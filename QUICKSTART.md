# Quick Start Guide 🚀

Get your Music Recreation Studio up and running in 5 minutes!

## Prerequisites

- Node.js installed (v16+)
- Anthropic API key from [console.anthropic.com](https://console.anthropic.com/)

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

You should see: `Music Recreation API server running on port 3001`

### 4. Start the Frontend
Open a **new terminal** (keep the backend running) and run:
```bash
npm run dev
```

Visit: `http://localhost:5173`

## Using the App

### Example Usage

1. **Enter a description** like:
   ```
   Create upbeat 80s synthwave music with energetic synths,
   driving bassline, and nostalgic atmosphere
   ```

2. **Click "Analyze Style with AI"** - Claude will analyze the musical style

3. **Click "Generate Music Parameters"** - AI creates synthesis parameters

4. **Click "Play Generated Music"** - Listen to your creation!

### Tips

- Be descriptive about the style you want (genre, mood, tempo, instruments)
- Reference artist styles for inspiration (transformative use only)
- Adjust volume and duration before playing
- Use headphones for best audio quality

## Troubleshooting

**Backend won't start**
- Check your API key is in `.env`
- Make sure port 3001 is available

**Frontend won't connect**
- Ensure backend is running first
- Check console for errors
- Verify API URL in the app matches backend port

**No sound**
- Click "Play" button to start audio context
- Check browser audio permissions
- Try Chrome or Firefox

## What's Next?

- Experiment with different music styles
- Try varying the descriptions to get different results
- Adjust synthesis parameters in the code for custom sounds
- Check out the full [README.md](README.md) for more details

## Need Help?

- Check the full README.md
- Review the API documentation
- Open an issue on GitHub

---

**Remember**: This creates ORIGINAL music inspired by styles, not copies. All synthesis, no sampling. Copyright-safe! 🎵
