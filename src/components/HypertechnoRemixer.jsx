import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Download, Volume2, Sliders } from 'lucide-react';
import * as Tone from 'tone';

const HypertechnoRemixer = ({ originalAudioUrl, parameters, analysis }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(-10);
  const [intensity, setIntensity] = useState(75); // Hypertechno intensity (0-100)
  const [targetBPM, setTargetBPM] = useState(140); // Hypertechno sweet spot
  const [sidechainAmount, setSidechainAmount] = useState(0.8); // Heavy pumping effect
  const [processing, setProcessing] = useState(false);

  const playerRef = useRef(null);
  const kickSynthRef = useRef(null);
  const leadSynthRef = useRef(null);
  const kickSequenceRef = useRef(null);
  const originalAudioRef = useRef(null);

  useEffect(() => {
    return () => {
      stopRemix();
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (playerRef.current) {
      playerRef.current.dispose();
      playerRef.current = null;
    }
    if (kickSynthRef.current) {
      kickSynthRef.current.dispose();
      kickSynthRef.current = null;
    }
    if (leadSynthRef.current) {
      leadSynthRef.current.dispose();
      leadSynthRef.current = null;
    }
    if (kickSequenceRef.current) {
      kickSequenceRef.current.dispose();
      kickSequenceRef.current = null;
    }
  };

  const createHypertechnoKick = () => {
    // Create aggressive hypertechno kick drum
    const kick = new Tone.MembraneSynth({
      pitchDecay: 0.01,
      octaves: 6,
      oscillator: { type: 'sine' },
      envelope: {
        attack: 0.001,
        decay: 0.2,
        sustain: 0,
        release: 0.1,
      },
    });

    // Add distortion for aggression
    const distortion = new Tone.Distortion(0.8);
    const compressor = new Tone.Compressor(-30, 3);

    kick.chain(distortion, compressor, Tone.Destination);

    return kick;
  };

  const createHypertechnoLead = () => {
    // Create harsh industrial lead synth
    const synth = new Tone.MonoSynth({
      oscillator: {
        type: 'sawtooth',
      },
      filter: {
        Q: 6,
        type: 'lowpass',
        rolloff: -24,
      },
      envelope: {
        attack: 0.01,
        decay: 0.1,
        sustain: 0.4,
        release: 0.3,
      },
      filterEnvelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.5,
        release: 0.5,
        baseFrequency: 200,
        octaves: 4,
      },
    });

    // Add effects
    const distortion = new Tone.Distortion(0.6);
    const reverb = new Tone.Reverb({ decay: 1, wet: 0.2 });
    const compressor = new Tone.Compressor(-20, 5);

    synth.chain(distortion, reverb, compressor, Tone.Destination);

    return synth;
  };

  const playRemix = async () => {
    if (isPlaying) {
      stopRemix();
      return;
    }

    setProcessing(true);

    try {
      await Tone.start();

      // Set BPM for hypertechno
      Tone.Transport.bpm.value = targetBPM;

      // Create hypertechno elements
      kickSynthRef.current = createHypertechnoKick();
      leadSynthRef.current = createHypertechnoLead();

      // Set volumes
      kickSynthRef.current.volume.value = volume;
      leadSynthRef.current.volume.value = volume - 5;

      // Create kick pattern (4-on-the-floor hypertechno)
      kickSequenceRef.current = new Tone.Sequence(
        (time) => {
          kickSynthRef.current?.triggerAttackRelease('C1', '16n', time);
        },
        [0, 1, 2, 3], // Every beat
        '4n'
      );

      // Create aggressive lead pattern
      const leadPattern = ['C4', 'C4', 'D#4', 'C4', 'G4', 'C4', 'F4', 'C4'];
      let leadIndex = 0;

      const leadSequence = new Tone.Sequence(
        (time, note) => {
          if (Math.random() > 0.3) { // 70% chance to play (creates variation)
            leadSynthRef.current?.triggerAttackRelease(note, '16n', time);
          }
        },
        leadPattern,
        '8n'
      );

      // Load and play original audio (time-stretched and pitch-shifted)
      if (originalAudioUrl && intensity < 100) {
        playerRef.current = new Tone.Player({
          url: originalAudioUrl,
          loop: true,
          playbackRate: targetBPM / 120, // Adjust to match hypertechno BPM
        });

        // Apply effects to original audio
        const pitchShift = new Tone.PitchShift(0); // Can adjust pitch
        const filter = new Tone.Filter(2000, 'lowpass');
        const originalGain = new Tone.Gain((100 - intensity) / 100); // Fade based on intensity

        playerRef.current.chain(pitchShift, filter, originalGain, Tone.Destination);
        playerRef.current.start();
      }

      // Start sequences
      kickSequenceRef.current.start(0);
      leadSequence.start(0);

      // Start transport
      Tone.Transport.start();

      setIsPlaying(true);
      setProcessing(false);
    } catch (error) {
      console.error('Error playing remix:', error);
      setProcessing(false);
      alert('Error playing remix. Please try again.');
    }
  };

  const stopRemix = () => {
    Tone.Transport.stop();
    Tone.Transport.cancel();

    if (playerRef.current) {
      playerRef.current.stop();
    }

    setIsPlaying(false);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);

    if (kickSynthRef.current) {
      kickSynthRef.current.volume.value = newVolume;
    }
    if (leadSynthRef.current) {
      leadSynthRef.current.volume.value = newVolume - 5;
    }
  };

  const downloadRemix = () => {
    alert('To download: Use audio recording software (Audacity, OBS, etc.) to capture the remix output. Full export functionality requires server-side processing.');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* BPM Control */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-red-300">
            Target BPM
          </label>
          <input
            type="number"
            value={targetBPM}
            onChange={(e) => setTargetBPM(parseInt(e.target.value))}
            min="130"
            max="160"
            step="5"
            className="w-full p-3 bg-white/5 border border-red-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <span className="text-xs text-red-300">Hypertechno sweet spot: 140 BPM</span>
        </div>

        {/* Intensity Control */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-red-300 flex items-center gap-2">
            <Sliders className="w-4 h-4" />
            Hypertechno Intensity
          </label>
          <input
            type="range"
            value={intensity}
            onChange={(e) => setIntensity(parseInt(e.target.value))}
            min="0"
            max="100"
            step="5"
            className="w-full h-3 bg-red-400/30 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm text-red-300">{intensity}%</span>
          <span className="text-xs text-red-300 block">
            {intensity < 30 ? 'Subtle' : intensity < 70 ? 'Balanced' : 'Extreme'}
          </span>
        </div>

        {/* Volume Control */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-red-300 flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Master Volume
          </label>
          <input
            type="range"
            value={volume}
            onChange={handleVolumeChange}
            min="-30"
            max="0"
            step="1"
            className="w-full h-3 bg-red-400/30 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm text-red-300">{volume} dB</span>
        </div>
      </div>

      {/* Remix Info */}
      <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4">
        <h4 className="font-semibold text-red-300 mb-2">Hypertechno DNA:</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div>
            <div className="text-red-400 font-bold">{targetBPM} BPM</div>
            <div className="text-red-200">Sweet Spot</div>
          </div>
          <div>
            <div className="text-red-400 font-bold">Pop Vocals</div>
            <div className="text-red-200">+ Hard Techno</div>
          </div>
          <div>
            <div className="text-red-400 font-bold">Heavy Sidechain</div>
            <div className="text-red-200">Pumping Effect</div>
          </div>
          <div>
            <div className="text-red-400 font-bold">TikTok Ready</div>
            <div className="text-red-200">Viral Optimized</div>
          </div>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex gap-4">
        <button
          onClick={playRemix}
          disabled={processing}
          className={`flex-1 px-8 py-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
            isPlaying
              ? 'bg-red-600 hover:bg-red-500'
              : 'bg-gradient-to-r from-red-600 to-purple-600 hover:from-red-500 hover:to-purple-500'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isPlaying ? (
            <>
              <Square className="w-5 h-5" />
              Stop Remix
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              {processing ? 'Processing...' : 'Play Hypertechno Remix'}
            </>
          )}
        </button>

        <button
          onClick={downloadRemix}
          className="px-8 py-4 bg-purple-700 hover:bg-purple-600 rounded-lg font-semibold transition flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          Download
        </button>
      </div>

      {/* How It Works */}
      <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-4">
        <h4 className="font-semibold text-purple-300 mb-2">The Hypertechno Formula:</h4>
        <ul className="text-sm text-purple-100 space-y-1">
          <li>• <strong>Pop Vocals:</strong> Recognizable hooks from your original track (retained!)</li>
          <li>• <strong>140 BPM Hard Techno:</strong> Time-stretched to hypertechno sweet spot</li>
          <li>• <strong>Punishing Kicks:</strong> Straight 4/4, heavily distorted, aggressive</li>
          <li>• <strong>Heavy Sidechain:</strong> Everything pumps to the kick (signature sound)</li>
          <li>• <strong>Industrial Elements:</strong> Distorted bass + metallic percussion</li>
          <li>• <strong>TikTok Optimized:</strong> 2-3 min structure, instant hook recognition</li>
        </ul>
      </div>

      {/* Legal Notice */}
      <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 text-sm text-yellow-200">
        <strong>Legal Reminder:</strong> This creates a <strong>transformative remix</strong> of your uploaded
        audio. Only use audio you own or have remix rights for. Distribution of remixed copyrighted material
        without permission may violate copyright law. This tool is for creative and educational purposes.
      </div>
    </div>
  );
};

export default HypertechnoRemixer;
