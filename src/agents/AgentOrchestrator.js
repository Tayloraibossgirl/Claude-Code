/**
 * AgentOrchestrator
 *
 * Coordinates the agent team pipeline:
 *   1. SongAnalyzer  → Analyze the input song
 *   2. RemixEngine   → Generate the remix blueprint
 *   3. DjayProBridge → Translate to djay Pro outputs
 *
 * Provides status updates, error handling, and result aggregation.
 * This is the single entry point for the entire remix generation flow.
 */

import { SongAnalyzer } from './SongAnalyzer.js';
import { RemixEngine } from './RemixEngine.js';
import { DjayProBridge } from './DjayProBridge.js';

export class AgentOrchestrator {
  constructor() {
    this.analyzer = new SongAnalyzer();
    this.engine = new RemixEngine();
    this.bridge = new DjayProBridge();

    this.status = 'idle';
    this.currentPhase = null;
    this.progress = 0;
    this.logs = [];
    this.listeners = [];
  }

  /**
   * Subscribe to status updates
   * @param {function} callback - Called with { phase, progress, message }
   */
  onUpdate(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  _emit(phase, progress, message) {
    this.currentPhase = phase;
    this.progress = progress;
    this.logs.push({ phase, message, timestamp: Date.now() });
    for (const listener of this.listeners) {
      listener({ phase, progress, message });
    }
  }

  /**
   * Run the full remix pipeline
   *
   * @param {string} songTitle - Song to remix (e.g. "Blinding Lights")
   * @param {object} options
   * @param {string} options.artist - Optional artist name
   * @param {string} options.style - 'hyper-techno' | 'fast-basston' | 'auto'
   * @param {number} options.bpm - Override target BPM
   * @param {string} options.key - Override target key
   * @param {number} options.blend - Blend ratio if using both styles (0-1)
   *
   * @returns {object} Complete remix package
   */
  async generateRemix(songTitle, options = {}) {
    this.status = 'running';
    this.logs = [];

    try {
      // ─── PHASE 1: ANALYZE ───
      this._emit('analyze', 10, `Analyzing "${songTitle}"...`);

      const analysis = await this.analyzer.analyze(songTitle, options.artist);

      this._emit('analyze', 25, [
        `Found: ${analysis.original.genre} @ ${analysis.original.bpm} BPM`,
        `Key: ${analysis.original.key} | Energy: ${Math.round(analysis.original.energy * 100)}%`,
        `Confidence: ${Math.round(analysis.original.confidence * 100)}% (${analysis.original.source})`,
      ].join(' | '));

      // ─── PHASE 2: STYLE SELECTION ───
      this._emit('style', 30, 'Selecting remix style...');

      let styleId = options.style || 'auto';

      if (styleId === 'auto') {
        styleId = analysis.styleFit.recommended;
        this._emit('style', 35, `Auto-selected: ${styleId} (HT: ${Math.round(analysis.styleFit.hyperTechno * 100)}% / FB: ${Math.round(analysis.styleFit.fastBasston * 100)}%)`);
      }

      // Handle blend mode
      if (options.blend !== undefined && options.blend > 0 && options.blend < 1) {
        styleId = `hyper-techno:${Math.round((1 - options.blend) * 100)}/fast-basston:${Math.round(options.blend * 100)}`;
        this._emit('style', 35, `Blending styles: ${styleId}`);
      }

      // ─── PHASE 3: GENERATE REMIX BLUEPRINT ───
      this._emit('remix', 40, 'Generating remix blueprint...');

      const blueprint = await this.engine.generateRemix(analysis, styleId, {
        bpm: options.bpm,
        key: options.key,
      });

      this._emit('remix', 65, [
        `Blueprint: ${blueprint.arrangement.length} sections`,
        `${blueprint.meta.totalBars} bars @ ${blueprint.meta.targetBpm} BPM`,
        `Duration: ~${Math.round(blueprint.meta.estimatedDurationSec)}s`,
      ].join(' | '));

      // ─── PHASE 4: GENERATE DJAY PRO OUTPUTS ───
      this._emit('djay-pro', 70, 'Translating to djay Pro...');

      const djayOutputs = await this.bridge.generate(blueprint);

      this._emit('djay-pro', 90, [
        `${djayOutputs.cuePoints.length} cue points`,
        `${djayOutputs.effectsPreset.slots.length} effect slots`,
        `${djayOutputs.liveGuide.length} performance steps`,
      ].join(' | '));

      // ─── PHASE 5: PACKAGE RESULTS ───
      this._emit('complete', 100, 'Remix generation complete!');

      const result = {
        analysis,
        blueprint,
        djayPro: djayOutputs,
        meta: {
          generatedAt: new Date().toISOString(),
          songTitle,
          options,
          duration: blueprint.meta.estimatedDurationSec,
          phases: this.logs,
        },
      };

      this.status = 'complete';
      return result;

    } catch (error) {
      this._emit('error', this.progress, `Error: ${error.message}`);
      this.status = 'error';
      throw error;
    }
  }

  /**
   * Quick preview — just the cheat sheet and timeline, no full generation
   */
  async quickPreview(songTitle, artistName = null) {
    const analysis = await this.analyzer.analyze(songTitle, artistName);
    return {
      song: analysis.original,
      recommended: analysis.styleFit.recommended,
      scores: analysis.styleFit,
      structure: analysis.structure,
    };
  }

  /**
   * Get the current status of the orchestrator
   */
  getStatus() {
    return {
      status: this.status,
      phase: this.currentPhase,
      progress: this.progress,
      logs: this.logs,
    };
  }
}
