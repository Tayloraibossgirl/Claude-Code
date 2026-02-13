/**
 * useDJ - React hook for the FlowRadio DJ system
 *
 * Provides a clean React interface to the multi-agent DJ system.
 * Handles initialization, state management, and event binding.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SpotifyClient } from '../core/spotify-client.js';
import { DJCoordinator } from '../agents/coordinator.js';

export function useDJ() {
  const [state, setState] = useState({
    phase: 'disconnected',  // disconnected | authenticating | initializing | ready | playing | paused | error
    currentTrack: null,
    queue: [],
    history: [],
    session: null,
    teamStatus: null,
    error: null,
    playbackState: null,
    moodJourney: null,
  });

  const spotifyRef = useRef(null);
  const djRef = useRef(null);

  // Initialize Spotify client
  useEffect(() => {
    const spotify = new SpotifyClient();
    spotifyRef.current = spotify;

    // Check for stored tokens
    if (spotify.loadTokens()) {
      setState(prev => ({ ...prev, phase: 'ready' }));
    }

    // Check for auth callback
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) {
      spotify.handleCallback(code).then(() => {
        window.history.replaceState({}, '', window.location.pathname);
        setState(prev => ({ ...prev, phase: 'ready' }));
      }).catch(err => {
        setState(prev => ({ ...prev, phase: 'error', error: err.message }));
      });
    }

    return () => {
      if (djRef.current) {
        djRef.current.destroy();
      }
    };
  }, []);

  // Connect to Spotify
  const connect = useCallback(async () => {
    if (!spotifyRef.current) return;
    setState(prev => ({ ...prev, phase: 'authenticating' }));
    await spotifyRef.current.initiateAuth();
  }, []);

  // Initialize DJ system
  const initializeDJ = useCallback(async (options = {}) => {
    if (!spotifyRef.current?.isAuthenticated) {
      setState(prev => ({ ...prev, error: 'Not authenticated' }));
      return;
    }

    setState(prev => ({ ...prev, phase: 'initializing' }));

    try {
      const dj = new DJCoordinator(spotifyRef.current);
      djRef.current = dj;

      // Bind events
      dj.on('status', ({ message, phase }) => {
        setState(prev => ({ ...prev, statusMessage: message }));
      });

      dj.on('trackChanged', ({ track, reason }) => {
        setState(prev => ({
          ...prev,
          currentTrack: { ...track, reason },
          phase: 'playing',
        }));
      });

      dj.on('queueUpdated', ({ queue }) => {
        setState(prev => ({ ...prev, queue }));
      });

      dj.on('trackSkipped', () => {
        setState(prev => ({
          ...prev,
          history: [...prev.history, prev.currentTrack],
        }));
      });

      dj.on('trackLiked', ({ track }) => {
        setState(prev => ({
          ...prev,
          currentTrack: prev.currentTrack ? { ...prev.currentTrack, liked: true } : null,
        }));
      });

      dj.on('playbackState', (playbackState) => {
        setState(prev => ({ ...prev, playbackState }));
      });

      dj.on('playbackPaused', () => {
        setState(prev => ({ ...prev, phase: 'paused' }));
      });

      dj.on('playbackResumed', () => {
        setState(prev => ({ ...prev, phase: 'playing' }));
      });

      dj.on('error', ({ message }) => {
        setState(prev => ({ ...prev, error: message }));
      });

      dj.on('sessionEnded', ({ session }) => {
        setState(prev => ({ ...prev, phase: 'ready', session }));
      });

      await dj.initialize(options);
      setState(prev => ({ ...prev, phase: 'ready', session: dj.session.toJSON() }));

    } catch (err) {
      setState(prev => ({ ...prev, phase: 'error', error: err.message }));
    }
  }, []);

  // DJ Controls
  const startSession = useCallback(async () => {
    if (djRef.current) {
      await djRef.current.startSession();
    }
  }, []);

  const skip = useCallback(async () => {
    if (djRef.current) {
      await djRef.current.skip();
    }
  }, []);

  const likeCurrent = useCallback(async () => {
    if (djRef.current) {
      await djRef.current.likeCurrent();
    }
  }, []);

  const pause = useCallback(async () => {
    if (djRef.current) {
      await djRef.current.pause();
    }
  }, []);

  const resume = useCallback(async () => {
    if (djRef.current) {
      await djRef.current.resume();
    }
  }, []);

  const setMood = useCallback((mood) => {
    if (djRef.current) {
      djRef.current.setMood(mood);
      setState(prev => ({ ...prev, session: djRef.current.session.toJSON() }));
    }
  }, []);

  const setEnergyCurve = useCallback((curve) => {
    if (djRef.current) {
      djRef.current.setEnergyCurve(curve);
      setState(prev => ({ ...prev, session: djRef.current.session.toJSON() }));
    }
  }, []);

  const setDiversity = useCallback((level) => {
    if (djRef.current) {
      djRef.current.setDiversityLevel(level);
      setState(prev => ({ ...prev, session: djRef.current.session.toJSON() }));
    }
  }, []);

  const saveAsPlaylist = useCallback(async (name) => {
    if (djRef.current) {
      return djRef.current.saveAsPlaylist(name);
    }
  }, []);

  const optimizePlaylist = useCallback(async (playlistId) => {
    if (djRef.current) {
      return djRef.current.optimizePlaylist(playlistId);
    }
  }, []);

  const getTeamStatus = useCallback(() => {
    if (djRef.current) {
      const status = djRef.current.getTeamStatus();
      setState(prev => ({ ...prev, teamStatus: status, moodJourney: status.moodJourney }));
      return status;
    }
    return null;
  }, []);

  return {
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
    optimizePlaylist,
    getTeamStatus,
  };
}
