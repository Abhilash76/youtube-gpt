import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

# Mock all external dependencies that might block during import
mock_rag = MagicMock()
mock_instrumentator = MagicMock()
mock_search = MagicMock()

with patch('rag.rag_workflow.TranscriptRAG', return_value=mock_rag):
    with patch('prometheus_fastapi_instrumentator.Instrumentator', return_value=mock_instrumentator):
        with patch('youtubesearchpython.VideosSearch', return_value=mock_search):
            from backend.main import app

client = TestClient(app)

def test_mindmap_endpoint():
    with patch('backend.main.transcript_rag') as mocked_rag:
        with patch('backend.main.MindMapService.generate_mind_map') as mock_gen:
            mock_gen.return_value = "mindmap\n  root((Test))"
            response = client.post("/mindmap", json={"transcript_text": "text"})
            assert response.status_code == 200
            assert response.json()["mind_map"] == "mindmap\n  root((Test))"

def test_process_all_endpoint():
    with patch('backend.main.transcript_rag') as mocked_rag:
        with patch('backend.main.Summarize.summarize_topic') as mock_sum:
            mock_sum.return_value = "summary"
            with patch('backend.main.MCQService.generate_mcqs_from_text') as mock_mcq:
                mock_mcq.return_value = {"questions": []}
                with patch('backend.main.MindMapService.generate_mind_map') as mock_mm:
                    mock_mm.return_value = "mindmap"
                    with patch('backend.main.get_recommendations') as mock_rec:
                        # Make it a coroutine since it's awaited
                        async def mock_rec_coro(*args, **kwargs):
                            return []
                        mock_rec.return_value = mock_rec_coro()
                        
                        response = client.post("/process-all", json={"transcript_text": "text"})
                        assert response.status_code == 200
                        data = response.json()
                        assert data["summary"] == "summary"
                        assert data["mcqs"] == []
                        assert data["mind_map"] == "mindmap"
                        assert data["recommendations"] == []
