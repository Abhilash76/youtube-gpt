"""
Agentic RAG Workflow
- Hugging Face Inference API (STREAMING)
- Qwen3 Embeddings (local)
- Cohere Reranker (high-quality retrieval)
"""

import re
import numpy as np
import faiss
from typing import TypedDict, List, Literal, Dict

from sentence_transformers import SentenceTransformer
from huggingface_hub import InferenceClient
from langgraph.graph import StateGraph, END
import cohere
import dotenv
import os
# =============================================================================
# 🔐 CONFIGURATION (ONLY CHANGE THESE)
# =============================================================================
dotenv.load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")
COHERE_API_KEY = os.getenv("COHERE_API_KEY")

GENERATION_MODEL = "Qwen/Qwen2.5-7B-Instruct"
EMBEDDING_MODEL = "Qwen/Qwen3-Embedding-0.6B"
RERANK_MODEL = "rerank-english-v3.0"

# =============================================================================
# 🚀 INITIALIZATION (ONCE)
# =============================================================================

hf_client = InferenceClient(
    model=GENERATION_MODEL,
    token=HF_TOKEN,
    timeout=120
)

embedding_model = SentenceTransformer(
    EMBEDDING_MODEL,
    trust_remote_code=True
)

cohere_client = cohere.Client(COHERE_API_KEY)

# =============================================================================
# 🧠 RAG STATE
# =============================================================================

class RAGState(TypedDict):
    transcript_text: str
    clean_sentences: List[str]
    query: str
    chunking_strategy: Literal["semantic", "recursive", "sentence"]
    chunks: List[str]
    context: str
    answer: str
    error: str

# =============================================================================
# 🧩 GRAPH NODES
# =============================================================================

