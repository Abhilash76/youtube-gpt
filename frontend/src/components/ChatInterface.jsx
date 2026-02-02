import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

const ChatInterface = ({ videoId, onClose, isChunking, messages, setMessages }) => {
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const messagesEndRef = useRef(null);

    // Automatically scroll to the bottom whenever the messages array updates
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading || isChunking) return;

        const userMessage = input.trim();
        setInput('');
        setError('');

        // 1. Add User Message and an empty Assistant message placeholder
        const initialMessages = [
            ...messages,
            { role: 'user', content: userMessage },
            { role: 'assistant', content: '' } // This will be filled by the stream
        ];
        setMessages(initialMessages);
        setLoading(true);

        try {
            // 2. Use native fetch for streaming (Axios doesn't support this easily in the browser)
            const response = await fetch('http://localhost:8000/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    video_id: videoId,
                    query: userMessage
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'Failed to connect to the server');
            }

            // 3. Initialize the stream reader
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let accumulatedContent = '';

            // Once the stream starts, we can stop the main loading spinner/dots
            setLoading(false);

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // Decode the Uint8Array chunk to a string
                const chunk = decoder.decode(value, { stream: true });
                accumulatedContent += chunk;

                // 4. Update ONLY the last message (the assistant's content)
                setMessages((prevMessages) => {
                    const updated = [...prevMessages];
                    updated[updated.length - 1] = {
                        ...updated[updated.length - 1],
                        content: accumulatedContent,
                    };
                    return updated;
                });
            }
        } catch (err) {
            setError('Error: ' + err.message);
            setLoading(false);
            // Remove the empty assistant message if an error occurs early
            setMessages((prev) => prev.filter(m => m.content !== ''));
        }
    };

    return (
        <div className="chat-content-direct">
            <div className="chat-messages">
                {isChunking && (
                    <div className="progress-container">
                        <div className="progress-spinner"></div>
                        <div className="progress-text">Video is currently being processed. It will be ready in a few moments...</div>
                    </div>
                )}
                {messages.length === 0 && !isChunking && (
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

                {messages.map((msg, idx) => {
                    // Don't render the assistant bubble if it's currently empty and we are still in the initial loading state
                    if (msg.role === 'assistant' && msg.content === '' && loading) return null;

                    return (
                        <div key={idx} className={`chat-message ${msg.role}`}>
                            <div className="chat-message-content">
                                {msg.role === 'user' ? (
                                    <p>{msg.content}</p>
                                ) : (
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                )}
                            </div>
                        </div>
                    );
                })}

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

                {error && <div className="chat-error">{error}</div>}

                {/* Invisible element to anchor the auto-scroll */}
                <div ref={messagesEndRef} />
            </div>

            <form className="chat-input-form" onSubmit={handleSend}>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={isChunking ? "Chat will be available once processing is complete..." : "Ask a question about the video..."}
                    disabled={loading || isChunking}
                    className="chat-input"
                />
                <button
                    type="submit"
                    disabled={loading || !input.trim() || isChunking}
                    className="chat-send-button"
                >
                    Send
                </button>
            </form>
        </div>
    );
};

export default ChatInterface;