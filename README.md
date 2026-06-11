# RAG Chat

A full-stack conversational AI app powered by Retrieval-Augmented Generation. Ask questions about a PDF document and get cited, grounded answers — with full conversation history, response regeneration, and human feedback collection.

---

## Features

- **Streaming responses** — answers stream token by token from a local Ollama LLM (qwen3:4b)
- **Inline citations** — responses include `[1]`, `[2]` markers; hover for a source snippet, click to highlight the source in the accordion
- **Source accordion** — collapsible panel under each response splits sources into "Cited in response" vs "Also retrieved", with page numbers
- **Response regeneration** — regenerate any answer and switch between versions using `← 1/2 →`
- **Feedback collection** — thumbs up/down on every response; thumbs down requires a reason selection before submitting
- **Conversation threads** — full chat history with sidebar navigation, persisted to MariaDB
- **Guided tour** — first-visit walkthrough powered by driver.js

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | Vite + React + Tailwind CSS |
| Backend | FastAPI + httpx |
| LLM | Ollama (qwen3:4b) |
| Vector DB | Weaviate (local) |
| Embeddings | Custom embedder (sentence-transformers) |
| Reranker | Custom reranker |
| Database | MariaDB + aiomysql |

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+
- [Ollama](https://ollama.com) running locally with `qwen3:4b` pulled
- Weaviate running locally (`docker compose up`)
- MariaDB running locally

### 1. Clone and install

```bash
git clone <your-repo-url>
cd rag_setup
```

```bash
# Backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
```

```bash
# Frontend
cd frontend
npm install
```

### 2. Configure environment

Create `rag_setup/.env`:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=rag_chat
```

### 3. Ingest the PDF

Place your PDF at `data/CIS.pdf`, then run:

```bash
python -m main
```

This builds the Weaviate vector store. Once ingested, exit with `exit`.

### 4. Run

```bash
# Terminal 1 — from project root
uvicorn api:app --reload

# Terminal 2 — frontend
cd rag_setup/frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---
