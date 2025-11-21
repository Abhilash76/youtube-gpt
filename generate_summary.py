import os
from groq import Groq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Initialize Groq client
client = Groq(api_key=GROQ_API_KEY)

class Summarize:

    def summarize_topic(transcript_text: str) -> str:
            """Ask the LLM to summarize the main topic/title."""
            prompt = f"""
            You are an expert summarizer. People pay you to summarize their texts.
            Given the following transcript from a YouTube video, identify the main topic or title of discussion.
            Therefore, without wasting people's money, summarize the transcript of the youtube video in atmost 400 words.

            Transcript:
            {transcript_text[:4000]}  # limit text for efficiency
            """
            response = client.chat.completions.create(
                model="groq/compound",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.4,
            )
            return response.choices[0].message.content.strip()
