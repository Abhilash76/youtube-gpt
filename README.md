## youtube-gpt
An open-source clone of Google's NotebookLM that lets you chat with YouTube videos using open‑source LLMs and a RAG (Retrieval‑Augmented Generation) pipeline.

It:
- **Transcribes YouTube videos**
- **Chunks and embeds transcripts into Pinecone**
- **Runs RAG over those embeddings**
- **Serves a backend API** (FastAPI) and a **frontend UI** (React) for interactive chat

---

## Quick start

### 1. Prerequisites

- **Git**
- **Docker + Docker Compose**
- **Python 3.10+** (for running locally without Docker)

You will also need the following accounts/keys (free tiers are enough to start):
- **Pinecone**: for vector storage (PINECONE_API_KEY)
- **Cohere**: for reranking (COHERE_API_KEY, optional but recommended)
- **Ollama** (running locally): for LLM and the `nomic-embed-text` model

### 2. Clone the repository

```bash
git clone https://github.com/Abhilash76/class-gpt.git
cd class-gpt
```

### 3. Set up environment variables

Create a new `.env` file in the project root

Edit `.env` and set at least:

```bash
PINECONE_API_KEY=your_pinecone_key_here
COHERE_API_KEY=your_cohere_key_here  # optional, can be left empty
OLLAMA_BASE_URL=http://host.docker.internal:11434

### 4. Start Ollama and pull models

Install **Ollama** from their website, then in a terminal run:

```bash
ollama pull nomic-embed-text
ollama pull kimi-k2-thinking:cloud  
```

### 5. Run everything with Docker

From the project root:

```bash
docker-compose up --build
```

This will:
- Build and start the **backend** on `http://localhost:8000`
- Build and start the **frontend** on `http://localhost:3000`

Open your browser at `http://localhost:3000` to use the app.

To stop:

```bash
docker-compose down
```

### 6. Running locally without Docker (optional)

1. Create and activate a virtual environment:

```bash
python -m venv .venv
source .venv/bin/activate        # macOS/Linux
# or on Windows (PowerShell):
# .\.venv\Scripts\Activate.ps1
```

2. Install Python dependencies:

```bash
pip install -r requirements.txt
```

3. Export the required environment variables (`PINECONE_API_KEY`, `COHERE_API_KEY`, `OLLAMA_BASE_URL`.

4. Run the backend API:

```bash
export PYTHONPATH=./src           # PowerShell: $env:PYTHONPATH = ".\src"
uvicorn src.backend.main:app --reload --host 0.0.0.0 --port 8000
```

5. In another terminal, start the frontend (from `frontend/`):

```bash
cd frontend
npm install
npm run dev
```

Visit `http://localhost:3000` in your browser.

---

## Using the app

High‑level flow:

1. **Provide a video title** in the UI.
2. The backend **loads and transcribes** the video.
3. The transcript is **chunked** (recursive or semantic strategy).
4. Chunks are **embedded** and stored in **Pinecone**.
5. Your chat **queries are embedded and used to retrieve relevant chunks**.
6. An LLM (via Ollama) answers using the retrieved context.

You can then ask follow‑up questions, refer to timestamps, and explore the video content conversationally.

---

## Overview

- **Backend**: Python / FastAPI (`src/backend/main.py`)
  - Handles YouTube ingestion, transcription, RAG pipeline, and chat endpoints.
  - Uses environment‑driven configuration for Pinecone, Cohere, Ollama, and embedding model path.
- **RAG pipeline** (`src/rag/rag_workflow.py`):
  - Cleans and splits transcripts using `RecursiveCharacterTextSplitter` and an optional **agentic decision** between recursive vs semantic chunking.
  - Embeddings:
    - Previously via `OllamaEmbeddings` with `nomic-embed-text`
  - Vector store: **Pinecone** (`PineconeVectorStore`) with cosine similarity and 768‑dim embeddings.
  - Optional reranking via **Cohere** (`rerank-english-v3.0`).
- **LLM**:
  - Served via **Ollama** (`ChatOllama`), defaulting to `kimi-k2-thinking:cloud` (configurable).
- **Frontend** (`frontend/`):
  - React app that talks to the backend for ingestion and chat.
- **Containerization**:
  - `Dockerfile.backend` for the backend image.
  - `docker-compose.yml` orchestrates backend + frontend only (no monitoring stack).

For deeper details, inspect:
- `src/backend/main.py` for API design and dependency wiring
- `src/rag/rag_workflow.py` for chunking, embedding, and retrieval
- `tests/test_rag.py` for basic RAG tests and examples

---

## Testing

From the project root (with dependencies installed):

```bash
pytest
```

This runs the existing tests (e.g. `tests/test_rag.py`) to verify the RAG pipeline behavior.

