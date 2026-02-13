/**
 * Diversity Scorer
 *
 * Prevents the "echo chamber" problem in Spotify's algorithm.
 * Spotify tends to lock you into a narrow band of similar artists/genres.
 * This scorer actively rewards diversity while keeping coherence.
 *
 * Key innovations:
 * 1. Artist cooldown - don't repeat an artist too soon
 * 2. Genre family balancing - explore across genre boundaries
 * 3. Popularity spread - mix popular tracks with deeper cuts
 * 4. Temporal freshness - recently played tracks get penalized
 */

import { GENRE_FAMILIES } from '../config/spotify-config.js';

/**
 * Calculate artist diversity score for a candidate track
 * Penalizes artists that were recently played
 *
 * @param {Track} candidate - The candidate track
 * @param {DJSession} session - Current session state
 * @returns {number} 0.0 - 1.0 (1.0 = very diverse artist choice)
 */
export function artistDiversityScore(candidate, session) {
  const candidateArtistIds = new Set(candidate.artists.map(a => a.id));

  // Check recent history
  const recentHistory = session.history.slice(-15);
  let penalty = 0;

  recentHistory.forEach((queued, idx) => {
    const recency = 1 - idx / recentHistory.length; // More recent = higher penalty
    const overlap = queued.track.artists.some(a => candidateArtistIds.has(a.id));

    if (overlap) {
      // Same artist played recently - big penalty
      penalty += recency * 0.4;
    }
  });

  // Check total plays of this artist in the session
  const artistPlays = candidate.artists.reduce((sum, a) => {
    return sum + (session.artistsPlayed[a.id] || 0);
  }, 0);

  // Penalize over-represented artists
  if (artistPlays > 2) penalty += 0.3;
  else if (artistPlays > 1) penalty += 0.15;

  return Math.max(0, 1 - penalty);
}

/**
 * Calculate genre diversity score
 * Rewards exploring new genre families while maintaining coherence
 *
 * @param {string[]} candidateGenres - Genres associated with the candidate track's artist
 * @param {DJSession} session - Current session state
 * @param {number} diversityLevel - 0-1, how much diversity to encourage
 * @returns {number} 0.0 - 1.0
 */
export function genreDiversityScore(candidateGenres, session, diversityLevel = 0.5) {
  if (!candidateGenres || candidateGenres.length === 0) return 0.5;

  // Map candidate genres to genre families
  const candidateFamilies = new Set();
  for (const genre of candidateGenres) {
    for (const [family, members] of Object.entries(GENRE_FAMILIES)) {
      if (members.some(m => genre.toLowerCase().includes(m))) {
        candidateFamilies.add(family);
      }
    }
  }

  // What genre families have we played?
  const playedFamilies = new Set(Object.keys(session.genresPlayed));

  // Balance between exploration and coherence
  const isNewFamily = [...candidateFamilies].some(f => !playedFamilies.has(f));
  const isKnownFamily = [...candidateFamilies].some(f => playedFamilies.has(f));

  if (isNewFamily && diversityLevel > 0.3) {
    // New genre family - reward based on diversity level
    return 0.5 + diversityLevel * 0.5;
  } else if (isKnownFamily) {
    // Known genre family - check if over-represented
    const familyCounts = {};
    for (const [genre, count] of Object.entries(session.genresPlayed)) {
      for (const [family, members] of Object.entries(GENRE_FAMILIES)) {
        if (members.some(m => genre.toLowerCase().includes(m))) {
          familyCounts[family] = (familyCounts[family] || 0) + count;
        }
      }
    }

    const totalPlayed = Object.values(familyCounts).reduce((s, c) => s + c, 0) || 1;
    const candidateFamilyCount = [...candidateFamilies].reduce(
      (max, f) => Math.max(max, familyCounts[f] || 0), 0
    );
    const representation = candidateFamilyCount / totalPlayed;

    // Penalize over-representation
    if (representation > 0.5) return 0.3;
    if (representation > 0.3) return 0.6;
    return 0.8;
  }

  return 0.5; // Unknown genres
}

/**
 * Calculate popularity diversity score
 * Ensures a good mix of popular and deep cuts
 *
 * @param {number} candidatePopularity - 0-100 popularity score
 * @param {DJSession} session - Current session state
 * @param {number} diversityLevel - 0-1
 * @returns {number} 0.0 - 1.0
 */
export function popularityDiversityScore(candidatePopularity, session, diversityLevel = 0.5) {
  const recentPopularities = session.history.slice(-10).map(q => q.track.popularity);
  if (recentPopularities.length === 0) return 0.7; // Slight bias toward popular initially

  const avgRecent = recentPopularities.reduce((s, p) => s + p, 0) / recentPopularities.length;

  // Are we in an echo chamber of similar popularity?
  const popStdDev = Math.sqrt(
    recentPopularities.reduce((s, p) => s + (p - avgRecent) ** 2, 0) / recentPopularities.length
  );

  if (popStdDev < 10) {
    // Low variety - reward different popularity levels
    const diffFromAvg = Math.abs(candidatePopularity - avgRecent);
    if (diffFromAvg > 20) return 0.8 + diversityLevel * 0.2;
    if (diffFromAvg > 10) return 0.7;
    return 0.4; // Same popularity range - penalize slightly
  }

  return 0.6; // Reasonable variety already
}

/**
 * Temporal freshness - penalize tracks played recently (even across sessions)
 */
export function temporalFreshnessScore(trackId, session, trackMemory = {}) {
  // Check if played in current session
  if (session.playedTrackIds.has(trackId)) return 0; // Never repeat in same session

  // Check track memory for cross-session freshness
  const mem = trackMemory[trackId];
  if (mem?.lastPlayed) {
    const hoursSincePlay = (Date.now() - mem.lastPlayed) / (1000 * 60 * 60);
    if (hoursSincePlay < 1) return 0.1;
    if (hoursSincePlay < 6) return 0.4;
    if (hoursSincePlay < 24) return 0.7;
    if (hoursSincePlay < 72) return 0.85;
  }

  return 1.0; // Fresh!
}

/**
 * Composite diversity score combining all diversity dimensions
 */
export function compositeDiversityScore(candidate, session, options = {}) {
  const {
    diversityLevel = 0.5,
    candidateGenres = [],
    trackMemory = {},
  } = options;

  const scores = {
    artist: artistDiversityScore(candidate, session),
    genre: genreDiversityScore(candidateGenres, session, diversityLevel),
    popularity: popularityDiversityScore(candidate.popularity, session, diversityLevel),
    freshness: temporalFreshnessScore(candidate.id, session, trackMemory),
  };

  // Weighted average
  const weights = { artist: 0.35, genre: 0.25, popularity: 0.15, freshness: 0.25 };
  let total = 0;
  let weightSum = 0;

  for (const [key, score] of Object.entries(scores)) {
    total += score * weights[key];
    weightSum += weights[key];
  }

  return {
    composite: total / weightSum,
    breakdown: scores,
  };
}
