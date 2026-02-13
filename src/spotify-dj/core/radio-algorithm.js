/**
 * FlowRadio - A replacement radio algorithm for Spotify
 *
 * Why this is better than Spotify's algorithm:
 *
 * 1. HARMONIC AWARENESS - Spotify picks "similar vibes" but ignores musical key.
 *    FlowRadio uses the Camelot Wheel to ensure every transition is harmonically
 *    compatible, like a professional DJ mixing in key.
 *
 * 2. ENERGY ARC MANAGEMENT - Spotify's radio is flat and random. FlowRadio
 *    plans an energy arc across the session (build, wave, peak, journey)
 *    so the listening experience tells an emotional story.
 *
 * 3. TEMPO CONTINUITY - Spotify ignores BPM entirely. FlowRadio ensures smooth
 *    tempo transitions with half-time/double-time awareness.
 *
 * 4. ANTI-ECHO-CHAMBER - Spotify traps you in a narrow taste bubble.
 *    FlowRadio has artist cooldown, genre family balancing, and popularity
 *    spread to keep recommendations diverse.
 *
 * 5. ADAPTIVE LEARNING - FlowRadio learns from skip/like patterns within
 *    a session to adjust feature weights in real-time, not just across weeks.
 *
 * 6. TIME-OF-DAY AWARENESS - Morning recommendations differ from late night.
 *    FlowRadio builds temporal mood profiles from your listening history.
 *
 * 7. DISCOVERY WITH SAFETY NET - Spotify either plays all familiar or throws in
 *    random "Discover" tracks. FlowRadio has a tunable exploration radius that
 *    gradually expands when discoveries are successful.
 */

import { harmonicCompatibility } from '../algorithms/harmonic-mixing.js';
import { tempoCompatibility } from '../algorithms/tempo-matching.js';
import { moodFitScore, energyContinuityScore, classifyTrackMood } from '../algorithms/mood-arc.js';
import { compositeDiversityScore } from '../algorithms/diversity-scorer.js';
import { featureSimilarity, findMostSimilar, computeCentroid } from '../algorithms/feature-similarity.js';
import { QueuedTrack } from '../models/track.js';

export class FlowRadioAlgorithm {
  constructor(spotifyClient, session, listenerProfile) {
    this.spotify = spotifyClient;
    this.session = session;
    this.profile = listenerProfile;

    // Track pool - the universe of tracks we can choose from
    this.trackPool = new Map();       // trackId -> Track
    this.poolSources = new Set();     // Where our tracks came from

    // Internal state
    this.centroid = null;             // Average features of pool
    this.featureWeights = null;       // Adaptive feature weights
    this.lastRefreshTime = 0;
    this.seedTracks = [];             // Tracks used to seed recommendations
  }

