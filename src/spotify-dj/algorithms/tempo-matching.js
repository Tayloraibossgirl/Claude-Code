/**
 * Tempo Matching Engine
 *
 * Handles BPM compatibility for smooth transitions.
 * Professional DJs never jump wildly between tempos.
 * Spotify's radio ignores tempo continuity entirely.
 *
 * Key improvements over Spotify:
 * 1. Half-time / double-time detection (128 BPM techno -> 64 BPM hip-hop is fine)
 * 2. Gradual BPM drift support (slowly shift tempo over multiple tracks)
 * 3. Genre-aware tempo zones
 */

/**
 * Normalize BPM to handle half-time / double-time relationships
 * Maps all tempos to the 75-150 range
 */
export function normalizeTempo(bpm) {
  if (!bpm || bpm <= 0) return 120; // Default
  let t = bpm;
  while (t > 150) t /= 2;
  while (t < 75) t *= 2;
  return t;
}

/**
 * Calculate tempo compatibility between two tracks
 * Returns 0.0 - 1.0
 *
 * Considers:
 * - Direct BPM match
 * - Half-time / double-time relationships
 * - Small BPM differences are fine (DJs pitch-bend up to +/-6%)
 */
export function tempoCompatibility(bpm1, bpm2) {
  if (!bpm1 || !bpm2) return 0.5; // Unknown = neutral

  const norm1 = normalizeTempo(bpm1);
  const norm2 = normalizeTempo(bpm2);

  // Also check half/double time relationships
  const candidates = [norm2, norm2 / 2, norm2 * 2];
  let bestMatch = 0;

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeTempo(candidate);
    const diff = Math.abs(norm1 - normalizedCandidate);
    const percentDiff = diff / norm1;

    let score;
    if (percentDiff <= 0.02) {
      score = 1.0;      // Within 2% - essentially the same BPM
    } else if (percentDiff <= 0.05) {
      score = 0.9;      // Within 5% - easy pitch adjustment
    } else if (percentDiff <= 0.08) {
      score = 0.75;     // Within 8% - noticeable but DJ-mixable
    } else if (percentDiff <= 0.12) {
      score = 0.5;      // Within 12% - requires skill to mix
    } else if (percentDiff <= 0.20) {
      score = 0.25;     // Big jump - need a transition trick
    } else {
      score = 0.05;     // Too different for smooth transition
    }

    bestMatch = Math.max(bestMatch, score);
  }

  return bestMatch;
}

/**
 * Calculate the ideal next BPM given a target drift
 * Used for gradually shifting tempo over multiple tracks
 *
 * @param {number} currentBpm - Current track BPM
 * @param {number} targetBpm - Where we want to end up
 * @param {number} tracksRemaining - How many tracks to get there
 * @returns {number} Suggested BPM for next track
 */
export function calculateTempoDrift(currentBpm, targetBpm, tracksRemaining = 5) {
  if (tracksRemaining <= 1) return targetBpm;

  const current = normalizeTempo(currentBpm);
  const target = normalizeTempo(targetBpm);

  // Maximum BPM change per track (3% of current)
  const maxStep = current * 0.03;

  const idealStep = (target - current) / tracksRemaining;
  const clampedStep = Math.max(-maxStep, Math.min(maxStep, idealStep));

  return current + clampedStep;
}

/**
 * Group tracks into tempo zones
 * Useful for organizing a pool of tracks by compatible tempos
 */
export function groupByTempoZone(tracks) {
  const zones = {
    slow: [],       // 60-90 BPM (downtempo, hip-hop)
    midSlow: [],    // 90-110 BPM (R&B, neo-soul)
    mid: [],        // 110-125 BPM (house, pop)
    midFast: [],    // 125-135 BPM (progressive house, trance)
    fast: [],       // 135-160 BPM (drum and bass, techno)
    veryFast: [],   // 160+ BPM (jungle, gabber)
  };

  tracks.forEach(track => {
    const bpm = normalizeTempo(track.tempo || 120);
    if (bpm < 90) zones.slow.push(track);
    else if (bpm < 110) zones.midSlow.push(track);
    else if (bpm < 125) zones.mid.push(track);
    else if (bpm < 135) zones.midFast.push(track);
    else if (bpm < 160) zones.fast.push(track);
    else zones.veryFast.push(track);
  });

  return zones;
}

/**
 * Rank candidates by tempo compatibility with a source track
 */
export function rankByTempoFit(sourceTrack, candidates) {
  return candidates
    .map(track => ({
      track,
      tempoScore: tempoCompatibility(sourceTrack.tempo, track.tempo),
      bpmFrom: Math.round(sourceTrack.tempo || 0),
      bpmTo: Math.round(track.tempo || 0),
    }))
    .sort((a, b) => b.tempoScore - a.tempoScore);
}
