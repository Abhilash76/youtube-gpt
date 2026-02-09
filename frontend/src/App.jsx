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
import Mermaid from './components/Mermaid';
import api from './api';
import { FiCopy, FiShare2, FiDownload } from 'react-icons/fi';
import { SiWhatsapp, SiInstagram, SiLinkedin } from 'react-icons/si';
import { HiOutlineMail } from 'react-icons/hi';
import './App.css';
import './Actions.css';

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
  const [mindMap, setMindMap] = useState('');
  const [loadingMindMap, setLoadingMindMap] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(null);
  const mermaidRef = React.useRef(null);

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
        // 3. Parallel Processing of All AI Tasks
        handleProcessAll(transcriptText, vId);

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

  const handleGenerateMindMap = async (text) => {
    const transcriptToUse = text || transcript;
    if (!transcriptToUse) return;
    setLoadingMindMap(true);
    try {
      const response = await api.post('/mindmap', {
        transcript_text: transcriptToUse
      });
      setMindMap(response.data.mind_map);
    } catch (err) {
      console.error("Mind Map generation failed:", err);
    } finally {
      setLoadingMindMap(false);
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

  const handleProcessAll = async (text, vId) => {
    const transcriptToUse = text || transcript;
    const currentVid = vId || videoId;
    if (!transcriptToUse) return;

    setLoadingSummary(true);
    setLoadingMindMap(true);
    setIsChunking(true);

    try {
      const response = await api.post('/process-all', {
        transcript_text: transcriptToUse,
        video_id: currentVid
      });

      const data = response.data;
      setSummary(data.summary);
      setMcqs(data.mcqs);
      setMindMap(data.mind_map);
      setRecommendations(data.recommendations);
    } catch (err) {
      console.error("Batch processing failed:", err);
      setLlmError('Failed to process all video data smoothly.');
    } finally {
      setLoadingSummary(false);
      setLoadingMindMap(false);
      setIsChunking(false);
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

  const getShareText = (type) => {
    switch (type) {
      case 'transcript': return transcript;
      case 'summary': return summary;
      case 'mcqs':
        return mcqs.map((q, i) =>
          `${i + 1}. ${q.question}\n` +
          q.options.map((opt, oi) => `   ${oi + 1}) ${opt}`).join('\n')
        ).join('\n\n');
      case 'chat':
        return chatMessages.map(m =>
          `${m.role === 'user' ? 'User' : 'Youtube-GPT'}: ${m.content}`
        ).join('\n\n');
      case 'mindmap': return mindMap;
      default: return '';
    }
  };

  const handleCopy = (type) => {
    const text = getShareText(type);
    navigator.clipboard.writeText(text).then(() => {
      alert('Copied to clipboard!');
    });
  };

  const renderShareMenu = (type) => {
    if (showShareMenu !== type) return null;
    const text = encodeURIComponent(getShareText(type));
    const url = encodeURIComponent(window.location.href);

    return (
      <div className="share-menu">
        <a href={`mailto:?subject=Study Notes&body=${text}`} className="share-option">
          <HiOutlineMail /> Email
        </a>
        <a href={`https://wa.me/?text=${text}`} target="_blank" rel="noopener noreferrer" className="share-option">
          <SiWhatsapp /> WhatsApp
        </a>
        <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${url}`} target="_blank" rel="noopener noreferrer" className="share-option">
          <SiLinkedin /> LinkedIn
        </a>
        <div className="share-option" onClick={() => alert('Feature coming soon to Instagram API or use manual copy!')}>
          <SiInstagram /> Instagram
        </div>
      </div>
    );
  };

  const ActionButtons = ({ type }) => (
    <div className="action-buttons">
      <button className="icon-button" title="Copy" onClick={() => handleCopy(type)}>
        <FiCopy />
      </button>
      <div style={{ position: 'relative' }}>
        <button className="icon-button" title="Share" onClick={() => setShowShareMenu(showShareMenu === type ? null : type)}>
          <FiShare2 />
        </button>
        {renderShareMenu(type)}
      </div>
    </div>
  );

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
                  <div className="panel-header-actions">
                    <h3>Transcript</h3>
                    <ActionButtons type="transcript" />
                  </div>
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
                  <>
                    <div className="panel-header-actions">
                      <h3>Summary</h3>
                      <ActionButtons type="summary" />
                    </div>
                    <OutputDisplay title="" content={summary} />
                  </>
                )}
              </div>

              <div style={{ display: activeTab === 'mcqs' ? 'block' : 'none' }}>
                {mcqs.length > 0 ? (
                  <>
                    <div className="panel-header-actions">
                      <h3>MCQs</h3>
                      <ActionButtons type="mcqs" />
                    </div>
                    <MCQDisplay
                      questions={mcqs}
                      onSubmit={handleSubmitMCQ}
                      gradingResults={gradingResults}
                      loading={loading}
                    />
                  </>
                ) : (
                  <div className="no-content">
                    <p>{loading ? 'Generating MCQs...' : 'MCQs are being generated...'}</p>
                  </div>
                )}
              </div>

              <div style={{ display: activeTab === 'chat' ? 'block' : 'none', height: '100%' }}>
                {videoId && (
                  <>
                    <div className="panel-header-actions">
                      <h3>Chat</h3>
                      <ActionButtons type="chat" />
                    </div>
                    <ChatInterface
                      videoId={videoId}
                      onClose={() => setIsSidebarOpen(false)}
                      isChunking={isChunking}
                      messages={chatMessages}
                      setMessages={setChatMessages}
                    />
                  </>
                )}
              </div>

              <div style={{ display: activeTab === 'mindmap' ? 'block' : 'none' }}>
                <div className="panel-header-actions">
                  <h3>Mind Map</h3>
                  <ActionButtons type="mindmap" />
                </div>
                {loadingMindMap ? (
                  <div className="no-content">
                    <p>Creating your mind map. This might take a moment...</p>
                  </div>
                ) : mindMap ? (
                  <div className="mindmap-container" style={{ textAlign: 'center' }}>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                      Interactive mind map generated from video transcript.
                    </p>
                    <Mermaid ref={mermaidRef} chart={mindMap} />
                    <div className="mindmap-actions" style={{ marginTop: '1.5rem' }}>
                      <button
                        className="icon-button"
                        title="Download as PNG"
                        onClick={() => mermaidRef.current?.downloadImage()}
                        style={{ width: '45px', height: '45px', borderRadius: '50%', fontSize: '1.4rem' }}
                      >
                        <FiDownload />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="no-content">
                    <p>Mind map is being generated...</p>
                  </div>
                )}
              </div>

              <div style={{ display: activeTab === 'recommendations' ? 'block' : 'none' }}>
                <h3>Recommended Literature</h3>
                {recommendations.length > 0 ? (
                  <div className="recommendations-list">
                    {recommendations.map((rec, index) => (
                      <div key={index} onClick={() => handleSelectVideo(rec)} className="rec-card" style={{ cursor: 'pointer' }}>
                        <img src={rec.thumbnails[0].url} alt={rec.title} />
                        <div className="rec-info">
                          <h4>{rec.title}</h4>
                          <p>{rec.channel.name}</p>
                        </div>
                      </div>
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
