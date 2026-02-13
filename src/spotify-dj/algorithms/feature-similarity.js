/**
 * Audio Feature Similarity Engine
 *
 * Multi-dimensional similarity calculations using audio features.
 * Goes beyond Spotify's basic "similar vibes" approach by using
 * weighted Euclidean distance with dynamic weight adjustment
 * based on what the user actually responds to.
 */

/**
 * Calculate cosine similarity between two feature vectors
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] ** 2;
    normB += vecB[i] ** 2;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

/**
 * Calculate weighted Euclidean distance between two tracks
 * Lower = more similar
 */
export function weightedDistance(trackA, trackB, weights = null) {
  if (!trackA.hasAudioFeatures || !trackB.hasAudioFeatures) return 0.5;

  const defaultWeights = {
    energy: 2.0,
    valence: 1.5,
    danceability: 1.5,
    tempo: 1.0,
    acousticness: 0.8,
    instrumentalness: 0.6,
    loudness: 0.4,
    speechiness: 0.3,
  };

  const w = weights || defaultWeights;

  const diffs = [];
  if (w.energy) diffs.push(((trackA.energy - trackB.energy) ** 2) * w.energy);
  if (w.valence) diffs.push(((trackA.valence - trackB.valence) ** 2) * w.valence);
  if (w.danceability) diffs.push(((trackA.danceability - trackB.danceability) ** 2) * w.danceability);
  if (w.acousticness) diffs.push(((trackA.acousticness - trackB.acousticness) ** 2) * w.acousticness);
  if (w.instrumentalness) diffs.push(((trackA.instrumentalness - trackB.instrumentalness) ** 2) * w.instrumentalness);
  if (w.speechiness) diffs.push(((trackA.speechiness - trackB.speechiness) ** 2) * w.speechiness);

  // Normalize tempo to 0-1 range before comparing
  if (w.tempo) {
    const normTempoA = ((trackA.normalizedTempo || 120) - 80) / 80;
    const normTempoB = ((trackB.normalizedTempo || 120) - 80) / 80;
    diffs.push(((normTempoA - normTempoB) ** 2) * w.tempo);
  }

  // Loudness: normalize from dB (-60 to 0) to 0-1
  if (w.loudness) {
    const normLoudA = ((trackA.loudness || -10) + 60) / 60;
    const normLoudB = ((trackB.loudness || -10) + 60) / 60;
    diffs.push(((normLoudA - normLoudB) ** 2) * w.loudness);
  }

  const totalWeight = Object.values(w).reduce((sum, v) => sum + v, 0);
  return Math.sqrt(diffs.reduce((sum, d) => sum + d, 0) / totalWeight);
}

/**
 * Calculate feature similarity between two tracks
 * Returns 0.0 - 1.0 (1.0 = identical features)
 */
export function featureSimilarity(trackA, trackB, weights = null) {
  const distance = weightedDistance(trackA, trackB, weights);
  return Math.max(0, 1 - distance);
}

/**
 * Find the N most similar tracks to a given track from a pool
 */
export function findMostSimilar(sourceTrack, candidates, n = 10, weights = null) {
  return candidates
    .filter(c => c.id !== sourceTrack.id && c.hasAudioFeatures)
    .map(track => ({
      track,
      similarity: featureSimilarity(sourceTrack, track, weights),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, n);
}

/**
 * Compute the "centroid" (average) of a set of tracks' audio features
 * Useful for understanding the overall vibe of a playlist
 */
export function computeCentroid(tracks) {
  const featured = tracks.filter(t => t.hasAudioFeatures);
  if (featured.length === 0) return null;

  const sums = {
    energy: 0, valence: 0, danceability: 0, acousticness: 0,
    instrumentalness: 0, speechiness: 0, tempo: 0, loudness: 0,
  };

  featured.forEach(t => {
    sums.energy += t.energy;
    sums.valence += t.valence;
    sums.danceability += t.danceability;
    sums.acousticness += t.acousticness;
    sums.instrumentalness += t.instrumentalness;
    sums.speechiness += t.speechiness;
    sums.tempo += t.normalizedTempo;
    sums.loudness += t.loudness || -10;
  });

  const n = featured.length;
  return {
    energy: sums.energy / n,
    valence: sums.valence / n,
    danceability: sums.danceability / n,
    acousticness: sums.acousticness / n,
    instrumentalness: sums.instrumentalness / n,
    speechiness: sums.speechiness / n,
    tempo: sums.tempo / n,
    loudness: sums.loudness / n,
  };
}

/**
 * Calculate how different a track is from a centroid (for novelty detection)
 * Higher = more different from the "average"
 */
export function noveltyScore(track, centroid) {
  if (!track.hasAudioFeatures || !centroid) return 0.5;

  const diffs = [
    (track.energy - centroid.energy) ** 2 * 2,
    (track.valence - centroid.valence) ** 2 * 1.5,
    (track.danceability - centroid.danceability) ** 2,
    (track.acousticness - centroid.acousticness) ** 2,
    ((track.normalizedTempo - centroid.tempo) / 40) ** 2,
  ];

  return Math.sqrt(diffs.reduce((s, d) => s + d, 0) / diffs.length);
}

/**
 * Adaptive weight learning - adjust feature weights based on user feedback
 * Tracks that were liked increase weights for their distinctive features
 * Tracks that were skipped decrease weights for their distinctive features
 */
export function updateWeightsFromFeedback(currentWeights, likedTracks, skippedTracks, centroid) {
  if (!centroid) return currentWeights;

  const newWeights = { ...currentWeights };
  const learningRate = 0.05;

  const features = ['energy', 'valence', 'danceability', 'acousticness', 'instrumentalness'];

  // For liked tracks: find what features they have in common
  if (likedTracks.length > 0) {
    const likedCentroid = computeCentroid(likedTracks);
    if (likedCentroid) {
      features.forEach(feat => {
        // If liked tracks cluster tightly on a feature, that feature matters more
        const variance = likedTracks
          .filter(t => t.hasAudioFeatures)
          .reduce((sum, t) => sum + (t[feat] - likedCentroid[feat]) ** 2, 0) / likedTracks.length;
        if (variance < 0.05) {
          newWeights[feat] = Math.min(3.0, (newWeights[feat] || 1) + learningRate);
        }
      });
    }
  }

  // For skipped tracks: reduce weight of features where skipped tracks were similar to played ones
  if (skippedTracks.length > 0) {
    features.forEach(feat => {
      const avgSkipped = skippedTracks
        .filter(t => t.hasAudioFeatures)
        .reduce((sum, t) => sum + t[feat], 0) / skippedTracks.length;
      const distFromCentroid = Math.abs(avgSkipped - centroid[feat]);
      if (distFromCentroid < 0.1) {
        // Skipped tracks were similar on this feature - it's not a distinguishing factor
        newWeights[feat] = Math.max(0.1, (newWeights[feat] || 1) - learningRate);
      }
    });
  }

  return newWeights;
}
