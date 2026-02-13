import React from 'react';

export default function QueueView({ queue = [] }) {
  if (queue.length === 0) {
    return (
      <div className="px-4 py-6">
        <h3 className="text-white font-semibold mb-3">Up Next</h3>
        <p className="text-gray-600 text-sm">Queue is empty</p>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h3 className="text-white font-semibold mb-3">Up Next</h3>
      <div className="space-y-2">
        {queue.slice(0, 10).map((item, idx) => {
          const track = item.track;
          return (
            <div
              key={track?.id || idx}
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
            >
              <span className="text-gray-600 text-sm w-5 text-right">{idx + 1}</span>

              {track?.album?.images?.[2]?.url ? (
                <img
                  src={track.album.images[2].url}
                  alt=""
                  className="w-10 h-10 rounded-lg"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center">
                  <span className="text-gray-500 text-xs">&#9835;</span>
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {track?.name || 'Unknown'}
                </p>
                <p className="text-gray-500 text-xs truncate">
                  {track?.artists?.map(a => a.name).join(', ') || 'Unknown'}
                </p>
              </div>

              {item.reason && (
                <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full hidden sm:block max-w-32 truncate">
                  {item.reason}
                </span>
              )}

              {item.score && (
                <span className="text-xs text-green-500/70 font-mono w-8 text-right">
                  {(item.score * 100).toFixed(0)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {queue.length > 10 && (
        <p className="text-gray-600 text-xs text-center mt-3">
          +{queue.length - 10} more tracks queued
        </p>
      )}
    </div>
  );
}
