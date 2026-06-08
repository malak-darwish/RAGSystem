import os
import json
import pandas as pd

from deepeval.models import DeepEvalBaseLLM
from deepeval.test_case import LLMTestCase
from deepeval.metrics import (
    FaithfulnessMetric,
    AnswerRelevancyMetric,
    ContextualPrecisionMetric,
    ContextualRecallMetric,
)

from langchain_groq import ChatGroq

from notebooks.src.vector_store import connect_weaviate
from notebooks.src.retriever import retrieve_and_rerank, generate


RESULTS_JSON = "eval_data/deepeval_results.json"
SUMMARY_JSON = "eval_data/summary.json"
SUMMARY_CSV = "eval_data/summary.csv"

THRESHOLD = 0.7
GOLDENS = [
    {
        "question": "What is the purpose of CIS Control 3: Data Protection?",
        "ground_truth": "Develop processes and technical controls to identify, classify, securely handle, retain, and dispose of data.",
    },
    {
        "question": "Why is maintaining a complete software inventory important according to CIS Control 2?",
        "ground_truth": "A complete software inventory is critical for preventing attacks because attackers continuously scan for vulnerable software versions. Without a complete inventory, an enterprise cannot determine whether it has vulnerable software or potential licensing violations.",
    },
    {
        "question": "What does Safeguard 1.2 Address Unauthorized Assets require?",
        "ground_truth": "Ensure that a process exists to address unauthorized assets on a weekly basis. The enterprise may choose to remove the asset from the network, deny the asset from connecting remotely to the network, or quarantine the asset.",
    },
    {
        "question": "What is the maximum period of inactivity before automatic session locking must occur according to Safeguard 4.3?",
        "ground_truth": "Automatic session locking must occur after a defined period of inactivity that does not exceed 15 minutes for general purpose operating systems.",
    },
    {
        "question": "What does Safeguard 6.5 require for administrative access?",
        "ground_truth": "Require Multi-Factor Authentication (MFA) for all administrative access accounts, where supported, on all enterprise assets, whether managed on-site or through a third-party provider.",
    },
]

class GroqJudge(DeepEvalBaseLLM):

    def __init__(self):
        self.model = ChatGroq(
            model="llama-3.1-8b-instant",
            api_key=os.getenv("GROQ_API_KEY"),
        )

    def load_model(self):
        return self.model

    def generate(self, prompt: str) -> str:
        return self.model.invoke(prompt).content

    async def a_generate(self, prompt: str) -> str:
        return self.model.invoke(prompt).content

    def get_model_name(self):
        return "llama-3.1-8b-instant"


def run_metric(metric, test_case):

    try:

        metric.measure(test_case)

        return {
            "status": "success",
            "score": float(metric.score),
            "reason": metric.reason,
        }

    except Exception as e:

        return {
            "status": "failed",
            "score": None,
            "reason": str(e),
        }


client = connect_weaviate()

try:

    collection = client.collections.get(
        "CISControls"
    )

    judge = GroqJudge()

    all_results = []

    metric_names = [
        "FaithfulnessMetric",
        "AnswerRelevancyMetric",
        "ContextualPrecisionMetric",
        "ContextualRecallMetric",
    ]

    metric_scores = {
        metric: []
        for metric in metric_names
    }

    for i, golden in enumerate(GOLDENS, start=1):

        print(
            f"\n[{i}/{len(GOLDENS)}] "
            f"{golden['question']}"
        )

        reranked = retrieve_and_rerank(
            collection,
            golden["question"],
            fetch_k=50,
            top_n=3,
        )

        contexts = [
            obj.properties["text"]
            for obj in reranked
        ]

        answer = generate(
            golden["question"],
            reranked,
        )

        test_case = LLMTestCase(
            input=golden["question"],
            actual_output=answer,
            expected_output=golden["ground_truth"],
            retrieval_context=contexts,
            context=contexts,
        )

        metrics = [
            FaithfulnessMetric(
                model=judge,
                threshold=THRESHOLD,
            ),
            AnswerRelevancyMetric(
                model=judge,
                threshold=THRESHOLD,
            ),
            ContextualPrecisionMetric(
                model=judge,
                threshold=THRESHOLD,
            ),
            ContextualRecallMetric(
                model=judge,
                threshold=THRESHOLD,
            ),
        ]

        question_metrics = {}

        for metric in metrics:

            metric_name = metric.__class__.__name__

            print(
                f"   -> {metric_name}"
            )

            result = run_metric(
                metric,
                test_case,
            )

            question_metrics[
                metric_name
            ] = result

            if (
                result["status"] == "success"
                and result["score"] is not None
            ):
                metric_scores[
                    metric_name
                ].append(
                    result["score"]
                )

        all_results.append(
            {
                "question":
                    golden["question"],
                "ground_truth":
                    golden["ground_truth"],
                "answer":
                    answer,
                "metrics":
                    question_metrics,
            }
        )

    summary = {}

    for metric_name, scores in metric_scores.items():

        if len(scores) == 0:

            avg_score = None
            pass_rate = None

        else:

            avg_score = (
                sum(scores)
                / len(scores)
            )

            pass_count = len(
                [
                    s
                    for s in scores
                    if s >= THRESHOLD
                ]
            )

            pass_rate = (
                pass_count
                / len(scores)
            )

        summary[metric_name] = {
            "average_score":
                avg_score,
            "pass_rate":
                pass_rate,
        }


    os.makedirs(
        "eval_data",
        exist_ok=True,
    )

    with open(
        RESULTS_JSON,
        "w",
        encoding="utf-8",
    ) as f:

        json.dump(
            all_results,
            f,
            indent=2,
            ensure_ascii=False,
        )

    with open(
        SUMMARY_JSON,
        "w",
        encoding="utf-8",
    ) as f:

        json.dump(
            summary,
            f,
            indent=2,
        )

    table = []

    for metric_name, data in summary.items():

        table.append(
            {
                "Metric":
                    metric_name,
                "Average Score":
                    round(
                        data["average_score"],
                        3,
                    )
                    if data["average_score"]
                    is not None
                    else None,
                "Pass Rate (%)":
                    round(
                        data["pass_rate"]
                        * 100,
                        1,
                    )
                    if data["pass_rate"]
                    is not None
                    else None,
            }
        )

    df = pd.DataFrame(table)

    df.to_csv(
        SUMMARY_CSV,
        index=False,
    )

    print("\n========== SUMMARY ==========\n")

    print(df)

    print(
        f"\nDetailed results: {RESULTS_JSON}"
    )

    print(
        f"Summary JSON: {SUMMARY_JSON}"
    )

    print(
        f"Summary CSV: {SUMMARY_CSV}"
    )

finally:

    client.close()