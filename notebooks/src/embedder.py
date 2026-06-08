from langchain_huggingface import HuggingFaceEmbeddings

embeddings = HuggingFaceEmbeddings(
    model_name="BAAI/bge-small-en-v1.5"
)

def embed_query(text):
    return embeddings.embed_query(text)

def embed_documents(texts):
    return [embeddings.embed_query(t) for t in texts]