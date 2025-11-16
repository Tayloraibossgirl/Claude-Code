import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Lock, CheckCircle, Info, Home, RotateCcw, Eye } from 'lucide-react';

// Audio Engine: Proper binaural + isochronic entrainment
class NeuralAudioEngine {
  constructor() {
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.ctx.destination);

    this.binauralGain = this.ctx.createGain();
    this.isochronicGain = this.ctx.createGain();
    this.noiseGain = this.ctx.createGain();

    this.binauralGain.connect(this.masterGain);
    this.isochronicGain.connect(this.masterGain);
    this.noiseGain.connect(this.masterGain);

    this.leftOsc = null;
    this.rightOsc = null;
    this.isoOsc = null;
    this.isoLFO = null;
    this.noiseNode = null;
    this.isPlaying = false;
    this.currentBeat = 6;
  }

  createPinkNoise() {
    const bufferSize = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    return noise;
  }

  start(targetFreq = 6) {
    if (this.isPlaying) return;
    this.isPlaying = true;

    const carrierFreq = 150;
    const beatFreq = targetFreq;

    this.leftOsc = this.ctx.createOscillator();
    this.rightOsc = this.ctx.createOscillator();
    const merger = this.ctx.createChannelMerger(2);

    this.leftOsc.frequency.value = carrierFreq;
    this.rightOsc.frequency.value = carrierFreq + beatFreq;
    this.leftOsc.type = 'sine';
    this.rightOsc.type = 'sine';

    const leftGain = this.ctx.createGain();
    const rightGain = this.ctx.createGain();
    leftGain.gain.value = 0.15;
    rightGain.gain.value = 0.15;

    this.leftOsc.connect(leftGain);
    this.rightOsc.connect(rightGain);
    leftGain.connect(merger, 0, 0);
    rightGain.connect(merger, 0, 1);
    merger.connect(this.binauralGain);

    this.isoOsc = this.ctx.createOscillator();
    this.isoLFO = this.ctx.createOscillator();
    const isoGainNode = this.ctx.createGain();

    this.isoOsc.frequency.value = carrierFreq;
    this.isoOsc.type = 'sine';
    this.isoLFO.frequency.value = beatFreq;
    this.isoLFO.type = 'square';

    this.isoOsc.connect(isoGainNode);
    this.isoLFO.connect(isoGainNode.gain);
    isoGainNode.gain.value = 0.08;
    isoGainNode.connect(this.isochronicGain);

    this.noiseNode = this.createPinkNoise();
    this.noiseGain.gain.value = 0.03;
    this.noiseNode.connect(this.noiseGain);

    this.leftOsc.start();
    this.rightOsc.start();
    this.isoOsc.start();
    this.isoLFO.start();
    this.noiseNode.start();

    this.masterGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.masterGain.gain.linearRampToValueAtTime(1, this.ctx.currentTime + 3);
  }

  stop() {
    if (!this.isPlaying) return;

    this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 2);

    setTimeout(() => {
      [this.leftOsc, this.rightOsc, this.isoOsc, this.isoLFO, this.noiseNode].forEach(node => {
        if (node) {
          try { node.stop(); } catch(e) {}
        }
      });
      this.isPlaying = false;
    }, 2100);
  }

  setIntensity(level) {
    if (!this.isPlaying) return;
    this.masterGain.gain.linearRampToValueAtTime(level, this.ctx.currentTime + 0.5);
  }

  updateFrequency(coherence) {
    let beat;
    if (coherence < 0.3) beat = 8;
    else if (coherence < 0.6) beat = 6;
    else if (coherence < 0.85) beat = 5;
    else beat = 4;
    this.currentBeat = beat;

    if (this.rightOsc && this.leftOsc) {
      const carrier = this.leftOsc.frequency.value;
      this.rightOsc.frequency.setTargetAtTime(carrier + beat, this.ctx.currentTime, 0.1);
    }
    if (this.isoLFO) {
      this.isoLFO.frequency.setTargetAtTime(beat, this.ctx.currentTime, 0.1);
    }
  }
}