class AgenticRAG:

    def clean_transcript_node(state: RAGState) -> Dict:
        text = re.sub(r"\[\d{2}:\d{2}\]", "", state["transcript_text"])
        sentences = [
            s.strip()
            for s in re.split(r"(?<=[.!?])\s+", text)
            if len(s.strip()) > 5
        ]
        return {"clean_sentences": sentences}


    def analyzer_agent_node(state: RAGState) -> Dict:
        """
        AI Agent that analyzes transcript content to decide the best chunking strategy.
        Uses Qwen model to intelligently analyze the transcript characteristics.
        """
        sentences = state["clean_sentences"]
        
        if not sentences:
            # Default to recursive if no sentences
            return {"chunking_strategy": "recursive"}
        
        # Prepare transcript sample for analysis (use first 2000 chars to avoid token limits)
        transcript_sample = " ".join(sentences[:50])  # First 50 sentences or less
        if len(transcript_sample) > 2000:
            transcript_sample = transcript_sample[:2000] + "..."
        
        # Calculate basic statistics for context
        total_chars = sum(len(s) for s in sentences)
        avg_sentence_len = total_chars / len(sentences)
        num_sentences = len(sentences)
        
        # Create prompt for AI agent to analyze and decide
        analysis_prompt = f"""You are an expert at analyzing text content to determine the best chunking strategy for RAG (Retrieval Augmented Generation).

        Analyze the following transcript sample and decide which chunking strategy would work best:

        TRANSCRIPT SAMPLE:
        {transcript_sample}

        STATISTICS:
        - Total sentences: {num_sentences}
        - Average sentence length: {avg_sentence_len:.1f} characters
        - Total characters: {total_chars}

        CHUNKING STRATEGIES:
        1. "semantic" - Best for: Technical content, complex topics, content with clear topic shifts, long-form educational material
        2. "recursive" - Best for: Narrative content, conversational transcripts, balanced content, standard presentations
        3. "sentence" - Best for: Short transcripts, simple content, Q&A formats, brief explanations

        Consider:
        - Content complexity and technical depth
        - Whether topics shift frequently (needs semantic)
        - Whether it's narrative/conversational (needs recursive)
        - Overall length and structure

        Respond with ONLY one word: "semantic", "recursive", or "sentence"
        Do not include any explanation, just the strategy name."""

        try:
            # Use AI agent to make decision
            response = hf_client.text_generation(
                analysis_prompt,
                max_new_tokens=15,  # Small buffer for the strategy name
                temperature=0.1,   # Low temperature for consistent decisions
                top_p=0.9
            )
            
            # Extract strategy from response (clean and validate)
            strategy = response.strip().lower()
            
            # Remove any quotes, punctuation, or extra text
            strategy = strategy.replace('"', '').replace("'", '').replace('.', '').replace(',', '').strip()
            
            # Extract the first word that matches a valid strategy
            words = strategy.split()
            strategy = None
            for word in words:
                if word in ["semantic", "recursive", "sentence"]:
                    strategy = word
                    break
            
            # Validate the response is one of the expected strategies
            if strategy not in ["semantic", "recursive", "sentence"]:
                # Fallback logic if AI response is unexpected
                if total_chars < 1000:
                    strategy = "sentence"
                elif avg_sentence_len > 120 or num_sentences > 100:
                    strategy = "semantic"
                else:
                    strategy = "recursive"
            
            return {"chunking_strategy": strategy}
            
        except Exception as e:
            # Fallback to heuristic-based decision if AI call fails
            print(f"AI agent error, using fallback: {e}")
            if total_chars < 1000:
                strategy = "sentence"
            elif avg_sentence_len > 120:
                strategy = "semantic"
            else:
                strategy = "recursive"
            
            return {"chunking_strategy": strategy}


    def semantic_chunking_node(state: RAGState) -> Dict:
        sentences = state["clean_sentences"]
        embeddings = embedding_model.encode(sentences)

        chunks = []
        current = [sentences[0]]

        for i in range(1, len(sentences)):
            sim = np.dot(embeddings[i], embeddings[i - 1]) / (
                np.linalg.norm(embeddings[i]) * np.linalg.norm(embeddings[i - 1])
            )
            if sim < 0.7:
                chunks.append(" ".join(current))
                current = []
            current.append(sentences[i])

        if current:
            chunks.append(" ".join(current))

        return {"chunks": chunks}


    def recursive_chunking_node(state: RAGState) -> Dict:
        chunks, buf = [], ""
        for s in state["clean_sentences"]:
            if len(buf) + len(s) < 800:
                buf += " " + s
            else:
                chunks.append(buf.strip())
                buf = s
        if buf:
            chunks.append(buf.strip())
        return {"chunks": chunks}


    def sentence_chunking_node(state: RAGState) -> Dict:
        s = state["clean_sentences"]
        return {"chunks": [" ".join(s[i:i + 3]) for i in range(0, len(s), 3)]}


    def rag_retrieval_node(state: RAGState) -> Dict:
        chunks = state["chunks"]
        query = state["query"]

        # --- FAISS retrieval (top 10) ---
        chunk_embeddings = embedding_model.encode(chunks)
        dim = chunk_embeddings.shape[1]

        index = faiss.IndexFlatL2(dim)
        index.add(chunk_embeddings.astype("float32"))

        query_vec = embedding_model.encode([query])
        _, idx = index.search(query_vec.astype("float32"), k=min(10, len(chunks)))

        candidate_chunks = [chunks[i] for i in idx[0]]

        # --- Cohere reranking (top 3) ---
        rerank = cohere_client.rerank(
            model=RERANK_MODEL,
            query=query,
            documents=candidate_chunks,
            top_n=3
        )

        context = "\n\n".join([candidate_chunks[r.index] for r in rerank.results])
        return {"context": context}


    def generation_node(state: RAGState) -> Dict:
        prompt = f"""
    You are a helpful assistant.
    Answer the question using ONLY the context below.
    If the answer is not in the context, say so clearly.

    Context:
    {state['context']}

    Question:
    {state['query']}
    """

        try:
            streamed_text = []
            for token in hf_client.text_generation(
                prompt,
                max_new_tokens=350,
                temperature=0.2,
                top_p=0.9,
                repetition_penalty=1.05,
                stream=True
            ):
                streamed_text.append(token)

            return {"answer": "".join(streamed_text).strip()}

        except Exception as e:
            return {"error": str(e)}

    # =============================================================================
    # 🧠 GRAPH CONSTRUCTION
    # =============================================================================

    def router(state: RAGState):
        return state["chunking_strategy"]


    workflow = StateGraph(RAGState)

    workflow.add_node("clean", clean_transcript_node)
    workflow.add_node("analyze", analyzer_agent_node)
    workflow.add_node("semantic", semantic_chunking_node)
    workflow.add_node("recursive", recursive_chunking_node)
    workflow.add_node("sentence", sentence_chunking_node)
    workflow.add_node("retrieve", rag_retrieval_node)
    workflow.add_node("generate", generation_node)

    workflow.set_entry_point("clean")
    workflow.add_edge("clean", "analyze")

    workflow.add_conditional_edges(
        "analyze",
        router,
        {
            "semantic": "semantic",
            "recursive": "recursive",
            "sentence": "sentence",
        }
    )

    workflow.add_edge("semantic", "retrieve")
    workflow.add_edge("recursive", "retrieve")
    workflow.add_edge("sentence", "retrieve")
    workflow.add_edge("retrieve", "generate")
    workflow.add_edge("generate", END)

    app = workflow.compile()
