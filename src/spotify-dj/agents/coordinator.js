/**
 * DJ Coordinator Agent
 *
 * The master orchestrator that coordinates all specialized agents.
 * Receives input from the Curator, Transition, Discovery, and Mood agents,
 * resolves conflicts, and makes final decisions about what to play.
 *
 * This is the replacement for Spotify's DJ - a multi-agent system
 * that thinks like a real DJ instead of a recommendation algorithm.
 */

import { CuratorAgent } from './curator-agent.js';
import { TransitionAgent } from './transition-agent.js';
import { DiscoveryAgent } from './discovery-agent.js';
import { MoodAgent } from './mood-agent.js';
import { FlowRadioAlgorithm } from '../core/radio-algorithm.js';
import { DJSession } from '../models/session.js';
import { ListenerProfile } from '../models/listener-profile.js';
import { QueuedTrack } from '../models/track.js';

export class DJCoordinator {
  constructor(spotifyClient) {
    this.spotify = spotifyClient;
    this.session = new DJSession();
    this.profile = new ListenerProfile();

    // Load saved profile
    this.profile.load();

    // Initialize the agent team
    this.curator = new CuratorAgent(spotifyClient, this.profile);
    this.transition = new TransitionAgent();
    this.discovery = new DiscoveryAgent(spotifyClient, this.profile);
    this.mood = new MoodAgent(this.profile);

    // The core radio algorithm
    this.radio = new FlowRadioAlgorithm(spotifyClient, this.session, this.profile);

    // Coordination state
    this.initialized = false;
    this.autoPlay = false;
    this.pollInterval = null;
    this.queueRefreshThreshold = 3; // Refresh queue when this many tracks remain

    // Event listeners
    this.listeners = new Map();
  }

