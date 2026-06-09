from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.notebooks.src.vector_store import connect_weaviate
from backend.notebooks.src.retriever import OLLAMA_URL, OLLAMA_MODEL, retrieve_and_rerank, build_prompt
from fastapi.responses import StreamingResponse
import httpx

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
async def query(req: QueryRequest):
    reranked = retrieve_and_rerank(collection, req.question)
    context = "\n\n---\n\n".join(obj.properties["text"] for obj in reranked)
    prompt = build_prompt(req.question, context)  

    async def stream():
        async with httpx.AsyncClient(timeout=None) as client:  # ← add this
            async with client.stream("POST", OLLAMA_URL, json={
                "model": OLLAMA_MODEL, "prompt": prompt, "stream": True
            }) as r:
                async for line in r.aiter_lines():
                    if line:
                        import json
                        data = json.loads(line)
                        if not data.get("done"):
                            yield data["response"]

    return StreamingResponse(stream(), media_type="text/plain")


class FeedbackRequest(BaseModel):
    message_id: int
    feedback: str  

@app.post("/feedback")
def feedback(req: FeedbackRequest):
    return {"status": "ok"}

@app.get("/health")
def health():
    return {"status": "ok"}