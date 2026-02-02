import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

# Mock TranscriptRAG before importing app
with patch('rag.rag_workflow.TranscriptRAG'):
    from src.backend.main import app

client = TestClient(app)

def test_search_endpoint():
    with patch('backend.main.VideosSearch') as mock_search:
        mock_search.return_value.result.return_value = {
            "result": [{"title": "Video 1", "link": "url1"}]
        }
        response = client.post("/search", json={"query": "test"})
        assert response.status_code == 200
        assert "results" in response.json()
        assert response.json()["results"][0]["title"] == "Video 1"

def test_transcript_endpoint():
    with patch('backend.main.gettranscripts') as mock_get:
        mock_get.extract_video_id.return_value = "vid123"
        mock_get.get_transcript.return_value = [{"text": "hello"}]
        mock_get.format_transcript.return_value = "hello"
        
        response = client.post("/transcript", json={"video_url": "url", "title": "title"})
        assert response.status_code == 200
        assert response.json()["transcript"] == "hello"

def test_summarize_endpoint():
    with patch('backend.main.Summarize') as mock_sum:
        mock_sum.summarize_topic.return_value = "summary"
        response = client.post("/summarize", json={"transcript_text": "text"})
        assert response.status_code == 200
        assert response.json()["summary"] == "summary"

def test_ingest_endpoint():
    with patch('backend.main.transcript_rag') as mock_rag:
        response = client.post("/ingest", json={"video_id": "vid", "transcript_text": "text"})
        assert response.status_code == 200
        assert response.json()["status"] == "success"

def test_generate_mcq_endpoint():
    with patch('backend.main.transcript_rag') as mock_rag:
        with patch('backend.main.MCQService.generate_mcqs_from_text') as mock_gen:
            mock_gen.return_value = {"questions": []}
            response = client.post("/generate-mcq", json={"transcript_text": "text"})
            assert response.status_code == 200
            assert "questions" in response.json()

def test_grade_mcq_endpoint():
    with patch('backend.main.transcript_rag') as mock_rag:
        with patch('backend.main.MCQService.grade_mcq_answers') as mock_grade:
            mock_grade.return_value = {"score": "5/5"}
            response = client.post("/grade-mcq", json={
                "transcript_text": "text",
                "questions": [],
                "user_answers": {}
            })
            assert response.status_code == 200
            assert response.json()["score"] == "5/5"

def test_recommend_endpoint():
    with patch('backend.main.transcript_rag') as mock_rag:
        mock_rag.llm.invoke.return_value = MagicMock(content="Query 1\nQuery 2")
        with patch('backend.main.VideosSearch') as mock_search:
            mock_search.return_value.result.return_value = {
                "result": [{"title": "Rec 1", "link": "url1", "thumbnails": [{"url": "img"}], "channel": {"name": "ch"}}]
            }
            response = client.post("/recommend", json={"transcript_text": "text", "summary": "sum"})
            assert response.status_code == 200
            assert "recommendations" in response.json()
            assert len(response.json()["recommendations"]) > 0
