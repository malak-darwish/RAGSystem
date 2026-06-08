import requests
from notebooks.src.embedder import embed_query
from notebooks.src.reranker import rerank

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen3:4b"          


def retrieve(collection, query: str, k: int = 50):
    print("Embedding query...")
    query_vector = embed_query(query)

    print("Searching Weaviate...")
    response = collection.query.near_vector(
        near_vector=query_vector,
        limit=k
    )

    print(f"Retrieved {len(response.objects)} chunks")

    return response.objects


def retrieve_and_rerank(collection, query: str, fetch_k: int = 50, top_n: int = 5) -> list:
    candidates = retrieve(collection, query, k=fetch_k)
    return rerank(query, candidates, top_n=top_n)


def generate(query: str, context_chunks: list) -> str:
    context = "\n\n---\n\n".join(
        obj.properties["text"] for obj in context_chunks
    )
    prompt = (
        f"Use ONLY the context below to answer the question. "
        f"If the answer is not in the context, say so.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {query}\n\n"
        f"Answer:"
    )

    response = requests.post(
        OLLAMA_URL,
        json={"model": OLLAMA_MODEL, "prompt": prompt, "stream": False},
    )
    response.raise_for_status()
    return response.json()["response"]


def query_pipeline(collection, query: str) -> str:
    print("Step 1: Retrieving")
    reranked = retrieve_and_rerank(collection, query, fetch_k=20, top_n=5)

    print("Step 2: Retrieved and reranked")

    print("Step 3: Generating")
    answer = generate(query, reranked)

    print("Step 4: Generated")

    return answer