/**
 * Listener Profile - builds and maintains a model of the user's listening preferences
 * This goes beyond what Spotify tracks by building temporal patterns,
 * mood correlations, and exploration boundaries.
 */

export class ListenerProfile {
  constructor() {
    this.initialized = false;

    // Core taste vectors (weighted averages from listening history)
    this.tasteVector = {
      energy: 0.5,
      valence: 0.5,
      danceability: 0.5,
      acousticness: 0.3,
      instrumentalness: 0.2,
      tempoCenter: 120,
    };

    // Genre affinity map: genre -> { score, playCount, skipRate, lastPlayed }
    this.genreAffinities = {};

    // Artist familiarity: artistId -> { name, playCount, likeCount, skipCount, lastPlayed }
    this.artistFamiliarity = {};

    // Temporal patterns: what time of day maps to what moods
    this.temporalPatterns = {
      morning: { energy: 0.4, valence: 0.5 },    // 6-12
      afternoon: { energy: 0.6, valence: 0.6 },   // 12-17
      evening: { energy: 0.7, valence: 0.5 },     // 17-22
      night: { energy: 0.5, valence: 0.4 },       // 22-6
    };

    // Exploration boundaries - how far from comfort zone we've gone successfully
    this.explorationRadius = 0.2; // starts small, grows with successful discoveries

    // Track-level memory for skip/like patterns
    this.trackMemory = {}; // trackId -> { played, skipped, liked, lastPlayed }

    // Session history summaries
    this.sessionSummaries = [];
  }

  /**
   * Initialize profile from Spotify top tracks and recent history
   */
  initializeFromTopTracks(tracks) {
    if (tracks.length === 0) return;

    const featuredTracks = tracks.filter(t => t.hasAudioFeatures);
    if (featuredTracks.length === 0) return;

    // Compute weighted average of audio features (more recent/popular = higher weight)
    let totalWeight = 0;
    const sums = { energy: 0, valence: 0, danceability: 0, acousticness: 0, instrumentalness: 0, tempo: 0 };

    featuredTracks.forEach((track, idx) => {
      const weight = (featuredTracks.length - idx) / featuredTracks.length; // position weight
      totalWeight += weight;

      sums.energy += track.energy * weight;
      sums.valence += track.valence * weight;
      sums.danceability += track.danceability * weight;
      sums.acousticness += track.acousticness * weight;
      sums.instrumentalness += track.instrumentalness * weight;
      sums.tempo += track.normalizedTempo * weight;
    });

    this.tasteVector = {
      energy: sums.energy / totalWeight,
      valence: sums.valence / totalWeight,
      danceability: sums.danceability / totalWeight,
      acousticness: sums.acousticness / totalWeight,
      instrumentalness: sums.instrumentalness / totalWeight,
      tempoCenter: sums.tempo / totalWeight,
    };

    // Build artist familiarity from top tracks
    tracks.forEach(track => {
      track.artists.forEach(artist => {
        if (!this.artistFamiliarity[artist.id]) {
          this.artistFamiliarity[artist.id] = {
            name: artist.name,
            playCount: 0,
            likeCount: 0,
            skipCount: 0,
            lastPlayed: null,
          };
        }
        this.artistFamiliarity[artist.id].playCount++;
      });
    });

    this.initialized = true;
  }

  /**
   * Update the profile based on a played track and user reaction
   */
  recordTrackPlay(track, reaction = 'played') {
    // Update track memory
    if (!this.trackMemory[track.id]) {
      this.trackMemory[track.id] = { played: 0, skipped: 0, liked: 0, lastPlayed: null };
    }
    const mem = this.trackMemory[track.id];
    mem.lastPlayed = Date.now();

    if (reaction === 'skipped') {
      mem.skipped++;
    } else if (reaction === 'liked') {
      mem.liked++;
      mem.played++;
    } else {
      mem.played++;
    }

    // Update artist familiarity
    track.artists.forEach(artist => {
      if (!this.artistFamiliarity[artist.id]) {
        this.artistFamiliarity[artist.id] = {
          name: artist.name,
          playCount: 0,
          likeCount: 0,
          skipCount: 0,
          lastPlayed: null,
        };
      }
      const af = this.artistFamiliarity[artist.id];
      af.lastPlayed = Date.now();

      if (reaction === 'skipped') {
        af.skipCount++;
      } else if (reaction === 'liked') {
        af.likeCount++;
        af.playCount++;
      } else {
        af.playCount++;
      }
    });

    // Slowly adapt taste vector towards liked tracks, away from skipped
    if (track.hasAudioFeatures && reaction !== 'played') {
      const learningRate = reaction === 'liked' ? 0.05 : -0.03;
      this.tasteVector.energy += (track.energy - this.tasteVector.energy) * learningRate;
      this.tasteVector.valence += (track.valence - this.tasteVector.valence) * learningRate;
      this.tasteVector.danceability += (track.danceability - this.tasteVector.danceability) * learningRate;
      this.tasteVector.acousticness += (track.acousticness - this.tasteVector.acousticness) * learningRate;
      this.tasteVector.instrumentalness += (track.instrumentalness - this.tasteVector.instrumentalness) * learningRate;
    }

    // Update temporal patterns
    this.updateTemporalPattern(track, reaction);
  }

