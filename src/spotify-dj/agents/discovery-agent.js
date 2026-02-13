/**
 * Discovery Agent
 *
 * Responsible for introducing the user to new music they'll love.
 * Goes beyond Spotify's "Discover Weekly" by using active exploration
 * strategies and learning from immediate feedback.
 *
 * Strategies:
 * 1. Related Artist Crawling - follow the artist graph
 * 2. Genre Bridge Tracks - find tracks that bridge two genres the user likes
 * 3. Feature Space Exploration - systematically explore underexplored regions
 * 4. Popularity Diving - find deep cuts from artists the user already likes
 */

import { BaseAgent } from './base-agent.js';
import { featureSimilarity, noveltyScore, computeCentroid } from '../algorithms/feature-similarity.js';

export class DiscoveryAgent extends BaseAgent {
  constructor(spotify, profile) {
    super('Discovery', 'Finds new music the user will love');
    this.spotify = spotify;
    this.profile = profile;

    // Discovery state
    this.exploredArtists = new Set();     // Artists we've already explored
    this.discoveryQueue = [];             // Tracks waiting to be introduced
    this.successfulDiscoveries = [];      // Tracks the user liked
    this.failedDiscoveries = [];          // Tracks the user skipped
    this.discoveryRate = 0.2;             // What fraction of queue should be discoveries
  }

  /**
   * Explore related artists from a seed artist
   */
  async exploreRelatedArtists(artistId) {
    if (this.exploredArtists.has(artistId)) return [];
    this.exploredArtists.add(artistId);

    try {
      const related = await this.spotify.getRelatedArtists(artistId);

      // Filter to artists the user doesn't know well
      const unknown = related.filter(artist => {
        const familiarity = this.profile.getArtistFamiliarity(artist.id);
        return familiarity < 0.3; // Only explore unfamiliar artists
      });

      // Get top tracks from unknown related artists
      const discoveries = [];
      for (const artist of unknown.slice(0, 3)) {
        try {
          const topTracks = await this.spotify.getArtistTopTracks(artist.id);
          await this.spotify.enrichTracksWithFeatures(topTracks);

          // Only keep tracks that are somewhat similar to user's taste
          const matching = topTracks.filter(track => {
            if (!track.hasAudioFeatures) return false;
            const tasteFit = this.profile.computeTasteFit(track);
            return tasteFit > 0.4; // Loose threshold for discovery
          });

          discoveries.push(...matching.slice(0, 3));
        } catch {
          // Skip artist if we can't get their tracks
        }
      }

      this.lastAction = `Explored ${unknown.length} related artists from ${artistId}, found ${discoveries.length} candidates`;
      return discoveries;
    } catch (err) {
      console.warn('[Discovery] Related artist exploration failed:', err);
      return [];
    }
  }

  /**
   * Find tracks that bridge two genre families
   * e.g., electronic + jazz = nu-jazz, acid jazz, electro-jazz
   */
  async findGenreBridgeTracks(genre1, genre2) {
    try {
      const results = await this.spotify.search(
        `genre:"${genre1}" genre:"${genre2}"`,
        ['track'],
        20
      );

      if (results?.tracks?.items) {
        const tracks = results.tracks.items.map(t => {
          const { Track: TrackClass } = require('../models/track.js');
          return new TrackClass(t);
        });
        await this.spotify.enrichTracksWithFeatures(tracks);
        return tracks;
      }
    } catch (err) {
      console.warn('[Discovery] Genre bridge search failed:', err);
    }
    return [];
  }

  /**
   * Find deep cuts from artists the user already likes
   * (Tracks with low popularity from familiar artists)
   */
  async findDeepCuts(knownArtistIds) {
    const deepCuts = [];

    for (const artistId of knownArtistIds.slice(0, 5)) {
      try {
        const topTracks = await this.spotify.getArtistTopTracks(artistId);
        await this.spotify.enrichTracksWithFeatures(topTracks);

        // Filter for less popular tracks
        const deep = topTracks.filter(t => t.popularity < 40 && t.hasAudioFeatures);
        deepCuts.push(...deep);
      } catch {
        // Skip this artist
      }
    }

    this.lastAction = `Found ${deepCuts.length} deep cuts from known artists`;
    return deepCuts;
  }

  async evaluate(candidate, context) {
    const { session } = context;
    const isDiscovery = this.profile.getArtistFamiliarity(candidate.primaryArtistId) < 0.2;

    if (!isDiscovery) {
      return { score: 0.5, reasoning: 'Familiar track', veto: false };
    }

    // For discovery tracks, score based on how well they fit while being new
    const tasteFit = this.profile.computeTasteFit(candidate);
    const familiarityBonus = 1 - this.profile.getArtistFamiliarity(candidate.primaryArtistId);

    // Discovery success rate influences confidence
    const successRate = this.successfulDiscoveries.length /
      Math.max(1, this.successfulDiscoveries.length + this.failedDiscoveries.length);

    // Higher discovery level = more aggressive discovery scoring
    const discoveryBoost = session.diversityLevel * 0.3;

    const score = tasteFit * 0.5 + familiarityBonus * 0.3 + successRate * 0.2 + discoveryBoost;

    return {
      score: Math.min(1, score),
      reasoning: `Discovery candidate (taste fit: ${(tasteFit * 100).toFixed(0)}%, novelty: ${(familiarityBonus * 100).toFixed(0)}%)`,
      veto: false,
    };
  }

  async suggest(context) {
    const { currentTrack, session } = context;

    // Should we suggest a discovery track?
    const tracksPlayed = session.history.length;
    const discoveriesSoFar = session.history.filter(q =>
      this.profile.getArtistFamiliarity(q.track.primaryArtistId) < 0.2
    ).length;
    const currentDiscoveryRate = discoveriesSoFar / Math.max(1, tracksPlayed);

    if (currentDiscoveryRate > this.discoveryRate && tracksPlayed > 3) {
      return []; // Already at discovery quota
    }

    // Try to find new tracks from related artists
    if (currentTrack?.primaryArtistId) {
      const discoveries = await this.exploreRelatedArtists(currentTrack.primaryArtistId);
      if (discoveries.length > 0) {
        return discoveries.slice(0, 5);
      }
    }

    return this.discoveryQueue.slice(0, 5);
  }

  async onTrackPlayed(track, reaction) {
    const isDiscovery = this.profile.getArtistFamiliarity(track.primaryArtistId) < 0.2;

    if (isDiscovery) {
      if (reaction === 'liked') {
        this.successfulDiscoveries.push(track);
        this.discoveryRate = Math.min(0.4, this.discoveryRate + 0.02);
        this.confidence = Math.min(1.0, this.confidence + 0.1);
        this.lastAction = `Discovery success: "${track.name}" - increasing discovery rate`;
      } else if (reaction === 'skipped') {
        this.failedDiscoveries.push(track);
        this.discoveryRate = Math.max(0.05, this.discoveryRate - 0.03);
        this.confidence = Math.max(0.2, this.confidence - 0.1);
        this.lastAction = `Discovery skip: "${track.name}" - reducing discovery rate`;
      }
    }
  }
}
