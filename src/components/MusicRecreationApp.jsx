import React, { useState } from 'react';
import { Music, Sparkles, Download, Play, Square, AlertCircle, Info } from 'lucide-react';
import MusicGenerator from './MusicGenerator';

const MusicRecreationApp = () => {
  const [description, setDescription] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [parameters, setParameters] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('input');

  const API_URL = 'http://localhost:3001';

  const analyzeStyle = async () => {
    if (!description.trim()) {
      setError('Please enter a music description');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/analyze-music-style`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      const data = await response.json();

      if (data.success) {
        setAnalysis(data.analysis);
        setActiveTab('analysis');
      } else {
        setError(data.error || 'Failed to analyze music style');
      }
    } catch (err) {
      setError('Failed to connect to the API server. Make sure the server is running.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateParameters = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/generate-music-parameters`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysis,
          userPreferences: {
            duration: 30,
            complexity: 'medium'
          }
        }),
      });

      const data = await response.json();

      if (data.success) {
        setParameters(data.parameters);
        setActiveTab('generate');
      } else {
        setError(data.error || 'Failed to generate music parameters');
      }
    } catch (err) {
      setError('Failed to connect to the API server.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Music className="w-12 h-12 text-purple-300" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-300 to-blue-300 bg-clip-text text-transparent">
              Music Recreation Studio
            </h1>
          </div>
          <p className="text-xl text-purple-200">
            AI-Powered Music Style Recreation with Copyright Compliance
          </p>
        </div>

        {/* Copyright Notice */}
        <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 mb-8">
          <div className="flex gap-3">
            <AlertCircle className="w-6 h-6 text-yellow-400 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-yellow-300 mb-2">Copyright Compliance Notice</h3>
              <p className="text-sm text-yellow-100">
                This tool creates <strong>original music inspired by styles</strong>, not copies of existing works.
                All music is generated using synthesizers and does not sample or reproduce copyrighted material.
                The AI analyzes musical characteristics (tempo, harmony, mood) to create transformative works.
                Always respect copyright laws and use this tool ethically.
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('input')}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'input'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/50'
            }`}
          >
            1. Input
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            disabled={!analysis}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'analysis'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/50 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            2. Analysis
          </button>
          <button
            onClick={() => setActiveTab('generate')}
            disabled={!parameters}
            className={`px-6 py-3 rounded-lg font-semibold transition ${
              activeTab === 'generate'
                ? 'bg-purple-600 text-white'
                : 'bg-purple-900/50 text-purple-300 hover:bg-purple-800/50 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            3. Generate
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
          {activeTab === 'input' && (
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Info className="w-6 h-6" />
                Describe the Music Style
              </h2>
              <p className="text-purple-200 mb-6">
                Describe the musical style you want to recreate. You can mention genres, moods, artists' styles
                (for inspiration only), or specific musical characteristics.
              </p>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Example: Create an upbeat electronic track with energetic synths, similar to 80s synthwave style, with a driving bassline and nostalgic atmosphere..."
                className="w-full h-40 p-4 bg-white/5 border border-purple-400/30 rounded-lg text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
              <button
                onClick={analyzeStyle}
                disabled={loading}
                className="mt-4 px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold hover:from-purple-500 hover:to-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                {loading ? 'Analyzing...' : 'Analyze Style with AI'}
              </button>
            </div>
          )}

          {activeTab === 'analysis' && analysis && (
            <div>
              <h2 className="text-2xl font-bold mb-4">AI Style Analysis</h2>
              <div className="bg-white/5 rounded-lg p-6 mb-6 max-h-96 overflow-y-auto">
                <pre className="whitespace-pre-wrap text-purple-100 font-mono text-sm">
                  {analysis}
                </pre>
              </div>
              <button
                onClick={generateParameters}
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-semibold hover:from-purple-500 hover:to-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Sparkles className="w-5 h-5" />
                {loading ? 'Generating Parameters...' : 'Generate Music Parameters'}
              </button>
            </div>
          )}

          {activeTab === 'generate' && parameters && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Music Generation</h2>
              <div className="bg-white/5 rounded-lg p-6 mb-6 max-h-64 overflow-y-auto">
                <h3 className="font-semibold mb-2 text-purple-300">Generation Parameters:</h3>
                <pre className="whitespace-pre-wrap text-purple-100 font-mono text-sm">
                  {parameters}
                </pre>
              </div>
              <MusicGenerator parameters={parameters} />
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-purple-300 text-sm">
          <p>
            Powered by Claude AI for music analysis and Tone.js for synthesis.
            All generated music is original and copyright-free.
          </p>
        </div>
      </div>
    </div>
  );
};

export default MusicRecreationApp;
