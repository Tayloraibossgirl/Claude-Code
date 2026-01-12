# Hypertechno Remix Generator ⚡🎵

**Pop Vocals + 140 BPM Hard Techno = Hypertechno**

Transform any song into viral-ready hypertechno using AI-powered analysis. Born in Germany (2022-2023) and exploded on TikTok, hypertechno takes recognizable pop/eurodance vocal hooks and slams them over relentless 140 BPM hard techno beats. Upload your audio, let Claude AI analyze it, and generate that perfect blend of nostalgic vocals + aggressive techno energy.

## ⚖️ Copyright & Legal Compliance

**IMPORTANT: Only upload audio you own or have permission to remix.**

This tool creates **transformative remixes** by:
- Analyzing musical structure (tempo, key, mood, arrangement)
- Applying hypertechno style transformations
- Generating new creative works derived from the original

### Legal Use
✅ Remixing your own music
✅ Personal creative projects
✅ Content you have rights to remix
✅ Educational and experimental use

### Illegal Use
❌ Distributing remixes of copyrighted music without permission
❌ Commercial use without proper licensing
❌ Infringing on others' copyright

**Always respect copyright laws and obtain necessary licenses for commercial distribution.**

## 🎹 What is Hypertechno?

**Genre DNA:** Born 2022-2023 in Germany, went viral on TikTok. Hypertechno = nostalgic 2000s pop/eurodance vocals + 140 BPM hard techno beats.

Think Lady Gaga, Rihanna, or eurodance classics getting the hard techno treatment. The goal is creating that "Ohhh I know this song!" moment while your body moves to relentless techno energy.

### Core Characteristics

- **140-160 BPM** (sweet spot: 140) - Hard techno tempo
- **Recognizable Pop Vocal Hooks** - THE defining element (not buried, featured!)
- **Punishing Kicks** - Straight 4/4, heavily distorted, relentless
- **Heavy Sidechain Compression** - Everything pumps to the kick (signature sound)
- **Industrial Synths & Distorted Bass** - Aggressive, metallic, energetic
- **2-3 Minute Structure** - Viral-optimized for TikTok/Instagram
- **Maximum Loudness** - Loudness war champion (-6 to -4 LUFS)
- **Pop Structure** - Verse/chorus/bridge (NOT slow-building techno journeys)

## ✨ Features

- **Audio Upload**: Support for MP3, WAV, OGG, M4A (up to 50MB)
- **AI Analysis**: Claude AI analyzes vocals, structure, tempo, key, remix potential
- **Hypertechno Transformation**: 140 BPM hard techno beats + preserved vocal hooks
- **Vocal Preservation**: Keeps recognizable pop hooks (THE key to hypertechno)
- **Customizable Parameters**: Control BPM (130-160), intensity (0-100%), volume
- **Heavy Sidechain**: Signature pumping effect (everything sidechains to kick)
- **Real-Time Synthesis**: Browser-based audio generation with Tone.js
- **TikTok-Ready**: 2-3 minute viral-optimized structure
- **Copyright-Safe**: Transformative use with clear legal guidance

## 🏗️ Architecture

### Frontend (React + Vite + Tone.js)
- Audio file upload with drag-and-drop
- Real-time synthesis and audio processing
- Interactive controls for remix customization
- Responsive UI with Tailwind CSS

### Backend (Node.js + Express + Multer)
- Audio file upload handling
- Claude AI integration for analysis
- Hypertechno remix parameter generation
- RESTful API endpoints

