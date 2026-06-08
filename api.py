from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.notebooks.src.vector_store import connect_weaviate
from backend.notebooks.src.retriever import query_pipeline

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default port
    allow_methods=["*"],
    allow_headers=["*"],
)

client = connect_weaviate()
collection = client.collections.get("CC")

class QueryRequest(BaseModel):
    question: str

@app.post("/query")
def query(req: QueryRequest):
    answer = query_pipeline(collection, req.question)
    return {"answer": answer}