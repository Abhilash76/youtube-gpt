from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from youtubesearchpython import VideosSearch
import sys
import os

# Add parent directory to path to import existing modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from get_transcripts import gettranscripts
from generate_summary import Summarize
from rag.faiss_manager import FAISSManager
from rag.rag_workflow import AgenticRAG

app = FastAPI()

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize FAISS Manager
faiss_manager = FAISSManager()

# Initialize RAG Agent (lazy initialization - will be created on first use)
rag_agent = None

def get_rag_agent():
    """Get or create the RAG agent instance (singleton pattern)."""
    global rag_agent
    if rag_agent is None:
        rag_agent = AgenticRAG()
    return rag_agent

class SearchRequest(BaseModel):
    query: str

class TranscriptRequest(BaseModel):
    video_url: str
    title: str

class SummaryRequest(BaseModel):
    transcript_text: str

@app.post("/search")
async def search_videos(request: SearchRequest):
    try:
        search = VideosSearch(request.query, limit=5)
        results = search.result()["result"]
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/transcript")
async def get_transcript(request: TranscriptRequest):
    try:
        video_id = gettranscripts.extract_video_id(request.video_url)
        transcript = gettranscripts.get_transcript(video_id)
        transcript_text = gettranscripts.format_transcript(transcript)
        
        # Save transcript locally as per original logic (optional, but good for caching/debugging)
        file_path = f"{request.title.replace(' ', '_').replace('?', '').replace('|', '')}.txt"
        gettranscripts.save_transcript(request.title, transcript_text, file_path)
        
        # Create and save FAISS index for RAG
        try:
            index, chunks = faiss_manager.create_index(transcript_text, video_id)
            faiss_manager.save_index(index, chunks, video_id)
        except Exception as e:
            # Log error but don't fail the transcript request
            print(f"Warning: Failed to create FAISS index: {e}")
        
        return {"transcript": transcript_text, "video_id": video_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/summarize")
async def summarize_transcript(request: SummaryRequest):
    try:
        summary = Summarize.summarize_topic(request.transcript_text)
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from mcq_service import MCQService

class MCQRequest(BaseModel):
    transcript_text: str

class GradeRequest(BaseModel):
    transcript_text: str
    questions: list
    user_answers: dict

@app.post("/generate-mcq")
async def generate_mcq(request: MCQRequest):
    try:
        mcq_data = MCQService.generate_mcqs_from_text(request.transcript_text)
        return mcq_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/grade-mcq")
async def grade_mcq(request: GradeRequest):
    try:
        grading_result = MCQService.grade_mcq_answers(
            request.transcript_text, 
            request.questions, 
            request.user_answers
        )
        return grading_result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ChatRequest(BaseModel):
    video_id: str
    query: str

@app.post("/chat")
async def chat_with_video(request: ChatRequest):
    """Chat with video using RAG workflow."""
    try:
        # Check if index exists
        if not faiss_manager.index_exists(request.video_id):
            raise HTTPException(
                status_code=404, 
                detail=f"FAISS index not found for video_id: {request.video_id}. Please generate transcript first."
            )
        
        # Load index and chunks
        index, chunks = faiss_manager.load_index(request.video_id)
        
        # Search for relevant context
        relevant_chunks = faiss_manager.search(index, chunks, request.query, k=3)
        context = "\n\n".join(relevant_chunks)
        
        # Use RAG workflow to generate answer
        rag_agent = get_rag_agent()
        
        # Build prompt for Qwen
        prompt = f"""<|im_start|>system
You are a helpful assistant. Use the following context from a video transcript to answer the user's question accurately. If the context doesn't contain enough information, say so.
Context:
{context}<|im_end|>
<|im_start|>user
{request.query}<|im_end|>
<|im_start|>assistant
"""
        
        # Generate answer using the generator
        # Note: This is a simplified version. For production, you'd want to properly
        # configure the generation parameters
        try:
            result = rag_agent.generator(
                prompt,
                max_new_tokens=256,
                temperature=0.7,
                do_sample=True,
                return_full_text=False
            )
            answer = result[0]['generated_text'].strip()
        except Exception as e:
            # Fallback if generation fails
            print(f"Generation error: {e}")
            answer = f"Based on the video transcript, here's what I found:\n\n{context[:500]}..."
        
        return {"answer": answer, "context_used": len(relevant_chunks)}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":

    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
