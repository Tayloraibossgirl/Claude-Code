/**
 * Transition Agent
 *
 * Specializes in ensuring smooth transitions between tracks.
 * Evaluates harmonic compatibility, tempo matching, and energy flow.
 * Can veto tracks that would create jarring transitions.
 */

import { BaseAgent } from './base-agent.js';
import { harmonicCompatibility, toCamelot, findHarmonicPath } from '../algorithms/harmonic-mixing.js';
import { tempoCompatibility, normalizeTempo } from '../algorithms/tempo-matching.js';
import { energyContinuityScore } from '../algorithms/mood-arc.js';

export class TransitionAgent extends BaseAgent {
  constructor() {
    super('Transition', 'Ensures smooth track-to-track transitions');
    this.strictMode = false; // When true, vetoes all non-compatible transitions
    this.transitionHistory = []; // Log of transition quality scores
  }

  async evaluate(candidate, context) {
    const { currentTrack, session } = context;

    if (!currentTrack?.hasAudioFeatures || !candidate.hasAudioFeatures) {
      return { score: 0.5, reasoning: 'Insufficient audio data', veto: false };
    }

    // Three pillars of a good transition
    const harmonic = harmonicCompatibility(
      currentTrack.key, currentTrack.mode,
      candidate.key, candidate.mode
    );

    const tempo = tempoCompatibility(currentTrack.tempo, candidate.tempo);

    const targetEnergy = session.getTargetEnergy();
    const energy = energyContinuityScore(currentTrack.energy, candidate.energy, targetEnergy);

    // Composite transition score with weights
    const score = harmonic * 0.4 + tempo * 0.35 + energy * 0.25;

    // Build detailed reasoning
    const camFrom = toCamelot(currentTrack.key, currentTrack.mode);
    const camTo = toCamelot(candidate.key, candidate.mode);
    const bpmFrom = Math.round(normalizeTempo(currentTrack.tempo));
    const bpmTo = Math.round(normalizeTempo(candidate.tempo));

    const reasoning = [
      `Key: ${camFrom || '?'} -> ${camTo || '?'} (${(harmonic * 100).toFixed(0)}%)`,
      `BPM: ${bpmFrom} -> ${bpmTo} (${(tempo * 100).toFixed(0)}%)`,
      `Energy: ${currentTrack.energy.toFixed(2)} -> ${candidate.energy.toFixed(2)} (${(energy * 100).toFixed(0)}%)`,
    ].join(', ');

    // Veto logic: in strict mode, reject bad transitions
    const veto = this.strictMode && (harmonic < 0.35 || tempo < 0.25);

    return { score, reasoning, veto };
  }

  /**
   * Reorder a list of tracks for optimal transition flow
   * Uses a greedy nearest-neighbor approach
   */
  async optimizeTrackOrder(tracks, startTrack = null) {
    if (tracks.length <= 1) return tracks;

    const remaining = [...tracks];
    const ordered = [];

    // Start from the given track or the first one
    let current = startTrack || remaining.shift();
    ordered.push(current);

    while (remaining.length > 0) {
      let bestIdx = 0;
      let bestScore = -1;

      for (let i = 0; i < remaining.length; i++) {
        const candidate = remaining[i];
        if (!current.hasAudioFeatures || !candidate.hasAudioFeatures) continue;

        const harmonic = harmonicCompatibility(current.key, current.mode, candidate.key, candidate.mode);
        const tempo = tempoCompatibility(current.tempo, candidate.tempo);
        const energyStep = 1 - Math.abs(current.energy - candidate.energy);
        const score = harmonic * 0.4 + tempo * 0.35 + energyStep * 0.25;

        if (score > bestScore) {
          bestScore = score;
          bestIdx = i;
        }
      }

      current = remaining.splice(bestIdx, 1)[0];
      ordered.push(current);
    }

    return ordered;
  }

  /**
   * Rate the overall flow quality of a track sequence
   */
  rateSequenceFlow(tracks) {
    if (tracks.length < 2) return { score: 1, transitions: [] };

    const transitions = [];
    let totalScore = 0;

    for (let i = 0; i < tracks.length - 1; i++) {
      const from = tracks[i];
      const to = tracks[i + 1];

      if (from.hasAudioFeatures && to.hasAudioFeatures) {
        const harmonic = harmonicCompatibility(from.key, from.mode, to.key, to.mode);
        const tempo = tempoCompatibility(from.tempo, to.tempo);
        const energyFlow = 1 - Math.abs(from.energy - to.energy);
        const score = harmonic * 0.4 + tempo * 0.35 + energyFlow * 0.25;

        transitions.push({
          from: `${from.artistNames} - ${from.name}`,
          to: `${to.artistNames} - ${to.name}`,
          harmonic,
          tempo,
          energyFlow,
          score,
        });

        totalScore += score;
      }
    }

    return {
      score: totalScore / Math.max(1, transitions.length),
      transitions,
    };
  }

  async onTrackPlayed(track, reaction) {
    if (this.transitionHistory.length > 0) {
      const lastTransition = this.transitionHistory[this.transitionHistory.length - 1];
      lastTransition.userReaction = reaction;

      // If user skipped during a bad transition, increase strictness
      if (reaction === 'skipped' && lastTransition.score < 0.5) {
        this.strictMode = true;
        this.lastAction = 'Enabling strict mode after skip on bad transition';
      }
    }
  }
}
