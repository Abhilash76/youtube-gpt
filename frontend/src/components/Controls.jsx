import React from 'react';

const Controls = ({ onSummarize, onGenerateMCQ, onChatWithVideo, loading, hasTranscript }) => {
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
                    <button onClick={onChatWithVideo} disabled={loading} className="control-button secondary">
                        {loading ? 'Processing...' : 'Chat with Video'}
                    </button>
                </>
            )}
        </div>
    );
};

export default Controls;
