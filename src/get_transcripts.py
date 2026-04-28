import re
import os
import json
from youtube_transcript_api import YouTubeTranscriptApi
import traceback

class gettranscripts:

    @staticmethod
    def extract_video_id(url: str) -> str:
        """Extract the video ID from a YouTube URL."""
        match = re.search(r"(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})", url)
        if not match:
            raise ValueError("Invalid YouTube URL.")
        return match.group(1)

    @staticmethod
    def get_transcript(video_id: str):
        """Fetch transcript with timestamps from YouTube, with Proxy Rotation support."""
        url = f"https://www.youtube.com/watch?v={video_id}"
        
        # 1. Setup Cookies
        cookies_path = "cookies.txt"
        if not os.path.exists(cookies_path):
            cookies_path = os.path.join(os.getcwd(), "cookies.txt")
        
        # 2. Setup Proxy Rotation
        proxy_list = []
        if os.path.exists("proxies.txt"):
            with open("proxies.txt", "r") as f:
                proxy_list = [line.strip() for line in f if line.strip()]
        
        # Add the environment variable proxy if it exists
        env_proxy = os.getenv("YOUTUBE_PROXY")
        if env_proxy:
            proxy_list.append(env_proxy)

        import random
        
        attempts = 3
        last_error = None

        for attempt in range(attempts):
            current_proxy = random.choice(proxy_list) if proxy_list else None
            proxies = {"http": current_proxy, "https": current_proxy} if current_proxy else None
            
            print(f"Attempt {attempt + 1}/{attempts} for {video_id}...")
            if current_proxy:
                print(f"Using proxy: {current_proxy}")

            # Try youtube-transcript-api
            try:
                # Use the functional-style call which is more reliable across versions
                # Note: We avoid the direct .get_transcript call which caused AttributeError
                from youtube_transcript_api import YouTubeTranscriptApi
                
                # In newer versions, we can pass proxies to the constructor
                api = YouTubeTranscriptApi()
                # Some versions support proxies here, some don't. We try our best.
                transcript_list = api.list_transcripts(video_id, proxies=proxies, cookies=cookies_path if os.path.exists(cookies_path) else None)
                transcript = transcript_list.find_transcript(["en-GB", "en-US", "en", "de", "nl"])
                return transcript.fetch()
            except Exception as e:
                print(f"youtube-transcript-api attempt failed: {e}")
                last_error = e
                
                # Try yt-dlp fallback for this specific proxy
                try:
                    print("Trying yt-dlp fallback for this proxy...")
                    import yt_dlp
                    ydl_opts = {
                        'skip_download': True,
                        'writeautosubs': True,
                        'subtitleslangs': ['en.*'],
                        'quiet': True,
                        'user_agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                    }
                    if os.path.exists(cookies_path):
                        ydl_opts['cookiefile'] = cookies_path
                    if current_proxy:
                        ydl_opts['proxy'] = current_proxy

                    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                        ydl.extract_info(url, download=False)
                        # Extraction successful, but we need the text. 
                        # yt-dlp is best for bypassing blocks, but complex for text extraction.
                        # If we reach here, the proxy works!
                        pass
                except Exception as e2:
                    print(f"yt-dlp fallback with proxy failed: {e2}")

        # If all attempts fail, raise the last error
        raise last_error if last_error else Exception("Transcript retrieval failed after multiple proxy attempts.")

    @staticmethod
    def format_transcript(transcript):
        """Format transcript text with readable timestamps, supporting both dict and object formats."""
        if not transcript:
            return ""
            
        formatted = []
        for t in transcript:
            # Handle both dict and object formats safely
            if isinstance(t, dict):
                text = t.get('text', '')
                start = t.get('start', 0)
            else:
                text = getattr(t, 'text', '')
                start = getattr(t, 'start', 0)
            
            minutes = int(start // 60)
            seconds = int(start % 60)
            time_str = f"{minutes:02d}:{seconds:02d}"
            formatted.append(f"[{time_str}] {text}")
        return "\n".join(formatted)

    @staticmethod
    def save_transcript(title: str, transcript_text: str, output_file="transcript.txt"):
        """Save title and transcript"""
        os.makedirs("transcripts", exist_ok=True)
        output_path = os.path.join("transcripts", output_file)
        with open(output_path, "w", encoding="utf-8") as f:
            f.write(f"{title}\n\nTranscript with Timestamps\n\n{transcript_text}")
        print(f"Transcript saved to {output_path}")

