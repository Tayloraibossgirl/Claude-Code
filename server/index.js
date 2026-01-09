import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

app.post('/api/analyze-music-style', async (req, res) => {
  try {
    const { description, reference } = req.body;

    if (!description && !reference) {
      return res.status(400).json({ error: 'Please provide a music description or reference' });
    }

    const prompt = `You are a music composition expert. Analyze the following music description and provide detailed parameters for recreating a similar style (NOT a copy) while respecting copyright laws.

User's input: ${description || reference}

Provide:
1. Genre and sub-genre
2. Tempo (BPM)
3. Key signature
4. Mood and emotional characteristics
5. Instrumentation suggestions (synthesized only, no samples)
6. Rhythm patterns
7. Harmonic progressions
8. Melodic characteristics
9. Production style

IMPORTANT: We are creating ORIGINAL music inspired by a style, not copying existing works. Focus on the musical elements and characteristics that define the style, not specific melodies or recordings.

Format your response as a structured analysis that can guide music generation.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const analysis = message.content[0].text;

    res.json({ analysis, success: true });
  } catch (error) {
    console.error('Error analyzing music style:', error);
    res.status(500).json({
      error: 'Failed to analyze music style',
      details: error.message
    });
  }
});

app.post('/api/generate-music-parameters', async (req, res) => {
  try {
    const { analysis, userPreferences } = req.body;

    const prompt = `Based on this music style analysis:

${analysis}

User preferences: ${JSON.stringify(userPreferences)}

Generate specific technical parameters for synthesizer-based music generation:

1. **Note Sequences**: Provide 2-3 melodic patterns (note names and durations)
2. **Chord Progressions**: Suggest 4-8 chord progression (with chord names)
3. **Bass Line**: Simple bass pattern
4. **Rhythm Pattern**: Drum/percussion pattern
5. **Synth Settings**:
   - Waveform types (sine, square, triangle, sawtooth)
   - ADSR envelope settings
   - Filter settings
6. **Effects**: Reverb, delay, distortion parameters
7. **Arrangement**: Song structure (intro, verse, chorus, etc.)

Provide this in a structured format that can be parsed into synthesis parameters.`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const parameters = message.content[0].text;

    res.json({ parameters, success: true });
  } catch (error) {
    console.error('Error generating music parameters:', error);
    res.status(500).json({
      error: 'Failed to generate music parameters',
      details: error.message
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Music Recreation API is running' });
});

app.listen(PORT, () => {
  console.log(`Music Recreation API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