  // ─── Event System ─────────────────────────────────────────────────────

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    const callbacks = this.listeners.get(event) || [];
    callbacks.forEach(cb => cb(data));
  }

  // ─── Initialization ───────────────────────────────────────────────────

  async initialize(options = {}) {
    const {
      seedPlaylistIds = [],
      useLikedSongs = true,
      energyCurve = 'wave',
      targetMood = 'auto',
      diversityLevel = 0.5,
    } = options;

    this.emit('status', { message: 'Initializing DJ...', phase: 'init' });

    try {
      // Configure session
      this.session.energyCurve = energyCurve;
      this.session.targetMood = targetMood;
      this.session.diversityLevel = diversityLevel;

      // Initialize mood arc
      this.mood.initializeArc(energyCurve);

      // Gather user data
      this.emit('status', { message: 'Loading your music library...', phase: 'loading' });

      const [likedSongs, topTracks, recentlyPlayed] = await Promise.all([
        useLikedSongs ? this.spotify.getAllLikedSongs(300) : [],
        this.spotify.getTopTracks('medium_term', 50),
        this.spotify.getRecentlyPlayed(50),
      ]);

      // Initialize the curator with library data
      await this.curator.initialize(likedSongs, topTracks, []);

      // Enrich tracks with audio features
      this.emit('status', { message: 'Analyzing audio features...', phase: 'analyzing' });
      const allTracks = [...likedSongs, ...topTracks, ...recentlyPlayed];
      const uniqueTracks = [...new Map(allTracks.map(t => [t.id, t])).values()];
      await this.spotify.enrichTracksWithFeatures(uniqueTracks);

      // Initialize radio algorithm
      await this.radio.initialize({
        seedPlaylistIds,
        useLikedSongs,
        useTopTracks: true,
        useRecentlyPlayed: true,
      });

      // Initialize listener profile from data
      if (!this.profile.initialized) {
        this.profile.initializeFromTopTracks(uniqueTracks.filter(t => t.hasAudioFeatures));
        this.profile.save();
      }

      // Build initial context pool for curator
      const targetEnergy = this.session.getTargetEnergy();
      await this.curator.buildContextPool({
        targetMood,
        targetEnergy,
        session: this.session,
      });

      // Pre-populate discovery pool
      const seeds = topTracks.filter(t => t.hasAudioFeatures).slice(0, 5);
      const moodParams = this.mood.getSeedParameters(0);
      await this.curator.refreshDiscoveryPool(seeds, moodParams);

      this.initialized = true;
      this.emit('status', { message: 'DJ ready!', phase: 'ready' });
      this.emit('initialized', { trackPoolSize: this.radio.trackPool.size });

    } catch (err) {
      this.emit('error', { message: `Initialization failed: ${err.message}`, error: err });
      throw err;
    }
  }

  // ─── Core DJ Operations ───────────────────────────────────────────────

  /**
   * Start a DJ session
   */
  async startSession() {
    if (!this.initialized) throw new Error('DJ not initialized');

    this.session.state = 'playing';

    // Fill the initial queue
    await this.fillQueue();

    // Start playback with the first track
    const firstTrack = this.session.getNextFromQueue();
    if (firstTrack) {
      await this.playTrack(firstTrack);
    }

    // Start polling for playback state
    this.startPolling();

    this.emit('sessionStarted', { session: this.session.toJSON() });
  }

  /**
   * Fill the queue with the next batch of tracks using the agent team
   */
  async fillQueue(count = 8) {
    const context = {
      currentTrack: this.session.currentTrack?.track || null,
      session: this.session,
      sessionMinutes: this.session.sessionDurationMinutes,
    };

    // Step 1: Get candidate suggestions from each agent
    const [curatorSuggestions, discoverySuggestions] = await Promise.all([
      this.curator.suggest(context),
      this.discovery.suggest(context),
    ]);

    // Merge suggestions into a candidate pool
    const candidateMap = new Map();
    [...curatorSuggestions, ...discoverySuggestions].forEach(track => {
      if (!candidateMap.has(track.id) && !this.session.playedTrackIds.has(track.id)) {
        candidateMap.set(track.id, track);
      }
    });

    let candidates = [...candidateMap.values()];

    // If not enough candidates, use the radio algorithm directly
    if (candidates.length < count * 2) {
      const radioTracks = await this.radio.selectNextTracks(count * 2);
      radioTracks.forEach(qt => {
        if (!candidateMap.has(qt.track.id)) {
          candidates.push(qt.track);
        }
      });
    }

    // Step 2: Have each agent evaluate all candidates
    const evaluated = await Promise.all(
      candidates.map(async (candidate) => {
        const [curatorEval, transitionEval, discoveryEval, moodEval] = await Promise.all([
          this.curator.evaluate(candidate, context),
          this.transition.evaluate(candidate, context),
          this.discovery.evaluate(candidate, context),
          this.mood.evaluate(candidate, context),
        ]);

        // Check for vetoes
        const vetoed = curatorEval.veto || transitionEval.veto || moodEval.veto;

        // Weighted composite score from all agents
        const compositeScore =
          curatorEval.score * 0.30 +
          transitionEval.score * 0.25 +
          moodEval.score * 0.25 +
          discoveryEval.score * 0.20;

        return {
          track: candidate,
          score: vetoed ? 0 : compositeScore,
          vetoed,
          evaluations: {
            curator: curatorEval,
            transition: transitionEval,
            discovery: discoveryEval,
            mood: moodEval,
          },
        };
      })
    );

    // Step 3: Sort by score, filter vetoed tracks
    const ranked = evaluated
      .filter(e => !e.vetoed && e.score > 0.2)
      .sort((a, b) => b.score - a.score);

    // Step 4: Have the transition agent optimize the order of top picks
    const topPicks = ranked.slice(0, count).map(r => r.track);
    const currentTrack = this.session.currentTrack?.track || null;
    const ordered = await this.transition.optimizeTrackOrder(topPicks, currentTrack);

    // Step 5: Build queue entries with reasoning
    const queueEntries = ordered.map(track => {
      const evalData = ranked.find(r => r.track.id === track.id);
      const reasons = [];

      if (evalData) {
        const evals = evalData.evaluations;
        if (evals.transition.score > 0.7) reasons.push('smooth transition');
        if (evals.mood.score > 0.7) reasons.push('fits the mood');
        if (evals.curator.score > 0.7) reasons.push('great match for you');
        if (evals.discovery.score > 0.7) reasons.push('new discovery');
      }

      return new QueuedTrack(
        track,
        reasons.length > 0 ? reasons.join(', ') : 'selected by DJ',
        evalData?.score || 0
      );
    });

    // Add to session queue
    this.session.queue.push(...queueEntries);
    this.emit('queueUpdated', { queue: this.session.queue.map(q => ({
      track: q.track.toJSON(),
      reason: q.reason,
      score: q.score,
    }))});
  }

  /**
   * Play a specific queued track
   */
  async playTrack(queuedTrack) {
    try {
      await this.spotify.play({ uris: [queuedTrack.track.uri] });

      // Update session state
      if (this.session.currentTrack) {
        this.session.addToHistory(this.session.currentTrack);
      }
      this.session.currentTrack = queuedTrack;
      this.session.state = 'playing';

      // Notify agents
      await Promise.all([
        this.curator.onTrackPlayed(queuedTrack.track, 'played'),
        this.transition.onTrackPlayed(queuedTrack.track, 'played'),
        this.discovery.onTrackPlayed(queuedTrack.track, 'played'),
        this.mood.onTrackPlayed(queuedTrack.track, 'played'),
      ]);

      this.profile.recordTrackPlay(queuedTrack.track, 'played');

      this.emit('trackChanged', {
        track: queuedTrack.track.toJSON(),
        reason: queuedTrack.reason,
      });

    } catch (err) {
      this.emit('error', { message: `Playback failed: ${err.message}`, error: err });
    }
  }

  /**
   * Skip the current track (user-initiated)
   */
  async skip() {
    if (this.session.currentTrack) {
      const skippedTrack = this.session.currentTrack.track;
      this.session.markSkipped(skippedTrack.id);
      this.radio.handleFeedback(skippedTrack.id, 'skipped');

      // Notify agents about the skip
      await Promise.all([
        this.curator.onTrackPlayed(skippedTrack, 'skipped'),
        this.transition.onTrackPlayed(skippedTrack, 'skipped'),
        this.discovery.onTrackPlayed(skippedTrack, 'skipped'),
        this.mood.onTrackPlayed(skippedTrack, 'skipped'),
      ]);

      this.profile.recordTrackPlay(skippedTrack, 'skipped');
      this.emit('trackSkipped', { track: skippedTrack.toJSON() });
    }

    // Play next from queue
    await this.playNext();
  }

  /**
   * Like the current track
   */
  async likeCurrent() {
    if (!this.session.currentTrack) return;

    const track = this.session.currentTrack.track;
    await this.spotify.likeTrack(track.id);
    this.session.markLiked(track.id);
    this.radio.handleFeedback(track.id, 'liked');

    // Notify agents
    await Promise.all([
      this.curator.onTrackPlayed(track, 'liked'),
      this.discovery.onTrackPlayed(track, 'liked'),
    ]);

    this.profile.recordTrackPlay(track, 'liked');
    this.emit('trackLiked', { track: track.toJSON() });
  }

  /**
   * Play the next track from the queue
   */
  async playNext() {
    // Refill queue if running low
    if (this.session.queue.length <= this.queueRefreshThreshold) {
      await this.fillQueue();
    }

    const next = this.session.getNextFromQueue();
    if (next) {
      await this.playTrack(next);
    }
  }

  /**
   * Pause playback
   */
  async pause() {
    await this.spotify.pause();
    this.session.state = 'paused';
    this.emit('playbackPaused', {});
  }

  /**
   * Resume playback
   */
  async resume() {
    await this.spotify.play();
    this.session.state = 'playing';
    this.emit('playbackResumed', {});
  }

  // ─── Session Controls ─────────────────────────────────────────────────

  setMood(mood) {
    this.session.targetMood = mood;
    this.emit('moodChanged', { mood });
  }

  setEnergyCurve(curve) {
    this.session.energyCurve = curve;
    this.mood.initializeArc(curve);
    this.emit('energyCurveChanged', { curve });
  }

  setDiversityLevel(level) {
    this.session.diversityLevel = Math.max(0, Math.min(1, level));
    this.emit('diversityChanged', { level: this.session.diversityLevel });
  }

  setTempoRange(min, max) {
    this.session.tempoRange = [min, max];
    this.emit('tempoRangeChanged', { min, max });
  }

  // ─── Playlist Operations ──────────────────────────────────────────────

  /**
   * Save the current session as a playlist
   */
  async saveAsPlaylist(name = null) {
    const playlist = await this.radio.saveSessionAsPlaylist(name);
    if (playlist) {
      this.emit('playlistSaved', { playlist });
    }
    return playlist;
  }

  /**
   * Reorder a playlist for optimal DJ flow
   */
  async optimizePlaylist(playlistId) {
    this.emit('status', { message: 'Loading playlist...', phase: 'loading' });

    const tracks = await this.spotify.getAllPlaylistTracks(playlistId);
    await this.spotify.enrichTracksWithFeatures(tracks);

    this.emit('status', { message: 'Optimizing track order...', phase: 'optimizing' });

    const optimized = await this.transition.optimizeTrackOrder(tracks);
    const flow = this.transition.rateSequenceFlow(optimized);
    const originalFlow = this.transition.rateSequenceFlow(tracks);

    this.emit('status', { message: 'Optimization complete!', phase: 'done' });

    return {
      originalOrder: tracks,
      optimizedOrder: optimized,
      originalFlow: originalFlow,
      optimizedFlow: flow,
      improvement: ((flow.score - originalFlow.score) / Math.max(0.01, originalFlow.score) * 100).toFixed(1) + '%',
    };
  }

  /**
   * Analyze a playlist's DJ flow quality
   */
  async analyzePlaylist(playlistId) {
    const tracks = await this.spotify.getAllPlaylistTracks(playlistId);
    await this.spotify.enrichTracksWithFeatures(tracks);
    return this.radio.analyzePlaylistFlow(tracks);
  }

  // ─── Playback Polling ─────────────────────────────────────────────────

  startPolling() {
    if (this.pollInterval) clearInterval(this.pollInterval);

    this.pollInterval = setInterval(async () => {
      try {
        const state = await this.spotify.getPlaybackState();
        if (!state) return;

        // Check if the current track has ended
        if (state.item && this.session.currentTrack) {
          const progress = state.progress_ms || 0;
          const duration = state.item.duration_ms || 0;

          // If track is about to end (within 5 seconds), queue the next
          if (duration > 0 && progress > duration - 5000 && !state.is_playing === false) {
            await this.playNext();
          }
        }

        // Detect if user manually changed the track
        if (state.item && state.item.id !== this.session.currentTrack?.track?.id) {
          this.emit('externalTrackChange', { trackId: state.item.id });
        }

        this.emit('playbackState', {
          isPlaying: state.is_playing,
          progressMs: state.progress_ms,
          durationMs: state.item?.duration_ms,
          device: state.device?.name,
        });

      } catch (err) {
        // Polling errors are non-fatal
        console.warn('[DJ] Poll error:', err.message);
      }
    }, 3000);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  // ─── Status & Diagnostics ─────────────────────────────────────────────

  getTeamStatus() {
    return {
      session: this.session.toJSON(),
      agents: {
        curator: this.curator.getStatus(),
        transition: this.transition.getStatus(),
        discovery: this.discovery.getStatus(),
        mood: this.mood.getStatus(),
      },
      moodJourney: this.mood.getMoodJourneySummary(),
      trackPoolSize: this.radio.trackPool.size,
      profileInitialized: this.profile.initialized,
    };
  }

  /**
   * Clean up when session ends
   */
  destroy() {
    this.stopPolling();
    this.profile.save();
    this.session.state = 'idle';
    this.emit('sessionEnded', { session: this.session.toJSON() });
  }
}
