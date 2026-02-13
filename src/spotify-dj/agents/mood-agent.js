/**
 * Mood Agent
 *
 * Manages the emotional arc of the DJ session.
 * Tracks the current mood, plans the energy curve,
 * and ensures the session tells an emotional story
 * rather than being a random playlist.
 */

import { BaseAgent } from './base-agent.js';
import { classifyTrackMood, moodFitScore, energyContinuityScore, generateMoodArc, getCurrentArcTarget } from '../algorithms/mood-arc.js';

export class MoodAgent extends BaseAgent {
  constructor(profile) {
    super('Mood', 'Manages emotional arc and energy flow');
    this.profile = profile;

    // Mood arc state
    this.moodArc = null;
    this.currentMood = null;
    this.moodHistory = [];
    this.energySmoothing = []; // Rolling window for energy smoothing

    // Mood detection from listening patterns
    this.detectedMood = null;
    this.moodConfidence = 0;
  }

  /**
   * Initialize the mood arc for a session
   */
  initializeArc(arcType, durationMinutes = 60) {
    this.moodArc = generateMoodArc(arcType, durationMinutes);
    this.lastAction = `Initialized "${arcType}" mood arc for ${durationMinutes} minutes`;
  }

  /**
   * Get the current target mood/energy based on the arc
   */
  getCurrentTarget(sessionMinutes) {
    if (!this.moodArc) {
      // No arc set - use adaptive mood based on time of day
      const timeMood = this.profile.getCurrentTimeMood();
      return {
        targetEnergy: timeMood.energy,
        targetMood: 'auto',
      };
    }

    return getCurrentArcTarget(this.moodArc, sessionMinutes);
  }

  /**
   * Detect the current session mood from recent tracks
   */
  detectCurrentMood(recentTracks) {
    if (recentTracks.length === 0) return null;

    // Classify each recent track
    const moods = recentTracks
      .filter(t => t.hasAudioFeatures)
      .map(t => classifyTrackMood(t));

    // Find the dominant mood
    const moodCounts = {};
    moods.forEach(({ mood, confidence }) => {
      moodCounts[mood] = (moodCounts[mood] || 0) + confidence;
    });

    let dominantMood = 'auto';
    let maxScore = 0;
    for (const [mood, score] of Object.entries(moodCounts)) {
      if (score > maxScore) {
        maxScore = score;
        dominantMood = mood;
      }
    }

    this.detectedMood = dominantMood;
    this.moodConfidence = maxScore / recentTracks.length;

    return {
      mood: dominantMood,
      confidence: this.moodConfidence,
    };
  }

  async evaluate(candidate, context) {
    const { currentTrack, session } = context;
    const sessionMinutes = session.sessionDurationMinutes;

    // Get where we want to be on the mood arc
    const target = this.getCurrentTarget(sessionMinutes);

    // Score the candidate against the mood target
    const moodScore = moodFitScore(candidate, target.targetMood);

    // Score energy continuity
    const currentEnergy = currentTrack?.energy ?? 0.5;
    const energyScore = energyContinuityScore(
      currentEnergy,
      candidate.energy,
      target.targetEnergy
    );

    // Check if we need to change direction
    const needsChange = this.shouldChangeDirection(session);

    let score;
    let reasoning;

    if (needsChange) {
      // If we need to change direction, weight energy movement heavily
      const movingRight = Math.abs(candidate.energy - target.targetEnergy) <
        Math.abs(currentEnergy - target.targetEnergy);
      score = movingRight ? 0.8 : 0.3;
      reasoning = `Redirecting energy toward ${target.targetEnergy.toFixed(2)} (${target.targetMood})`;
    } else {
      score = moodScore * 0.5 + energyScore * 0.5;
      reasoning = `Mood fit: ${(moodScore * 100).toFixed(0)}%, Energy flow: ${(energyScore * 100).toFixed(0)}%`;
    }

    // Veto if the track would completely break the energy arc
    const energyJump = Math.abs(candidate.energy - currentEnergy);
    const veto = energyJump > 0.5 && !needsChange;

    return { score, reasoning, veto };
  }

  /**
   * Check if the session energy has stalled and needs a direction change
   */
  shouldChangeDirection(session) {
    const recent = session.history.slice(-5);
    if (recent.length < 3) return false;

    const recentEnergies = recent.map(q => q.track.energy || 0.5);
    const avgRecent = recentEnergies.reduce((s, e) => s + e, 0) / recentEnergies.length;
    const targetEnergy = session.getTargetEnergy();

    // If we've been far from target for 3+ tracks, force a direction change
    const distFromTarget = Math.abs(avgRecent - targetEnergy);
    return distFromTarget > 0.25;
  }

  /**
   * Suggest mood-appropriate seed parameters for recommendations
   */
  getSeedParameters(sessionMinutes) {
    const target = this.getCurrentTarget(sessionMinutes);

    return {
      target_energy: target.targetEnergy,
      target_valence: target.targetMood === 'melancholy' ? 0.2 :
        target.targetMood === 'euphoric' ? 0.8 :
        target.targetMood === 'chill' ? 0.5 : undefined,
      min_energy: Math.max(0, target.targetEnergy - 0.2),
      max_energy: Math.min(1, target.targetEnergy + 0.2),
    };
  }

  async onTrackPlayed(track, reaction) {
    if (track.hasAudioFeatures) {
      const mood = classifyTrackMood(track);
      this.moodHistory.push({
        track: track.name,
        mood: mood.mood,
        energy: track.energy,
        reaction,
        timestamp: Date.now(),
      });

      // Keep energy smoothing window
      this.energySmoothing.push(track.energy);
      if (this.energySmoothing.length > 5) this.energySmoothing.shift();
    }
  }

  /**
   * Get a summary of the mood journey so far
   */
  getMoodJourneySummary() {
    if (this.moodHistory.length === 0) return null;

    const journey = this.moodHistory.map(entry => ({
      track: entry.track,
      mood: entry.mood,
      energy: entry.energy.toFixed(2),
    }));

    const avgEnergy = this.moodHistory.reduce((s, e) => s + e.energy, 0) / this.moodHistory.length;
    const moodChanges = this.moodHistory.reduce((count, entry, idx) => {
      if (idx > 0 && entry.mood !== this.moodHistory[idx - 1].mood) return count + 1;
      return count;
    }, 0);

    return {
      journey,
      averageEnergy: avgEnergy,
      moodChanges,
      currentMood: this.moodHistory[this.moodHistory.length - 1]?.mood,
    };
  }
}
