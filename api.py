from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from backend.notebooks.src.vector_store import connect_weaviate
from backend.notebooks.src.retriever import OLLAMA_URL, OLLAMA_MODEL, retrieve_and_rerank, build_prompt
from fastapi.responses import StreamingResponse
import httpx
from rag_setup.database import init_db
import rag_setup.database as database 
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  
    expose_headers=["X-Sources"],
    allow_methods=["*"],
    allow_headers=["*"],
)

weaviate_client = connect_weaviate()
collection = weaviate_client.collections.get("CC")

class QueryRequest(BaseModel):
    question: str
    thread_id: int | None = None   

@app.post("/query")
async def query(req: QueryRequest):
    reranked = retrieve_and_rerank(collection, req.question)

    # Build numbered chunks for citation-aware prompt
    numbered_chunks = []
    sources = []
    for i, obj in enumerate(reranked, start=1):
        props = obj.properties
        text  = props.get("text", "")
        numbered_chunks.append({"index": i, "text": text})
        sources.append({
            "index": i,
            "title": f"Page {props.get('page_number', '?')}",
            "chunk": text[:120],
            "text":  text,
            "score": getattr(obj, "score", None) or 0,
        })

    prompt = build_prompt(req.question, numbered_chunks)

    full_response = []

    async def stream():
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", OLLAMA_URL, json={
                "model": OLLAMA_MODEL, "prompt": prompt, "stream": True
            }) as r:
                async for line in r.aiter_lines():
                    if line:
                        data = json.loads(line)
                        if not data.get("done"):
                            chunk = data["response"]
                            full_response.append(chunk)
                            yield chunk

        if req.thread_id:
            await database.save_message(req.thread_id, "user", req.question)
            await database.save_message(req.thread_id, "assistant", "".join(full_response), sources)

    return StreamingResponse(
        stream(),
        media_type="text/plain",
        headers={"X-Sources": json.dumps(sources)},
    )

class FeedbackRequest(BaseModel):
    message_id: int
    feedback: str  

class CreateThreadRequest(BaseModel):
    title: str

class SaveMessageRequest(BaseModel):
    role: str
    content: str
    sources: list = []

@app.post("/feedback")
def feedback(req: FeedbackRequest):
    return {"status": "ok"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.on_event("startup")
async def startup():
    await init_db()

@app.post("/threads")
async def create_thread(req: CreateThreadRequest):
    thread_id = await database.create_thread(req.title)
    return {"id": thread_id, "title": req.title}

@app.get("/threads")
async def list_threads():
    threads = await database.get_threads()
    return {"threads": [dict(t) for t in threads]}

@app.get("/threads/{thread_id}/messages")
async def list_messages(thread_id: int):
    messages = await database.get_messages(thread_id)
    return {"messages": [dict(m) for m in messages]}

@app.post("/threads/{thread_id}/messages")
async def save_message(thread_id: int, req: SaveMessageRequest):
    msg_id = await database.save_message(thread_id, req.role, req.content, req.sources)
    return {"id": msg_id}