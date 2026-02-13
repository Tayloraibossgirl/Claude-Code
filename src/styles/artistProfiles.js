/**
 * Artist Style Profiles
 *
 * Encodes the sonic DNA of remix artists — NOT their specific songs/notes,
 * but the structural patterns, energy curves, effects philosophy, and
 * rhythmic signatures that define their style.
 *
 * These profiles drive the RemixEngine to generate unique remixes
 * that FEEL like the artist's approach without copying any specific track.
 */

export const ARTIST_PROFILES = {
  hyperTechno: {
    name: 'Hyper Techno',
    id: 'hyper-techno',

    // Tempo & Rhythm
    tempo: {
      bpmRange: [150, 180],
      preferredBpm: 165,
      swingAmount: 0,          // Dead straight, no swing
      gridResolution: '1/16',  // 16th note grid for maximum density
      rushFactor: 0.02,        // Slight tempo push on drops (+2%)
    },

    // Kick & Low End
    kick: {
      style: 'distorted-punch',
      attackMs: 2,
      decayMs: 180,
      driveAmount: 0.7,        // Heavy saturation
      pitchEnvelope: { start: 200, end: 55, curveMs: 40 },
      sidechain: { ratio: 8, releaseMs: 120 },
      pattern: 'four-on-floor', // Relentless 4/4
    },

    // Bass Design
    bass: {
      style: 'acid-saw',
      waveforms: ['sawtooth', 'square'],
      filterType: 'resonant-lowpass',
      filterCutoffRange: [200, 8000],
      resonance: 0.75,
      filterEnvAmount: 0.8,    // Deep filter sweeps
      slideAmount: 0.6,        // 303-style glides
      distortion: 0.5,
      pattern: 'syncopated-16th',
    },

    // Effects Chain
    effects: {
      primaryChain: [
        { type: 'highpass-filter', freq: 20, resonance: 0 },
        { type: 'distortion', drive: 0.4, mix: 0.3 },
        { type: 'delay', time: '1/8d', feedback: 0.35, mix: 0.2 },
        { type: 'reverb', size: 0.6, damping: 0.7, mix: 0.15 },
      ],
      buildupEffects: [
        { type: 'highpass-sweep', startFreq: 20, endFreq: 4000, durationBars: 8 },
        { type: 'snare-roll', resolution: '1/16', crescendo: true },
        { type: 'white-noise-riser', durationBars: 4 },
        { type: 'reverb-wash', tailMs: 3000 },
      ],
      dropEffects: [
        { type: 'highpass-release', freq: 20, snapMs: 10 },
        { type: 'impact-hit', style: 'sub-boom' },
        { type: 'sidechain-pump', intensity: 0.9 },
      ],
      transitionEffects: [
        { type: 'echo-out', feedback: 0.7, decay: '2-bars' },
        { type: 'filter-sweep', direction: 'up', bars: 4 },
        { type: 'beat-repeat', division: '1/8' },
      ],
    },

    // Arrangement / Energy Curve
    arrangement: {
      introStyle: 'minimal-build',
      introBars: 16,
      buildupBars: 8,
      dropBars: 16,
      breakdownBars: 8,
      outroStyle: 'filter-fade',
      outroBars: 16,
      energyCurve: [0.3, 0.5, 0.7, 0.9, 1.0, 0.4, 0.7, 1.0, 0.6, 0.2],
      dropCount: 2,
      fakeDropProbability: 0.3,
    },

    // Hi-Hats & Percussion
    hats: {
      style: 'metallic-open',
      pattern: 'offbeat-16th',
      velocityVariation: 0.3,
      openHatPlacement: 'offbeat-8th',
      ridePattern: null,       // No ride, pure hats
    },
    clap: {
      style: 'layered-reverb',
      placement: 'beats-2-4',
      reverbTail: 0.6,
    },

    // Synths & Melodic
    synths: {
      leadStyle: 'rave-stab',
      padStyle: null,          // No pads, too aggressive
      stabChord: 'minor-fifth',
      arpeggiator: { rate: '1/16', octaves: 2, style: 'up' },
      detuneAmount: 15,        // Wide detuned saws
    },

    // Vocal Treatment
    vocals: {
      chop: true,
      chopResolution: '1/8',
      pitchShift: [-12, 0, 12], // Octave shifts
      formantShift: 0.3,
      reverbSend: 0.5,
      delaySend: 0.3,
      stutterProbability: 0.4,
      filterSweep: true,
    },

    // djay Pro Specific
    djayPro: {
      neuralMixIsolation: ['drums', 'bass'],
      crossfaderCurve: 'sharp',
      eqStyle: 'isolator',
      loopSizes: [1, 2, 4, 8],
      cuePointStrategy: 'drop-markers',
      padMode: 'loop-roll',
      effectRack: ['Echo', 'Flanger', 'Noise'],
    },
  },

  fastBasston: {
    name: 'Fast Basston',
    id: 'fast-basston',

    // Tempo & Rhythm
    tempo: {
      bpmRange: [140, 170],
      preferredBpm: 155,
      swingAmount: 0.05,       // Tiny shuffle for groove
      gridResolution: '1/16',
      rushFactor: 0,
    },

    // Kick & Low End
    kick: {
      style: 'sub-heavy',
      attackMs: 5,
      decayMs: 250,
      driveAmount: 0.3,
      pitchEnvelope: { start: 160, end: 40, curveMs: 60 },
      sidechain: { ratio: 12, releaseMs: 80 },
      pattern: 'broken-4',    // Broken beat kicks for bass space
    },

    // Bass Design
    bass: {
      style: 'wobble-reese',
      waveforms: ['sawtooth', 'sawtooth'],
      filterType: 'bandpass-modulated',
      filterCutoffRange: [80, 6000],
      resonance: 0.6,
      filterEnvAmount: 0.9,
      slideAmount: 0.3,
      distortion: 0.6,
      lfoRate: '1/4',          // Quarter note wobble
      lfoDepth: 0.8,
      pattern: 'half-time-drops',
      subBassLayer: true,      // Dedicated sub layer
      subFreq: 40,
    },

    // Effects Chain
    effects: {
      primaryChain: [
        { type: 'sub-enhancer', freq: 60, boost: 6 },
        { type: 'multiband-distortion', lowDrive: 0.2, midDrive: 0.6, highDrive: 0.3 },
        { type: 'stereo-widener', amount: 0.4, freq: 300 },
        { type: 'limiter', threshold: -2, release: 50 },
      ],
      buildupEffects: [
        { type: 'bass-vacuum', durationBars: 4 },
        { type: 'snare-buildup', resolution: '1/16', crescendo: true },
        { type: 'sub-riser', startFreq: 20, endFreq: 80, durationBars: 4 },
        { type: 'vinyl-brake', speed: 0.5 },
      ],
      dropEffects: [
        { type: 'bass-drop-impact', subFreq: 35, durationMs: 800 },
        { type: 'sidechain-pump', intensity: 1.0 },
        { type: 'crowd-impact', style: 'air-horn' },
      ],
      transitionEffects: [
        { type: 'bass-swap', crossfadeMs: 500 },
        { type: 'rewind-scratch', durationMs: 1200 },
        { type: 'half-time-switch', bars: 4 },
      ],
    },

    // Arrangement / Energy Curve
    arrangement: {
      introStyle: 'bass-tease',
      introBars: 8,
      buildupBars: 8,
      dropBars: 16,
      breakdownBars: 16,
      outroStyle: 'bass-fadeout',
      outroBars: 8,
      energyCurve: [0.2, 0.4, 0.6, 1.0, 0.8, 1.0, 0.3, 0.8, 1.0, 0.1],
      dropCount: 3,
      fakeDropProbability: 0.5,
    },

    // Hi-Hats & Percussion
    hats: {
      style: 'rapid-fire',
      pattern: 'triplet-rolls',
      velocityVariation: 0.5,
      openHatPlacement: 'syncopated',
      ridePattern: 'quarter-bell',
    },
    clap: {
      style: 'tight-snap',
      placement: 'beat-3',
      reverbTail: 0.2,
    },

    // Synths & Melodic
    synths: {
      leadStyle: 'wobble-lead',
      padStyle: 'dark-atmosphere',
      stabChord: null,
      arpeggiator: null,       // No arps, bass IS the melody
      detuneAmount: 8,
    },

    // Vocal Treatment
    vocals: {
      chop: true,
      chopResolution: '1/4',
      pitchShift: [-5, 0, 7],  // Interval shifts
      formantShift: -0.4,      // Darker vocal
      reverbSend: 0.3,
      delaySend: 0.5,
      stutterProbability: 0.6,
      filterSweep: true,
      vocoder: true,           // Vocoder on drops
    },

    // djay Pro Specific
    djayPro: {
      neuralMixIsolation: ['bass', 'vocals'],
      crossfaderCurve: 'smooth',
      eqStyle: 'isolator',
      loopSizes: [0.5, 1, 2, 4],
      cuePointStrategy: 'bass-drops',
      padMode: 'slicer',
      effectRack: ['Reverb', 'Echo', 'Filter'],
    },
  },
};

