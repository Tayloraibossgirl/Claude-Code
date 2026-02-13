/**
 * RemixEngine Agent
 *
 * The core creative engine. Takes a SongAnalysis + ArtistProfile
 * and generates a complete remix blueprint:
 * - Arrangement timeline with sections
 * - Per-section effects chains
 * - Transition instructions
 * - EQ/filter automation curves
 * - Drop design with buildups
 *
 * This is the "producer brain" of the agent team.
 */

import { ARTIST_PROFILES, blendProfiles } from '../styles/artistProfiles.js';

export class RemixEngine {
  constructor() {
    this.status = 'idle';
    this.result = null;
  }

  /**
   * Generate a full remix blueprint
   * @param {object} songAnalysis - Output from SongAnalyzer
   * @param {string} styleId - 'hyper-techno' | 'fast-basston' | or blend
   * @param {object} options - Override options
   */
  async generateRemix(songAnalysis, styleId = null, options = {}) {
    this.status = 'generating';

    // Select style profile
    const style = styleId
      ? this._resolveStyle(styleId)
      : this._resolveStyle(songAnalysis.styleFit.recommended);

    // Determine target BPM
    const targetBpm = this._selectTargetBpm(songAnalysis, style, options.bpm);

    // Determine target key
    const targetKey = options.key || songAnalysis.remix.suggestedKey;

    // Generate arrangement
    const arrangement = this._generateArrangement(songAnalysis, style, targetBpm);

    // Generate effects automation
    const effectsTimeline = this._generateEffectsTimeline(arrangement, style);

    // Generate mix instructions
    const mixInstructions = this._generateMixInstructions(songAnalysis, style, targetBpm);

    // Generate vocal treatment plan
    const vocalPlan = this._generateVocalPlan(songAnalysis, style);

    // Generate the live performance cue sheet
    const cueSheet = this._generateCueSheet(arrangement, style);

    const blueprint = {
      meta: {
        originalTitle: songAnalysis.original.title,
        originalArtist: songAnalysis.original.artist,
        originalBpm: songAnalysis.original.bpm,
        originalKey: songAnalysis.original.key,
        remixStyle: style.name,
        targetBpm,
        targetKey,
        totalBars: arrangement.reduce((sum, s) => sum + s.bars, 0),
        estimatedDurationSec: this._barsToSeconds(
          arrangement.reduce((sum, s) => sum + s.bars, 0),
          targetBpm
        ),
      },
      arrangement,
      effectsTimeline,
      mixInstructions,
      vocalPlan,
      cueSheet,
      style,
    };

    this.status = 'complete';
    this.result = blueprint;
    return blueprint;
  }

  /**
   * Resolve a style profile by ID
   */
  _resolveStyle(styleId) {
    if (styleId === 'hyper-techno') return ARTIST_PROFILES.hyperTechno;
    if (styleId === 'fast-basston') return ARTIST_PROFILES.fastBasston;

    // Check for blend syntax: "hyper-techno:70/fast-basston:30"
    if (styleId.includes('/')) {
      const parts = styleId.split('/');
      const [id1, pct1] = parts[0].split(':');
      const blend = parseInt(pct1 || '50') / 100;
      return blendProfiles(id1.trim(), parts[1].split(':')[0].trim(), 1 - blend);
    }

    // Default to hyper techno
    return ARTIST_PROFILES.hyperTechno;
  }

  /**
   * Select the optimal target BPM for the remix
   */
  _selectTargetBpm(analysis, style, overrideBpm) {
    if (overrideBpm) return overrideBpm;

    const original = analysis.original.bpm;
    const [minBpm, maxBpm] = style.tempo.bpmRange;
    const preferred = style.tempo.preferredBpm;

    // Check if any BPM multiplier lands us in the target range
    for (const opt of analysis.remix.bpmMultiplier) {
      if (opt.resultBpm >= minBpm && opt.resultBpm <= maxBpm) {
        return opt.resultBpm;
      }
    }

    // If original is close, use it with small adjustment
    if (original >= minBpm - 10 && original <= maxBpm + 10) {
      return Math.max(minBpm, Math.min(maxBpm, original));
    }

    // Fall back to preferred BPM
    return preferred;
  }

