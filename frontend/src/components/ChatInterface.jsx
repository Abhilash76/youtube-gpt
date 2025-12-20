import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import api from '../api';

const ChatInterface = ({ videoId, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        const userMessage = input.trim();
        setInput('');
        setError('');

        // Add user message
        const newMessages = [...messages, { role: 'user', content: userMessage }];
        setMessages(newMessages);
        setLoading(true);

        try {
            const response = await api.post('/chat', {
                video_id: videoId,
                query: userMessage
            });

            // Add assistant response
            setMessages([
                ...newMessages,
                { role: 'assistant', content: response.data.answer }
            ]);
        } catch (err) {
            setError('Failed to get response. ' + (err.response?.data?.detail || err.message));
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chat-interface">
            <div className="chat-header">
                <h3>Chat with Video</h3>
                <button className="close-chat" onClick={onClose} aria-label="Close chat">
                    ✕
                </button>
            </div>
            <div className="chat-messages">
                {messages.length === 0 && (
                    <div className="chat-welcome">
                        <p>Ask me anything about the video!</p>
                        <p className="chat-hint">Try questions like:</p>
                        <ul>
                            <li>"What are the main topics covered?"</li>
                            <li>"Explain the key concepts"</li>
                            <li>"What did the speaker say about X?"</li>
                        </ul>
                    </div>
                )}
                {messages.map((msg, idx) => (
                    <div key={idx} className={`chat-message ${msg.role}`}>
                        <div className="chat-message-content">
                            {msg.role === 'user' ? (
                                <p>{msg.content}</p>
                            ) : (
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            )}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="chat-message assistant">
                        <div className="chat-message-content">
                            <div className="loading-dots">
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    </div>
                )}
                {error && (
                    <div className="chat-error">{error}</div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <form className="chat-input-form" onSubmit={handleSend}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question about the video..."
                    disabled={loading}
                    className="chat-input"
                />
                <button type="submit" disabled={loading || !input.trim()} className="chat-send-button">
                    Send
                </button>
            </form>
        </div>
    );
};

export default ChatInterface;

