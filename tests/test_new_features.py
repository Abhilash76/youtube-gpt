import pytest
from unittest.mock import MagicMock, patch
import sys
import os
import asyncio

# Add src/backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src', 'backend'))

from mindMap import MindMapService
from recommendation import get_recommendations

def test_mindmap_generation():
    mock_llm = MagicMock()
    mock_response = MagicMock()
    mock_response.content = "mindmap\n  root((Topic))\n    Subtopic"
    mock_llm.invoke.return_value = mock_response
    
    result = MindMapService.generate_mind_map("Transcript text", mock_llm)
    assert "mindmap" in result
    assert "Topic" in result
    assert "Subtopic" in result

def test_mindmap_extraction_from_markdown():
    mock_llm = MagicMock()
    mock_response = MagicMock()
    mock_response.content = "Here is your mindmap: \n```mermaid\nmindmap\n  root((Main))\n```"
    mock_llm.invoke.return_value = mock_response
    
    result = MindMapService.generate_mind_map("Transcript text", mock_llm)
    assert "mindmap" in result
    assert "Main" in result
    assert "Here is your mindmap" not in result

@pytest.mark.asyncio
async def test_recommendations_parallel_search():
    mock_rag = MagicMock()
    mock_llm_response = MagicMock()
    mock_llm_response.content = "Query 1\nQuery 2\nQuery 3"
    mock_rag.llm.invoke.return_value = mock_llm_response
    
    mock_executor = MagicMock()
    
    # Mock VideosSearch
    with patch('recommendation.VideosSearch') as mock_search:
        mock_search_instance = MagicMock()
        mock_search_instance.result.return_value = {
            "result": [{"title": "Video 1", "link": "link1", "thumbnails": [{"url": "thumb1"}], "channel": {"name": "Chan1"}}]
        }
        mock_search.return_value = mock_search_instance
        
        # We need a real loop for run_in_executor to be called or mock it properly
        # Since get_recommendations uses run_in_executor, we can mock the loop
        with patch('asyncio.get_event_loop') as mock_loop:
            mock_loop_instance = MagicMock()
            # In Python 3.8+, run_in_executor returns a future
            future = asyncio.Future()
            future.set_result([{"title": "Video 1", "link": "link1", "thumbnails": [{"url": "thumb1"}], "channel": {"name": "Chan1"}}])
            mock_loop_instance.run_in_executor.return_value = future
            mock_loop.return_value = mock_loop_instance
            
            recs = await get_recommendations("Transcript", "Summary", mock_rag, mock_executor)
            
            assert len(recs) > 0
            assert recs[0]["title"] == "Video 1"
            assert mock_rag.llm.invoke.called
