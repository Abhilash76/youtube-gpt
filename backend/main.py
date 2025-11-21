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

app = FastAPI()

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        
        return {"transcript": transcript_text}
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

if __name__ == "__main__":

    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
