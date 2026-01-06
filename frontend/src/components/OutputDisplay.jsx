import React from 'react';
import ReactMarkdown from 'react-markdown';

const OutputDisplay = ({ title, content }) => {
    if (!content) return null;

    return (
        <div className="output-display">
            <h3>{title}</h3>
            <div className="markdown-content">
                <ReactMarkdown>{content}</ReactMarkdown>
            </div>
        </div>
    );
};

export default OutputDisplay;