const LEVELS = [
  {
    id: 1,
    name: 'Glass',
    mechanic: 'stillness',
    clarityThreshold: 0.75,
    desc: 'A true pattern will emerge. Wait for it. False signals will try to deceive you.',
    instruction: 'Let go. Don\'t seek. Just observe.'
  },
  {
    id: 2,
    name: 'Moiré',
    mechanic: 'ambiguous',
    clarityThreshold: 0.80,
    desc: 'Let your focus soften. One interpretation will dominate.',
    instruction: 'Soft gaze reveals truth.'
  },
  {
    id: 3,
    name: 'Loom',
    mechanic: 'bilateral',
    clarityThreshold: 0.82,
    desc: 'Two streams diverge. Wait for the moment they align.',
    instruction: 'Patience finds synchrony.'
  },
  {
    id: 4,
    name: 'Shards',
    mechanic: 'breath',
    clarityThreshold: 0.88,
    desc: 'Slow your tempo. Long pauses assemble the fragments.',
    instruction: 'Breath shapes form.'
  },
  {
    id: 5,
    name: 'Echo Gate',
    mechanic: 'inhibition',
    clarityThreshold: 0.90,
    maxFalsePositives: 2,
    desc: 'Resist the false signals. Tap only on truth.',
    instruction: 'Impulse is the enemy.'
  }
];

const PALETTE = {
  primaryHue: 290,
  secondaryHue: 320,
  accentHue: 25
};

