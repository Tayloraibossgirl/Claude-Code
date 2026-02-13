/**
 * Mood Arc Engine
 *
 * Manages the emotional journey of a DJ session.
 * Real DJs think in terms of energy arcs - building tension,
 * releasing it, creating peaks and valleys.
 *
 * Spotify's radio has no concept of an energy arc - it just
 * picks similar songs in random order. This engine ensures
 * every session tells an emotional story.
 */

import { MOOD_PROFILES } from '../config/spotify-config.js';

/**
 * Classify a track's mood based on its audio features
 * Returns the best-matching mood and a confidence score
 */
export function classifyTrackMood(track) {
  if (!track.hasAudioFeatures) return { mood: 'unknown', confidence: 0 };

  let bestMood = 'unknown';
  let bestScore = -Infinity;

  for (const [mood, ranges] of Object.entries(MOOD_PROFILES)) {
    let score = 0;
    let checks = 0;

    // Check each feature against the mood profile range
    if (ranges.energy) {
      const inRange = track.energy >= ranges.energy[0] && track.energy <= ranges.energy[1];
      const distance = inRange ? 0 : Math.min(
        Math.abs(track.energy - ranges.energy[0]),
        Math.abs(track.energy - ranges.energy[1])
      );
      score += inRange ? 1 : -distance * 2;
      checks++;
    }

    if (ranges.valence) {
      const inRange = track.valence >= ranges.valence[0] && track.valence <= ranges.valence[1];
      const distance = inRange ? 0 : Math.min(
        Math.abs(track.valence - ranges.valence[0]),
        Math.abs(track.valence - ranges.valence[1])
      );
      score += inRange ? 1 : -distance * 2;
      checks++;
    }

    if (ranges.danceability) {
      const inRange = track.danceability >= ranges.danceability[0] && track.danceability <= ranges.danceability[1];
      const distance = inRange ? 0 : Math.min(
        Math.abs(track.danceability - ranges.danceability[0]),
        Math.abs(track.danceability - ranges.danceability[1])
      );
      score += inRange ? 0.8 : -distance * 1.5;
      checks++;
    }

    if (ranges.tempo) {
      const normalizedTempo = track.normalizedTempo || track.tempo || 120;
      const inRange = normalizedTempo >= ranges.tempo[0] && normalizedTempo <= ranges.tempo[1];
      const distance = inRange ? 0 : Math.min(
        Math.abs(normalizedTempo - ranges.tempo[0]),
        Math.abs(normalizedTempo - ranges.tempo[1])
      ) / 60; // Normalize tempo distance
      score += inRange ? 0.6 : -distance;
      checks++;
    }

    const normalized = score / checks;
    if (normalized > bestScore) {
      bestScore = normalized;
      bestMood = mood;
    }
  }

  return {
    mood: bestMood,
    confidence: Math.max(0, Math.min(1, (bestScore + 1) / 2)),
  };
}

/**
 * Calculate how well a track fits a target mood
 * Returns 0.0 - 1.0
 */
export function moodFitScore(track, targetMood) {
  if (targetMood === 'auto' || targetMood === 'any') return 0.5;
  if (!track.hasAudioFeatures) return 0.5;

  const profile = MOOD_PROFILES[targetMood];
  if (!profile) return 0.5;

  let score = 0;
  let totalWeight = 0;

  const features = [
    { value: track.energy, range: profile.energy, weight: 2.0 },
    { value: track.valence, range: profile.valence, weight: 1.5 },
    { value: track.danceability, range: profile.danceability, weight: 1.0 },
  ];

  for (const { value, range, weight } of features) {
    if (!range) continue;
    totalWeight += weight;

    if (value >= range[0] && value <= range[1]) {
      // In range - score based on how centered it is
      const center = (range[0] + range[1]) / 2;
      const halfWidth = (range[1] - range[0]) / 2;
      const distFromCenter = Math.abs(value - center) / halfWidth;
      score += weight * (1 - distFromCenter * 0.3); // Slight preference for centered
    } else {
      // Out of range - penalize based on distance
      const distance = Math.min(Math.abs(value - range[0]), Math.abs(value - range[1]));
      score += weight * Math.max(0, 0.5 - distance);
    }
  }

  return totalWeight > 0 ? score / totalWeight : 0.5;
}

/**
 * Compute energy continuity score between consecutive tracks
 * Ensures smooth transitions in energy level
 *
 * @param {number} currentEnergy - Energy of the current track
 * @param {number} nextEnergy - Energy of the candidate track
 * @param {number} targetEnergy - Where the session wants to go
 * @returns {number} 0.0 - 1.0 score
 */
