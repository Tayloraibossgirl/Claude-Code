import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// File upload configuration
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadDir = path.join(__dirname, 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed!'), false);
    }
  },
});

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Test endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Hypertechno Remix API is running!' });
});

// Analyze audio file
app.post('/api/analyze-audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No audio file uploaded' });
    }

    const fileName = req.file.originalname;
    const fileSize = (req.file.size / (1024 * 1024)).toFixed(2);

    console.log(`Analyzing audio file: ${fileName} (${fileSize} MB)`);

    // Use Claude to analyze the music style based on filename and metadata
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are a music production expert analyzing an audio file for hypertechno remix generation.

File name: ${fileName}

Based on the filename and typical song structures, provide a detailed musical analysis including:

1. **Likely Genre & Style**: What genre does this appear to be?
2. **Estimated BPM**: Typical BPM for this type of music
3. **Likely Key**: Common keys for this genre
4. **Song Structure**: Typical structure (intro, verse, chorus, bridge, outro)
5. **Instrumentation**: Expected instruments and sounds
6. **Mood & Energy**: Emotional characteristics
7. **Remix Potential**: How well this would work as a hypertechno remix

Provide specific, actionable information that will help create an authentic hypertechno remix (180-200 BPM, hard kicks, industrial synths, aggressive energy).

Format your response as a structured analysis that's easy to read.`
      }]
    });

    const analysis = message.content[0].text;

    // Clean up uploaded file after analysis
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      analysis: analysis,
      fileInfo: {
        name: fileName,
        size: fileSize + ' MB',
      }
    });

  } catch (error) {
    console.error('Error analyzing audio:', error);

    // Clean up file if it exists
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: 'Failed to analyze audio: ' + error.message
    });
  }
});

// Generate hypertechno remix parameters
app.post('/api/generate-hypertechno-remix', async (req, res) => {
  try {
    const { analysis, style, targetBPM } = req.body;

    if (!analysis) {
      return res.status(400).json({ success: false, error: 'No analysis provided' });
    }

    console.log('Generating hypertechno remix parameters...');

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 3000,
      messages: [{
        role: 'user',
        content: `You are an expert hypertechno music producer. Based on this audio analysis, create detailed remix parameters.

AUDIO ANALYSIS:
${analysis}

TARGET STYLE: Hypertechno
TARGET BPM: ${targetBPM || 180}

Generate comprehensive remix parameters including:

1. **BPM Transformation**
   - Original estimated BPM → Target ${targetBPM || 180} BPM
   - Time-stretch factor
   - Pitch adjustment to maintain musicality

2. **Kick Drum Pattern**
   - Kick placement (4-on-the-floor with variations)
   - Kick sound design (distortion level, pitch envelope)
   - Layering strategy

3. **Bass Line**
   - How to transform original bass or create new
   - Frequency range (sub-bass focus)
   - Distortion and saturation levels

4. **Lead Synths**
   - Harsh industrial lead patterns
   - Frequency ranges and filter sweeps
   - Modulation and effects

5. **Effects Chain**
   - Distortion settings (for aggression)
   - Reverb/delay (industrial atmosphere)
   - Compression (hard limiting for loudness)
   - Filter automation

6. **Arrangement**
   - How to restructure original song sections
   - Build-ups and drops placement
   - Breakdown and climax timing

7. **Mixing Ratios**
   - Original audio: X%
   - Kicks: X%
   - Bass: X%
   - Leads: X%
   - Effects: X%

Provide specific numeric values and concrete instructions for creating an authentic hypertechno remix.
Format as a clear, structured guide.`
      }]
    });

    const parameters = message.content[0].text;

    res.json({
      success: true,
      parameters: parameters,
      config: {
        targetBPM: targetBPM || 180,
        style: style || 'hypertechno'
      }
    });

  } catch (error) {
    console.error('Error generating remix parameters:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate remix parameters: ' + error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🎵 Hypertechno Remix API Server Running!`);
  console.log(`📡 Port: ${PORT}`);
  console.log(`🤖 Using Claude AI: ${process.env.ANTHROPIC_API_KEY ? '✓' : '✗ (Missing API key!)'}`);
  console.log(`\nEndpoints:`);
  console.log(`  GET  /api/health - Health check`);
  console.log(`  POST /api/analyze-audio - Analyze uploaded audio`);
  console.log(`  POST /api/generate-hypertechno-remix - Generate remix parameters`);
  console.log(`\nReady to transform music into hypertechno! 🔥\n`);
});

// Handle errors
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error'
  });
});
