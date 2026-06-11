import weaviate
from weaviate.classes.config import Configure, Property, DataType

def connect_weaviate():
    client = weaviate.connect_to_local()
    return client
def collection_exists(client, name):
    return client.collections.exists(name)
def create_collection(client):
    if client.collections.exists("CC"):
        return client.collections.get("CC")

    return client.collections.create(
        name="CC",
        properties=[
            Property(name="text", data_type=DataType.TEXT),
            Property(name="page_number", data_type=DataType.INT),
        ],
        vectorizer_config=Configure.Vectorizer.none()
    )

def insert_chunks(collection, chunks, vectors):
    with collection.batch.dynamic() as batch:
        for chunk, vector in zip(chunks, vectors):
            batch.add_object(
                properties={"text": chunk.page_content,
                            "page_number": chunk.metadata.get("page", 0) + 1},
                vector=vector
            )

