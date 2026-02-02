import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import SearchBar from './components/SearchBar';
import VideoList from './components/VideoList';
import VideoPlayer from './components/VideoPlayer';
import Controls from './components/Controls';
import OutputDisplay from './components/OutputDisplay';
import MCQDisplay from './components/MCQDisplay';
import ChatInterface from './components/ChatInterface';
import SidePanel from './components/SidePanel';
import api from './api';
import './App.css'; // Ensure we use the default or custom CSS

function App() {
  const [videos, setVideos] = useState([]);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [mcqs, setMcqs] = useState([]);
  const [gradingResults, setGradingResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [llmError, setLlmError] = useState('');
  const [videoId, setVideoId] = useState(null);
  const [isChunking, setIsChunking] = useState(false);
  const [activeTab, setActiveTab] = useState('transcript');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const [chatMessages, setChatMessages] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loadingSummary, setLoadingSummary] = useState(false);

  const handleSearch = async (query) => {
    setLoading(true);
    setError('');
    setLlmError('');
    setVideos([]);
    setSelectedVideo(null);
    setTranscript('');
    setSummary('');
    setMcqs([]);
    setGradingResults(null);
    setChatMessages([]);
    setRecommendations([]);
    setIsChunking(false);

    try {
      const response = await api.post('/search', { query });
      setVideos(response.data.results);
    } catch (err) {
      setError('Failed to search videos. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVideo = (video) => {
    setSelectedVideo(video);
    setTranscript('');
    setSummary('');
    setMcqs([]);
    setGradingResults(null);
    setChatMessages([]);
    setRecommendations([]);
    setVideoId(null);
    setLlmError('');
    setIsChunking(false);
    setActiveTab('transcript');
    setIsSidebarOpen(false);
    // Scroll to player
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!selectedVideo) return;

    const fetchAllData = async () => {
      setLoading(true);
      setError('');
      setLlmError('');

      try {
        // 1. Get Transcript (Fast)
        const response = await api.post('/transcript', {
          video_url: selectedVideo.link,
          title: selectedVideo.title
        });

        const transcriptText = response.data.transcript;
        const vId = response.data.video_id || selectedVideo.id;

        setTranscript(transcriptText);
        setVideoId(vId);
        setLoading(false);

        // 2. Start Ingestion/Chunking (Background-ish)
        setIsChunking(true);
        api.post('/ingest', {
          video_id: vId,
          transcript_text: transcriptText
        }).catch(err => console.error("Ingestion failed:", err))
          .finally(() => setIsChunking(false));

        // 3. Auto-generate Summary and MCQs and Recommendations
        handleSummarize(transcriptText);
        handleGenerateMCQ(transcriptText);

      } catch (err) {
        setError('Failed to get transcript. ' + (err.response?.data?.detail || err.message));
        setLoading(false);
      }
    };

    fetchAllData();
  }, [selectedVideo]);

  const handleSummarize = async (text) => {
    const transcriptToUse = text || transcript;
    if (!transcriptToUse) return;
    setLoadingSummary(true);
    try {
      const response = await api.post('/summarize', {
        transcript_text: transcriptToUse
      });
      const summaryText = response.data.summary;
      setSummary(summaryText);
      // Fetch recommendations after summary is ready
      fetchRecommendations(transcriptToUse, summaryText);
    } catch (err) {
      console.error("Summarize failed:", err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchRecommendations = async (text, summ) => {
    try {
      const response = await api.post('/recommend', {
        transcript_text: text,
        summary: summ
      });
      setRecommendations(response.data.recommendations);
    } catch (err) {
      console.error("Recommendations failed:", err);
    }
  };

  const handleGenerateMCQ = async (text) => {
    const transcriptToUse = text || transcript;
    if (!transcriptToUse) return;
    try {
      const response = await api.post('/generate-mcq', {
        transcript_text: transcriptToUse
      });
      setMcqs(response.data.questions);
    } catch (err) {
      console.error("MCQ generation failed:", err);
    }
  };

  const handleSubmitMCQ = async (userAnswers) => {
    setLoading(true);
    setError('');

    try {
      const response = await api.post('/grade-mcq', {
        transcript_text: transcript,
        questions: mcqs,
        user_answers: userAnswers
      });
      setGradingResults(response.data);
    } catch (err) {
      setError('Failed to grade answers. ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleChatWithVideo = () => {
    if (!videoId) {
      setError('Video ID not available. Please wait for transcript to be generated.');
      return;
    }
    handleTabChange('chat');
  };

  const handleTabChange = (tabId) => {
    if (activeTab === tabId && isSidebarOpen) {
      setIsSidebarOpen(false);
      return;
    }
    setActiveTab(tabId);
    setIsSidebarOpen(true);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>🎓 YouTube Learning Assistant</h1>
      </header>

      <main className="app-main">
        <SearchBar onSearch={handleSearch} />

        {loading && <div className="loading-spinner">Loading...</div>}
        {error && <div className="error-message">{error}</div>}

        {!selectedVideo && <VideoList videos={videos} onSelect={handleSelectVideo} />}

        {selectedVideo && (
          <div className={`video-workspace-container ${isSidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
            <div className={`video-main-content ${isSidebarOpen ? 'sidebar-open' : ''}`}>
              <button className="back-button" onClick={() => setSelectedVideo(null)}>← Back to Results</button>

              <div className="video-section">
                <div className="video-section-header">
                  <h2>{selectedVideo.title}</h2>
                </div>

                <div className="video-container">
                  <VideoPlayer url={`https://www.youtube.com/watch?v=${selectedVideo.id}`} />
                </div>
              </div>

            </div>

            <SidePanel
              activeTab={activeTab}
              onTabChange={handleTabChange}
              isOpen={isSidebarOpen}
              setIsOpen={setIsSidebarOpen}
            >
              <div style={{ display: activeTab === 'transcript' ? 'block' : 'none' }}>
                <div className="transcript-panel-body">
                  <h3>Transcript</h3>
                  {transcript ? (
                    <ReactMarkdown>{transcript}</ReactMarkdown>
                  ) : (
                    <p>Transcript is being generated...</p>
                  )}
                </div>
              </div>

              <div style={{ display: activeTab === 'summary' ? 'block' : 'none' }}>
                {loadingSummary ? (
                  <div className="no-content">
                    <p>Summarizing the video for you. This can take upto a few moments...</p>
                  </div>
                ) : (
                  <OutputDisplay title="Summary" content={summary} />
                )}
              </div>

              <div style={{ display: activeTab === 'mcqs' ? 'block' : 'none' }}>
                {mcqs.length > 0 ? (
                  <MCQDisplay
                    questions={mcqs}
                    onSubmit={handleSubmitMCQ}
                    gradingResults={gradingResults}
                    loading={loading}
                  />
                ) : (
                  <div className="no-content">
                    <p>{loading ? 'Generating MCQs...' : 'MCQs are being generated...'}</p>
                  </div>
                )}
              </div>

              <div style={{ display: activeTab === 'chat' ? 'block' : 'none', height: '100%' }}>
                {videoId && (
                  <ChatInterface
                    videoId={videoId}
                    onClose={() => setIsSidebarOpen(false)}
                    isChunking={isChunking}
                    messages={chatMessages}
                    setMessages={setChatMessages}
                  />
                )}
              </div>

              <div style={{ display: activeTab === 'recommendations' ? 'block' : 'none' }}>
                <h3>Recommended Literature</h3>
                {recommendations.length > 0 ? (
                  <div className="recommendations-list">
                    {recommendations.map((rec, index) => (
                      <a key={index} href={rec.link} target="_blank" rel="noopener noreferrer" className="rec-card">
                        <img src={rec.thumbnails[0].url} alt={rec.title} />
                        <div className="rec-info">
                          <h4>{rec.title}</h4>
                          <p>{rec.channel.name}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                ) : (
                  <p>Finding recommendations...</p>
                )}
              </div>
            </SidePanel>
          </div>
        )}
      </main>
      {llmError && <div className="error-message llm-error">{llmError}</div>}
    </div>
  );
}

export default App;
