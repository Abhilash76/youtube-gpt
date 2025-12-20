"""
FAISS Index Manager - Handles creation, storage, and loading of FAISS indexes
for video transcripts.
"""

import os
import re
import numpy as np
import faiss
import pickle
from typing import List, Tuple
from sentence_transformers import SentenceTransformer

# Configuration
EMBEDDING_MODEL = "Qwen/Qwen3-Embedding-0.6B"
FAISS_INDEX_DIR = "faiss_indexes"

class FAISSManager:
    """Manages FAISS indexes for video transcripts."""
    
    def __init__(self):
        """Initialize the FAISS manager with embedding model."""
        self.encoder = SentenceTransformer(EMBEDDING_MODEL, trust_remote_code=True)
        os.makedirs(FAISS_INDEX_DIR, exist_ok=True)
    
    def clean_transcript(self, transcript_text: str) -> List[str]:
        """Remove timestamps and split into sentences."""
        # Remove timestamps like [01:22]
        cleaned = re.sub(r"\[\d{2}:\d{2}\]", "", transcript_text)
        # Basic sentence splitting
        sentences = [s.strip() for s in re.split(r'(?<=[.!?]) +', cleaned) if len(s) > 5]
        return sentences
    
    def chunk_transcript(self, sentences: List[str]) -> List[str]:
        """Chunk sentences into meaningful chunks for embedding."""
        chunks = []
        temp_chunk = ""
        
        for s in sentences:
            if len(temp_chunk) + len(s) < 800:
                temp_chunk += " " + s if temp_chunk else s
            else:
                if temp_chunk:
                    chunks.append(temp_chunk.strip())
                temp_chunk = s
        
        if temp_chunk:
            chunks.append(temp_chunk.strip())
        
        return chunks if chunks else [" ".join(sentences)]
    
    def create_index(self, transcript_text: str, video_id: str) -> Tuple[faiss.Index, List[str]]:
        """
        Create FAISS index from transcript text.
        
        Args:
            transcript_text: The raw transcript text with timestamps
            video_id: Unique identifier for the video (used for storage)
        
        Returns:
            Tuple of (FAISS index, list of chunks)
        """
        # Clean and chunk the transcript
        sentences = self.clean_transcript(transcript_text)
        chunks = self.chunk_transcript(sentences)
        
        if not chunks:
            raise ValueError("No chunks created from transcript")
        
        # Generate embeddings
        chunk_embeddings = self.encoder.encode(chunks)
        dimension = chunk_embeddings.shape[1]
        
        # Create FAISS index
        index = faiss.IndexFlatL2(dimension)
        index.add(np.array(chunk_embeddings).astype('float32'))
        
        return index, chunks
    
    def save_index(self, index: faiss.Index, chunks: List[str], video_id: str):
        """
        Save FAISS index and chunks to disk.
        
        Args:
            index: The FAISS index to save
            chunks: List of text chunks corresponding to the index
            video_id: Unique identifier for the video
        """
        index_path = os.path.join(FAISS_INDEX_DIR, f"{video_id}.index")
        chunks_path = os.path.join(FAISS_INDEX_DIR, f"{video_id}_chunks.pkl")
        
        # Save FAISS index
        faiss.write_index(index, index_path)
        
        # Save chunks
        with open(chunks_path, 'wb') as f:
            pickle.dump(chunks, f)
    
    def load_index(self, video_id: str) -> Tuple[faiss.Index, List[str]]:
        """
        Load FAISS index and chunks from disk.
        
        Args:
            video_id: Unique identifier for the video
        
        Returns:
            Tuple of (FAISS index, list of chunks)
        """
        index_path = os.path.join(FAISS_INDEX_DIR, f"{video_id}.index")
        chunks_path = os.path.join(FAISS_INDEX_DIR, f"{video_id}_chunks.pkl")
        
        if not os.path.exists(index_path) or not os.path.exists(chunks_path):
            raise FileNotFoundError(f"Index not found for video_id: {video_id}")
        
        # Load FAISS index
        index = faiss.read_index(index_path)
        
        # Load chunks
        with open(chunks_path, 'rb') as f:
            chunks = pickle.load(f)
        
        return index, chunks
    
    def search(self, index: faiss.Index, chunks: List[str], query: str, k: int = 3) -> List[str]:
        """
        Search the FAISS index for relevant chunks.
        
        Args:
            index: The FAISS index to search
            chunks: List of text chunks
            query: Search query
            k: Number of results to return
        
        Returns:
            List of relevant chunk texts
        """
        query_vec = self.encoder.encode([query])
        _, indices = index.search(np.array(query_vec).astype('float32'), k)
        
        # Return the top k chunks
        results = [chunks[i] for i in indices[0] if i < len(chunks)]
        return results
    
    def index_exists(self, video_id: str) -> bool:
        """Check if an index exists for the given video_id."""
        index_path = os.path.join(FAISS_INDEX_DIR, f"{video_id}.index")
        chunks_path = os.path.join(FAISS_INDEX_DIR, f"{video_id}_chunks.pkl")
        return os.path.exists(index_path) and os.path.exists(chunks_path)

