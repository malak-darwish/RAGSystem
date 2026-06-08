from sentence_transformers import CrossEncoder

_model = CrossEncoder("BAAI/bge-reranker-v2-m3")

def rerank(query: str, candidates: list, top_n: int = 3):
    print(f"Reranking {len(candidates)} candidates...")
    if not candidates:
        return []

    texts = [obj.properties["text"] for obj in candidates]
    pairs = [(query, t) for t in texts]

    scores = _model.predict(pairs)

    scored = sorted(zip(scores, candidates), key=lambda x: x[0], reverse=True)
    print("Reranking complete")

    return [obj for _, obj in scored[:top_n]]