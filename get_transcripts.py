import re
from youtube_transcript_api import YouTubeTranscriptApi
import os

class gettranscripts:

    def extract_video_id(url: str) -> str:
        """Extract the video ID from a YouTube URL."""
        match = re.search(r"(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})", url)
        if not match:
            raise ValueError("Invalid YouTube URL.")
        return match.group(1)

    def get_transcript(video_id: str):
        """Fetch transcript with timestamps from YouTube."""
        transcript = YouTubeTranscriptApi().list(video_id).find_transcript(["en-GB", "en-US", "en", "de", "nl"]).fetch(preserve_formatting=True)
        return transcript

    def format_transcript(transcript):
        """Format transcript text with readable timestamps."""
        formatted = []
        for t in transcript:
            print(t.text)
            minutes = int(t.start // 60)
            seconds = int(t.start % 60)
            print(minutes, seconds)
            time_str = f"{minutes:02d}:{seconds:02d}"
            formatted.append(f"[{time_str}] {t.text}")
        return "\n".join(formatted)

    def save_transcript(title: str, transcript_text: str, output_file="transcript.txt"):
        """Save title and transcript"""
        # Create the 'transcripts' folder if it doesn't exist
        os.makedirs("transcripts", exist_ok=True)

        # Build the full file path
        output_path = os.path.join("transcripts", output_file)

        with open(output_path, "w", encoding="utf-8") as f:
            f.write(f"{title}\n\n")
            f.write("Transcript with Timestamps\n\n")
            f.write(transcript_text)
        print(f"Transcript saved to {output_path}")