/**
 * Get a blended profile between two artists
 * @param {string} artist1Id
 * @param {string} artist2Id
 * @param {number} blend 0.0 = full artist1, 1.0 = full artist2
 */
export function blendProfiles(artist1Id, artist2Id, blend = 0.5) {
  const profiles = ARTIST_PROFILES;
  const p1 = Object.values(profiles).find(p => p.id === artist1Id);
  const p2 = Object.values(profiles).find(p => p.id === artist2Id);

  if (!p1 || !p2) throw new Error('Unknown artist profile');

  const lerp = (a, b, t) => a + (b - a) * t;

  return {
    name: `${p1.name} x ${p2.name} (${Math.round(blend * 100)}%)`,
    id: `blend-${artist1Id}-${artist2Id}`,
    tempo: {
      bpmRange: [
        Math.round(lerp(p1.tempo.bpmRange[0], p2.tempo.bpmRange[0], blend)),
        Math.round(lerp(p1.tempo.bpmRange[1], p2.tempo.bpmRange[1], blend)),
      ],
      preferredBpm: Math.round(lerp(p1.tempo.preferredBpm, p2.tempo.preferredBpm, blend)),
      swingAmount: lerp(p1.tempo.swingAmount, p2.tempo.swingAmount, blend),
      gridResolution: blend < 0.5 ? p1.tempo.gridResolution : p2.tempo.gridResolution,
      rushFactor: lerp(p1.tempo.rushFactor, p2.tempo.rushFactor, blend),
    },
    kick: blend < 0.5 ? { ...p1.kick } : { ...p2.kick },
    bass: blend < 0.5 ? { ...p1.bass } : { ...p2.bass },
    effects: blend < 0.5 ? { ...p1.effects } : { ...p2.effects },
    arrangement: {
      ...( blend < 0.5 ? p1.arrangement : p2.arrangement ),
      dropCount: Math.round(lerp(p1.arrangement.dropCount, p2.arrangement.dropCount, blend)),
      energyCurve: p1.arrangement.energyCurve.map((v, i) =>
        lerp(v, p2.arrangement.energyCurve[i] || v, blend)
      ),
    },
    hats: blend < 0.5 ? { ...p1.hats } : { ...p2.hats },
    clap: blend < 0.5 ? { ...p1.clap } : { ...p2.clap },
    synths: blend < 0.5 ? { ...p1.synths } : { ...p2.synths },
    vocals: blend < 0.5 ? { ...p1.vocals } : { ...p2.vocals },
    djayPro: blend < 0.5 ? { ...p1.djayPro } : { ...p2.djayPro },
  };
}

