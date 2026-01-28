import React from 'react';

const SidePanel = ({ activeTab, onTabChange, isOpen, setIsOpen, children }) => {
  const tabs = [
    { id: 'transcript', label: 'Transcript', icon: '📝' },
    { id: 'summary', label: 'Summary', icon: '📋' },
    { id: 'mcqs', label: 'MCQs', icon: '❓' },
    { id: 'chat', label: 'Chat', icon: '💬' },
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
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="side-panel-content">
        <div className="sidebar-toggle-container">
          <button
            className="toggle-sidebar"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Minimize sidebar" : "Maximize sidebar"}
          >
            {isOpen ? '→' : '←'}
          </button>
        </div>

        <div className="tab-content-area" style={{ display: isOpen ? 'flex' : 'none' }}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default SidePanel;