### AI Integration
- **Claude Sonnet 4.5**: Analyzes musical characteristics
- Generates detailed remix parameters
- Provides BPM transformation, kick patterns, synth design
- Copyright-compliant transformative approach

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Anthropic API key ([Get one here](https://console.anthropic.com/))
- Modern browser (Chrome/Firefox recommended)

## 🚀 Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

3. **Start backend server**
   ```bash
   npm run server
   ```

   Server runs on `http://localhost:3001`

4. **Start frontend (in new terminal)**
   ```bash
   npm run dev
   ```

   App available at `http://localhost:5173`

## 📖 How to Use

### Step 1: Upload Your Song
- Click to upload or drag audio file (MP3, WAV, OGG, M4A)
- Preview your original audio
- Maximum file size: 50MB

### Step 2: AI Analysis
- Click "Analyze with AI"
- Claude AI analyzes:
  - Genre and style
  - Estimated BPM and key
  - Song structure
  - Instrumentation
  - Mood and energy
  - Remix potential

### Step 3: Generate Remix
- Click "Generate Hypertechno Remix"
- AI creates detailed parameters:
  - **Vocal treatment** (how to preserve recognition at 140 BPM)
  - BPM transformation (original → 140 BPM sweet spot)
  - Kick drum patterns (punishing hard techno)
  - Heavy sidechain compression (pumping effect)
  - Bass line design (distorted, aggressive)
  - Industrial synth leads
  - TikTok-optimized arrangement (2-3 min)

### Step 4: Customize & Play
- **Target BPM**: 130-160 (default: 140 - hypertechno sweet spot)
- **Intensity**: 0-100% (how aggressive the remix is)
  - 0%: Original vocals + subtle techno kicks
  - 50%: Perfect hypertechno blend (recommended!)
  - 100%: Maximum techno aggression
- **Volume**: -30 to 0 dB
- Click "Play Hypertechno Remix" and experience pop vocals + hard techno!

### Step 5: Download
Use audio recording software (Audacity, OBS, etc.) to capture the remix output.

## 🎛️ Technical Details

### Audio Processing Pipeline

1. **Upload**: Audio file uploaded to server
2. **Analysis**: Claude AI analyzes filename and typical musical structures
3. **Parameter Generation**: AI creates hypertechno remix parameters
4. **Synthesis**: Tone.js generates:
   - Hard kicks (MembraneSynth with distortion)
   - Industrial leads (MonoSynth with harsh filters)
   - Time-stretched original audio (playback rate adjustment)
5. **Effects**: Distortion, reverb, compression, filters
6. **Real-time Playback**: Mixed audio streamed to browser

### Synthesis Components

- **Kick Drum**: MembraneSynth → Distortion → Compressor
- **Lead Synth**: MonoSynth (sawtooth) → Distortion → Reverb → Compressor
- **Original Audio**: Player → PitchShift → Filter → Gain (intensity-based)
- **Master Bus**: All channels → Destination

### BPM Transformation

Original song time-stretched to match target BPM:
```
playbackRate = targetBPM / originalBPM
```

Example: 120 BPM → 180 BPM = 1.5x speed

## 🔧 Configuration

### Environment Variables
```bash
ANTHROPIC_API_KEY=your_key_here  # Required
PORT=3001                         # Optional (default: 3001)
```

### Customization

**Adjust Kick Aggression** (`src/components/HypertechnoRemixer.jsx:32-48`):
```javascript
const kick = new Tone.MembraneSynth({
  pitchDecay: 0.01,      // Shorter = more aggressive
  octaves: 6,            // Higher = deeper kick
  // ... customize further
});
```

**Modify Lead Synth** (`src/components/HypertechnoRemixer.jsx:53-80`):
```javascript
const synth = new Tone.MonoSynth({
  oscillator: { type: 'sawtooth' },  // Try 'square' or 'triangle'
  filter: { Q: 6 },                   // Higher Q = more resonance
  // ... customize further
});
```

**Change AI Prompts** (`server/index.js:72-94`, `server/index.js:142-191`):
Modify the Claude AI prompts to adjust analysis depth and remix style.

## 🎯 Use Cases

- **Music Producers**: Generate high-energy remixes for DJ sets
- **Content Creators**: Create intense background music for videos
- **DJs**: Experiment with hypertechno versions of popular tracks
- **Educators**: Teach music production and style transformation
- **Hobbyists**: Explore extreme electronic music creation

## 🐛 Troubleshooting

**"Failed to connect to the API server"**
- Ensure backend is running (`npm run server`)
- Check `.env` has valid API key
- Verify port 3001 is available

**"No audio file uploaded"**
- Check file is audio format (MP3, WAV, etc.)
- Ensure file is under 50MB
- Try different browser (Chrome/Firefox recommended)

**"No sound playing"**
- Click "Play" to start audio context
- Check volume slider is not muted
- Adjust browser audio permissions
- Open browser console for errors

**Audio is distorted/too loud**
- Lower volume slider (try -20 dB)
- Reduce intensity to 50-70%
- Adjust BPM to match original better

## 📁 Project Structure

```
Claude-Code/
├── server/
│   ├── index.js          # Express API, Claude integration, file upload
│   └── uploads/          # Temporary audio file storage (gitignored)
├── src/
│   ├── components/
│   │   ├── HypertechnoRemixApp.jsx   # Main UI and workflow
│   │   ├── HypertechnoRemixer.jsx    # Audio synthesis engine
│   │   ├── MusicRecreationApp.jsx    # (Legacy - text-to-music)
│   │   └── MusicGenerator.jsx        # (Legacy)
│   ├── main.jsx          # React entry point
│   └── index.css         # Tailwind styles
├── index.html
├── package.json
├── .env.example
├── .gitignore
├── README.md
└── QUICKSTART.md
```

## 🔬 How It Works (Technical Deep Dive)

### 1. Audio Upload
- Frontend: FormData with audio file
- Backend: Multer middleware handles file upload
- File temporarily saved to `server/uploads/`
- Filename and size sent to Claude AI

### 2. AI Analysis
Claude Sonnet 4.5 analyzes based on:
- Filename patterns (e.g., "song_name_pop.mp3" → likely pop genre)
- Typical structures for that genre
- BPM ranges, key signatures, instrumentation

Returns structured analysis:
```
1. Genre: Pop
2. Estimated BPM: 120
3. Key: C Major
4. Structure: Intro → Verse → Chorus → Verse → Chorus → Bridge → Chorus → Outro
5. Instrumentation: Vocals, synths, bass, drums
6. Mood: Upbeat, energetic
7. Remix Potential: High (clear structure, simple harmony)
```

### 3. Remix Parameter Generation
Claude generates detailed remix instructions:
- **BPM**: 120 → 180 (1.5x time-stretch)
- **Kicks**: 4-on-the-floor, 80% distortion, C1 pitch
- **Bass**: Sub-bass (40-100 Hz), heavy distortion
- **Leads**: Sawtooth at 200-2000 Hz, resonant filter sweeps
- **Effects**: Distortion 60%, reverb decay 1s, hard compression
- **Arrangement**: Extend intro, shorten verses, emphasize drops

### 4. Real-Time Synthesis
Tone.js in browser:
```javascript
// Original audio time-stretched
player.playbackRate = 180 / 120  // = 1.5

// Kick pattern (every quarter note)
kickSequence = [0, 1, 2, 3]  // 4-on-the-floor

// Lead pattern (8th notes with variation)
leadPattern = ['C4', 'C4', 'D#4', 'C4', 'G4', 'C4', 'F4', 'C4']
```

### 5. Mixing
- Original audio: (100 - intensity)% gain
- Kicks: Full volume (adjustable)
- Leads: -5dB below kicks
- All → Compressor → Master out

## 🤝 Contributing

Contributions welcome! Areas for improvement:

- **Advanced Audio Analysis**: Integrate Web Audio API for real-time tempo/key detection
- **More Remix Styles**: Hardcore, Gabber, Industrial, Speedcore
- **MIDI Export**: Export remix as MIDI file
- **Preset Library**: Save and share remix configurations
- **Visual Waveform**: Display audio waveform during playback
- **Better Recording**: Server-side audio rendering for clean exports

## 📄 License

This project is for educational and creative purposes.

**Music Copyright Notice:**
- Original songs remain copyright of their owners
- Remixes are derivative works requiring permission for distribution
- This tool is for personal, educational, and experimental use
- Always obtain proper licenses for commercial use

## 🙏 Acknowledgments

- **Anthropic** for Claude AI
- **Tone.js** for Web Audio synthesis
- **React** and **Vite** for frontend framework
- **Multer** for file upload handling
- **Express** for backend API
- **Tailwind CSS** for styling

## ⚠️ Disclaimer

This tool is designed for creative and educational purposes. It creates transformative remixes by analyzing musical characteristics and applying hypertechno style elements.

**Users are responsible for:**
- Ensuring they have rights to remix uploaded audio
- Obtaining proper licenses for distribution
- Complying with copyright laws in their jurisdiction

**This tool does not:**
- Provide legal advice
- Grant remix rights to copyrighted material
- Guarantee copyright-free output for commercial use

Always consult a legal professional for copyright questions.

---

**Ready to transform your music into hypertechno?** 🔥⚡🎵

Upload your track, let AI analyze it, and experience the power of 180+ BPM industrial mayhem!