  /**
   * Generate the full arrangement timeline
   */
  _generateArrangement(analysis, style, targetBpm) {
    const arr = style.arrangement;
    const sections = [];
    const { energy } = analysis.original;
    const hasVocals = analysis.structure.hasVocals;

    // -- INTRO --
    sections.push({
      id: 'intro',
      name: 'Intro',
      bars: arr.introBars,
      startBar: 0,
      bpm: targetBpm,
      energy: arr.energyCurve[0],
      elements: this._introElements(style, hasVocals),
      description: `${arr.introStyle} — stripped back, build tension`,
    });

    let currentBar = arr.introBars;

    // -- DROPS with BUILDUPS --
    for (let d = 0; d < arr.dropCount; d++) {
      const isFirstDrop = d === 0;
      const isFinalDrop = d === arr.dropCount - 1;
      const dropEnergy = isFinalDrop ? 1.0 : 0.8 + (d * 0.1);

      // Fake drop?
      const hasFakeDrop = d > 0 && Math.random() < arr.fakeDropProbability;

      // BUILDUP
      sections.push({
        id: `buildup-${d + 1}`,
        name: `Build ${d + 1}`,
        bars: arr.buildupBars,
        startBar: currentBar,
        bpm: targetBpm + (style.tempo.rushFactor * targetBpm * (d + 1)),
        energy: 0.5 + (d * 0.15),
        elements: this._buildupElements(style, d, hasFakeDrop),
        description: hasFakeDrop
          ? `Buildup with FAKE DROP at bar ${currentBar + arr.buildupBars - 2}`
          : `Rising tension, all filters sweeping up`,
      });
      currentBar += arr.buildupBars;

      // FAKE DROP (if applicable)
      if (hasFakeDrop) {
        sections.push({
          id: `fake-drop-${d + 1}`,
          name: 'Fake Drop',
          bars: 2,
          startBar: currentBar,
          bpm: targetBpm,
          energy: 0.1,
          elements: [
            { type: 'silence', durationBars: 1 },
            { type: 'reverse-cymbal', durationBars: 1 },
          ],
          description: 'Silence! The crowd thinks the drop is coming... PSYCH',
        });
        currentBar += 2;
      }

      // THE DROP
      sections.push({
        id: `drop-${d + 1}`,
        name: `Drop ${d + 1}${isFinalDrop ? ' (Final)' : ''}`,
        bars: arr.dropBars,
        startBar: currentBar,
        bpm: targetBpm + (style.tempo.rushFactor * targetBpm),
        energy: dropEnergy,
        elements: this._dropElements(style, analysis, d, isFinalDrop),
        description: isFinalDrop
          ? 'MAXIMUM ENERGY — everything unleashed'
          : `Main drop — ${style.kick.style} kick + ${style.bass.style} bass`,
      });
      currentBar += arr.dropBars;

      // BREAKDOWN (between drops, not after final)
      if (!isFinalDrop) {
        sections.push({
          id: `breakdown-${d + 1}`,
          name: `Breakdown ${d + 1}`,
          bars: arr.breakdownBars,
          startBar: currentBar,
          bpm: targetBpm,
          energy: 0.3,
          elements: this._breakdownElements(style, analysis, d),
          description: hasVocals
            ? 'Strip to vocals + atmospherics, rebuild tension'
            : 'Rhythmic breakdown, filter sweep back up',
        });
        currentBar += arr.breakdownBars;
      }
    }

    // -- OUTRO --
    sections.push({
      id: 'outro',
      name: 'Outro',
      bars: arr.outroBars,
      startBar: currentBar,
      bpm: targetBpm,
      energy: arr.energyCurve[arr.energyCurve.length - 1],
      elements: this._outroElements(style),
      description: `${arr.outroStyle} — wind down for mix-out`,
    });

    return sections;
  }

  // --- Section element generators ---

  _introElements(style, hasVocals) {
    const elements = [
      { type: 'kick', pattern: 'quarter', velocity: 0.5 },
      { type: 'hihat', pattern: style.hats.pattern, velocity: 0.3 },
    ];
    if (hasVocals) {
      elements.push({ type: 'vocal-tease', chopSize: '1-bar', filter: 'lowpass-800hz' });
    }
    if (style.bass.style === 'acid-saw') {
      elements.push({ type: 'bass-intro', filter: 'lowpass-sweep-up', startBar: 8 });
    }
    return elements;
  }

  _buildupElements(style, dropIndex, hasFakeDrop) {
    const elements = [
      { type: 'snare-roll', resolution: '1/16', crescendo: true },
      { type: 'highpass-sweep', startFreq: 200, endFreq: 4000 },
      { type: 'noise-riser', intensity: 0.7 + (dropIndex * 0.1) },
    ];

    for (const fx of style.effects.buildupEffects) {
      elements.push({ ...fx });
    }

    if (hasFakeDrop) {
      elements.push({ type: 'tension-cut', bar: -2, description: 'Cut everything at bar N-2' });
    }

    return elements;
  }

