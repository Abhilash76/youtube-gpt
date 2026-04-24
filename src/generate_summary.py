import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from langchain_community.chat_models.ollama import ChatOllama

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

class Summarize:

    def summarize_topic(transcript_text: str) -> str:
        """Summarize a YouTube transcript using the KimiK2 thinking model (Ollama)."""
        headers = {}

        llm = ChatOllama(
            model="kimi-k2-thinking:cloud",
            base_url=OLLAMA_BASE_URL,
            headers=headers,
        )

        prompt = f"""
You are an expert summarizer. People pay you to summarize their texts.
Given the following transcript from a YouTube video, identify the main topic or title of discussion.
Therefore, without wasting people's money, summarize the transcript of the youtube video in at most 400 words.

Transcript:
{transcript_text[:4000]}  # limit text for efficiency
        """.strip()

        response = llm.invoke(prompt)
        return response.content.strip()
