import React from 'react';

const Controls = ({ onSummarize, onGenerateMCQ, onChatWithVideo, loading, hasTranscript, isChunking }) => {
    return (
        <div className="controls">
            {hasTranscript && (
                <>
                    <button onClick={onSummarize} disabled={loading} className="control-button primary">
                        {loading ? 'Processing...' : 'Summarize Video'}
                    </button>
                    <button onClick={onGenerateMCQ} disabled={loading} className="control-button secondary">
                        {loading ? 'Processing...' : 'Generate Quiz'}
                    </button>
                    <button
                        onClick={onChatWithVideo}
                        disabled={loading || isChunking}
                        className="control-button secondary"
                        title={isChunking ? "Processing video for chat..." : "Chat with Video"}
                    >
                        {loading ? 'Processing...' : (isChunking ? 'Preparing Chat...' : 'Chat with Video')}
                    </button>
                </>
            )}
        </div>
    );
};

export default Controls;