  /**
   * Initialize the algorithm with a track pool from various sources
   */
  async initialize(options = {}) {
    const {
      seedPlaylistIds = [],
      useLikedSongs = true,
      useTopTracks = true,
      useRecentlyPlayed = true,
      maxPoolSize = 500,
    } = options;

    console.log('[FlowRadio] Initializing track pool...');

    // Gather tracks from multiple sources in parallel
    const trackSources = [];

    if (useLikedSongs) {
      trackSources.push(
        this.spotify.getAllLikedSongs(200).then(tracks => {
          this.poolSources.add('liked_songs');
          return tracks;
        }).catch(() => [])
      );
    }

    if (useTopTracks) {
      trackSources.push(
        Promise.all([
          this.spotify.getTopTracks('short_term', 50),
          this.spotify.getTopTracks('medium_term', 50),
          this.spotify.getTopTracks('long_term', 50),
        ]).then(([short, medium, long]) => {
          this.poolSources.add('top_tracks');
          // Weight short-term tracks higher by including them first
          return [...short, ...medium, ...long];
        }).catch(() => [])
      );
    }

    if (useRecentlyPlayed) {
      trackSources.push(
        this.spotify.getRecentlyPlayed(50).then(tracks => {
          this.poolSources.add('recently_played');
          return tracks;
        }).catch(() => [])
      );
    }

    for (const playlistId of seedPlaylistIds) {
      trackSources.push(
        this.spotify.getAllPlaylistTracks(playlistId, 200).then(tracks => {
          this.poolSources.add(`playlist_${playlistId}`);
          return tracks;
        }).catch(() => [])
      );
    }

    const allTrackArrays = await Promise.all(trackSources);
    const allTracks = allTrackArrays.flat();

    // Deduplicate by track ID
    const uniqueTracks = new Map();
    allTracks.forEach(track => {
      if (!uniqueTracks.has(track.id)) {
        uniqueTracks.set(track.id, track);
      }
    });

    // Limit pool size
    const poolTracks = [...uniqueTracks.values()].slice(0, maxPoolSize);

    // Enrich with audio features in batches
    console.log(`[FlowRadio] Enriching ${poolTracks.length} tracks with audio features...`);
    await this.spotify.enrichTracksWithFeatures(poolTracks);

    // Store in pool
    poolTracks.forEach(track => this.trackPool.set(track.id, track));

    // Initialize listener profile if needed
    if (!this.profile.initialized) {
      this.profile.initializeFromTopTracks(poolTracks.filter(t => t.hasAudioFeatures));
    }

    // Compute pool centroid
    this.centroid = computeCentroid(poolTracks);

    // Store seed tracks for recommendation seeding
    this.seedTracks = poolTracks.filter(t => t.hasAudioFeatures).slice(0, 20);

    console.log(`[FlowRadio] Initialized with ${this.trackPool.size} tracks from ${this.poolSources.size} sources`);
  }

  /**
   * Score a candidate track considering all dimensions
   * This is the core scoring function that makes FlowRadio superior
   */
  scoreCandidate(candidate, currentTrack, session) {
    if (!candidate.hasAudioFeatures) return { total: 0.3, breakdown: {} };

    const weights = session.weights;
    const targetEnergy = session.getTargetEnergy();

    // 1. Harmonic compatibility with current track
    const harmonicScore = currentTrack?.hasAudioFeatures
      ? harmonicCompatibility(currentTrack.key, currentTrack.mode, candidate.key, candidate.mode)
      : 0.5;

    // 2. Tempo compatibility
    const tempoScore = currentTrack?.hasAudioFeatures
      ? tempoCompatibility(currentTrack.tempo, candidate.tempo)
      : 0.5;

    // 3. Energy fit (does it match our energy arc?)
    const currentEnergy = currentTrack?.energy ?? 0.5;
    const energyScore = energyContinuityScore(currentEnergy, candidate.energy, targetEnergy);

    // 4. Mood continuity
    const moodScore = moodFitScore(candidate, session.targetMood);

    // 5. Diversity (anti-echo-chamber)
    const diversityResult = compositeDiversityScore(candidate, session, {
      diversityLevel: session.diversityLevel,
      trackMemory: this.profile.trackMemory,
    });
    const diversityScore = diversityResult.composite;

    // 6. Feature similarity to overall taste (with time-of-day adjustment)
    const tasteFit = this.profile.computeTasteFit(candidate);

    // 7. Discovery bonus - slight bonus for tracks from outside the user's core taste
    const artistFamiliarity = this.profile.getArtistFamiliarity(candidate.primaryArtistId);
    const discoveryScore = session.diversityLevel > 0.3
      ? 0.5 + (1 - artistFamiliarity) * 0.5 * session.diversityLevel
      : artistFamiliarity * 0.8 + 0.2;

    // 8. User affinity for this artist
    const artistAffinity = this.profile.getArtistAffinity(candidate.primaryArtistId);
    const affinityBonus = (artistAffinity + 1) / 2; // Normalize -1..1 to 0..1

    // Composite score with configurable weights
    const breakdown = {
      harmonic: harmonicScore,
      tempo: tempoScore,
      energy: energyScore,
      mood: moodScore,
      diversity: diversityScore,
      taste: tasteFit,
      discovery: discoveryScore,
      affinity: affinityBonus,
    };

    const total =
      harmonicScore * weights.harmonicCompatibility +
      tempoScore * weights.tempoSimilarity +
      energyScore * weights.energyFit +
      moodScore * weights.moodContinuity +
      diversityScore * weights.artistDiversity +
      diversityScore * weights.genreDiversity +
      discoveryScore * weights.discovery +
      tasteFit * 0.10 +
      affinityBonus * 0.05;

    return { total, breakdown };
  }

