/**
 * FlowRadio DJ - Spotify DJ AI Agent System
 *
 * Main entry point. Exports the complete DJ system for use
 * in the React UI or as a standalone module.
 */

export { SpotifyClient } from './core/spotify-client.js';
export { FlowRadioAlgorithm } from './core/radio-algorithm.js';
export { DJCoordinator } from './agents/coordinator.js';
export { CuratorAgent } from './agents/curator-agent.js';
export { TransitionAgent } from './agents/transition-agent.js';
export { DiscoveryAgent } from './agents/discovery-agent.js';
export { MoodAgent } from './agents/mood-agent.js';
export { Track, QueuedTrack } from './models/track.js';
export { DJSession } from './models/session.js';
export { ListenerProfile } from './models/listener-profile.js';

// Algorithm exports
export { harmonicCompatibility, toCamelot } from './algorithms/harmonic-mixing.js';
export { tempoCompatibility, normalizeTempo } from './algorithms/tempo-matching.js';
export { classifyTrackMood, generateMoodArc } from './algorithms/mood-arc.js';
export { compositeDiversityScore } from './algorithms/diversity-scorer.js';
export { featureSimilarity, computeCentroid } from './algorithms/feature-similarity.js';

// Config
export { default as SPOTIFY_CONFIG, MOOD_PROFILES, GENRE_FAMILIES, CAMELOT_WHEEL } from './config/spotify-config.js';
