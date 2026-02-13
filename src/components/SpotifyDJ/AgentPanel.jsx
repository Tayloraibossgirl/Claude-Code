import React from 'react';

export default function AgentPanel({ teamStatus, moodJourney, onClose }) {
  if (!teamStatus) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
        <div className="bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg p-6 max-h-[80vh] overflow-y-auto border border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white font-bold text-lg">Agent Team</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <p className="text-gray-500 text-sm">Waiting for team data...</p>
        </div>
      </div>
    );
  }

  const { session, agents, trackPoolSize } = teamStatus;

  const agentList = [
    {
      ...agents.curator,
      icon: '&#9881;',
      description: 'Selects tracks from your library and recommendations',
    },
    {
      ...agents.transition,
      icon: '&#8644;',
      description: 'Ensures smooth harmonic and tempo transitions',
    },
    {
      ...agents.discovery,
      icon: '&#9733;',
      description: 'Finds new music you\'ll love',
    },
    {
      ...agents.mood,
      icon: '&#9836;',
      description: 'Manages the emotional energy arc',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
      <div className="bg-gray-900 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg p-6 max-h-[80vh] overflow-y-auto border border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white font-bold text-lg">Agent Team Status</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Session Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-gray-800/50 rounded-xl p-3 text-center">
            <p className="text-green-400 text-xl font-bold">{session.tracksPlayed}</p>
            <p className="text-gray-500 text-xs">Played</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-3 text-center">
            <p className="text-yellow-400 text-xl font-bold">{session.skippedCount}</p>
            <p className="text-gray-500 text-xs">Skipped</p>
          </div>
          <div className="bg-gray-800/50 rounded-xl p-3 text-center">
            <p className="text-pink-400 text-xl font-bold">{session.likedCount}</p>
            <p className="text-gray-500 text-xs">Liked</p>
          </div>
        </div>

        {/* Pool Size */}
        <div className="bg-gray-800/30 rounded-xl p-3 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Track Pool</span>
            <span className="text-white font-mono">{trackPoolSize} tracks</span>
          </div>
        </div>

        {/* Agent Cards */}
        <div className="space-y-3">
          {agentList.map(agent => (
            <div
              key={agent.name}
              className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/20"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg" dangerouslySetInnerHTML={{ __html: agent.icon }} />
                  <div>
                    <h3 className="text-white font-semibold text-sm">{agent.name}</h3>
                    <p className="text-gray-500 text-xs">{agent.description}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  agent.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-500'
                }`}>
                  {agent.active ? 'Active' : 'Idle'}
                </span>
              </div>

              {/* Confidence bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-500">Confidence</span>
                  <span className="text-gray-400">{(agent.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${agent.confidence * 100}%` }}
                  />
                </div>
              </div>

              {agent.lastAction && (
                <p className="text-gray-500 text-xs mt-2 italic">{agent.lastAction}</p>
              )}
            </div>
          ))}
        </div>

        {/* Mood Journey */}
        {moodJourney && moodJourney.journey?.length > 0 && (
          <div className="mt-6">
            <h3 className="text-white font-semibold mb-3">Mood Journey</h3>
            <div className="bg-gray-800/30 rounded-xl p-4">
              <div className="flex items-center gap-1 flex-wrap">
                {moodJourney.journey.map((entry, idx) => (
                  <div key={idx} className="flex items-center">
                    <span
                      className="text-xs px-2 py-0.5 rounded-full bg-gray-700/50 text-gray-300"
                      title={entry.track}
                    >
                      {entry.mood}
                    </span>
                    {idx < moodJourney.journey.length - 1 && (
                      <span className="text-gray-700 mx-0.5">&#8594;</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-3">
                <span>Avg energy: {moodJourney.averageEnergy?.toFixed(2)}</span>
                <span>{moodJourney.moodChanges} mood changes</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
