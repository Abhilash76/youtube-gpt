import os
import time
import re
import json
import hashlib
import logging
from typing import Any, Literal, Optional

import numpy as np
import cohere
import torch

from dotenv import load_dotenv
from langchain_text_splitters.character import RecursiveCharacterTextSplitter
from langchain_community.embeddings.ollama import OllamaEmbeddings
from langchain_community.chat_models.ollama import ChatOllama
from langchain_pinecone import PineconeVectorStore
from langchain_core.embeddings import Embeddings
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.documents import Document

from pinecone import Pinecone, ServerlessSpec
from transformers import AutoModel, AutoTokenizer, BitsAndBytesConfig

try:
    from neo4j import GraphDatabase
except Exception:
    GraphDatabase = None

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
LOG = logging.getLogger(__name__)

load_dotenv()


class NomicLocalEmbeddings(Embeddings):
    """
    Embeddings using a local/quantized HuggingFace Nomic embedding model.

    The model is loaded with 4-bit (QLoRA-style) quantization via bitsandbytes
    when possible, and runs with the task-specific instruction prefix:
    - search_document: for RAG document embeddings
    - search_query: for query embeddings
    """

    def __init__(self, model: Any, tokenizer: Any):
        self.model = model
        self.tokenizer = tokenizer

    def _embed(self, texts: list[str], task: str) -> list[list[float]]:
        prefix = task + ": "
        inputs = self.tokenizer(
            [prefix + t for t in texts],
            padding=True,
            truncation=True,
            return_tensors="pt",
        ).to(self.model.device)

        with torch.no_grad():
            outputs = self.model(**inputs)
            embeddings = outputs.last_hidden_state.mean(dim=1)
            embeddings = torch.nn.functional.normalize(embeddings, p=2, dim=1)

        return embeddings.cpu().tolist()

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return self._embed(texts, task="search_document")

    def embed_query(self, text: str) -> list[float]:
        return self._embed([text], task="search_query")[0]