  updateTemporalPattern(track, reaction) {
    if (!track.hasAudioFeatures) return;

    const hour = new Date().getHours();
    let period;
    if (hour >= 6 && hour < 12) period = 'morning';
    else if (hour >= 12 && hour < 17) period = 'afternoon';
    else if (hour >= 17 && hour < 22) period = 'evening';
    else period = 'night';

    const pattern = this.temporalPatterns[period];
    const rate = reaction === 'liked' ? 0.08 : reaction === 'skipped' ? -0.04 : 0.02;

    pattern.energy += (track.energy - pattern.energy) * rate;
    pattern.valence += (track.valence - pattern.valence) * rate;
  }

  /**
   * Get the current time-of-day mood suggestion
   */
  getCurrentTimeMood() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return this.temporalPatterns.morning;
    if (hour >= 12 && hour < 17) return this.temporalPatterns.afternoon;
    if (hour >= 17 && hour < 22) return this.temporalPatterns.evening;
    return this.temporalPatterns.night;
  }

  /**
   * How familiar is the user with a given artist?
   * Returns 0 (unknown) to 1 (very familiar)
   */
  getArtistFamiliarity(artistId) {
    const af = this.artistFamiliarity[artistId];
    if (!af) return 0;
    // Sigmoid-like curve: rapid rise at first, then plateaus
    return 1 - 1 / (1 + af.playCount * 0.3);
  }

  /**
   * What's the user's affinity for a specific artist?
   * Considers play count, like rate, and skip rate
   * Returns -1 (avoid) to 1 (loves)
   */
  getArtistAffinity(artistId) {
    const af = this.artistFamiliarity[artistId];
    if (!af || af.playCount === 0) return 0;

    const likeRate = af.likeCount / af.playCount;
    const skipRate = af.skipCount / Math.max(1, af.playCount + af.skipCount);

    return Math.max(-1, Math.min(1, (likeRate - skipRate) * 2));
  }

  /**
   * Compute how well a track fits the user's current taste profile
   * Returns 0.0 - 1.0
   */
  computeTasteFit(track) {
    if (!track.hasAudioFeatures) return 0.5; // neutral if no data

    const tv = this.tasteVector;
    const timeMood = this.getCurrentTimeMood();

    // Weighted distance from taste vector
    const diffs = [
      (track.energy - (tv.energy * 0.6 + timeMood.energy * 0.4)) ** 2 * 2,
      (track.valence - (tv.valence * 0.6 + timeMood.valence * 0.4)) ** 2 * 1.5,
      (track.danceability - tv.danceability) ** 2,
      (track.acousticness - tv.acousticness) ** 2 * 0.5,
      (track.instrumentalness - tv.instrumentalness) ** 2 * 0.5,
      ((track.normalizedTempo - tv.tempoCenter) / 40) ** 2 * 0.5,
    ];

    const distance = Math.sqrt(diffs.reduce((sum, d) => sum + d, 0) / diffs.length);

    // Convert distance to similarity (0-1)
    return Math.max(0, 1 - distance);
  }

  /**
   * Save profile to localStorage
   */
  save() {
    try {
      localStorage.setItem('dj-listener-profile', JSON.stringify({
        tasteVector: this.tasteVector,
        genreAffinities: this.genreAffinities,
        temporalPatterns: this.temporalPatterns,
        explorationRadius: this.explorationRadius,
        artistFamiliarity: this.artistFamiliarity,
        initialized: this.initialized,
      }));
    } catch (e) {
      console.warn('Failed to save listener profile:', e);
    }
  }

  /**
   * Load profile from localStorage
   */
  load() {
    try {
      const data = JSON.parse(localStorage.getItem('dj-listener-profile'));
      if (data) {
        Object.assign(this, data);
        return true;
      }
    } catch (e) {
      console.warn('Failed to load listener profile:', e);
    }
    return false;
  }
}
