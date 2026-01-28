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

    const fetchTranscript = async () => {
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
        setLoading(false); // Enable other buttons immediately

        // 2. Start Ingestion/Chunking (Background-ish)
        setIsChunking(true);
        try {
          await api.post('/ingest', {
            video_id: vId,
            transcript_text: transcriptText
          });
        } catch (ingestErr) {
          console.error("Ingestion failed:", ingestErr);
        } finally {
          setIsChunking(false);
        }

      } catch (err) {
        setError('Failed to get transcript. ' + (err.response?.data?.detail || err.message));
        setLoading(false);
      }
    };

    fetchTranscript();
  }, [selectedVideo]);

  const handleSummarize = async () => {
    if (!transcript) return;
    setLoading(true);
    setError('');
    setLlmError('');

    try {
      const response = await api.post('/summarize', {
        transcript_text: transcript
      });
      setSummary(response.data.summary);
    } catch (err) {
      if (err.response?.status === 500) {
        setLlmError('The LLM is currently not available. Please try again later.');
        setError('');
      } else {
        setError('Failed to summarize. ' + (err.response?.data?.detail || err.message));
        setLlmError('');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMCQ = async () => {
    if (!transcript) return;
    setLoading(true);
    setError('');
    setMcqs([]);
    setGradingResults(null);
    setLlmError('');

    try {
      const response = await api.post('/generate-mcq', {
        transcript_text: transcript
      });
      setMcqs(response.data.questions);
    } catch (err) {
      if (err.response?.status === 500) {
        setLlmError('The LLM is currently not available. Please try again later.');
        setError('');
      } else {
        setError('Failed to generate MCQs. ' + (err.response?.data?.detail || err.message));
        setLlmError('');
      }
    } finally {
      setLoading(false);
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

    if (tabId === 'summary' && !summary) {
      handleSummarize();
    } else if (tabId === 'mcqs' && mcqs.length === 0) {
      handleGenerateMCQ();
    }
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
          <div className="video-workspace-container">
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
              {activeTab === 'transcript' && (
                <div className="transcript-panel-body">
                  <h3>Transcript</h3>
                  {transcript ? (
                    <ReactMarkdown>{transcript}</ReactMarkdown>
                  ) : (
                    <p>Transcript is being generated...</p>
                  )}
                </div>
              )}
              {activeTab === 'summary' && (
                <div className="output-section">
                  <OutputDisplay title="Summary" content={summary} />
                </div>
              )}
              {activeTab === 'mcqs' && (
                mcqs.length > 0 ? (
                  <MCQDisplay
                    questions={mcqs}
                    onSubmit={handleSubmitMCQ}
                    gradingResults={gradingResults}
                    loading={loading}
                  />
                ) : (
                  <div className="no-content">
                    <p>{loading ? 'Generating MCQs...' : 'Click "Generate MCQs" to start the quiz.'}</p>
                  </div>
                )
              )}
              {videoId && (
                <div style={{ display: activeTab === 'chat' ? 'block' : 'none', height: '100%' }}>
                  <ChatInterface
                    videoId={videoId}
                    onClose={() => setIsSidebarOpen(false)}
                    isChunking={isChunking}
                  />
                </div>
              )}
            </SidePanel>
          </div>
        )}
      </main>
      {llmError && <div className="error-message llm-error">{llmError}</div>}
    </div>
  );
}

export default App;
