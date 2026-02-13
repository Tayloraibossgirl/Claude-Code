/**
 * Curator Agent
 *
 * The track selection specialist. Responsible for maintaining a rich
 * pool of candidate tracks and scoring them based on overall quality
 * and fit. The Curator manages the relationship between the user's
 * library and external recommendations.
 */

import { BaseAgent } from './base-agent.js';
import { featureSimilarity, findMostSimilar } from '../algorithms/feature-similarity.js';

export class CuratorAgent extends BaseAgent {
  constructor(spotify, profile) {
    super('Curator', 'Selects and scores tracks for the queue');
    this.spotify = spotify;
    this.profile = profile;

    // The curator's curated pools
    this.familiarPool = [];    // Tracks the user knows and likes
    this.discoveryPool = [];   // Tracks for exploration
    this.contextPool = [];     // Tracks matching current context

    // Track artist genres cache
    this.artistGenresCache = new Map();
  }

  async initialize(likedSongs, topTracks, playlists) {
    this.familiarPool = [...likedSongs, ...topTracks];

    // Remove duplicates
    const seen = new Set();
    this.familiarPool = this.familiarPool.filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });

    this.lastAction = `Initialized with ${this.familiarPool.length} familiar tracks`;
    this.confidence = 0.7;
  }

  /**
   * Fetch fresh discovery tracks from Spotify recommendations
   */
  async refreshDiscoveryPool(seedTracks, targetFeatures = {}) {
    try {
      const seeds = seedTracks.slice(0, 5).map(t => t.id);
      if (seeds.length === 0) return;

      const recommendations = await this.spotify.getRecommendations({
        seedTracks: seeds,
        limit: 40,
        ...targetFeatures,
      });

      await this.spotify.enrichTracksWithFeatures(recommendations);
      this.discoveryPool = recommendations;
      this.lastAction = `Refreshed discovery pool: ${recommendations.length} tracks`;
    } catch (err) {
      console.warn('[Curator] Discovery refresh failed:', err);
    }
  }

  /**
   * Build a context-specific pool based on current mood/time/situation
   */
  async buildContextPool(context) {
    const { targetMood, targetEnergy, session } = context;

    // Start with familiar tracks that match the context
    this.contextPool = this.familiarPool.filter(track => {
      if (!track.hasAudioFeatures) return false;
      if (session.playedTrackIds.has(track.id)) return false;

      // Loose energy filter
      const energyDiff = Math.abs(track.energy - targetEnergy);
      return energyDiff < 0.4;
    });

    // Add discovery tracks that match
    const matchingDiscovery = this.discoveryPool.filter(track => {
      if (!track.hasAudioFeatures) return false;
      if (session.playedTrackIds.has(track.id)) return false;
      const energyDiff = Math.abs(track.energy - targetEnergy);
      return energyDiff < 0.35;
    });

    this.contextPool = [...this.contextPool, ...matchingDiscovery];
    this.lastAction = `Built context pool: ${this.contextPool.length} tracks (energy target: ${targetEnergy.toFixed(2)})`;

    return this.contextPool;
  }

  async evaluate(candidate, context) {
    const { currentTrack, session } = context;

    // Taste fit from listener profile
    const tasteFit = this.profile.computeTasteFit(candidate);

    // Artist affinity
    const artistAffinity = this.profile.getArtistAffinity(candidate.primaryArtistId);

    // Was this track previously skipped?
    const wasPreviouslySkipped = this.profile.trackMemory[candidate.id]?.skipped > 0;

    // Combine into curator score
    let score = tasteFit * 0.5 + (artistAffinity + 1) / 2 * 0.3 + (candidate.popularity / 100) * 0.2;

    if (wasPreviouslySkipped) score *= 0.5; // Heavy penalty for previously skipped tracks

    return {
      score,
      reasoning: `Taste fit: ${(tasteFit * 100).toFixed(0)}%, Artist affinity: ${(artistAffinity * 100).toFixed(0)}%`,
      veto: wasPreviouslySkipped && this.profile.trackMemory[candidate.id].skipped > 2,
    };
  }

  async suggest(context) {
    const { currentTrack, session } = context;

    if (!currentTrack?.hasAudioFeatures) {
      // No current track - suggest from top of familiar pool
      return this.familiarPool.slice(0, 20);
    }

    // Find tracks similar to what's playing now
    const similar = findMostSimilar(currentTrack, this.contextPool, 20);
    return similar.map(s => s.track);
  }

  async onTrackPlayed(track, reaction) {
    if (reaction === 'liked') {
      this.confidence = Math.min(1.0, this.confidence + 0.05);
      // Add similar tracks to next discovery refresh
      this.lastAction = `User liked "${track.name}" - boosting confidence`;
    } else if (reaction === 'skipped') {
      this.confidence = Math.max(0.2, this.confidence - 0.08);
      this.lastAction = `User skipped "${track.name}" - adjusting approach`;
    }
  }
}
