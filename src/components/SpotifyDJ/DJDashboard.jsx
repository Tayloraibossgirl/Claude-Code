import React, { useState, useEffect } from 'react';
import { useDJ } from '../../spotify-dj/hooks/useDJ.js';
import NowPlaying from './NowPlaying.jsx';
import QueueView from './QueueView.jsx';
import MoodControl from './MoodControl.jsx';
import AgentPanel from './AgentPanel.jsx';

const ENERGY_CURVES = [
  { id: 'wave', label: 'Wave', desc: 'Gentle energy waves' },
  { id: 'build', label: 'Build', desc: 'Slow escalation to peak' },
  { id: 'descend', label: 'Wind Down', desc: 'High to low energy' },
  { id: 'peak', label: 'Peak', desc: 'Build, peak, then descend' },
  { id: 'journey', label: 'Journey', desc: 'Multiple peaks and valleys' },
  { id: 'steady', label: 'Steady', desc: 'Maintain current energy' },
];

export default function DJDashboard() {
  const {
    state,
    connect,
    initializeDJ,
    startSession,
    skip,
    likeCurrent,
    pause,
    resume,
    setMood,
    setEnergyCurve,
    setDiversity,
    saveAsPlaylist,
    getTeamStatus,
  } = useDJ();

  const [showAgentPanel, setShowAgentPanel] = useState(false);
  const [selectedCurve, setSelectedCurve] = useState('wave');
  const [diversityLevel, setDiversityLevel] = useState(0.5);
  const [statusMessage, setStatusMessage] = useState('');

  // Poll team status when agent panel is open
  useEffect(() => {
    if (!showAgentPanel) return;
    const interval = setInterval(() => getTeamStatus(), 5000);
    return () => clearInterval(interval);
  }, [showAgentPanel, getTeamStatus]);

  const handleInit = async () => {
    setStatusMessage('Initializing DJ...');
    await initializeDJ({
      useLikedSongs: true,
      energyCurve: selectedCurve,
      diversityLevel,
    });
    setStatusMessage('');
  };

  const handleSavePlaylist = async () => {
    const name = prompt('Playlist name:', `DJ Session - ${new Date().toLocaleDateString()}`);
    if (name) {
      const playlist = await saveAsPlaylist(name);
      if (playlist) {
        setStatusMessage(`Saved playlist: ${playlist.name}`);
        setTimeout(() => setStatusMessage(''), 3000);
      }
    }
  };

  // ─── Disconnected State ─────────────────────────────────────────────
  if (state.phase === 'disconnected') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-5xl font-bold text-white mb-2">FlowRadio</h1>
          <p className="text-gray-400 text-lg mb-8">AI DJ Agent for Spotify</p>

          <div className="bg-gray-800/60 rounded-2xl p-8 backdrop-blur-sm border border-gray-700/50">
            <p className="text-gray-300 mb-6">
              A multi-agent DJ system that controls your Spotify with harmonic mixing,
              energy arc management, and intelligent discovery.
            </p>

            <button
              onClick={connect}
              className="w-full bg-green-500 hover:bg-green-400 text-black font-bold py-3 px-6 rounded-full transition-colors text-lg"
            >
              Connect to Spotify
            </button>

            <div className="mt-6 text-sm text-gray-500">
              <p>Requires Spotify Premium for playback control</p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-4 text-left">
            {[
              { title: 'Harmonic Mixing', desc: 'Key-compatible transitions like a real DJ' },
              { title: 'Energy Arcs', desc: 'Sessions tell an emotional story' },
              { title: 'Smart Discovery', desc: 'Find new music without the echo chamber' },
              { title: 'Agent Team', desc: '4 specialized AI agents collaborate' },
            ].map(feature => (
              <div key={feature.title} className="bg-gray-800/40 rounded-xl p-4 border border-gray-700/30">
                <h3 className="text-white font-semibold text-sm">{feature.title}</h3>
                <p className="text-gray-500 text-xs mt-1">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ─── Setup / Ready State ────────────────────────────────────────────
  if (state.phase === 'ready' || state.phase === 'initializing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-1">FlowRadio</h1>
          <p className="text-gray-400 mb-8">Configure your DJ session</p>

          {state.statusMessage && (
            <div className="bg-blue-500/20 border border-blue-500/40 rounded-xl p-4 mb-6">
              <p className="text-blue-300">{state.statusMessage}</p>
            </div>
          )}

          {/* Energy Curve Selection */}
          <section className="mb-8">
            <h2 className="text-white font-semibold mb-3">Energy Curve</h2>
            <div className="grid grid-cols-3 gap-3">
              {ENERGY_CURVES.map(curve => (
                <button
                  key={curve.id}
                  onClick={() => {
                    setSelectedCurve(curve.id);
                    setEnergyCurve(curve.id);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    selectedCurve === curve.id
                      ? 'bg-green-500/20 border-green-500/60 text-white'
                      : 'bg-gray-800/40 border-gray-700/30 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <span className="font-medium text-sm">{curve.label}</span>
                  <p className="text-xs mt-1 opacity-70">{curve.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Diversity Slider */}
          <section className="mb-8">
            <h2 className="text-white font-semibold mb-3">
              Discovery Level: {Math.round(diversityLevel * 100)}%
            </h2>
            <input
              type="range"
              min="0"
              max="100"
              value={diversityLevel * 100}
              onChange={e => {
                const val = parseInt(e.target.value) / 100;
                setDiversityLevel(val);
                setDiversity(val);
              }}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Familiar favorites</span>
              <span>New discoveries</span>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex gap-4">
            {state.phase === 'initializing' ? (
              <button disabled className="flex-1 bg-gray-700 text-gray-400 font-bold py-4 px-6 rounded-full">
                Initializing...
              </button>
            ) : !state.session ? (
              <button
                onClick={handleInit}
                className="flex-1 bg-green-500 hover:bg-green-400 text-black font-bold py-4 px-6 rounded-full transition-colors"
              >
                Initialize DJ
              </button>
            ) : (
              <button
                onClick={startSession}
                className="flex-1 bg-green-500 hover:bg-green-400 text-black font-bold py-4 px-6 rounded-full transition-colors text-lg"
              >
                Start DJ Session
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ─── Playing / Paused State ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 pb-32">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-800/50">
        <div>
          <h1 className="text-xl font-bold text-white">FlowRadio</h1>
          <p className="text-xs text-gray-500">
            {state.session?.tracksPlayed || 0} tracks played | {state.session?.durationMinutes || 0}m
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAgentPanel(!showAgentPanel)}
            className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
              showAgentPanel ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-400'
            }`}
          >
            Agents
          </button>
          <button
            onClick={handleSavePlaylist}
            className="px-3 py-1.5 rounded-lg text-sm bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            Save Playlist
          </button>
        </div>
      </header>

      {statusMessage && (
        <div className="mx-4 mt-2 bg-green-500/20 border border-green-500/40 rounded-lg p-2 text-center text-green-300 text-sm">
          {statusMessage}
        </div>
      )}

      {state.error && (
        <div className="mx-4 mt-2 bg-red-500/20 border border-red-500/40 rounded-lg p-2 text-center text-red-300 text-sm">
          {state.error}
        </div>
      )}

      {/* Now Playing */}
      <NowPlaying
        track={state.currentTrack}
        playbackState={state.playbackState}
        isPlaying={state.phase === 'playing'}
        onSkip={skip}
        onLike={likeCurrent}
        onPause={pause}
        onResume={resume}
      />

      {/* Mood Controls */}
      <MoodControl
        currentMood={state.session?.targetMood}
        currentCurve={state.session?.energyCurve}
        diversityLevel={state.session?.diversityLevel || 0.5}
        onMoodChange={setMood}
        onCurveChange={setEnergyCurve}
        onDiversityChange={setDiversity}
      />

      {/* Queue */}
      <QueueView queue={state.queue} />

      {/* Agent Panel (overlay) */}
      {showAgentPanel && (
        <AgentPanel
          teamStatus={state.teamStatus}
          moodJourney={state.moodJourney}
          onClose={() => setShowAgentPanel(false)}
        />
      )}
    </div>
  );
}
