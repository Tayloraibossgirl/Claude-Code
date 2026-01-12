# Hypertechno Remix Generator - Quick Start 🚀⚡

**Pop Vocals + 140 BPM Hard Techno = Hypertechno**

Get your AI-powered hypertechno remix generator running in 5 minutes! Turn any pop song into a TikTok-ready viral banger.

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
- **Target BPM**: Adjust to 130-160 (default: 140 - sweet spot!)
- **Intensity**: 0% (subtle) to 100% (full hypertechno)
- **Volume**: Adjust -30 to 0 dB
- Click "Play Hypertechno Remix" - hear pop vocals + hard techno! 🔥

**Step 5: Download**
- Use audio recording software (Audacity, OBS) to capture the output
- Or enjoy it live in the browser!

## What is Hypertechno?

**Born in Germany 2022-2023, went viral on TikTok.**

The formula: Recognizable pop/eurodance vocal hooks + 140 BPM hard techno beats

- **140 BPM** (hypertechno sweet spot - not too fast, not too slow)
- **Pop vocal hooks** (Lady Gaga, Rihanna, 2000s eurodance - recognizable!)
- **Punishing kicks** (straight 4/4, heavily distorted, relentless)
- **Heavy sidechain** (everything pumps to the kick - signature sound)
- **2-3 minutes** (TikTok/Instagram optimized)
- **Maximum energy** (for clubs and viral content)

## Examples

### Transforming a Pop Song
1. Upload: "lady_gaga_poker_face.mp3" (120 BPM)
2. Analysis: "Pop, catchy vocal hooks, major key"
3. Remix: → 140 BPM, preserve "P-p-p-poker face" hook + hard kicks
4. Result: Recognizable Gaga vocals + relentless techno = Hypertechno! 🎵

### Transforming a Eurodance Track
1. Upload: "90s_eurodance.wav" (140 BPM)
2. Analysis: "Eurodance, energetic vocals, uplifting"
3. Remix: → Perfect at 140! Add punishing kicks + heavy sidechain
4. Result: Nostalgic vocals + modern hard techno = TikTok viral!

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
