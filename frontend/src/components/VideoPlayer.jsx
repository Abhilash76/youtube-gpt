import React from 'react';

const VideoPlayer = ({ url }) => {
    if (!url) return null;

    // Extract video ID from URL
    const videoId = url.split('v=')[1]?.split('&')[0];

    if (!videoId) {
        return <div className="error-message">Invalid Video URL</div>;
    }

    const embedUrl = `https://www.youtube.com/embed/${videoId}`;

    return (
        <div className="video-player-wrapper">
            <iframe
                src={embedUrl}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
            ></iframe>
        </div>
    );
};

export default VideoPlayer;
