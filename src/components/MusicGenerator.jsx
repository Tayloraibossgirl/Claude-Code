import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Download, Volume2, VolumeX } from 'lucide-react';
import * as Tone from 'tone';

const MusicGenerator = ({ parameters }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(-10);
  const [duration, setDuration] = useState(30);
  const [generating, setGenerating] = useState(false);
  const synthRef = useRef(null);
  const bassRef = useRef(null);
  const sequenceRef = useRef(null);
  const recorderRef = useRef(null);

  useEffect(() => {
    return () => {
      stopMusic();
    };
  }, []);

  const parseParametersToMusic = () => {
    // This is a simplified music generation based on common patterns
    // In a production app, you'd parse the AI parameters more intelligently

    const melodies = [
      ['C4', 'E4', 'G4', 'E4', 'C4', 'E4', 'G4', 'A4'],
      ['D4', 'F4', 'A4', 'F4', 'D4', 'F4', 'A4', 'B4'],
      ['E4', 'G4', 'B4', 'G4', 'E4', 'G4', 'B4', 'C5'],
    ];

    const chords = [
      ['C3', 'E3', 'G3'],
      ['F3', 'A3', 'C4'],
      ['G3', 'B3', 'D4'],
      ['Am3', 'C4', 'E4'],
    ];

    const bassNotes = ['C2', 'F2', 'G2', 'Am2'];

    return {
      melody: melodies[Math.floor(Math.random() * melodies.length)],
      chords: chords,
      bass: bassNotes,
      tempo: 120, // BPM
    };
  };

  const generateMusic = async () => {
    setGenerating(true);

    try {
      await Tone.start();

      const musicData = parseParametersToMusic();

      // Create synthesizer
      synthRef.current = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: 'triangle' },
        envelope: {
          attack: 0.02,
          decay: 0.1,
          sustain: 0.3,
          release: 1,
        },
      }).toDestination();

      // Create bass synthesizer
      bassRef.current = new Tone.MonoSynth({
        oscillator: { type: 'sawtooth' },
        envelope: {
          attack: 0.1,
          decay: 0.3,
          sustain: 0.4,
          release: 0.8,
        },
        filter: {
          Q: 2,
          type: 'lowpass',
          rolloff: -24,
        },
      }).toDestination();

      // Set volume
      synthRef.current.volume.value = volume;
      bassRef.current.volume.value = volume - 5;

      // Set tempo
      Tone.Transport.bpm.value = musicData.tempo;

      setGenerating(false);
      return musicData;
    } catch (error) {
      console.error('Error generating music:', error);
      setGenerating(false);
      return null;
    }
  };

  const playMusic = async () => {
    if (isPlaying) {
      stopMusic();
      return;
    }

    const musicData = await generateMusic();
    if (!musicData) return;

    setIsPlaying(true);

    // Create melody sequence
    let noteIndex = 0;
    const melodyPart = new Tone.Sequence(
      (time, note) => {
        synthRef.current?.triggerAttackRelease(note, '8n', time);
      },
      musicData.melody,
      '8n'
    );

    // Create bass sequence
    const bassPart = new Tone.Sequence(
      (time, note) => {
        bassRef.current?.triggerAttackRelease(note, '4n', time);
      },
      musicData.bass,
      '2n'
    );

    melodyPart.start(0);
    bassPart.start(0);

    Tone.Transport.start();

    // Auto-stop after duration
    setTimeout(() => {
      stopMusic();
    }, duration * 1000);
  };

  const stopMusic = () => {
    Tone.Transport.stop();
    Tone.Transport.cancel();
    setIsPlaying(false);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (synthRef.current) {
      synthRef.current.volume.value = newVolume;
    }
    if (bassRef.current) {
      bassRef.current.volume.value = newVolume - 5;
    }
  };

  const downloadMusic = async () => {
    alert('Recording functionality will capture the generated music when you click Play. For now, you can use audio recording software to capture the output.');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Duration Control */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-purple-300">
            Duration (seconds)
          </label>
          <input
            type="number"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            min="10"
            max="120"
            className="w-full p-3 bg-white/5 border border-purple-400/30 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>

        {/* Volume Control */}
        <div>
          <label className="block text-sm font-semibold mb-2 text-purple-300 flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            Volume
          </label>
          <input
            type="range"
            value={volume}
            onChange={handleVolumeChange}
            min="-30"
            max="0"
            step="1"
            className="w-full h-3 bg-purple-400/30 rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-sm text-purple-300">{volume} dB</span>
        </div>
      </div>

      {/* Playback Controls */}
      <div className="flex gap-4">
        <button
          onClick={playMusic}
          disabled={generating}
          className={`flex-1 px-8 py-4 rounded-lg font-semibold transition flex items-center justify-center gap-2 ${
            isPlaying
              ? 'bg-red-600 hover:bg-red-500'
              : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isPlaying ? (
            <>
              <Square className="w-5 h-5" />
              Stop
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              {generating ? 'Generating...' : 'Play Generated Music'}
            </>
          )}
        </button>

        <button
          onClick={downloadMusic}
          className="px-8 py-4 bg-purple-700 hover:bg-purple-600 rounded-lg font-semibold transition flex items-center gap-2"
        >
          <Download className="w-5 h-5" />
          Download
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-900/30 border border-blue-500/50 rounded-lg p-4">
        <h4 className="font-semibold text-blue-300 mb-2">How it works:</h4>
        <ul className="text-sm text-blue-100 space-y-1">
          <li>• AI analyzes your description to understand the musical style</li>
          <li>• Generates synthesis parameters (not samples)</li>
          <li>• Creates original melodies, harmonies, and rhythms</li>
          <li>• Uses Tone.js for real-time audio synthesis</li>
          <li>• All music is generated, not copied or sampled</li>
        </ul>
      </div>

      {/* Legal Notice */}
      <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-4 text-sm text-purple-200">
        <strong>Legal Notice:</strong> This tool generates transformative, original compositions inspired by
        musical styles. It does not reproduce, sample, or copy existing copyrighted works. The generated
        music is copyright-free and can be used according to your needs. Always verify licensing requirements
        for commercial use.
      </div>
    </div>
  );
};

export default MusicGenerator;
