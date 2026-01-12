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
        content: `You are a music production expert analyzing an audio file for HYPERTECHNO remix generation.

File name: ${fileName}

HYPERTECHNO GENRE DNA (born 2022-2023 in Germany, viral on TikTok):
- Pop vocals + 140 BPM hard techno beats
- Recognizable pop/eurodance vocal hooks (THE defining element)
- Straight 4/4 hard kicks with heavy distortion
- 2-3 minute viral-optimized structure
- Heavy sidechain compression (pumping effect)
- Industrial percussion + aggressive distorted bass

Analyze this audio file for hypertechno remix potential:

1. **Likely Genre & Style**: What genre does this appear to be?
2. **Estimated BPM**: Typical BPM for this type of music
3. **Likely Key**: Common keys for this genre
4. **Vocal Characteristics**: Does it have recognizable pop vocal hooks? (CRITICAL for hypertechno)
5. **Song Structure**: Typical structure (intro, verse, chorus, bridge, outro)
6. **Instrumentation**: Expected instruments and sounds
7. **Mood & Energy**: Emotional characteristics
8. **Remix Potential**: How well will the vocals work at 140 BPM with hard techno beats?

Focus on identifying memorable vocal hooks and how they'll sound over relentless 140 BPM techno drums.
Hypertechno is about creating that "Ohhh I know this song!" moment with aggressive beats.

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
        content: `You are an expert HYPERTECHNO music producer. Based on this audio analysis, create detailed remix parameters.

HYPERTECHNO FORMULA:
Pop Vocals + 140 BPM Hard Techno Beats = HYPERTECHNO

GENRE DNA (born 2022-2023 Germany, TikTok viral):
- Recognizable pop/eurodance vocal hooks (MOST IMPORTANT)
- 140-160 BPM (sweet spot: 140)
- Straight 4/4 punishing kicks
- Heavy sidechain compression (pumping effect)
- Industrial synths + distorted bass
- 2-3 minute viral-optimized structure
- Maximum loudness

AUDIO ANALYSIS:
${analysis}

TARGET BPM: ${targetBPM || 140}

Generate comprehensive HYPERTECHNO remix parameters including:

1. **VOCAL TREATMENT** (MOST CRITICAL - this defines hypertechno)
   - Which vocal hooks/phrases to emphasize
   - How to preserve recognition while fitting 140 BPM
   - Pitch adjustments (if needed)
   - Effects: reverb/delay for space (tasteful, not overwhelming)
   - Placement strategy for "Ohhh I know this!" moments

2. **BPM Transformation**
   - Original estimated BPM → Target ${targetBPM || 140} BPM
   - Time-stretch factor (maintain vocal clarity)
   - Pitch compensation to keep vocals natural

3. **KICK DRUM** (Foundation)
   - Straight 4/4 pattern (no swing!)
   - Punishing hard techno kick design
   - Heavy distortion/saturation levels
   - Frequency: 40-60Hz (sub), 80-120Hz (body), crisp click

4. **SIDECHAIN COMPRESSION** (Signature pumping effect)
   - Everything sidechains to kick (bass, synths, vocals)
   - Aggressive settings for maximum pump
   - Creates the driving hypertechno feel

5. **Bass Line**
   - Rolling, driving, aggressive
   - Locked to kick rhythm
   - Heavy distortion + bit-crushing
   - Mono below 200Hz

6. **Industrial Elements**
   - Metallic hi-hats (16th notes)
   - Hard techno claps/snares (2 & 4)
   - Screech leads during builds (optional)
   - Distorted percussion fills

7. **Arrangement** (Viral-optimized 2-3 min structure)
   - Intro: 8-16 bars (drums + vocal teaser)
   - Verse: Add bass + partial vocals
   - Build: Extended (32+ bars) with tension
   - Drop: FULL vocal hook + all elements (recognition moment!)
   - Breakdown: Strip to vocals + minimal percussion
   - Final drop: Maximum energy
   - Outro: Quick fade (4-8 bars)

8. **Mixing Philosophy**
   - Maximum loudness (-6 to -4 LUFS)
   - Heavy limiting/compression
   - Kick + bass: mono
   - Vocals: centered with stereo effects
   - Everything else: wide stereo

Provide specific numeric values and concrete instructions for creating an AUTHENTIC hypertechno remix that will go viral on TikTok.
Remember: It's about recognizable pop vocals + relentless 140 BPM techno beats!
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
