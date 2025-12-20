import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import SearchBar from './components/SearchBar';
import VideoList from './components/VideoList';
import VideoPlayer from './components/VideoPlayer';
import Controls from './components/Controls';
import OutputDisplay from './components/OutputDisplay';
import MCQDisplay from './components/MCQDisplay';
import ChatInterface from './components/ChatInterface';
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
  const [showTranscript, setShowTranscript] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [videoId, setVideoId] = useState(null);

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
    setShowTranscript(false);
    setShowChat(false);
    setVideoId(null);
    setLlmError('');
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
        const response = await api.post('/transcript', {
          video_url: selectedVideo.link,
          title: selectedVideo.title
        });
        setTranscript(response.data.transcript);
        setVideoId(response.data.video_id || selectedVideo.id);
        setShowTranscript(false);
      } catch (err) {
        setError('Failed to get transcript. ' + (err.response?.data?.detail || err.message));
      } finally {
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
    setShowChat(true);
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
          <div className="video-workspace">
            <button className="back-button" onClick={() => setSelectedVideo(null)}>← Back to Results</button>

            <div className="video-section">
              <div className="video-section-header">
                <h2>{selectedVideo.title}</h2>
                {transcript && !showTranscript && (
                  <button
                    className="control-button secondary transcript-toggle"
                    onClick={() => setShowTranscript(true)}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'View Transcript'}
                  </button>
                )}
              </div>

              <div className={`video-transcript-layout ${showTranscript && transcript ? 'with-transcript' : ''}`}>
                <div className="video-container">
                  <VideoPlayer url={`https://www.youtube.com/watch?v=${selectedVideo.id}`} />
                </div>
                {showTranscript && transcript && (
                  <div className="transcript-panel open">
                    <div className="transcript-panel-header">
                      <h3>Transcript</h3>
                      <button
                        className="close-transcript"
                        onClick={() => setShowTranscript(false)}
                        aria-label="Hide transcript"
                      >
                        Close
                      </button>
                    </div>
                    <div className="transcript-panel-body">
                      <ReactMarkdown>{transcript}</ReactMarkdown>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <Controls
              onSummarize={handleSummarize}
              onGenerateMCQ={handleGenerateMCQ}
              onChatWithVideo={handleChatWithVideo}
              loading={loading}
              hasTranscript={!!transcript}
            />

            <div className="output-section">
              <OutputDisplay title="Summary" content={summary} />
            </div>

            {mcqs.length > 0 && (
              <MCQDisplay
                questions={mcqs}
                onSubmit={handleSubmitMCQ}
                gradingResults={gradingResults}
                loading={loading}
              />
            )}

            {showChat && videoId && (
              <div className="chat-container">
                <ChatInterface videoId={videoId} onClose={() => setShowChat(false)} />
              </div>
            )}
          </div>
        )}
      </main>
      {llmError && <div className="error-message llm-error">{llmError}</div>}
    </div>
  );
}

export default App;
