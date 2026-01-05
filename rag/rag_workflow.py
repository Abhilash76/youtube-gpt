import os
import time
import re
import logging
import numpy as np
import cohere
from typing import Literal

from dotenv import load_dotenv
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.embeddings.ollama import OllamaEmbeddings
from langchain_community.chat_models.ollama import ChatOllama
from langchain_pinecone import PineconeVectorStore
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document

from pinecone import Pinecone, ServerlessSpec

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
LOG = logging.getLogger(__name__)

load_dotenv()

class TranscriptRAG:
    def __init__(self):
        # Configuration
        self.pinecone_api_key = os.getenv("PINECONE_API_KEY")
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL")
        self.ollama_api_key = os.getenv("OLLAMA_API_KEY")  # Optional, can be None
        self.cohere_api_key = os.getenv("COHERE_API_KEY")  # Added Cohere Key
        
        # Validate required environment variables
        if not self.pinecone_api_key:
            raise ValueError("PINECONE_API_KEY environment variable is required")
        if not self.ollama_base_url:
            raise ValueError("OLLAMA_BASE_URL environment variable is required")
        
        # Setup headers for Ollama
        self.request_headers = {}
        if self.ollama_api_key:
            self.request_headers["Authorization"] = f"Bearer {self.ollama_api_key}"

        # Initialize Models first (needed for PineconeVectorStore)
        # Using nomic-embed-text as it's a reliable embedding model (768 dimensions)
        # Alternative: "all-minilm" (384 dims), "mxbai-embed-large" (1024 dims)
        self.embed_model = OllamaEmbeddings(
            model="nomic-embed-text", 
            base_url=self.ollama_base_url,
            headers=self.request_headers
        )
        
        # Initialize Clients
        # Pinecone client for index management
        self.pinecone_client = Pinecone(api_key=self.pinecone_api_key)
        # Note: PineconeVectorStore instances are created on-demand with specific index names
        
        # Initialize Cohere for Reranking
        if self.cohere_api_key:
            self.cohere_client = cohere.Client(self.cohere_api_key)
        else:
            LOG.warning("COHERE_API_KEY not found. Reranking will be disabled.")
            self.cohere_client = None
        self.llm = ChatOllama(
            model="kimi-k2-thinking:cloud", 
            base_url=self.ollama_base_url, 
            headers=self.request_headers
        )

    def _sanitize_index_name(self, name: str) -> str:
        return "".join(c if c.isalnum() else "-" for c in name).lower().strip("-")

    def _clean_transcript(self, text: str) -> list[str]:
        """
        Removes timestamps and splits into clean sentences.
        Ported from Agentic Workflow.
        """
        # Remove timestamps like [00:00]
        text = re.sub(r"\[\d{2}:\d{2}\]", "", text)
        # Split into sentences
        sentences = [
            s.strip()
            for s in re.split(r"(?<=[.!?])\s+", text)
            if len(s.strip()) > 5
        ]
        return sentences

    def _semantic_chunking(self, sentences: list[str], threshold: float = 0.7) -> list[str]:
        """
        Groups sentences based on semantic similarity.
        Mimics 'semantic_chunking_node' from workflow using existing Ollama embeddings.
        """
        LOG.info("Performing Semantic Chunking...")
        # Get embeddings for all sentences at once
        embeddings = self.embed_model.embed_documents(sentences)
        
        chunks = []
        current_chunk = [sentences[0]]
        current_emb = embeddings[0]

        for i in range(1, len(sentences)):
            sim = np.dot(embeddings[i], embeddings[i-1]) / (
                np.linalg.norm(embeddings[i]) * np.linalg.norm(embeddings[i-1])
            )
            
            if sim < threshold:
                chunks.append(" ".join(current_chunk))
                current_chunk = []
            
            current_chunk.append(sentences[i])

        if current_chunk:
            chunks.append(" ".join(current_chunk))
            
        return chunks

    def create_transcript_index(self, transcript_id: str):
        """Creates a dedicated Pinecone index."""
        index_name = self._sanitize_index_name(f"transcript-{transcript_id}")
        existing_indexes = [i.name for i in self.pinecone_client.list_indexes()]
        
        if index_name not in existing_indexes:            
            LOG.info(f"Creating new index: {index_name}")
            try:
                self.pinecone_client.create_index(
                    name=index_name,
                    dimension=768, # nomic-embed-text dimension (change if using different embedding model)
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1") 
                )
                # Wait for index to be ready (simple approach - wait and verify)
                max_wait = 60  # Maximum 60 seconds
                waited = 0
                while waited < max_wait:
                    try:
                        # Try to get the index - if it works, it's ready
                        index = self.pinecone_client.Index(index_name)
                        # Try a simple operation to verify it's ready
                        index.describe_index_stats()
                        LOG.info(f"Index {index_name} is ready")
                        break
                    except Exception:
                        time.sleep(2)
                        waited += 2
                if waited >= max_wait:
                    LOG.warning(f"Index {index_name} may not be ready yet, but proceeding...")
            except Exception as e:
                LOG.error(f"Failed to create index: {e}")
                raise
        return index_name

    def ingest_transcript(self, 
                         transcript_text: str, 
                         transcript_id: str, 
                         strategy: Literal["recursive", "semantic"] = "recursive"):
        """
        Ingests transcript with selectable strategy (Default: Recursive).
        """
        
        index_name = self._sanitize_index_name(f"transcript-{transcript_id}")

        # 1. Clean Text
        sentences = self._clean_transcript(transcript_text)
        cleaned_text = " ".join(sentences)
        
        chunks = []
        if strategy == "semantic":
            # Use the new semantic chunker
            chunk_texts = self._semantic_chunking(sentences)
            chunks = [Document(page_content=t, metadata={"source": transcript_id}) for t in chunk_texts]
        else:
            # Fallback to standard recursive
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            chunks = text_splitter.create_documents([cleaned_text], metadatas=[{"source": transcript_id}])

        LOG.info(f"Generated {len(chunks)} chunks using '{strategy}' strategy. Printing them below: ")

        for chunk in chunks:
            LOG.info(chunk)

        # 2. Upsert documents to Pinecone
        # Create vectorstore with the specific index and add documents
        vectorstore = PineconeVectorStore(
            embedding=self.embed_model,
            index_name=index_name,
            pinecone_api_key=self.pinecone_api_key
        )
        vectorstore.add_documents(documents=chunks)

    def query_transcript(self, transcript_id: str, query: str, use_reranker: bool = True, stream: bool = False) -> str:
        """
        Performs RAG with optional Cohere Reranking.
        """
        
        index_name = self._sanitize_index_name(f"transcript-{transcript_id}")

        # Check if it exists; if not, create it
        if index_name not in [idx.name for idx in self.pinecone_client.list_indexes()]:
            self.pinecone_client.create_index(
                name=index_name,
                dimension=768, 
                metric="cosine",
                spec=ServerlessSpec(cloud="aws", region="us-east-1")
            )
        
        vectorstore = PineconeVectorStore.from_existing_index(
            index_name=index_name,
            embedding=self.embed_model
        )
        
        # 1. Retrieve more candidates initially if reranking
        top_k = 15 if use_reranker and self.cohere_client else 5
        retriever = vectorstore.as_retriever(search_kwargs={"k": top_k})
        docs = retriever.invoke(query)
        
        # 2. Apply Cohere Reranking
        final_context = ""
        if use_reranker and self.cohere_client:
            LOG.info("Reranking retrieved documents...")
            doc_texts = [d.page_content for d in docs]
            results = self.cohere_client.rerank(
                model="rerank-english-v3.0",
                query=query,
                documents=doc_texts,
                top_n=5
            )
            # Reconstruct context from top reranked results
            final_context = "\n\n".join([doc_texts[r.index] for r in results.results])
        else:
            final_context = "\n\n".join([d.page_content for d in docs[:5]])

        # 3. Generate Answer
        prompt = ChatPromptTemplate.from_template("""
            Answer based ONLY on the context below:
            <context>
            {context}
            </context>
            Question: {input}
        """)
        
        chain = prompt | self.llm
        
        """response = chain.invoke({"input": query, "context": final_context})
        
        # Extract content from response (handles AIMessage objects)
        if hasattr(response, 'content'):
            return response.content
        elif isinstance(response, str):
            return response
        else:
            return str(response)"""

        input_data = {"input": query, "context": final_context}

        if stream:
            # Define a generator function to yield text chunks
            def generate():
                for chunk in chain.stream(input_data):
                    # LangChain chunks usually have a .content attribute
                    if hasattr(chunk, 'content'):
                        yield chunk.content
                    else:
                        yield str(chunk)
            
            return generate()  # Returns the generator object
        else:
            # Standard non-streaming behavior
            response = chain.invoke(input_data)
            if hasattr(response, 'content'):
                return response.content
            elif isinstance(response, str):
                return response
            else:
                return str(response)