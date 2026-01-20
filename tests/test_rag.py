import pytest
from unittest.mock import MagicMock, patch
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'src'))

from src.rag.rag_workflow import TranscriptRAG

@pytest.fixture
def mock_rag():
    with patch('rag.rag_workflow.Pinecone'), \
         patch('rag.rag_workflow.OllamaEmbeddings'), \
         patch('rag.rag_workflow.ChatOllama'), \
         patch('rag.rag_workflow.cohere.Client'):
        rag = TranscriptRAG()
        return rag

def test_sanitize_index_name(mock_rag):
    assert mock_rag._sanitize_index_name("Video ID 123!") == "video-id-123"

def test_clean_transcript(mock_rag):
    text = "[00:00] Hello world. [00:05] This is a test."
    sentences = mock_rag._clean_transcript(text)
    assert len(sentences) == 2
    assert "[00:00] Hello world." in sentences

@patch('rag.rag_workflow.ChatPromptTemplate.from_template')
def test_decide_chunking_strategy(mock_prompt, mock_rag):
    mock_chain = MagicMock()
    mock_chain.invoke.return_value.content = "semantic"
    mock_prompt.return_value.__or__.return_value = mock_chain
    
    strategy = mock_rag._decide_chunking_strategy("Some transcript text")
    assert strategy == "semantic"

@patch('rag.rag_workflow.PineconeVectorStore')
def test_ingest_transcript(mock_vectorstore, mock_rag):
    mock_rag.embed_model.embed_documents.return_value = [[0.1]*768]
    mock_rag.ingest_transcript("Some text", "video_id", strategy="recursive")
    assert mock_vectorstore.called

@patch('rag.rag_workflow.PineconeVectorStore.from_existing_index')
def test_query_transcript(mock_vectorstore_existing, mock_rag):
    mock_retriever = MagicMock()
    mock_retriever.invoke.return_value = [MagicMock(page_content="Context text")]
    mock_vectorstore_existing.return_value.as_retriever.return_value = mock_retriever
    
    # Mock the LLM chain for query_transcript
    mock_chain = MagicMock()
    mock_chain.invoke.return_value.content = "The answer."
    
    with patch('rag.rag_workflow.ChatPromptTemplate.from_template') as mock_prompt:
        mock_prompt.return_value.__or__.return_value = mock_chain
        answer = mock_rag.query_transcript("video_id", "What is the answer?", use_reranker=False)
        assert answer == "The answer."
