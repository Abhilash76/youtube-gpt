from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from prometheus_fastapi_instrumentator import Instrumentator
import sys
import os
import re
import asyncio
from concurrent.futures import ThreadPoolExecutor
import httpx

# Monkey patch to fix httpx compatibility issue with youtube-search-python
# Newer httpx versions don't accept 'proxies' in post()/get() directly
# MUST be done before importing VideosSearch
def patch_youtube_search_httpx():
    """Fix httpx compatibility for youtube-search-python library."""
    from youtubesearchpython.core.requests import RequestCore
    from youtubesearchpython.core.constants import userAgent
    
    def fixed_sync_post(self):
        """Fixed syncPostRequest that works with newer httpx versions."""
        if self.proxy:
            # Use httpx.Client with proxies for newer httpx versions
            with httpx.Client(proxies=self.proxy) as client:
                return client.post(
                    self.url,
                    headers={"User-Agent": userAgent},
                    json=self.data,
                    timeout=self.timeout
                )
        else:
            return httpx.post(
                self.url,
                headers={"User-Agent": userAgent},
                json=self.data,
                timeout=self.timeout
            )
    
    def fixed_sync_get(self):
        """Fixed syncGetRequest that works with newer httpx versions."""
        if self.proxy:
            with httpx.Client(proxies=self.proxy) as client:
                return client.get(
                    self.url,
                    headers={"User-Agent": userAgent},
                    timeout=self.timeout,
                    cookies={'CONSENT': 'YES+1'}
                )
        else:
            return httpx.get(
                self.url,
                headers={"User-Agent": userAgent},
                timeout=self.timeout,
                cookies={'CONSENT': 'YES+1'}
            )
    
    # Apply the patch
    RequestCore.syncPostRequest = fixed_sync_post
    RequestCore.syncGetRequest = fixed_sync_get

# Apply the patch BEFORE importing VideosSearch
try:
    patch_youtube_search_httpx()
except Exception as e:
    print(f"Warning: Could not patch youtube-search-python: {e}")

# Now import VideosSearch after the patch is applied
from youtubesearchpython import VideosSearch

# Add parent directory to path to import existing modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from get_transcripts import gettranscripts
from generate_summary import Summarize
from rag.rag_workflow import TranscriptRAG
import traceback

app = FastAPI()

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instrument FastAPI with Prometheus
Instrumentator().instrument(app).expose(app)

# Initialize TranscriptRAG for Pinecone workflow
try:
    transcript_rag = TranscriptRAG()
except Exception as e:
    print(f"ERROR: Failed to initialize TranscriptRAG: {e}")
    print(traceback.format_exc())
    transcript_rag = None

# In-memory transcript cache for Pinecone workflow
transcript_cache = {}

# Thread pool executor for blocking operations
executor = ThreadPoolExecutor(max_workers=4)

class SearchRequest(BaseModel):
    query: str

class TranscriptRequest(BaseModel):
    video_url: str
    title: str

class SummaryRequest(BaseModel):
    transcript_text: str

class RecommendRequest(BaseModel):
    transcript_text: str
    summary: str = ""

@app.post("/search")
async def search_videos(request: SearchRequest):
    try:
        # Validate query
        if not request.query or not request.query.strip():
            raise HTTPException(status_code=400, detail="Query cannot be empty")
        
        query = request.query.strip()
        
        # Run blocking search operation in thread pool to avoid blocking async event loop
        def perform_search():
            try:
                search = VideosSearch(query, limit=5)
                return search.result()
            except Exception as e:
                print(f"VideosSearch error: {e}")
                raise
        
        # Execute search in thread pool
        loop = asyncio.get_event_loop()
        search_result = await loop.run_in_executor(executor, perform_search)
        
        # Validate result structure
        if not search_result:
            raise HTTPException(
                status_code=500, 
                detail="Empty response from YouTube search"
            )
        
        if "result" not in search_result:
            # Log the actual response for debugging
            print(f"Unexpected search result structure: {search_result}")
            raise HTTPException(
                status_code=500, 
                detail="Invalid response format from YouTube search"
            )
        
        results = search_result["result"]
        
        # Ensure results is a list
        if not isinstance(results, list):
            print(f"Results is not a list, type: {type(results)}, value: {results}")
            results = []
        
        return {"results": results}
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"Search error: {error_msg}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Search failed: {error_msg}")