const Renderers = {
  stillness: (ctx, w, h, time, coherence, noiseLevel, truePattern, falsePattern) => {
    const shardCount = 80;
    const assemblyProgress = coherence;
    const scatter = noiseLevel * 150 + Math.pow(1 - assemblyProgress, 1.5) * 100;

    for (let i = 0; i < shardCount; i++) {
      const targetAngle = (i / shardCount) * Math.PI * 2;
      const targetRadius = 100;
      const noise = Math.sin(time * 0.01 + i) * scatter;

      const angle = targetAngle + (Math.random() - 0.5) * (1 - assemblyProgress) * 0.5;
      const radius = targetRadius + noise;

      const x = w/2 + Math.cos(angle) * radius;
      const y = h/2 + Math.sin(angle) * radius;
      const size = 8 + assemblyProgress * 12;
      const alpha = 0.3 + assemblyProgress * 0.6;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);

      ctx.fillStyle = `hsla(${PALETTE.primaryHue}, 50%, ${70 + assemblyProgress * 10}%, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.lineTo(size * 0.6, 0);
      ctx.lineTo(0, size * 0.4);
      ctx.lineTo(-size * 0.6, 0);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = `hsla(${PALETTE.primaryHue}, 50%, 50%, ${alpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.restore();
    }

    // False attractor (red glow, slightly off-center)
    if (falsePattern) {
      const pulse = Math.sin(time * 0.4) * 0.2 + 0.6;
      const offset = 40;
      const rings = 4;
      for (let i = 0; i < rings; i++) {
        ctx.strokeStyle = `hsla(0, 70%, 60%, ${pulse * (1 - i / rings) * 0.5})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(w/2 + offset, h/2, 35 + i * 12, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // True attractor (magenta/pink glow, center)
    if (truePattern) {
      const glow = Math.sin(time * 0.2) * 0.15 + 0.75;
      const rings = 5;
      for (let i = 0; i < rings; i++) {
        const ringAlpha = glow * (1 - i / rings);
        ctx.strokeStyle = `hsla(${PALETTE.secondaryHue}, 80%, 75%, ${ringAlpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(w/2, h/2, 40 + i * 15, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Central indicator
      ctx.fillStyle = `hsla(${PALETTE.secondaryHue}, 80%, 80%, ${glow})`;
      ctx.beginPath();
      ctx.arc(w/2, h/2, 15, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  ambiguous: (ctx, w, h, time, coherence, noiseLevel) => {
    const lines = 40;
    const offset1 = time * 0.2;
    const offset2 = time * 0.15;
    const separation = Math.pow(1 - coherence, 1.5) * 25 + noiseLevel * 10 + 5;

    for (let i = 0; i < lines; i++) {
      const wave1 = Math.sin((i + offset1) * 0.2) * separation;
      const wave2 = Math.sin((i + offset2) * 0.18) * separation;

      const alpha = 0.2 + coherence * 0.3;

      ctx.strokeStyle = `hsla(${PALETTE.primaryHue}, 60%, 75%, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 5) {
        const y = h/2 + (i - lines/2) * 8 + Math.sin(x * 0.02 + offset1) * wave1;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.strokeStyle = `hsla(${PALETTE.secondaryHue}, 60%, 75%, ${alpha})`;
      ctx.beginPath();
      for (let x = 0; x <= w; x += 5) {
        const y = h/2 + (i - lines/2) * 8 + Math.sin(x * 0.025 + offset2) * wave2;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  },

  bilateral: (ctx, w, h, time, coherence, noiseLevel) => {
    const threads = 25;
    const leftPhase = time * 0.03;
    const rightPhase = time * 0.025;
    const sync = Math.abs(Math.sin(leftPhase) - Math.sin(rightPhase));
    const alignment = 1 - sync;

    for (let i = 0; i < threads; i++) {
      const progress = coherence * threads;
      const alpha = i < progress ? 0.7 : 0.15;

      const leftOffset = Math.sin(leftPhase + i * 0.2) * (1 - alignment) * 30;
      const rightOffset = Math.sin(rightPhase + i * 0.2) * (1 - alignment) * 30;

      ctx.strokeStyle = `hsla(${PALETTE.primaryHue}, 70%, 75%, ${alpha})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(w * 0.15, h * 0.2 + i * 12);
      ctx.quadraticCurveTo(w * 0.35 + leftOffset, h * 0.5 + i * 6, w * 0.5, h * 0.65 + i * 3);
      ctx.stroke();

      ctx.strokeStyle = `hsla(${PALETTE.secondaryHue}, 70%, 75%, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(w * 0.85, h * 0.2 + i * 12);
      ctx.quadraticCurveTo(w * 0.65 - rightOffset, h * 0.5 + i * 6, w * 0.5, h * 0.65 + i * 3);
      ctx.stroke();
    }

    if (alignment > 0.7) {
      const pulseAlpha = alignment * Math.sin(time * 0.1) * 0.3 + 0.5;
      ctx.fillStyle = `hsla(${PALETTE.accentHue}, 70%, 80%, ${pulseAlpha})`;
      ctx.beginPath();
      ctx.arc(w/2, h * 0.7, 15, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  breath: (ctx, w, h, time, coherence, lastTapInterval) => {
    const breathQuality = Math.min(lastTapInterval / 3000, 1);
    const assemblyRate = breathQuality * coherence;

    const shards = 12;
    for (let i = 0; i < shards; i++) {
      const angle = (i / shards) * Math.PI * 2;
      const dist = 120 * (1 - assemblyRate * 0.7);
      const x = w/2 + Math.cos(angle) * dist;
      const y = h/2 + Math.sin(angle) * dist;

      const size = 20 + assemblyRate * 20;
      const alpha = 0.3 + assemblyRate * 0.6;

      ctx.fillStyle = `hsla(${PALETTE.primaryHue}, 55%, 75%, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `hsla(${PALETTE.primaryHue}, 55%, 60%, ${alpha * 0.6})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    if (assemblyRate > 0.6) {
      ctx.fillStyle = `hsla(${PALETTE.accentHue}, 70%, 85%, ${(assemblyRate - 0.6) * 2.5})`;
      ctx.beginPath();
      ctx.arc(w/2, h/2, 40, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  inhibition: (ctx, w, h, time, coherence, falsePositives, showFalseSignal, showTrueSignal) => {
    const rings = 20;

    for (let i = 0; i < rings; i++) {
      const progress = coherence * rings;
      const alpha = i < progress ? 0.6 : 0.1;

      ctx.strokeStyle = `hsla(${PALETTE.primaryHue}, 60%, 75%, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(w/2, h/2, 30 + i * 20, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (showFalseSignal) {
      const pulse = Math.sin(time * 0.3) * 0.3 + 0.7;
      ctx.fillStyle = `hsla(0, 70%, 60%, ${pulse})`;
      ctx.beginPath();
      ctx.arc(w/2, h/2, 60, 0, Math.PI * 2);
      ctx.fill();
    }

    if (showTrueSignal) {
      const glow = Math.sin(time * 0.15) * 0.2 + 0.8;
      ctx.fillStyle = `hsla(${PALETTE.secondaryHue}, 80%, 70%, ${glow})`;
      ctx.beginPath();
      ctx.arc(w/2, h/2, 80, 0, Math.PI * 2);
      ctx.fill();
    }

    if (falsePositives > 0) {
      ctx.fillStyle = 'hsla(0, 70%, 60%, 0.8)';
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`Impulses: ${falsePositives}`, w/2, h - 40);
    }
  }
};

export default function FlowfieldGame() {
  const [screen, setScreen] = useState('menu');
  const [level, setLevel] = useState(null);
  const [state, setState] = useState('idle');
  const [progress, setProgress] = useState(() => {
    const saved = localStorage.getItem('flowfield_progress');
    return saved ? JSON.parse(saved) : { completed: [], bestScores: {} };
  });

  const [coherence, setCoherence] = useState(0);
  const [noiseLevel, setNoiseLevel] = useState(0);
  const [stillnessDuration, setStillnessDuration] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [lastTapInterval, setLastTapInterval] = useState(0);
  const [falsePositives, setFalsePositives] = useState(0);
  const [showFalseSignal, setShowFalseSignal] = useState(false);
  const [showTrueSignal, setShowTrueSignal] = useState(false);
  const [showDev, setShowDev] = useState(false);
  const [truePatternActive, setTruePatternActive] = useState(false);
  const [falsePatternActive, setFalsePatternActive] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  const canvasRef = useRef(null);
  const audioEngine = useRef(null);
  const animFrame = useRef(null);
  const stillnessTimer = useRef(null);
  const signalTimer = useRef(null);
  const patternTimer = useRef(null);

  useEffect(() => {
    audioEngine.current = new NeuralAudioEngine();
    return () => audioEngine.current?.stop();
  }, []);

  useEffect(() => {
    localStorage.setItem('flowfield_progress', JSON.stringify(progress));
  }, [progress]);

  // Pattern activation system for Glass mechanic
  useEffect(() => {
    if (level?.mechanic === 'stillness' && state === 'playing') {
      const schedulePattern = () => {
        const delay = 3000 + Math.random() * 5000; // Random delay 3-8 seconds

        patternTimer.current = setTimeout(() => {
          const now = performance.now();
          const timeSinceLastTap = now - lastTapTime;

          // True pattern appears during deep stillness + high coherence (hypnagogic state)
          const inHypnagogicState = timeSinceLastTap > 4000 && coherence > 0.5;
          // False pattern appears when tapping too much (trying too hard, not in DMN)
          const tryingTooHard = timeSinceLastTap < 3000 && tapCount > 2;

          if (inHypnagogicState && Math.random() > 0.4) {
            // Show true pattern
            setTruePatternActive(true);
            setTimeout(() => {
              setTruePatternActive(false);
            }, 3000); // Pattern visible for 3 seconds
          } else if (tryingTooHard && Math.random() > 0.5) {
            // Show false pattern (distractor)
            setFalsePatternActive(true);
            setTimeout(() => {
              setFalsePatternActive(false);
            }, 2000); // Shorter duration for false pattern
          }

          schedulePattern(); // Schedule next pattern
        }, delay);
      };

      schedulePattern();
      return () => clearTimeout(patternTimer.current);
    }
  }, [level, state, lastTapTime, coherence, tapCount]);

  useEffect(() => {
    if (state === 'playing') {
      stillnessTimer.current = setInterval(() => {
        const now = performance.now();
        const timeSinceLastTap = now - lastTapTime;
        setStillnessDuration(timeSinceLastTap);

        // For Glass mechanic: coherence builds through diffuse awareness (DMN activation)
        if (level?.mechanic === 'stillness') {
          setCoherence(prev => {
            // Deep stillness activates DMN and builds coherence
            const isDeepStillness = timeSinceLastTap > 6000;
            const isMediumStillness = timeSinceLastTap > 3000 && timeSinceLastTap <= 6000;
            const isTappingTooMuch = timeSinceLastTap < 2000;

            const deepStillnessBoost = isDeepStillness ? 0.008 : 0;
            const mediumStillnessBoost = isMediumStillness ? 0.004 : 0;
            const activeAttentionPenalty = isTappingTooMuch ? 0.015 : 0; // Trying too hard
            const noisePenalty = noiseLevel * 0.01;
            const entropy = 0.002; // Natural decay

            let next = prev - entropy + deepStillnessBoost + mediumStillnessBoost - noisePenalty - activeAttentionPenalty;
            next = Math.max(0, Math.min(1, next));

            if (next > 0.4 && audioEngine.current && !audioEngine.current.isPlaying) {
              audioEngine.current.start(6);
            }

            if (audioEngine.current?.isPlaying) {
              audioEngine.current.updateFrequency(next);
              audioEngine.current.setIntensity(next * 0.7);
            }

            return next;
          });
        } else {
          // Other levels use original entropy-based system
          setCoherence(prev => {
            const entropy = 0.003;
            const stillnessThreshold = 300;
            const maxStillnessBoost = 0.008;

            const stillnessBoost = timeSinceLastTap > stillnessThreshold
              ? Math.min(maxStillnessBoost, (timeSinceLastTap - stillnessThreshold) / 5000)
              : 0;
            const noisePenalty = noiseLevel * 0.01;
            const recentTapPenalty = timeSinceLastTap < 500 ? 0.05 : 0;

            let next = prev - entropy + stillnessBoost - noisePenalty - recentTapPenalty;
            next = Math.max(0, Math.min(1, next));

            if (next > 0.4 && audioEngine.current && !audioEngine.current.isPlaying) {
              audioEngine.current.start(6);
            }

            if (audioEngine.current?.isPlaying) {
              const delta = next - prev;
              audioEngine.current.updateFrequency(next);
              audioEngine.current.setIntensity(Math.max(0, delta * 10));
            }

            // Auto-win for non-Glass levels
            if (next >= level.clarityThreshold && timeSinceLastTap > 2000 && state === 'playing') {
              setState('resolved');
              const score = Math.floor(next * 100);
              setProgress(prevProg => ({
                ...prevProg,
                completed: [...new Set([...prevProg.completed, level.id])],
                bestScores: { ...prevProg.bestScores, [level.id]: Math.max(prevProg.bestScores[level.id] || 0, score) }
              }));
              setTimeout(() => setState('transfer'), 2000);
            }

            return next;
          });
        }

        setNoiseLevel(prev => Math.max(0, prev * 0.99));
      }, 100);

      return () => clearInterval(stillnessTimer.current);
    }
  }, [state, lastTapTime, lastTapInterval, level, noiseLevel]);

  useEffect(() => {
    if (level?.mechanic === 'inhibition' && state === 'playing') {
      const scheduleSignal = () => {
        const delay = 2000 + Math.random() * 4000;
        signalTimer.current = setTimeout(() => {
          const isFalse = Math.random() < 0.7;

          if (isFalse) {
            setShowFalseSignal(true);
            setTimeout(() => setShowFalseSignal(false), 800);
          } else {
            setShowTrueSignal(true);
            setTimeout(() => setShowTrueSignal(false), 1200);
          }

          scheduleSignal();
        }, delay);
      };

      scheduleSignal();
      return () => clearTimeout(signalTimer.current);
    }
  }, [level, state]);

  const handleTap = useCallback(() => {
    if (!level || state !== 'playing') return;

    const now = performance.now();
    const interval = lastTapTime > 0 ? now - lastTapTime : 0;
    setLastTapTime(now);
    setLastTapInterval(interval);
    setTapCount(prev => prev + 1);

    if (level.mechanic === 'stillness') {
      // Glass mechanic: Tap to lock pattern
      if (truePatternActive) {
        // Correct! Locked true pattern - WIN
        setState('resolved');
        const score = Math.floor(coherence * 100);
        setProgress(prev => ({
          ...prev,
          completed: [...new Set([...prev.completed, level.id])],
          bestScores: { ...prev.bestScores, [level.id]: Math.max(prev.bestScores[level.id] || 0, score) }
        }));
        audioEngine.current?.stop();
        setTimeout(() => setState('transfer'), 2000);
      } else if (falsePatternActive) {
        // Wrong! Tapped false attractor
        setCoherence(prev => Math.max(0, prev - 0.4));
        setNoiseLevel(prev => Math.min(1, prev + 0.5));
        setFalsePatternActive(false);
      } else {
        // Tapped when no pattern present—adds noise, disrupts DMN
        setNoiseLevel(prev => Math.min(1, prev + 0.3));
        setCoherence(prev => Math.max(0, prev - 0.2));
      }
    } else if (level.mechanic === 'ambiguous' || level.mechanic === 'bilateral') {
      // Tapping adds noise
      setNoiseLevel(prev => Math.min(1, prev + 0.3));
      setCoherence(prev => Math.max(0, prev - 0.15));
    } else if (level.mechanic === 'breath') {
      // Long intervals are good, short are bad
      if (interval < 1500) {
        setNoiseLevel(prev => Math.min(1, prev + 0.2));
        setCoherence(prev => Math.max(0, prev - 0.1));
      }
    } else if (level.mechanic === 'inhibition') {
      // Check if tapping during true vs false signal
      if (showFalseSignal) {
        setFalsePositives(prev => prev + 1);
        setCoherence(prev => Math.max(0, prev - 0.2));

        if (falsePositives >= level.maxFalsePositives) {
          setState('failed');
        }
      } else if (showTrueSignal) {
        setCoherence(prev => Math.min(1, prev + 0.15));
        setShowTrueSignal(false);
      }
    }
  }, [level, state, lastTapTime, showFalseSignal, showTrueSignal, falsePositives, truePatternActive, falsePatternActive, coherence]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || screen !== 'game') return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);

    let time = 0;

    const animate = () => {
      const w = canvas.offsetWidth, h = canvas.offsetHeight;

      const baseHue = PALETTE.primaryHue;
      const hueShift = 60;
      const bgHue = baseHue + (1 - coherence) * 40;
      const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, Math.max(w, h)/2);
      grad.addColorStop(0, `hsl(${bgHue}, 50%, ${22 + coherence * 20}%)`);
      grad.addColorStop(1, `hsl(${(bgHue + hueShift) % 360}, 55%, ${16 + coherence * 15}%)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const renderer = Renderers[level?.mechanic] || Renderers.stillness;

      if (level?.mechanic === 'stillness') {
        renderer(ctx, w, h, time, coherence, noiseLevel, truePatternActive, falsePatternActive);
      } else if (level?.mechanic === 'inhibition') {
        renderer(ctx, w, h, time, coherence, falsePositives, showFalseSignal, showTrueSignal);
      } else if (level?.mechanic === 'breath') {
        renderer(ctx, w, h, time, coherence, lastTapInterval);
      } else {
        renderer(ctx, w, h, time, coherence, noiseLevel);
      }

      if (state === 'resolved' || state === 'transfer') {
        const petals = 16;
        for (let i = 0; i < petals; i++) {
          const angle = (i / petals) * Math.PI * 2;
          const length = 100 + Math.sin(time * 0.01 + i) * 20;
          ctx.strokeStyle = `hsla(${PALETTE.secondaryHue}, 70%, 85%, ${0.8 + Math.sin(time * 0.02 + i) * 0.2})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(w/2, h/2);
          ctx.lineTo(w/2 + Math.cos(angle) * length, h/2 + Math.sin(angle) * length);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(w/2 + Math.cos(angle) * length, h/2 + Math.sin(angle) * length, 8, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${PALETTE.secondaryHue}, 80%, 90%, 0.9)`;
          ctx.fill();
        }
      }

      time++;
      animFrame.current = requestAnimationFrame(animate);
    };

    animate();
    return () => animFrame.current && cancelAnimationFrame(animFrame.current);
  }, [coherence, noiseLevel, state, screen, level, falsePositives, showFalseSignal, showTrueSignal, lastTapInterval, truePatternActive, falsePatternActive]);

  const start = (lvl) => {
    setLevel(lvl);
    setScreen('game');
    setState('playing');
    setCoherence(0);
    setNoiseLevel(0.5);
    setStillnessDuration(0);
    setLastTapTime(performance.now());
    setLastTapInterval(0);
    setFalsePositives(0);
    setShowFalseSignal(false);
    setShowTrueSignal(false);
    setTruePatternActive(false);
    setFalsePatternActive(false);
    setTapCount(0);
  };

  const reset = () => {
    setState('playing');
    setCoherence(0);
    setNoiseLevel(0.5);
    setStillnessDuration(0);
    setLastTapTime(performance.now());
    setFalsePositives(0);
    setTruePatternActive(false);
    setFalsePatternActive(false);
    setTapCount(0);
    audioEngine.current?.stop();
  };

  const toMenu = () => {
    audioEngine.current?.stop();
    setScreen('menu');
    setLevel(null);
    setState('idle');
  };

  if (screen === 'menu') {
    return (
      <div className="w-full h-screen bg-gradient-to-br from-purple-950 via-pink-900 to-orange-950 flex flex-col items-center justify-center p-8">
        <div className="text-center mb-12">
          <h1 className="text-6xl font-light text-white mb-4 tracking-wide">Flowfield</h1>
          <p className="text-white/60 text-lg mb-2">A puzzle about awareness</p>
          <p className="text-white/40 text-sm">Not rhythm. Not reaction. Pure observation.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl w-full mb-8">
          {LEVELS.map(lvl => {
            const done = progress.completed.includes(lvl.id);
            const unlocked = lvl.id === 1 || progress.completed.includes(lvl.id - 1);
            const best = progress.bestScores[lvl.id];

            return (
              <button
                key={lvl.id}
                onClick={() => unlocked && start(lvl)}
                disabled={!unlocked}
                className={`relative p-8 rounded-2xl border-2 transition-all ${
                  unlocked
                    ? 'bg-white/10 border-white/30 hover:bg-white/20 hover:scale-105'
                    : 'bg-white/5 border-white/10 cursor-not-allowed opacity-50'
                }`}
              >
                <div className="text-white/90 font-light text-2xl mb-3">{lvl.name}</div>
                <div className="text-white/60 text-sm mb-4">{lvl.desc}</div>
                <div className="text-white/40 text-xs italic">{lvl.instruction}</div>
                {done && <CheckCircle className="absolute top-3 right-3 w-6 h-6 text-green-400" />}
                {!unlocked && <Lock className="absolute top-3 right-3 w-6 h-6 text-white/30" />}
                {best && <div className="text-white/50 text-xs mt-2">Best: {best}</div>}
              </button>
            );
          })}
        </div>

        <div className="text-white/40 text-sm text-center max-w-md space-y-2">
          <p>Headphones recommended for binaural audio.</p>
          <p className="text-xs">This is an awareness training tool, not therapy.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full cursor-crosshair"
        onClick={handleTap}
        onTouchStart={(e) => { e.preventDefault(); handleTap(); }}
      />

      <div className="absolute top-4 left-4 right-4 flex justify-between z-10 pointer-events-none">
        <div className="bg-black/50 backdrop-blur-md px-5 py-3 rounded-xl text-white/90 text-sm font-light border border-white/10">
          <Eye className="inline w-4 h-4 mr-2" />
          {level?.name}
        </div>
        <button onClick={() => setShowDev(!showDev)} className="pointer-events-auto bg-black/50 backdrop-blur-md p-3 rounded-xl border border-white/10 hover:bg-black/60">
          <Info className="w-5 h-5 text-white/70" />
        </button>
      </div>

      <div className="absolute top-24 left-1/2 -translate-x-1/2 z-10 max-w-md text-center">
        <div className="bg-black/50 backdrop-blur-md px-8 py-4 rounded-full text-white/90 font-light border border-white/10">
          {state === 'playing' && level?.instruction}
          {state === 'resolved' && 'Pattern locked'}
          {state === 'transfer' && 'Awareness achieved'}
          {state === 'failed' && 'Impulse broke the pattern'}
        </div>
      </div>

      {state === 'playing' && level?.mechanic === 'stillness' && (
        <div className="absolute top-48 left-1/2 -translate-x-1/2 z-10 text-center">
          {truePatternActive && (
            <div className="bg-green-500/20 backdrop-blur-md px-6 py-3 rounded-full text-green-300 font-light border border-green-400/30 animate-pulse">
              True pattern emerging - tap now!
            </div>
          )}
          {falsePatternActive && (
            <div className="bg-red-500/20 backdrop-blur-md px-6 py-3 rounded-full text-red-300 font-light border border-red-400/30">
              Distraction
            </div>
          )}
        </div>
      )}

      {state === 'playing' && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 w-80 z-10">
          <div className="text-center mb-2 text-white/60 text-xs font-mono">
            Coherence: {(coherence * 100).toFixed(0)}%
          </div>
          <div className="h-3 bg-white/10 rounded-full overflow-hidden border border-white/20">
            <div
              className="h-full bg-gradient-to-r from-pink-400 to-orange-400 transition-all duration-300 rounded-full"
              style={{ width: `${coherence * 100}%` }}
            />
          </div>
          {coherence >= level.clarityThreshold && level.mechanic !== 'stillness' && (
            <div className="text-center mt-2 text-green-400 text-sm animate-pulse">
              Hold this awareness...
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-10">
        <button onClick={toMenu} className="bg-black/50 backdrop-blur-md p-4 rounded-full hover:bg-black/60 border border-white/10 hover:scale-110 transition-transform">
          <Home className="w-5 h-5 text-white/70" />
        </button>
        <button onClick={reset} className="bg-black/50 backdrop-blur-md p-4 rounded-full hover:bg-black/60 border border-white/10 hover:scale-110 transition-transform">
          <RotateCcw className="w-5 h-5 text-white/70" />
        </button>
      </div>

      {showDev && (
        <div className="absolute top-20 right-4 bg-black/90 backdrop-blur-md p-5 rounded-xl text-white/80 text-xs font-mono z-20 border border-white/20 max-w-xs">
          <div className="grid gap-2">
            <div className="flex justify-between gap-4">
              <span className="text-white/50">Coherence:</span>
              <span className={coherence >= level?.clarityThreshold ? 'text-green-400 font-bold' : ''}>{(coherence * 100).toFixed(1)}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/50">Target:</span>
              <span className="text-blue-400">{(level?.clarityThreshold * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/50">Noise Level:</span>
              <span className={noiseLevel > 0.5 ? 'text-yellow-400' : ''}>{(noiseLevel * 100).toFixed(0)}%</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/50">Stillness:</span>
              <span>{(stillnessDuration / 1000).toFixed(1)}s</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-white/50">Tap Count:</span>
              <span>{tapCount}</span>
            </div>
            {level?.mechanic === 'stillness' && (
              <>
                <div className="flex justify-between gap-4">
                  <span className="text-white/50">True Pattern:</span>
                  <span className={truePatternActive ? 'text-green-400' : 'text-white/30'}>{truePatternActive ? 'ACTIVE' : 'waiting'}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-white/50">False Pattern:</span>
                  <span className={falsePatternActive ? 'text-red-400' : 'text-white/30'}>{falsePatternActive ? 'ACTIVE' : 'waiting'}</span>
                </div>
              </>
            )}
            {level?.mechanic === 'inhibition' && (
              <div className="flex justify-between gap-4">
                <span className="text-white/50">False+:</span>
                <span className="text-red-400">{falsePositives}/{level.maxFalsePositives}</span>
              </div>
            )}
            <div className="mt-2 pt-2 border-t border-white/20 text-white/50">
              <div className="mb-1">Audio: {audioEngine.current?.isPlaying ? `${audioEngine.current.currentBeat}Hz` : 'Off'}</div>
            </div>
          </div>
        </div>
      )}

      {state === 'transfer' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-30">
          <div className="text-white text-center">
            <div className="text-3xl font-light mb-4">Level Complete</div>
            <div className="text-white/60 mb-6">Coherence achieved: {(coherence * 100).toFixed(0)}%</div>
            <button onClick={toMenu} className="bg-white/20 hover:bg-white/30 px-8 py-3 rounded-full transition-colors text-lg">
              Continue
            </button>
          </div>
        </div>
      )}

      {state === 'failed' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-md z-30">
          <div className="text-white text-center">
            <div className="text-3xl font-light mb-4 text-red-400">Pattern Broken</div>
            <div className="text-white/60 mb-6">Impulse control is awareness</div>
            <button onClick={reset} className="bg-white/20 hover:bg-white/30 px-8 py-3 rounded-full transition-colors text-lg">
              Try Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
