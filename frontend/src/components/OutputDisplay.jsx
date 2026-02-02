import React from 'react';
import ReactMarkdown from 'react-markdown';

const OutputDisplay = ({ title, content }) => {
    if (!content) return null;

    return (
        <>
            <h3>{title}</h3>
            <div className="markdown-content">
                <ReactMarkdown>{content}</ReactMarkdown>
            </div>
        </>
    );
};

export default OutputDisplay;