/**
 * Musical key relationships for remix key selection
 */
export const KEY_RELATIONSHIPS = {
  'C':  { relative: 'Am',  dominant: 'G',  subdominant: 'F',  parallel: 'Cm' },
  'C#': { relative: 'A#m', dominant: 'G#', subdominant: 'F#', parallel: 'C#m' },
  'D':  { relative: 'Bm',  dominant: 'A',  subdominant: 'G',  parallel: 'Dm' },
  'D#': { relative: 'Cm',  dominant: 'A#', subdominant: 'G#', parallel: 'D#m' },
  'E':  { relative: 'C#m', dominant: 'B',  subdominant: 'A',  parallel: 'Em' },
  'F':  { relative: 'Dm',  dominant: 'C',  subdominant: 'A#', parallel: 'Fm' },
  'F#': { relative: 'D#m', dominant: 'C#', subdominant: 'B',  parallel: 'F#m' },
  'G':  { relative: 'Em',  dominant: 'D',  subdominant: 'C',  parallel: 'Gm' },
  'G#': { relative: 'Fm',  dominant: 'D#', subdominant: 'C#', parallel: 'G#m' },
  'A':  { relative: 'F#m', dominant: 'E',  subdominant: 'D',  parallel: 'Am' },
  'A#': { relative: 'Gm',  dominant: 'F',  subdominant: 'D#', parallel: 'A#m' },
  'B':  { relative: 'G#m', dominant: 'F#', subdominant: 'E',  parallel: 'Bm' },
};

/**
 * Common genre BPM ranges for song analysis
 */
export const GENRE_BPM_MAP = {
  pop:          { range: [100, 130], energy: 0.5 },
  rock:         { range: [110, 140], energy: 0.6 },
  hiphop:       { range: [80, 115],  energy: 0.5 },
  trap:         { range: [130, 170], energy: 0.7 },
  house:        { range: [120, 130], energy: 0.6 },
  techno:       { range: [125, 150], energy: 0.7 },
  dnb:          { range: [170, 180], energy: 0.8 },
  dubstep:      { range: [140, 150], energy: 0.8 },
  trance:       { range: [130, 145], energy: 0.7 },
  edm:          { range: [125, 150], energy: 0.7 },
  rnb:          { range: [90, 115],  energy: 0.4 },
  latin:        { range: [95, 130],  energy: 0.6 },
  country:      { range: [100, 140], energy: 0.5 },
  indie:        { range: [100, 140], energy: 0.5 },
  metal:        { range: [120, 180], energy: 0.9 },
  classical:    { range: [60, 140],  energy: 0.3 },
  jazz:         { range: [80, 160],  energy: 0.4 },
  reggae:       { range: [70, 90],   energy: 0.3 },
  funk:         { range: [100, 130], energy: 0.6 },
  disco:        { range: [115, 135], energy: 0.6 },
  unknown:      { range: [110, 130], energy: 0.5 },
};