class IngestRequest(BaseModel):
    video_id: str
    transcript_text: str

@app.post("/transcript")
async def get_transcript(request: TranscriptRequest):
    try:
        video_id = gettranscripts.extract_video_id(request.video_url)
        transcript = gettranscripts.get_transcript(video_id)
        transcript_text = gettranscripts.format_transcript(transcript)
        
        # Save transcript locally as per original logic (optional, but good for caching/debugging)
        file_path = f"{request.title.replace(' ', '_').replace('?', '').replace('|', '')}.txt"
        gettranscripts.save_transcript(request.title, transcript_text, file_path)
        
        # Store transcript in cache for Pinecone workflow
        transcript_cache[video_id] = transcript_text
        
        return {"transcript": transcript_text, "video_id": video_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/ingest")
async def ingest_transcript(request: IngestRequest):
    try:
        # Create Pinecone index and ingest transcript
        if transcript_rag is None:
            raise HTTPException(status_code=503, detail="TranscriptRAG not initialized")
            
        transcript_rag.create_transcript_index(request.video_id)
        transcript_rag.ingest_transcript(request.transcript_text, request.video_id, strategy="agentic")
        
        return {"status": "success", "message": "Ingestion complete"}
    except Exception as e:
        print(f"Ingestion error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/summarize")
async def summarize_transcript(request: SummaryRequest):
    try:
        loop = asyncio.get_event_loop()
        summary = await loop.run_in_executor(executor, Summarize.summarize_topic, request.transcript_text)
        return {"summary": summary}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from mcq_service import MCQService
from recommendation import get_recommendations
from mindMap import MindMapService

class MCQRequest(BaseModel):
    transcript_text: str

class GradeRequest(BaseModel):
    transcript_text: str
    questions: list
    user_answers: dict

@app.post("/generate-mcq")
async def generate_mcq(request: MCQRequest):
    try:
        if transcript_rag is None:
            raise HTTPException(status_code=503, detail="RAG service not initialized")
        loop = asyncio.get_event_loop()
        mcq_data = await loop.run_in_executor(
            executor, 
            MCQService.generate_mcqs_from_text, 
            request.transcript_text, 
            transcript_rag.llm
        )
        return mcq_data
    except Exception as e:
        print(f"MCQ Generation error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/grade-mcq")
async def grade_mcq(request: GradeRequest):
    try:
        if transcript_rag is None:
            raise HTTPException(status_code=503, detail="RAG service not initialized")
        loop = asyncio.get_event_loop()
        grading_result = await loop.run_in_executor(
            executor,
            MCQService.grade_mcq_answers,
            request.transcript_text, 
            request.questions, 
            request.user_answers,
            transcript_rag.llm
        )
        return grading_result
    except Exception as e:
        print(f"MCQ Grading error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/recommend")
async def recommend_literature(request: RecommendRequest):
    return {"recommendations": await get_recommendations(
        request.transcript_text, 
        request.summary, 
        transcript_rag, 
        executor
    )}

class MindMapRequest(BaseModel):
    transcript_text: str

@app.post("/mindmap")
async def generate_mind_map(request: MindMapRequest):
    try:
        if transcript_rag is None:
            raise HTTPException(status_code=503, detail="RAG service not initialized")
        loop = asyncio.get_event_loop()
        mind_map_code = await loop.run_in_executor(
            executor, 
            MindMapService.generate_mind_map, 
            request.transcript_text, 
            transcript_rag.llm
        )
        return {"mind_map": mind_map_code}
    except Exception as e:
        print(f"Mind Map Generation error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

class ChatRequest(BaseModel):
    video_id: str
    query: str

@app.post("/chat")
async def chat_with_video(request: ChatRequest):
    """Chat with video using RAG workflow with Pinecone."""
    try:
        # Retrieve transcript text from cache
        transcript_text = transcript_cache.get(request.video_id)
        
        if not transcript_text:
            # Fallback: try to retrieve from saved file
            import glob
            import os
            transcript_files = glob.glob("transcripts/*.txt")
            for file_path in transcript_files:
                # Try to match by reading file and checking if it contains the video_id
                # or by filename if video_id is in filename
                if request.video_id in os.path.basename(file_path):
                    with open(file_path, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                        if len(lines) > 2:
                            transcript_text = ''.join(lines[2:]).strip()
                            # Cache it for future use
                            transcript_cache[request.video_id] = transcript_text
                            break
        
        if not transcript_text:
            raise HTTPException(
                status_code=404,
                detail=f"Transcript not found for video_id: {request.video_id}. Please generate transcript first using /transcript endpoint."
            )
        
        # Query transcript using TranscriptRAG
        if transcript_rag is None:
            raise HTTPException(
                status_code=503,
                detail="RAG service not available. Check server logs for initialization errors."
            )
        
        # The workflow will:
        # 1. Retrieve top 5 chunks from Pinecone (or 15 if reranking)
        # 2. Rerank with Cohere (if enabled)
        # 3. Generate answer from top 5 reranked chunks
        try:
            # 1. Get the generator from your RAG service
            # We assume query_transcript now yields text chunks
            answer_generator = transcript_rag.query_transcript(
                transcript_id=request.video_id,
                query=request.query,
                use_reranker=True,
                stream=True
            )

            # 2. Return the StreamingResponse immediately
            # media_type "text/event-stream" is standard for LLM streaming
            return StreamingResponse(
                answer_generator, 
                media_type="text/event-stream",
                headers={
                    "X-Context-Used": "5",  # Send metadata in headers
                    "Cache-Control": "no-cache"
                }
            )

        except Exception as e:
            error_msg = str(e)
            print(f"Generation error: {error_msg}")
            print(traceback.format_exc())
            # For streaming, you might want to return a JSON error 
            # or a stream that contains the error message
            raise HTTPException(status_code=500, detail=f"Error processing query: {error_msg}")
        
        #return {"answer": answer, "context_used": context_used}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/process-all")
async def process_all(request: MindMapRequest):
    """Run all processing tasks in parallel and return results."""
    try:
        if transcript_rag is None:
            raise HTTPException(status_code=503, detail="RAG service not initialized")
            
        loop = asyncio.get_event_loop()
        
        # 1. Start all tasks concurrently
        ingest_task = loop.run_in_executor(executor, transcript_rag.ingest_transcript, request.transcript_text, "temp_vid", "agentic")
        summary_task = loop.run_in_executor(executor, Summarize.summarize_topic, request.transcript_text)
        mcq_task = loop.run_in_executor(executor, MCQService.generate_mcqs_from_text, request.transcript_text, transcript_rag.llm)
        mindmap_task = loop.run_in_executor(executor, MindMapService.generate_mind_map, request.transcript_text, transcript_rag.llm)
        recommend_task = get_recommendations(request.transcript_text, "", transcript_rag, executor)
        
        # 2. Wait for all tasks to complete
        # We use gather to run them in parallel
        # Ingest task is technically background but we wait for it to ensure consistency if needed
        results = await asyncio.gather(
            summary_task, 
            mcq_task, 
            mindmap_task, 
            recommend_task, 
            ingest_task,
            return_exceptions=True
        )
        
        # 3. Extract results and handle possible errors in individuals
        summary_res = results[0] if not isinstance(results[0], Exception) else f"Error: {results[0]}"
        mcq_res = results[1] if not isinstance(results[1], Exception) else {"questions": []}
        mindmap_res = results[2] if not isinstance(results[2], Exception) else ""
        recommend_res = results[3] if not isinstance(results[3], Exception) else []
        
        return {
            "summary": summary_res,
            "mcqs": mcq_res.get("questions", []),
            "mind_map": mindmap_res,
            "recommendations": recommend_res
        }
    except Exception as e:
        print(f"Process All error: {e}")
        print(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":

    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
