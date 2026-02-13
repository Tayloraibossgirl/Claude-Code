/**
 * Harmonic Mixing Engine
 *
 * Uses the Camelot Wheel system for key compatibility analysis.
 * This is how professional DJs ensure smooth transitions between tracks.
 * Spotify's radio does NOT consider harmonic compatibility at all.
 */

import { CAMELOT_WHEEL, CAMELOT_COMPATIBLE } from '../config/spotify-config.js';

/**
 * Convert Spotify's key + mode to Camelot notation
 * @param {number} key - 0-11 (C, C#, D, ... B)
 * @param {number} mode - 0 = minor, 1 = major
 * @returns {string} Camelot notation (e.g., "8B", "5A")
 */
export function toCamelot(key, mode) {
  if (key === undefined || key === null || key === -1) return null;
  return CAMELOT_WHEEL[`${key}_${mode === 1 ? 0 : 1}`] || null;
}

/**
 * Check if two keys are harmonically compatible
 * Returns a compatibility score from 0 to 1
 */
export function harmonicCompatibility(key1, mode1, key2, mode2) {
  const cam1 = toCamelot(key1, mode1);
  const cam2 = toCamelot(key2, mode2);

  if (!cam1 || !cam2) return 0.5; // Unknown key = neutral

  if (cam1 === cam2) return 1.0; // Perfect match

  const compatible = CAMELOT_COMPATIBLE(cam1);
  if (compatible.includes(cam2)) return 0.85; // Adjacent on wheel

  // Calculate distance on the Camelot wheel
  const num1 = parseInt(cam1);
  const num2 = parseInt(cam2);
  const letter1 = cam1.slice(-1);
  const letter2 = cam2.slice(-1);

  // Circular distance on the number ring (1-12)
  const numDist = Math.min(
    Math.abs(num1 - num2),
    12 - Math.abs(num1 - num2)
  );

  // Letter change adds 1 unit of distance
  const letterDist = letter1 === letter2 ? 0 : 1;
  const totalDist = numDist + letterDist;

  // Map distance to compatibility score
  // 0 = perfect (1.0), 1 = adjacent (0.85), 2 = close (0.6), 3+ = rough
  const scores = [1.0, 0.85, 0.6, 0.35, 0.2, 0.1, 0.05];
  return scores[Math.min(totalDist, scores.length - 1)] || 0;
}

/**
 * Find the best harmonic transition from a source track to candidates
 * Returns candidates sorted by harmonic compatibility
 */
export function rankByHarmonicFit(sourceTrack, candidates) {
  return candidates
    .map(track => ({
      track,
      harmonicScore: harmonicCompatibility(
        sourceTrack.key, sourceTrack.mode,
        track.key, track.mode
      ),
      camelotFrom: toCamelot(sourceTrack.key, sourceTrack.mode),
      camelotTo: toCamelot(track.key, track.mode),
    }))
    .sort((a, b) => b.harmonicScore - a.harmonicScore);
}

/**
 * Suggest key modulation path for a multi-track transition
 * (e.g., going from 5A to 10B in smooth harmonic steps)
 */
export function findHarmonicPath(startKey, startMode, endKey, endMode, maxSteps = 4) {
  const startCam = toCamelot(startKey, startMode);
  const endCam = toCamelot(endKey, endMode);
  if (!startCam || !endCam) return null;

  // BFS to find shortest harmonic path
  const queue = [[startCam]];
  const visited = new Set([startCam]);

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];

    if (current === endCam) return path;
    if (path.length >= maxSteps) continue;

    const neighbors = CAMELOT_COMPATIBLE(current);
    for (const next of neighbors) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push([...path, next]);
      }
    }
  }

  return null; // No path found within maxSteps
}