export function energyContinuityScore(currentEnergy, nextEnergy, targetEnergy) {
  // How big is the energy jump?
  const jump = Math.abs(nextEnergy - currentEnergy);

  // Is the next track moving us toward the target?
  const currentDist = Math.abs(currentEnergy - targetEnergy);
  const nextDist = Math.abs(nextEnergy - targetEnergy);
  const movingTowardTarget = nextDist < currentDist;

  // Penalize large jumps (max comfortable jump is ~0.25 energy units)
  let jumpPenalty;
  if (jump <= 0.1) jumpPenalty = 1.0;      // Smooth
  else if (jump <= 0.2) jumpPenalty = 0.85; // Gentle shift
  else if (jump <= 0.3) jumpPenalty = 0.6;  // Noticeable
  else if (jump <= 0.4) jumpPenalty = 0.3;  // Jarring
  else jumpPenalty = 0.1;                   // Violent mood whiplash

  // Bonus for moving toward target energy
  const directionBonus = movingTowardTarget ? 0.15 : 0;

  return Math.min(1.0, jumpPenalty + directionBonus);
}

/**
 * Generate a mood arc plan for a session
 * Returns an array of target moods/energies over time
 *
 * @param {string} arcType - Type of arc (wave, build, descend, peak, journey)
 * @param {number} durationMinutes - Expected session length
 * @param {string} startMood - Starting mood
 * @returns {Array<{minuteMark: number, targetEnergy: number, targetMood: string}>}
 */
export function generateMoodArc(arcType, durationMinutes = 60, startMood = 'auto') {
  const points = [];
  const segments = Math.ceil(durationMinutes / 5); // One checkpoint every 5 minutes

  switch (arcType) {
    case 'build':
      // Classic DJ set build: slow start, steady escalation
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        points.push({
          minuteMark: Math.round(t * durationMinutes),
          targetEnergy: 0.25 + t * 0.65,
          targetMood: t < 0.3 ? 'chill' : t < 0.6 ? 'groovy' : t < 0.85 ? 'uplifting' : 'euphoric',
        });
      }
      break;

    case 'descend':
      // Wind-down: high energy start, gradually descend
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        points.push({
          minuteMark: Math.round(t * durationMinutes),
          targetEnergy: 0.9 - t * 0.6,
          targetMood: t < 0.3 ? 'euphoric' : t < 0.6 ? 'happy' : t < 0.85 ? 'chill' : 'dreamy',
        });
      }
      break;

    case 'peak':
      // Festival set: build to peak at 2/3, then gentle decline
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const peakAt = 0.65;
        let energy;
        if (t < peakAt) {
          energy = 0.3 + (t / peakAt) * 0.65;
        } else {
          energy = 0.95 - ((t - peakAt) / (1 - peakAt)) * 0.45;
        }
        points.push({
          minuteMark: Math.round(t * durationMinutes),
          targetEnergy: energy,
          targetMood: energy > 0.75 ? 'euphoric' : energy > 0.5 ? 'uplifting' : 'chill',
        });
      }
      break;

    case 'journey':
      // Multiple peaks and valleys - like a real DJ telling a story
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        // Two peaks with a valley in between
        const energy = 0.4 + 0.35 * Math.sin(t * Math.PI * 2.5) + 0.15 * Math.sin(t * Math.PI * 4);
        const moods = ['chill', 'groovy', 'uplifting', 'euphoric', 'intense', 'uplifting', 'groovy', 'dreamy'];
        const moodIdx = Math.floor(t * (moods.length - 1));
        points.push({
          minuteMark: Math.round(t * durationMinutes),
          targetEnergy: Math.max(0.15, Math.min(0.95, energy)),
          targetMood: moods[moodIdx],
        });
      }
      break;

    case 'wave':
    default:
      // Gentle waves - keep it interesting without extremes
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const energy = 0.5 + 0.25 * Math.sin(t * Math.PI * 3);
        points.push({
          minuteMark: Math.round(t * durationMinutes),
          targetEnergy: energy,
          targetMood: energy > 0.65 ? 'uplifting' : energy > 0.4 ? 'happy' : 'chill',
        });
      }
      break;
  }

  return points;
}

/**
 * Get the current target from a mood arc based on elapsed time
 */
export function getCurrentArcTarget(arcPoints, elapsedMinutes) {
  if (!arcPoints || arcPoints.length === 0) {
    return { targetEnergy: 0.5, targetMood: 'auto' };
  }

  // Find the two surrounding points and interpolate
  let before = arcPoints[0];
  let after = arcPoints[arcPoints.length - 1];

  for (let i = 0; i < arcPoints.length - 1; i++) {
    if (arcPoints[i].minuteMark <= elapsedMinutes && arcPoints[i + 1].minuteMark > elapsedMinutes) {
      before = arcPoints[i];
      after = arcPoints[i + 1];
      break;
    }
  }

  if (before.minuteMark === after.minuteMark) {
    return { targetEnergy: before.targetEnergy, targetMood: before.targetMood };
  }

  const progress = (elapsedMinutes - before.minuteMark) / (after.minuteMark - before.minuteMark);
  return {
    targetEnergy: before.targetEnergy + (after.targetEnergy - before.targetEnergy) * progress,
    targetMood: progress < 0.5 ? before.targetMood : after.targetMood,
  };
}
