import React from 'react';

const SidePanel = ({ activeTab, onTabChange, isOpen, setIsOpen, children }) => {
  const tabs = [
    { id: 'transcript', label: 'Transcript' },
    { id: 'summary', label: 'Summary' },
    { id: 'mcqs', label: 'MCQs' },
    { id: 'chat', label: 'Chat with video' },
    { id: 'recommendations', label: 'Recommended Literature' },
  ];

  return (
    <div className={`side-panel ${isOpen ? 'open' : 'closed'}`}>
      <div className="side-panel-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            title={tab.label}
          >
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="side-panel-content">
        <div className="tab-content-area" style={{ display: isOpen ? 'flex' : 'none' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default SidePanel;