  _dropElements(style, analysis, dropIndex, isFinal) {
    const elements = [
      { type: 'kick', pattern: style.kick.pattern, velocity: 1.0, style: style.kick.style },
      { type: 'bass', pattern: style.bass.pattern, style: style.bass.style,
        filter: style.bass.filterType, resonance: style.bass.resonance },
      { type: 'hihat', pattern: style.hats.pattern, velocity: 0.7 + (dropIndex * 0.1) },
      { type: 'clap', pattern: style.clap.placement, style: style.clap.style },
    ];

    // Add style-specific drop effects
    for (const fx of style.effects.dropEffects) {
      elements.push({ ...fx, intensity: isFinal ? 1.0 : 0.8 });
    }

    // Synth elements
    if (style.synths.leadStyle) {
      elements.push({
        type: 'synth-lead', style: style.synths.leadStyle,
        intensity: isFinal ? 1.0 : 0.7,
      });
    }
    if (style.synths.arpeggiator) {
      elements.push({
        type: 'arpeggiator', ...style.synths.arpeggiator,
        intensity: 0.5 + (dropIndex * 0.2),
      });
    }

    // Final drop extras
    if (isFinal) {
      elements.push(
        { type: 'layer-everything', description: 'All elements at maximum' },
        { type: 'crowd-energy', style: 'peak' },
      );
    }

    return elements;
  }

  _breakdownElements(style, analysis, breakIndex) {
    const elements = [
      { type: 'kick-remove', fadeBars: 2 },
      { type: 'atmosphere', style: style.synths.padStyle || 'reverb-wash' },
      { type: 'filter-sweep', direction: 'down', targetFreq: 400 },
    ];

    if (analysis.structure.hasVocals) {
      elements.push({
        type: 'vocal-feature',
        treatment: 'isolated',
        effects: ['reverb-long', 'delay-ping-pong'],
      });
    }

    // Add transition effects leading back to next buildup
    for (const fx of style.effects.transitionEffects) {
      elements.push({ ...fx });
    }

    return elements;
  }

  _outroElements(style) {
    return [
      { type: 'kick', pattern: 'quarter', velocity: 0.6 },
      { type: 'hihat', pattern: style.hats.pattern, velocity: 0.3 },
      { type: 'filter-sweep', direction: 'down', targetFreq: 200 },
      { type: 'reverb-tail', size: 0.9, fadeout: true },
      { type: 'volume-fade', startDb: 0, endDb: -24, bars: 8 },
    ];
  }

  /**
   * Generate the effects automation timeline
   */
  _generateEffectsTimeline(arrangement, style) {
    const timeline = [];

    for (const section of arrangement) {
      const sectionEffects = {
        sectionId: section.id,
        startBar: section.startBar,
        endBar: section.startBar + section.bars,
        effects: [],
      };

      // Apply primary chain with section-appropriate intensity
      for (const fx of style.effects.primaryChain) {
        sectionEffects.effects.push({
          ...fx,
          intensity: section.energy,
          active: true,
        });
      }

      // Section-specific automation
      if (section.id.startsWith('buildup')) {
        sectionEffects.automation = [
          { param: 'highpass-freq', start: 20, end: 3000, curve: 'exponential' },
          { param: 'reverb-mix', start: 0.1, end: 0.6, curve: 'linear' },
          { param: 'master-volume', start: 0.8, end: 1.0, curve: 'linear' },
        ];
      } else if (section.id.startsWith('drop')) {
        sectionEffects.automation = [
          { param: 'highpass-freq', start: 20, end: 20, curve: 'snap' },
          { param: 'sidechain-depth', start: 0.9, end: 0.7, curve: 'linear' },
          { param: 'bass-filter', start: style.bass.filterCutoffRange[1], end: style.bass.filterCutoffRange[0], curve: 'saw-lfo' },
        ];
      } else if (section.id.startsWith('breakdown')) {
        sectionEffects.automation = [
          { param: 'lowpass-freq', start: 8000, end: 800, curve: 'exponential' },
          { param: 'reverb-mix', start: 0.2, end: 0.7, curve: 'linear' },
          { param: 'delay-feedback', start: 0.2, end: 0.5, curve: 'linear' },
        ];
      }

      timeline.push(sectionEffects);
    }

    return timeline;
  }