  /**
   * Select the next N tracks for the queue
   * This is the main entry point for the radio algorithm
   */
  async selectNextTracks(count = 5) {
    const currentTrack = this.session.currentTrack?.track || null;
    const candidates = this.getCandidatePool(currentTrack);

    // Score all candidates
    const scored = candidates.map(track => {
      const { total, breakdown } = this.scoreCandidate(track, currentTrack, this.session);
      return { track, score: total, breakdown };
    });

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    // Add controlled randomness to prevent predictability
    // Top 20% of candidates get shuffled slightly
    const topTier = Math.max(count * 3, 15);
    const topCandidates = scored.slice(0, topTier);
    this.addControlledRandomness(topCandidates);

    // Select top N after randomization
    const selected = topCandidates.slice(0, count);

    // Convert to QueuedTracks with reasoning
    const queuedTracks = selected.map(({ track, score, breakdown }) => {
      const reason = this.generateReason(breakdown, track);
      return new QueuedTrack(track, reason, score);
    });

    // If pool is getting thin, refresh with new recommendations
    if (candidates.length < count * 3) {
      this.refreshPool();
    }

    return queuedTracks;
  }

  /**
   * Get candidate tracks from the pool, filtered by basic constraints
   */
  getCandidatePool(currentTrack) {
    const played = this.session.playedTrackIds;
    const skipped = this.session.skippedTracks;
    const [minBpm, maxBpm] = this.session.tempoRange;

    return [...this.trackPool.values()].filter(track => {
      // Never repeat in same session
      if (played.has(track.id)) return false;
      // Respect skips (user didn't like these)
      if (skipped.has(track.id)) return false;
      // Must have audio features for proper scoring
      if (!track.hasAudioFeatures) return false;
      // Respect tempo bounds if set
      if (track.normalizedTempo < minBpm || track.normalizedTempo > maxBpm) return false;

      return true;
    });
  }

  /**
   * Add controlled randomness to prevent deterministic ordering
   * Uses a weighted shuffle where higher-scored tracks are more likely to stay near top
   */
  addControlledRandomness(scored) {
    const randomFactor = 0.15; // How much randomness to inject
    scored.forEach(item => {
      item.score += (Math.random() - 0.5) * randomFactor;
    });
    scored.sort((a, b) => b.score - a.score);
  }

  /**
   * Refresh the track pool with fresh recommendations from Spotify
   */
  async refreshPool() {
    try {
      const seedTrackIds = this.seedTracks
        .filter(t => !this.session.skippedTracks.has(t.id))
        .slice(0, 5)
        .map(t => t.id);

      if (seedTrackIds.length === 0) return;

      const targetEnergy = this.session.getTargetEnergy();
      const timeMood = this.profile.getCurrentTimeMood();

      const newTracks = await this.spotify.getRecommendations({
        seedTracks: seedTrackIds,
        limit: 50,
        target_energy: targetEnergy,
        target_valence: timeMood.valence,
        min_popularity: 10, // Avoid very obscure tracks unless desired
      });

      if (newTracks.length > 0) {
        await this.spotify.enrichTracksWithFeatures(newTracks);
        newTracks.forEach(track => {
          if (!this.trackPool.has(track.id)) {
            this.trackPool.set(track.id, track);
          }
        });
        console.log(`[FlowRadio] Refreshed pool with ${newTracks.length} new tracks`);
      }
    } catch (err) {
      console.warn('[FlowRadio] Pool refresh failed:', err);
    }
  }

