# Hypertechno Remix Generator - Quick Start 🚀⚡

Get your AI-powered hypertechno remix generator running in 5 minutes!

## Prerequisites

- Node.js installed (v16+)
- Anthropic API key from [console.anthropic.com](https://console.anthropic.com/)
- Audio file to remix (MP3, WAV, etc.)

## Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Key
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your API key
# ANTHROPIC_API_KEY=sk-ant-your-key-here
```

### 3. Start the Backend
Open a terminal and run:
```bash
npm run server
```

You should see: `🎵 Hypertechno Remix API Server Running!`

### 4. Start the Frontend
Open a **new terminal** (keep the backend running) and run:
```bash
npm run dev
```

Visit: `http://localhost:5173`

## Using the App

### Quick Example

**Step 1: Upload Audio**
- Click the upload box or drag an audio file
- Supported: MP3, WAV, OGG, M4A (max 50MB)
- **IMPORTANT**: Only upload music you own or have permission to remix

**Step 2: AI Analysis**
- Click "Analyze with AI"
- Claude analyzes: genre, BPM, key, structure, mood, remix potential
- Takes 5-15 seconds

**Step 3: Generate Remix**
- Click "Generate Hypertechno Remix"
- AI creates detailed remix parameters
- Takes 10-20 seconds

**Step 4: Customize & Play**
- **Target BPM**: Adjust to 160-220 (default: 180)
- **Intensity**: 0% (subtle) to 100% (extreme hypertechno)
- **Volume**: Adjust -30 to 0 dB
- Click "Play Hypertechno Remix" and enjoy! 🔥

**Step 5: Download**
- Use audio recording software (Audacity, OBS) to capture the output
- Or enjoy it live in the browser!

## What is Hypertechno?

Extreme electronic music characterized by:
- **180-200+ BPM** (very fast!)
- **Hard kicks** (aggressive 4-on-the-floor)
- **Industrial synths** (harsh, metallic sounds)
- **Minimal melody** (focus on energy and rhythm)

## Examples

### Transforming a Pop Song
1. Upload: "my_pop_song.mp3" (120 BPM)
2. Analysis: "Pop, upbeat, major key, standard structure"
3. Remix: → 180 BPM, add hard kicks, industrial leads
4. Result: High-energy hypertechno version!

### Transforming a Rock Song
1. Upload: "rock_track.wav" (140 BPM)
2. Analysis: "Rock, energetic, guitar-driven, powerful"
3. Remix: → 190 BPM, distorted synths replace guitars
4. Result: Aggressive industrial hypertechno!

## Troubleshooting

**Backend won't start**
- Check your API key is in `.env`
- Make sure port 3001 is available
- Verify Node.js is installed (`node --version`)

**Frontend won't connect**
- Ensure backend is running first
- Check console for errors (F12 in browser)
- Try different port if 5173 is in use

**No sound**
- Click "Play" button (starts audio context)
- Check browser audio permissions
- Try Chrome or Firefox
- Adjust volume slider

**Upload fails**
- Check file is audio format
- Ensure file is under 50MB
- Try different browser

## Tips for Best Results

1. **Start with 50% intensity** to hear a balanced mix
2. **Adjust BPM** based on original song's energy
3. **Use headphones** for best audio quality
4. **Experiment** with different intensity levels
5. **Record your favorites** using audio software

## Legal Reminder

⚠️ **Only upload music you own or have permission to remix!**

This tool creates transformative remixes for:
✅ Your own music
✅ Personal creative projects
✅ Educational experiments

❌ Do NOT distribute remixes of copyrighted music without permission!

## What's Next?

- Experiment with different songs and styles
- Try varying BPM (160-220) for different energy levels
- Adjust intensity to find your perfect blend
- Check out the full [README.md](README.md) for technical details
- Customize the code to create your own remix styles!

## Need Help?

- Check the full README.md
- Review browser console for errors (F12)
- Verify API key is valid
- Open an issue on GitHub

---

**Ready to transform your music into hypertechno?** 🔥⚡

Upload, analyze, remix, and unleash 180+ BPM mayhem! 🎵
