import React, { useState } from 'react';

const MOODS = [
  { id: 'auto', label: 'Auto', color: 'gray' },
  { id: 'euphoric', label: 'Euphoric', color: 'yellow' },
  { id: 'happy', label: 'Happy', color: 'green' },
  { id: 'uplifting', label: 'Uplifting', color: 'emerald' },
  { id: 'groovy', label: 'Groovy', color: 'purple' },
  { id: 'chill', label: 'Chill', color: 'blue' },
  { id: 'dreamy', label: 'Dreamy', color: 'indigo' },
  { id: 'melancholy', label: 'Melancholy', color: 'slate' },
  { id: 'dark', label: 'Dark', color: 'red' },
  { id: 'intense', label: 'Intense', color: 'orange' },
  { id: 'aggressive', label: 'Aggressive', color: 'rose' },
];

const CURVES = [
  { id: 'wave', label: 'Wave' },
  { id: 'build', label: 'Build' },
  { id: 'descend', label: 'Wind Down' },
  { id: 'peak', label: 'Peak' },
  { id: 'journey', label: 'Journey' },
  { id: 'steady', label: 'Steady' },
];

export default function MoodControl({
  currentMood = 'auto',
  currentCurve = 'wave',
  diversityLevel = 0.5,
  onMoodChange,
  onCurveChange,
  onDiversityChange,
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="px-4 py-4">
      {/* Compact mood selector */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-800/40 border border-gray-700/30 hover:border-gray-600/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Mood:</span>
          <span className="text-white font-medium text-sm capitalize">{currentMood}</span>
          <span className="text-gray-600 mx-2">|</span>
          <span className="text-gray-400 text-sm">Arc:</span>
          <span className="text-white font-medium text-sm capitalize">{currentCurve}</span>
          <span className="text-gray-600 mx-2">|</span>
          <span className="text-gray-400 text-sm">Discovery:</span>
          <span className="text-white font-medium text-sm">{Math.round(diversityLevel * 100)}%</span>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`text-gray-500 transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-3 space-y-4 bg-gray-800/30 rounded-xl p-4 border border-gray-700/20">
          {/* Mood Selection */}
          <div>
            <label className="text-gray-400 text-xs font-medium uppercase tracking-wider">Target Mood</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {MOODS.map(mood => (
                <button
                  key={mood.id}
                  onClick={() => onMoodChange(mood.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    currentMood === mood.id
                      ? 'bg-green-500/30 text-green-300 border border-green-500/50'
                      : 'bg-gray-700/50 text-gray-400 border border-transparent hover:border-gray-600'
                  }`}
                >
                  {mood.label}
                </button>
              ))}
            </div>
          </div>

          {/* Energy Curve */}
          <div>
            <label className="text-gray-400 text-xs font-medium uppercase tracking-wider">Energy Arc</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {CURVES.map(curve => (
                <button
                  key={curve.id}
                  onClick={() => onCurveChange(curve.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    currentCurve === curve.id
                      ? 'bg-blue-500/30 text-blue-300 border border-blue-500/50'
                      : 'bg-gray-700/50 text-gray-400 border border-transparent hover:border-gray-600'
                  }`}
                >
                  {curve.label}
                </button>
              ))}
            </div>
          </div>

          {/* Discovery Level */}
          <div>
            <label className="text-gray-400 text-xs font-medium uppercase tracking-wider">
              Discovery Level: {Math.round(diversityLevel * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={diversityLevel * 100}
              onChange={e => onDiversityChange(parseInt(e.target.value) / 100)}
              className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500 mt-2"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>Favorites Only</span>
              <span>Max Discovery</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
