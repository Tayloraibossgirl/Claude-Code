import React, { useState } from 'react';
import FlowfieldGame from './components/FlowfieldGame';
import DJDashboard from './components/SpotifyDJ/DJDashboard';

/**
 * Root App component with navigation between the Flowfield game and DJ system
 */
export default function App() {
  const [view, setView] = useState('home');

  if (view === 'flowfield') {
    return (
      <div>
        <button
          onClick={() => setView('home')}
          className="fixed top-4 left-4 z-50 bg-gray-800/80 backdrop-blur-sm text-gray-300 px-3 py-1.5 rounded-lg text-sm hover:text-white transition-colors border border-gray-700/50"
        >
          &#8592; Back
        </button>
        <FlowfieldGame />
      </div>
    );
  }

  if (view === 'dj') {
    return (
      <div>
        <button
          onClick={() => setView('home')}
          className="fixed top-4 left-4 z-50 bg-gray-800/80 backdrop-blur-sm text-gray-300 px-3 py-1.5 rounded-lg text-sm hover:text-white transition-colors border border-gray-700/50"
        >
          &#8592; Back
        </button>
        <DJDashboard />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center p-4">
      <div className="text-center max-w-lg">
        <h1 className="text-4xl font-bold text-white mb-8">Choose Experience</h1>

        <div className="space-y-4">
          <button
            onClick={() => setView('dj')}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-bold py-6 px-8 rounded-2xl transition-all hover:scale-[1.02] text-left"
          >
            <span className="text-2xl block mb-1">FlowRadio DJ</span>
            <span className="text-sm opacity-80 font-normal">
              AI-powered Spotify DJ with harmonic mixing, energy arcs, and multi-agent intelligence
            </span>
          </button>

          <button
            onClick={() => setView('flowfield')}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-bold py-6 px-8 rounded-2xl transition-all hover:scale-[1.02] text-left"
          >
            <span className="text-2xl block mb-1">Flowfield Puzzle</span>
            <span className="text-sm opacity-80 font-normal">
              Awareness puzzle with binaural beats and pattern recognition
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
