from notebooks.src.parser import parse_pdf
from notebooks.src.embedder import embed_documents
from notebooks.src.vector_store import connect_weaviate, create_collection, insert_chunks, collection_exists
from notebooks.src.retriever import query_pipeline

client = connect_weaviate()

try:
    if not client.collections.exists("CC"):
        print("Building vector database...")

        docs = parse_pdf("data/CIS.pdf")
        vectors = embed_documents([d.page_content for d in docs])

        collection = create_collection(client)
        insert_chunks(collection, docs, vectors)

    else:
        print("Using existing collection...")
        collection = client.collections.get("CC")

    while True:
        query = input("\nAsk a question (or 'exit' to quit): ")
        if query.lower() in ["exit", "quit"]:
            break

        answer = query_pipeline(collection, query)
        print(answer)

finally:
    client.close()