  /**
   * Handle user feedback to adapt the algorithm in real-time
   */
  handleFeedback(trackId, reaction) {
    const track = this.trackPool.get(trackId);
    if (track) {
      this.profile.recordTrackPlay(track, reaction);

      // Update seed tracks based on feedback
      if (reaction === 'liked') {
        this.seedTracks = [track, ...this.seedTracks.slice(0, 19)];
        this.session.markLiked(trackId);
      } else if (reaction === 'skipped') {
        this.session.markSkipped(trackId);
        this.seedTracks = this.seedTracks.filter(t => t.id !== trackId);
      }
    }

    // Save updated profile
    this.profile.save();
  }

  /**
   * Generate a human-readable reason for why a track was selected
   */
  generateReason(breakdown, track) {
    const reasons = [];

    if (breakdown.harmonic >= 0.85) reasons.push('harmonically compatible');
    if (breakdown.tempo >= 0.9) reasons.push('matching tempo');
    if (breakdown.energy >= 0.8) reasons.push('fits the energy arc');
    if (breakdown.mood >= 0.7) reasons.push('matches the mood');
    if (breakdown.diversity >= 0.8) reasons.push('adds variety');
    if (breakdown.discovery >= 0.7 && breakdown.taste < 0.6) reasons.push('new discovery');
    if (breakdown.affinity >= 0.8) reasons.push('from an artist you love');

    if (reasons.length === 0) reasons.push('great overall fit');

    return reasons.join(', ');
  }

  /**
   * Create a smart playlist from the current session
   */
  async saveSessionAsPlaylist(name = null) {
    const playedTracks = this.session.history.filter(q => !q.skipped);
    if (playedTracks.length === 0) return null;

    const playlistName = name || `DJ Session - ${new Date().toLocaleDateString()}`;
    const playlist = await this.spotify.createPlaylist(
      playlistName,
      `Generated by FlowRadio AI DJ. ${playedTracks.length} tracks, ${this.session.energyCurve} energy curve.`
    );

    const uris = playedTracks.map(q => q.track.uri);
    await this.spotify.addTracksToPlaylist(playlist.id, uris);

    return playlist;
  }

  /**
   * Analyze a playlist and return insights about its flow quality
   */
  analyzePlaylistFlow(tracks) {
    if (tracks.length < 2) return { score: 1, issues: [] };

    const issues = [];
    let harmonicTotal = 0;
    let tempoTotal = 0;
    let energyJumps = 0;

    for (let i = 0; i < tracks.length - 1; i++) {
      const current = tracks[i];
      const next = tracks[i + 1];

      if (current.hasAudioFeatures && next.hasAudioFeatures) {
        const harmonic = harmonicCompatibility(current.key, current.mode, next.key, next.mode);
        harmonicTotal += harmonic;
        if (harmonic < 0.35) {
          issues.push(`Harsh key change at track ${i + 1} -> ${i + 2}`);
        }

        const tempo = tempoCompatibility(current.tempo, next.tempo);
        tempoTotal += tempo;
        if (tempo < 0.5) {
          issues.push(`Big tempo jump at track ${i + 1} (${Math.round(current.tempo)} BPM) -> ${i + 2} (${Math.round(next.tempo)} BPM)`);
        }

        const energyDiff = Math.abs(current.energy - next.energy);
        if (energyDiff > 0.3) {
          energyJumps++;
          issues.push(`Energy whiplash at track ${i + 1} -> ${i + 2}`);
        }
      }
    }

    const n = Math.max(1, tracks.length - 1);
    return {
      harmonicFlow: harmonicTotal / n,
      tempoFlow: tempoTotal / n,
      energySmoothness: 1 - energyJumps / n,
      overallScore: (harmonicTotal / n + tempoTotal / n + (1 - energyJumps / n)) / 3,
      issues,
    };
  }
}
