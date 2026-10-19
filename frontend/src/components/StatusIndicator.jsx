import React from 'react';

export const StatusIndicator = ({ isConnected, providerName }) => {
  const displayText = isConnected
    ? providerName || 'Velox Active'
    : 'System Offline';

  return (
    <div
      className={`velox-status-badge ${isConnected ? 'online' : 'offline'}`}
      title={isConnected ? 'Velox Engine Connected' : 'Engine Disconnected'}
    >
      <span className="velox-status-dot" aria-hidden="true" />
      <span className="velox-status-label">{displayText}</span>
    </div>
  );
};