  /**
   * Generate djay Pro mix instructions
   */
  _generateMixInstructions(analysis, style, targetBpm) {
    return {
      deckSetup: {
        deckA: {
          role: 'original-track',
          load: `"${analysis.original.title}" by ${analysis.original.artist}`,
          neuralMix: style.djayPro.neuralMixIsolation,
          startCue: 'verse-1',
        },
        deckB: {
          role: 'remix-elements',
          load: 'Remix stems / loop pack',
          padMode: style.djayPro.padMode,
          loopSizes: style.djayPro.loopSizes,
        },
      },

      crossfader: {
        curve: style.djayPro.crossfaderCurve,
        automix: false,
        startPosition: 'deck-a',
      },

      eq: {
        style: style.djayPro.eqStyle,
        strategy: [
          { phase: 'intro', low: -6, mid: 0, high: -3, description: 'Reduce low end, let original breathe' },
          { phase: 'buildup', low: -12, mid: 3, high: 0, description: 'Kill bass for buildup tension' },
          { phase: 'drop', low: 0, mid: 0, high: 0, description: 'Full EQ restore on drop impact' },
          { phase: 'breakdown', low: -24, mid: -3, high: -6, description: 'Strip everything for vocal isolation' },
        ],
      },

      effectRack: style.djayPro.effectRack.map((effect, i) => ({
        slot: i + 1,
        effect,
        intensity: 0.5,
        linkedTo: i === 0 ? 'transition-moments' : 'manual',
      })),

      performance: {
        loopStrategy: `Use ${style.djayPro.loopSizes.join('/')} beat loops on vocal hooks`,
        scratchStyle: style.id === 'fast-basston' ? 'bass-scratch-drops' : 'minimal',
        cueJumping: style.djayPro.cuePointStrategy,
      },
    };
  }

  /**
   * Generate vocal treatment plan
   */
  _generateVocalPlan(analysis, style) {
    if (!analysis.structure.hasVocals) {
      return { hasVocals: false, plan: 'No vocal content detected — pure instrumental remix' };
    }

    return {
      hasVocals: true,
      isolation: 'Use Neural Mix to isolate vocals on Deck A',
      treatment: {
        intro: {
          action: 'Tease vocal with heavy filter',
          filter: 'lowpass-800hz',
          effects: ['reverb-large', 'delay-dotted-8th'],
          chop: false,
        },
        buildup: {
          action: 'Vocal chops building in intensity',
          chop: true,
          chopResolution: style.vocals.chopResolution,
          pitchShift: style.vocals.pitchShift,
          stutter: style.vocals.stutterProbability > 0.3,
        },
        drop: {
          action: style.vocals.vocoder ? 'Vocoded vocal stabs on drop' : 'Pitched vocal stabs',
          chop: true,
          chopResolution: '1/8',
          effects: ['distortion-light', 'formant-shift'],
          vocoder: style.vocals.vocoder || false,
        },
        breakdown: {
          action: 'Full isolated vocal with atmospheric effects',
          chop: false,
          effects: ['reverb-hall', 'delay-ping-pong', 'chorus'],
          filter: 'none — let it breathe',
        },
      },
    };
  }

  /**
   * Generate performance cue sheet (what to do and when)
   */
  _generateCueSheet(arrangement, style) {
    const cues = [];
    let timeOffset = 0;

    for (const section of arrangement) {
      const durationSec = this._barsToSeconds(section.bars, section.bpm);

      cues.push({
        time: this._formatTime(timeOffset),
        timeSeconds: timeOffset,
        section: section.name,
        bars: `${section.startBar + 1}-${section.startBar + section.bars}`,
        energy: `${Math.round(section.energy * 100)}%`,
        action: this._cueAction(section, style),
      });

      timeOffset += durationSec;
    }

    return cues;
  }

  _cueAction(section, style) {
    const id = section.id;
    if (id === 'intro') return 'Start with filtered loop, bring in hats gradually';
    if (id.startsWith('buildup')) return 'HP filter sweep UP, snare roll, kill bass EQ';
    if (id.startsWith('fake-drop')) return 'CUT EVERYTHING — 1 bar silence, then reverse cymbal';
    if (id.startsWith('drop')) {
      if (id.includes('Final')) return 'FULL SEND — all faders up, maximum energy, crowd peak';
      return `DROP! Restore bass EQ, ${style.kick.style} kick, ${style.bass.style} bass`;
    }
    if (id.startsWith('breakdown')) return 'Strip to vocals/atmosphere, LP filter sweep down';
    if (id === 'outro') return 'Gradual filter + volume fade, prepare next track';
    return section.description;
  }

  _barsToSeconds(bars, bpm) {
    const beatsPerBar = 4;
    return (bars * beatsPerBar * 60) / bpm;
  }

  _formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