class TranscriptRAG:
    def __init__(self):
        # Configuration
        self.pinecone_api_key = os.getenv("PINECONE_API_KEY")
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL")
        self.ollama_api_key = os.getenv("OLLAMA_API_KEY")  # Optional, can be None
        self.cohere_api_key = os.getenv("COHERE_API_KEY")  # Added Cohere Key
        
        # 2. Handle OLLAMA_BASE_URL dynamically
        # Default to host.docker.internal if not provided, which works with the new docker-compose
        self.ollama_base_url = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")
        
        LOG.info(f"Connecting to Ollama at: {self.ollama_base_url}")
        
        # Validate required environment variables
        if not self.ollama_base_url:
            raise ValueError("OLLAMA_BASE_URL environment variable is required")
        
        # Setup headers for Ollama
        self.request_headers = {}
        if self.ollama_api_key:
            self.request_headers["Authorization"] = f"Bearer {self.ollama_api_key}"

        # Embeddings: prefer your local quantized Nomic model; fallback to Ollama.
        # This keeps the app booting even if Pinecone is not configured (GraphRAG can still work).
        self.nomic_model_path = os.getenv("NOMIC_EMBED_MODEL_PATH")

        self.embed_model: Embeddings
        if self.nomic_model_path:
            try:
                bnb_config = BitsAndBytesConfig(
                    load_in_4bit=True,
                    bnb_4bit_compute_dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float16,
                    bnb_4bit_use_double_quant=True,
                    bnb_4bit_quant_type="nf4",
                )
                LOG.info(f"Loading quantized Nomic embeddings from: {self.nomic_model_path}")
                tokenizer = AutoTokenizer.from_pretrained(self.nomic_model_path, trust_remote_code=True)
                model = AutoModel.from_pretrained(
                    self.nomic_model_path,
                    quantization_config=bnb_config,
                    torch_dtype=torch.bfloat16,
                    device_map="auto",
                    trust_remote_code=True,
                )
                self.embed_model = NomicLocalEmbeddings(model=model, tokenizer=tokenizer)
            except Exception as e:
                LOG.warning(f"Failed to load local quantized embeddings; falling back to Ollama. Error: {e}")
                self.embed_model = OllamaEmbeddings(
                    model="nomic-embed-text",
                    base_url=self.ollama_base_url,
                    headers=self.request_headers,
                )
        else:
            self.embed_model = OllamaEmbeddings(
                model="nomic-embed-text",
                base_url=self.ollama_base_url,
                headers=self.request_headers,
            )

        # Initialize Clients
        self.pinecone_enabled = bool(self.pinecone_api_key)
        self.pinecone_client: Optional[Pinecone] = None
        if self.pinecone_enabled:
            self.pinecone_client = Pinecone(api_key=self.pinecone_api_key)
        # Note: PineconeVectorStore instances are created on-demand with specific index names

        # GraphRAG: optional Neo4j connection
        self.neo4j_uri = os.getenv("NEO4J_URI")
        self.neo4j_username = os.getenv("NEO4J_USERNAME")
        self.neo4j_password = os.getenv("NEO4J_PASSWORD")
        self.neo4j_database = os.getenv("NEO4J_DATABASE", "neo4j")
        self.neo4j_driver = None
        self.graph_enabled = False

        if GraphDatabase and self.neo4j_uri and self.neo4j_username and self.neo4j_password:
            try:
                self.neo4j_driver = GraphDatabase.driver(
                    self.neo4j_uri,
                    auth=(self.neo4j_username, self.neo4j_password),
                )
                self.graph_enabled = True
                LOG.info(f"GraphRAG enabled (Neo4j): {self.neo4j_uri}")
            except Exception as e:
                LOG.warning(f"GraphRAG disabled; Neo4j connection failed: {e}")
                self.neo4j_driver = None
                self.graph_enabled = False
        
        # Initialize Cohere for Reranking
        if self.cohere_api_key:
            self.cohere_client = cohere.Client(self.cohere_api_key)
        else:
            LOG.warning("COHERE_API_KEY not found. Reranking will be disabled.")
            self.cohere_client = None
        self.llm = ChatOllama(
            model="gemma4:31b-cloud", 
            base_url=self.ollama_base_url, 
            headers=self.request_headers
        )

    def _sanitize_index_name(self, name: str) -> str:
        return "".join(c if c.isalnum() else "-" for c in name).lower().strip("-")

    def _clean_transcript(self, text: str) -> list[str]:
        """
        Splits into clean sentences while PRESERVING timestamps.
        """
        # Split into sentences but keep the [MM:SS] markers
        sentences = [
            s.strip()
            for s in re.split(r"(?<=[.!?])\s+", text)
            if len(s.strip()) > 5
        ]
        return sentences

    def _decide_chunking_strategy(self, transcript_text: str) -> Literal["recursive", "semantic"]:
        """
        Uses the LLM to decide which chunking strategy to use.
        """
        LOG.info("Deciding chunking strategy...")
        sample = transcript_text[:2000]  # Analyze first 2000 chars
        
        prompt = ChatPromptTemplate.from_template("""
            Analyze the following transcript snippet and decide if it should be chunked using a 'recursive' or 'semantic' strategy.
            - Use 'semantic' for structured content, tutorials, or lectures where logical flow is key.
            - Use 'recursive' for casual conversations, interviews, or unstructured dialogue.
            
            Transcript sample:
            {sample}
            
            Return ONLY the word 'semantic' or 'recursive'.
        """)
        
        chain = prompt | self.llm
        try:
            decision = chain.invoke({"sample": sample}).content.strip().lower()
            if "semantic" in decision:
                return "semantic"
            return "recursive"
        except Exception as e:
            LOG.warning(f"Failed to decide strategy agentically: {e}. Falling back to recursive.")
            return "recursive"

    def _semantic_chunking(self, sentences: list[str], threshold: float = 0.7) -> list[str]:
        """
        Groups sentences based on semantic similarity.
        Mimics 'semantic_chunking_node' from workflow using existing Ollama embeddings.
        """
        LOG.info("Performing Semantic Chunking...")
        # Get embeddings for all sentences (batched to avoid context limits)
        embeddings = []
        batch_size = 20  # Process 20 sentences at a time
        for i in range(0, len(sentences), batch_size):
            batch = sentences[i:i + batch_size]
            try:
                batch_embeddings = self.embed_model.embed_documents(batch)
                embeddings.extend(batch_embeddings)
            except Exception as e:
                LOG.error(f"Error embedding batch {i//batch_size}: {e}")
                # Fallback: try one by one or skip? For now, re-raise to fail fast
                raise e
        
        chunks = []
        if not sentences:
            return chunks
            
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

    # ----------------------------
    # GraphRAG (Neo4j) helpers
    # ----------------------------
    def _neo4j_sha_id(self, value: str) -> str:
        return hashlib.sha256(value.encode("utf-8")).hexdigest()

    def _graph_ensure_schema(self) -> None:
        if not self.graph_enabled or not self.neo4j_driver:
            return
        if getattr(self, "_graph_schema_initialized", False):
            return

        # Best-effort schema: failure shouldn't block app boot.
        cypher = [
            "CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE",
            "CREATE CONSTRAINT chunk_id IF NOT EXISTS FOR (c:Chunk) REQUIRE c.id IS UNIQUE",
            "CREATE CONSTRAINT transcript_id IF NOT EXISTS FOR (t:Transcript) REQUIRE t.id IS UNIQUE",
            "CREATE INDEX chunk_transcript_id IF NOT EXISTS FOR (c:Chunk) ON (c.transcript_id)",
            "CREATE INDEX entity_name_lower IF NOT EXISTS FOR (e:Entity) ON (e.name_lower)",
        ]
        try:
            with self.neo4j_driver.session(database=self.neo4j_database) as session:
                for q in cypher:
                    try:
                        session.run(q).consume()
                    except Exception:
                        # Some Neo4j versions reject IF NOT EXISTS forms; ignore.
                        continue
            self._graph_schema_initialized = True
        except Exception as e:
            LOG.warning(f"Graph schema initialization failed (continuing): {e}")

    def _graph_extract_entities(self, text: str, max_entities: int = 10) -> list[dict]:
        """
        Extract entities for graph construction/search.

        Returns: [{"name": "...", "type": "..."}]
        """
        prompt = ChatPromptTemplate.from_template(
            """
You are building a knowledge graph for GraphRAG.
Extract up to {max_entities} distinct entities from the text.
Return ONLY valid JSON in the following format:
{
  "entities": [{"name": "string", "type": "CONCEPT|PERSON|ORG|LOCATION|TOOL|SYSTEM|OTHER"}]
}

TEXT:
{text}
""".strip()
        )

        chain = prompt | self.llm
        try:
            msg = chain.invoke({"max_entities": max_entities, "text": text}).content
            # Robust JSON extraction in case the model wraps the JSON.
            m = re.search(r"\{.*\}", msg, flags=re.DOTALL)
            if not m:
                return []
            payload = json.loads(m.group(0))
            entities = payload.get("entities", [])
            if not isinstance(entities, list):
                return []

            cleaned = []
            for ent in entities:
                if not isinstance(ent, dict):
                    continue
                name = str(ent.get("name", "")).strip()
                typ = str(ent.get("type", "OTHER")).strip().upper()
                if not name:
                    continue
                if typ not in {"CONCEPT", "PERSON", "ORG", "LOCATION", "TOOL", "SYSTEM", "OTHER"}:
                    typ = "OTHER"
                cleaned.append({"name": name, "type": typ})
            return cleaned
        except Exception as e:
            LOG.warning(f"Entity extraction failed (continuing): {e}")
            return []

    def _graph_upsert_chunks(self, transcript_id: str, chunks: list[Document]) -> None:
        if not self.graph_enabled or not self.neo4j_driver:
            return

        self._graph_ensure_schema()

        with self.neo4j_driver.session(database=self.neo4j_database) as session:
            # Ensure transcript node exists.
            session.run(
                "MERGE (t:Transcript {id: $transcript_id})",
                transcript_id=transcript_id,
            ).consume()

            for i, chunk in enumerate(chunks):
                chunk_text = chunk.page_content
                chunk_id = f"{transcript_id}:{i}"

                entities = self._graph_extract_entities(chunk_text, max_entities=10)
                entity_payload = []
                for ent in entities:
                    name = ent["name"]
                    typ = ent["type"]
                    name_lower = name.lower()
                    entity_payload.append(
                        {
                            "id": self._neo4j_sha_id(f"{name_lower}:{typ}"),
                            "name": name,
                            "name_lower": name_lower,
                            "type": typ,
                        }
                    )

                session.run(
                    """
                    MERGE (t:Transcript {id: $transcript_id})
                    MERGE (c:Chunk {id: $chunk_id})
                    SET c.text = $chunk_text,
                        c.transcript_id = $transcript_id
                    MERGE (t)-[:HAS_CHUNK]->(c)
                    WITH c
                    UNWIND $entities AS ent
                    MERGE (e:Entity {id: ent.id})
                    SET e.name = ent.name,
                        e.name_lower = ent.name_lower,
                        e.type = ent.type
                    MERGE (c)-[:MENTIONS]->(e)
                    """,
                    transcript_id=transcript_id,
                    chunk_id=chunk_id,
                    chunk_text=chunk_text,
                    entities=entity_payload,
                ).consume()

    def _graph_retrieve_chunks(
        self,
        transcript_id: str,
        query: str,
        top_k: int = 5,
        candidate_multiplier: int = 4,
    ) -> list[Document]:
        if not self.graph_enabled or not self.neo4j_driver:
            return []

        entities = self._graph_extract_entities(query, max_entities=8)
        if not entities:
            return []

        entity_names_lower = [e["name"].lower() for e in entities if e.get("name")]
        if not entity_names_lower:
            return []

        candidate_limit = max(25, top_k * candidate_multiplier)
        with self.neo4j_driver.session(database=self.neo4j_database) as session:
            rows = session.run(
                """
                MATCH (t:Transcript {id: $transcript_id})-[:HAS_CHUNK]->(c:Chunk)<-[:MENTIONS]-(e:Entity)
                WHERE e.name_lower IN $entity_names_lower
                RETURN DISTINCT c.text AS text
                LIMIT $candidate_limit
                """,
                transcript_id=transcript_id,
                entity_names_lower=entity_names_lower,
                candidate_limit=candidate_limit,
            )
            candidate_texts = [r["text"] for r in rows if r.get("text")]

        if not candidate_texts:
            return []

        # Rerank candidate chunks using embedding similarity (cosine).
        query_emb = np.array(self.embed_model.embed_query(query), dtype=np.float32)
        doc_embs = self.embed_model.embed_documents(candidate_texts)
        doc_embs_np = np.array(doc_embs, dtype=np.float32)

        # Compute cosine similarity for normalized vectors.
        doc_norms = np.linalg.norm(doc_embs_np, axis=1, keepdims=True) + 1e-12
        query_norm = np.linalg.norm(query_emb) + 1e-12
        sims = (doc_embs_np @ query_emb) / (doc_norms.squeeze() * query_norm)

        top_idx = np.argsort(-sims)[:top_k]
        top_texts = [candidate_texts[i] for i in top_idx]

        return [Document(page_content=t, metadata={"source": transcript_id}) for t in top_texts]

    def create_transcript_index(self, transcript_id: str):
        """Creates a dedicated Pinecone index."""
        index_name = self._sanitize_index_name(f"transcript-{transcript_id}")
        if not self.pinecone_enabled or not self.pinecone_client:
            LOG.warning("Pinecone not configured; skipping index creation.")
            return index_name
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
                         strategy: Literal["recursive", "semantic", "agentic"] = "recursive"):
        """
        Ingests transcript with selectable strategy (Default: Recursive).
        """
        
        index_name = self._sanitize_index_name(f"transcript-{transcript_id}")

        # 1. Clean Text (Preserving timestamps)
        sentences = self._clean_transcript(transcript_text)
        cleaned_text = " ".join(sentences)
        
        # 2. Decide Strategy if Agentic
        if strategy == "agentic":
            strategy = self._decide_chunking_strategy(transcript_text)
            LOG.info(f"Agentic decision: Using '{strategy}' strategy.")

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

        # 2. Upsert documents to Pinecone (optional)
        if self.pinecone_enabled:
            # Create vectorstore with the specific index and add documents
            vectorstore = PineconeVectorStore(
                embedding=self.embed_model,
                index_name=index_name,
                pinecone_api_key=self.pinecone_api_key,
            )
            vectorstore.add_documents(documents=chunks)

        # 3. Graph ingestion for GraphRAG (optional)
        if self.graph_enabled:
            self._graph_upsert_chunks(transcript_id=transcript_id, chunks=chunks)

    def query_transcript(self, transcript_id: str, query: str, use_reranker: bool = True, stream: bool = False) -> str:
        """
        Performs RAG with optional Cohere Reranking.
        """
        
        docs = []

        # 1) GraphRAG retrieval (Neo4j) if enabled
        top_k = 15 if use_reranker and self.cohere_client else 5
        if self.graph_enabled:
            docs = self._graph_retrieve_chunks(transcript_id=transcript_id, query=query, top_k=top_k)

        # 2) Fallback to Pinecone retrieval if GraphRAG returns nothing
        if (not docs) and self.pinecone_enabled and self.pinecone_client:
            index_name = self._sanitize_index_name(f"transcript-{transcript_id}")

            # Check if it exists; if not, create it
            if index_name not in [idx.name for idx in self.pinecone_client.list_indexes()]:
                self.pinecone_client.create_index(
                    name=index_name,
                    dimension=768,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1"),
                )

            vectorstore = PineconeVectorStore.from_existing_index(
                index_name=index_name,
                embedding=self.embed_model,
            )

            retriever = vectorstore.as_retriever(search_kwargs={"k": top_k})
            docs = retriever.invoke(query)
        
        if not docs:
            LOG.warning("No documents retrieved from Pinecone.")
            # Return a generator that yields the default message if streaming
            if stream:
                def empty_gen():
                    yield "I couldn't find any relevant information in the transcript to answer your question."
                return empty_gen()
            return "I couldn't find any relevant information in the transcript to answer your question."
        
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
            Answer the question based ONLY on the context below.
            The context contains timestamps in [MM:SS] format. 
            If the user asks about a specific time or "when" something happened, use these timestamps to provide an accurate answer.
            
            <context>
            {context}
            </context>
            
            Question: {input}
            
            Answer (be concise and reference timestamps if relevant):
        """)
        
        chain = prompt | self.llm
        
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