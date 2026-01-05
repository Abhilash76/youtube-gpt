import streamlit as st
from get_transcripts import gettranscripts
import httpx
from youtubesearchpython.core.requests import RequestCore
from youtubesearchpython.core.constants import userAgent

# Monkey patch to fix httpx compatibility issue with youtube-search-python
def patch_youtube_search_httpx():
    def fixed_sync_post(self):
        if self.proxy:
            with httpx.Client(proxies=self.proxy) as client:
                return client.post(self.url, headers={"User-Agent": userAgent}, json=self.data, timeout=self.timeout)
        else:
            return httpx.post(self.url, headers={"User-Agent": userAgent}, json=self.data, timeout=self.timeout)
    
    def fixed_sync_get(self):
        if self.proxy:
            with httpx.Client(proxies=self.proxy) as client:
                return client.get(self.url, headers={"User-Agent": userAgent}, timeout=self.timeout, cookies={'CONSENT': 'YES+1'})
        else:
            return httpx.get(self.url, headers={"User-Agent": userAgent}, timeout=self.timeout, cookies={'CONSENT': 'YES+1'})
    
    RequestCore.syncPostRequest = fixed_sync_post
    RequestCore.syncGetRequest = fixed_sync_get

try:
    patch_youtube_search_httpx()
except Exception as e:
    print(f"Warning: Could not patch youtube-search-python: {e}")

from youtubesearchpython import VideosSearch
from generate_summary import Summarize


# ---------- STREAMLIT PAGE SETUP ----------
st.set_page_config(
    page_title="Learn with YouTube AI Tutor",
    page_icon="🎓",
    layout="centered"
)

st.title("🎓 YouTube Learning Assistant")

# ---------- STEP 1: ASK USER FOR TOPIC ----------
topic = st.text_input("What would you like to learn about today?", placeholder="e.g., autoregressive models, reinforcement learning, quantum computing...")

if topic:
    st.write(f"🔍 Searching YouTube for: **{topic}** ...")

    # ---------- STEP 2: SEARCH YOUTUBE ----------
    if "results" not in st.session_state:
        search = VideosSearch(topic, limit=5)
        st.session_state.results = search.result()["result"]

    results = st.session_state.results
    choice = st.radio(
        label="Choose a video:", 
        options=[result['title'] for result in results],
        index=None
    )

    if not choice:
        st.error("Select a video to proceed")
    else:
        video = next(result for result in results if result['title'] == choice)
        video_title = video["title"]
        video_url = video["link"]

        st.subheader(f"Top result: {video_title}")
        st.video(video_url)

        # Store the URL as a variable
        youtube_url = video_url

        # ---------- STEP 3: GENERATE TRANSCRIPT ----------
        if st.button("Generate Transcript"):
            with st.spinner("Fetching and analyzing transcript..."):
                try:
                    video_id = gettranscripts.extract_video_id(youtube_url)
                    transcript = gettranscripts.get_transcript(video_id)
                    transcript_text = gettranscripts.format_transcript(transcript)
                    title = video_title

                    file_path = f"{title.replace(' ', '_').replace('?', '').replace('|', '')}.txt"
                    gettranscripts.save_transcript(title, transcript_text, file_path)

                    st.success(f"Transcript and analysis saved to `{file_path}`")
                    st.session_state["transcript_text"] = transcript_text
                    st.session_state["title"] = title

                except Exception as e:
                    st.error(f"Error generating transcript: {e}")

# ---------- STEP 4: INTERACTIVE OPTIONS ----------
if "transcript_text" in st.session_state:
    st.markdown("---")
    st.subheader("What would you like to do next?")

    choice = st.radio(
        "Choose an action:",
        [
            "Summarize the video",
            "Generate MCQs for practice",
            "Ask about a specific topic in the video"
        ],
        index=None
    )

    if choice == "Summarize the video":
        st.spinner("Generating summary...")
        summary = Summarize.summarize_topic(st.session_state["transcript_text"])
        st.markdown(summary)
        