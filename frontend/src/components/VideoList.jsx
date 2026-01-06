import React from 'react';

const VideoList = ({ videos, onSelect }) => {
    if (!videos || videos.length === 0) return null;

    return (
        <div className="video-list">
            <h3>Select a Video</h3>
            <div className="video-grid">
                {videos.map((video) => (
                    <div key={video.id} className="video-card" onClick={() => onSelect(video)}>
                        <img src={video.thumbnails[0].url} alt={video.title} className="video-thumbnail" />
                        <div className="video-info">
                            <h4 className="video-title">{video.title}</h4>
                            <p className="video-channel">{video.channel.name}</p>
                            <p className="video-duration">{video.duration}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default VideoList;
