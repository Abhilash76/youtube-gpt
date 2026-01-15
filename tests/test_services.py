import pytest
from unittest.mock import MagicMock, patch
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from get_transcripts import gettranscripts
from generate_summary import Summarize
from mcq_service import MCQService

def test_extract_video_id():
    url = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    assert gettranscripts.extract_video_id(url) == "dQw4w9WgXcQ"
    
    url_short = "https://youtu.be/dQw4w9WgXcQ"
    assert gettranscripts.extract_video_id(url_short) == "dQw4w9WgXcQ"

@patch('get_transcripts.YouTubeTranscriptApi')
def test_get_transcript(mock_api):
    mock_transcript = MagicMock()
    mock_transcript.fetch.return_value = [{'text': 'Hello', 'start': 0.0, 'duration': 1.0}]
    mock_api.return_value.list.return_value.find_transcript.return_value = mock_transcript
    
    transcript = gettranscripts.get_transcript("video_id")
    assert transcript == [{'text': 'Hello', 'start': 0.0, 'duration': 1.0}]

def test_format_transcript():
    # Create mock objects with .text and .start attributes
    item = MagicMock()
    item.text = "Hello"
    item.start = 0.0
    transcript = [item]
    
    formatted = gettranscripts.format_transcript(transcript)
    assert "[00:00] Hello" in formatted

@patch('generate_summary.client.chat.completions.create')
def test_summarize_topic(mock_create):
    mock_response = MagicMock()
    mock_response.choices[0].message.content = "This is a summary."
    mock_create.return_value = mock_response
    
    summary = Summarize.summarize_topic("Some transcript text")
    assert summary == "This is a summary."

@patch('mcq_service.hf_client.chat_completion')
def test_generate_mcqs(mock_chat):
    mock_response = MagicMock()
    mock_response.choices[0].message.content = '{"questions": [{"id": 1, "question": "What?", "options": ["A", "B"]}]}'
    mock_chat.return_value = mock_response
    
    mcqs = MCQService.generate_mcqs_from_text("Some text")
    assert "questions" in mcqs
    assert mcqs["questions"][0]["question"] == "What?"
