import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

from langchain_community.chat_models.ollama import ChatOllama


class Summarize:

    def summarize_topic(transcript_text: str) -> str:
        """Summarize a YouTube transcript using the KimiK2 thinking model (Ollama)."""
        headers = {}
        if os.getenv('OLLAMA_API_KEY'):
            headers['Authorization'] = 'Bearer ' + os.getenv('OLLAMA_API_KEY')

        llm = ChatOllama(
            model="gemma4:31b-cloud",
            base_url="https://ollama.com",
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
