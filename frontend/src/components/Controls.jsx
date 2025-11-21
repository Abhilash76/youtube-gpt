import React from 'react';

const Controls = ({ onSummarize, onGenerateMCQ, loading, hasTranscript }) => {
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
                </>
            )}
        </div>
    );
};

export default Controls;
