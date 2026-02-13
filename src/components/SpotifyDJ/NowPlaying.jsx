import React from 'react';

export default function NowPlaying({ track, playbackState, isPlaying, onSkip, onLike, onPause, onResume }) {
  if (!track) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-gray-500 text-lg">No track playing</p>
        <p className="text-gray-600 text-sm mt-1">Start a session to begin</p>
      </div>
    );
  }

  const progressPercent = playbackState?.durationMs
    ? (playbackState.progressMs / playbackState.durationMs) * 100
    : 0;

  const formatTime = (ms) => {
    if (!ms) return '0:00';
    const seconds = Math.floor(ms / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };

  return (
    <div className="px-4 py-6">
      {/* Album Art & Track Info */}
      <div className="flex flex-col items-center">
        {track.album?.images?.[0]?.url ? (
          <img
            src={track.album.images[0].url}
            alt={track.album?.name}
            className="w-64 h-64 rounded-2xl shadow-2xl shadow-black/50 mb-6"
          />
        ) : (
          <div className="w-64 h-64 rounded-2xl bg-gray-800 flex items-center justify-center mb-6">
            <span className="text-gray-600 text-6xl">&#9835;</span>
          </div>
        )}

        <h2 className="text-white text-xl font-bold text-center">{track.name}</h2>
        <p className="text-gray-400 text-sm mt-1">
          {track.artists?.map(a => a.name).join(', ')}
        </p>

        {track.reason && (
          <p className="text-green-400/70 text-xs mt-2 bg-green-500/10 px-3 py-1 rounded-full">
            {track.reason}
          </p>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mt-6 px-4">
        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-1000"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{formatTime(playbackState?.progressMs)}</span>
          <span>{formatTime(playbackState?.durationMs)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-8 mt-6">
        {/* Like */}
        <button
          onClick={onLike}
          className={`p-3 rounded-full transition-colors ${
            track.liked
              ? 'text-green-400 bg-green-500/20'
              : 'text-gray-400 hover:text-green-400 hover:bg-gray-800'
          }`}
          title="Like this track"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={track.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>

        {/* Play/Pause */}
        <button
          onClick={isPlaying ? onPause : onResume}
          className="p-4 bg-white rounded-full text-black hover:scale-105 transition-transform"
        >
          {isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
        </button>

        {/* Skip */}
        <button
          onClick={onSkip}
          className="p-3 rounded-full text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
          title="Skip track"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 4 15 12 5 20 5 4" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
        </button>
      </div>

      {/* Device info */}
      {playbackState?.device && (
        <p className="text-center text-xs text-gray-600 mt-4">
          Playing on {playbackState.device}
        </p>
      )}
    </div>
  );
}
