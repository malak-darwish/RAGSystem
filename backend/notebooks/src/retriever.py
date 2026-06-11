import requests
from backend.notebooks.src.embedder import embed_query
from backend.notebooks.src.reranker import rerank

OLLAMA_URL = "http://localhost:11434/api/generate"
OLLAMA_MODEL = "qwen3:4b"          


def retrieve(collection, query: str, k: int = 20):
    print("Embedding query...")
    query_vector = embed_query(query)

    print("Searching Weaviate...")
    response = collection.query.near_vector(
        near_vector=query_vector,
        limit=k
    )

    print(f"Retrieved {len(response.objects)} chunks")

    return response.objects


def retrieve_and_rerank(collection, query: str, fetch_k: int = 20, top_n: int = 3) -> list:
    candidates = retrieve(collection, query, k=fetch_k)
    return rerank(query, candidates, top_n=top_n)


def generate(query: str, context_chunks: list) -> str:
    context = "\n\n---\n\n".join(
        obj.properties["text"] for obj in context_chunks
    )
    prompt = (
        f"You are a helpful assistant. Answer the question clearly and concisely "
        f"using the context below. Synthesize the information — do not copy chunks verbatim. "
        f"If the context doesn't contain enough information, say so briefly.\n\n"
        f"Context:\n{context}\n\n"
        f"Question: {query}\n\n"
        f"Answer in 2-4 sentences unless the question requires more detail. "
        f"Do not start your answer with phrases like 'Based on the context' or 'According to the document'.\n\n"
        f"Answer:"
    )

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "options": {
                "temperature": 0.3,
                "top_p": 0.9,
            }
        },
    )
    response.raise_for_status()
    return response.json()["response"]

def build_prompt(query: str, numbered_chunks: list[dict]) -> str:
    """
    numbered_chunks: list of dicts with keys 'index' (1-based int) and 'text' (str).
    The model is instructed to cite inline as [1], [2], etc.
    """
    context_block = "\n\n".join(
        f"[{c['index']}] {c['text']}" for c in numbered_chunks
    )

    return (
        f"You are a helpful assistant. Answer the question using the context chunks below.\n\n"
        f"Context:\n{context_block}\n\n"
        f"Question: {query}\n\n"
        f"Rules:\n"
        f"- Cite sources inline using [1], [2], etc. immediately after the relevant claim.\n"
        f"- Use **bold** for key terms.\n"
        f"- Use bullet points if the answer has multiple distinct points.\n"
        f"- Do NOT start with 'Based on the context' or 'According to the document'.\n"
        f"- If the context doesn't contain enough information, say so briefly.\n\n"
        f"Answer:"
    )

def query_pipeline(collection, query: str) -> str:
    print("Step 1: Retrieving")
    reranked = retrieve_and_rerank(collection, query, fetch_k=20, top_n=5)

    print("Step 2: Retrieved and reranked")

    print("Step 3: Generating")
    answer = generate(query, reranked)

    print("Step 4: Generated")

    return answer