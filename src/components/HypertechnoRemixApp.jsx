import React, { useState, useRef } from 'react';
import { Music, Upload, Sparkles, Download, Play, Square, AlertCircle, Zap, FileAudio } from 'lucide-react';
import HypertechnoRemixer from './HypertechnoRemixer';

const HypertechnoRemixApp = () => {
  const [audioFile, setAudioFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [audioAnalysis, setAudioAnalysis] = useState(null);
  const [remixParams, setRemixParams] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upload');
  const fileInputRef = useRef(null);

  const API_URL = 'http://localhost:3001';

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('audio/')) {
        setError('Please select an audio file (MP3, WAV, etc.)');
        return;
      }

      setAudioFile(file);
      setAudioUrl(URL.createObjectURL(file));
      setError(null);
      setActiveTab('upload');
    }
  };

  const analyzeAudio = async () => {
    if (!audioFile) {
      setError('Please upload an audio file first');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create FormData to send audio file
      const formData = new FormData();
      formData.append('audio', audioFile);

      const response = await fetch(`${API_URL}/api/analyze-audio`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        setAudioAnalysis(data.analysis);
        setActiveTab('analysis');
      } else {
        setError(data.error || 'Failed to analyze audio');
      }
    } catch (err) {
      setError('Failed to connect to the API server. Make sure the server is running.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateRemixParams = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/generate-hypertechno-remix`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysis: audioAnalysis,
          style: 'hypertechno',
          targetBPM: 180,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRemixParams(data.parameters);
        setActiveTab('remix');
      } else {
        setError(data.error || 'Failed to generate remix parameters');
      }
    } catch (err) {
      setError('Failed to connect to the API server.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-950 via-purple-950 to-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Zap className="w-12 h-12 text-red-400 animate-pulse" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-red-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Hypertechno Remix Generator
            </h1>
            <Zap className="w-12 h-12 text-red-400 animate-pulse" />
          </div>
          <p className="text-xl text-purple-200">
            Transform Any Song into Hypertechno • AI-Powered Remix Engine
          </p>
        </div>

        {/* Copyright Notice */}
        <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 mb-8">
          <div className="flex gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-300 mb-2">Copyright & Usage Notice</h3>
              <p className="text-sm text-yellow-100">
                <strong>Only upload audio you own or have permission to remix.</strong> This tool creates
                <strong> transformative remixes</strong> by analyzing musical structure and applying hypertechno
                style elements. The output is a new creative work derived from the original.
                <br/><br/>
                <strong>Legal Use:</strong> Personal use, remixing your own music, or content with proper rights.
                <strong>Illegal Use:</strong> Distributing remixes of copyrighted music without permission.
                <br/><br/>
                Always respect copyright laws and obtain necessary licenses for commercial use.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'upload'
                ? 'bg-red-600 text-white'
                : 'bg-red-900/50 text-red-300 hover:bg-red-800/50'
            }`}
          >
            1. Upload Audio
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            disabled={!audioAnalysis}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'analysis'
                ? 'bg-red-600 text-white'
                : 'bg-red-900/50 text-red-300 hover:bg-red-800/50 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            2. AI Analysis
          </button>
          <button
            onClick={() => setActiveTab('remix')}
            disabled={!remixParams}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'remix'
                ? 'bg-red-600 text-white'
                : 'bg-red-900/50 text-red-300 hover:bg-red-800/50 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            3. Remix
          </button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Content */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 shadow-2xl">
          {activeTab === 'upload' && (
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Upload className="w-6 h-6" />
                Upload Your Song
              </h2>

              <div className="border-2 border-dashed border-purple-400/50 rounded-xl p-12 text-center hover:border-purple-400 transition cursor-pointer bg-white/5"
                   onClick={() => fileInputRef.current?.click()}>
                <FileAudio className="w-16 h-16 mx-auto mb-4 text-purple-300" />
                <p className="text-lg mb-2">
                  {audioFile ? audioFile.name : 'Click to upload or drag audio file here'}
                </p>
                <p className="text-sm text-purple-300">
                  Supports MP3, WAV, OGG, M4A • Max 50MB
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {audioUrl && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Original Audio Preview:</h3>
                  <audio controls src={audioUrl} className="w-full" />
                </div>
              )}

              {audioFile && (
                <button
                  onClick={analyzeAudio}
                  disabled={loading}
                  className="mt-6 w-full px-8 py-4 bg-gradient-to-r from-red-600 to-purple-600 rounded-lg font-semibold hover:from-red-500 hover:to-purple-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  {loading ? 'Analyzing Audio...' : 'Analyze with AI'}
                </button>
              )}

              <div className="mt-8 bg-purple-900/30 border border-purple-500/50 rounded-lg p-4">
                <h4 className="font-semibold text-purple-300 mb-2">What is Hypertechno?</h4>
                <ul className="text-sm text-purple-100 space-y-1">
                  <li>• <strong>Extremely fast BPM:</strong> 180-200+ (vs. pop's 100-130)</li>
                  <li>• <strong>Hard, distorted kicks:</strong> Aggressive 4-on-the-floor beats</li>
                  <li>• <strong>Industrial synths:</strong> Harsh, metallic, energetic sounds</li>
                  <li>• <strong>Minimal melody:</strong> Focus on rhythm and energy</li>
                  <li>• <strong>Build-ups & drops:</strong> Intense tension and release</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'analysis' && audioAnalysis && (
            <div>
              <h2 className="text-2xl font-bold mb-4">AI Audio Analysis</h2>
              <div className="bg-white/5 rounded-lg p-6 mb-6 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-purple-100 font-mono text-sm">
                  {audioAnalysis}
                </pre>
              </div>
              <button
                onClick={generateRemixParams}
                disabled={loading}
                className="w-full px-8 py-4 bg-gradient-to-r from-red-600 to-purple-600 rounded-lg font-semibold hover:from-red-500 hover:to-purple-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Zap className="w-5 h-5" />
                {loading ? 'Generating Remix...' : 'Generate Hypertechno Remix'}
              </button>
            </div>
          )}

          {activeTab === 'remix' && remixParams && (
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Zap className="w-6 h-6" />
                Hypertechno Remix
              </h2>
              <div className="bg-white/5 rounded-lg p-6 mb-6 max-h-64 overflow-y-auto">
                <h3 className="font-semibold mb-2 text-purple-300">Remix Parameters:</h3>
                <pre className="whitespace-pre-wrap text-purple-100 font-mono text-sm">
                  {remixParams}
                </pre>
              </div>
              <HypertechnoRemixer
                originalAudioUrl={audioUrl}
                parameters={remixParams}
                analysis={audioAnalysis}
              />
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-purple-300 text-sm">
          <p>
            Powered by Claude AI for audio analysis and Web Audio API for remix generation.
            <br />
            <strong>Transformative use only</strong> - always respect copyright laws.
          </p>
        </div>
      </div>
    </div>
  );
};

export default HypertechnoRemixApp;
