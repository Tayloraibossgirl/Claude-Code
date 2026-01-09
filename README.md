# Music Recreation Studio 🎵

An AI-powered web application that creates original music inspired by musical styles while respecting copyright laws. This app uses Anthropic's Claude AI for music style analysis and Tone.js for real-time audio synthesis.

## ⚖️ Copyright Compliance

**This tool creates ORIGINAL music inspired by styles, NOT copies of existing works.**

- Uses **synthesis only** - no sampling or reproduction of copyrighted material
- AI analyzes musical **characteristics** (tempo, harmony, mood, structure)
- Generates **transformative works** inspired by styles
- All output is **original** and copyright-free
- Always respect copyright laws and use ethically

## ✨ Features

- **AI Style Analysis**: Claude AI analyzes music descriptions and extracts stylistic elements
- **Parameter Generation**: Converts style analysis into synthesis parameters
- **Real-time Synthesis**: Uses Tone.js to generate music with synthesizers
- **Copyright-Safe**: No sampling, only original synthesis
- **User-Friendly Interface**: Step-by-step workflow from description to music
- **Customizable**: Control duration, volume, and other parameters

## 🏗️ Architecture

### Frontend (React + Vite)
- Modern React UI with Tailwind CSS
- Real-time music synthesis with Tone.js
- Interactive controls for music generation

### Backend (Node.js + Express)
- REST API for Claude AI integration
- Music style analysis endpoint
- Parameter generation endpoint

### AI Integration
- Anthropic Claude Sonnet 4.5 for intelligent analysis
- Converts descriptions into musical parameters
- Provides copyright-compliant transformative interpretation

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Anthropic API key ([Get one here](https://console.anthropic.com/))

## 🚀 Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd Claude-Code
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```

   Edit `.env` and add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=your_api_key_here
   ```

4. **Start the backend server**
   ```bash
   npm run server
   ```

   The API server will start on `http://localhost:3001`

5. **Start the frontend (in a new terminal)**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:5173`

## 📖 How to Use

### Step 1: Describe the Music Style
Enter a description of the music you want to create. You can mention:
- Genres (e.g., "synthwave", "jazz", "ambient")
- Moods (e.g., "energetic", "melancholic", "uplifting")
- Musical characteristics (e.g., "driving bassline", "lush pads", "complex rhythms")
- Artist styles **for inspiration only** (e.g., "80s style electronic music")

**Example:**
> "Create an upbeat electronic track with energetic synths, similar to 80s synthwave style, with a driving bassline and nostalgic atmosphere"

### Step 2: AI Analysis
Click "Analyze Style with AI" to have Claude analyze your description. The AI will:
- Identify genre and sub-genre
- Suggest tempo (BPM)
- Recommend key signature
- Describe mood and emotional characteristics
- Suggest synthesized instrumentation
- Define rhythm patterns and harmonic progressions

### Step 3: Generate Music
Click "Generate Music Parameters" to create synthesis parameters, then:
- Adjust duration (10-120 seconds)
- Set volume level
- Click "Play Generated Music" to hear your creation
- Download the generated music (use audio recording software)

## 🎹 Technical Details

### Music Generation
The app uses **procedural synthesis** with Tone.js:
- **PolySynth**: For melodic content
- **MonoSynth**: For bass lines
- **Oscillators**: Triangle, sawtooth, sine, square waves
- **Envelopes**: ADSR control for dynamic shaping
- **Effects**: Can be extended with reverb, delay, filters

### AI Analysis Pipeline
1. User description → Claude API
2. Claude extracts musical elements and characteristics
3. Parameters generated (tempo, key, progression, etc.)
4. Frontend converts to Tone.js synthesis instructions
5. Real-time audio generation in browser

## 🔧 Configuration

### Environment Variables
- `ANTHROPIC_API_KEY`: Your Anthropic API key (required)
- `PORT`: Backend server port (default: 3001)

### Customization
Edit the following files to customize:
- `server/index.js`: Modify AI prompts and analysis logic
- `src/components/MusicGenerator.jsx`: Adjust synthesis parameters
- `src/components/MusicRecreationApp.jsx`: Change UI and workflow

## 🎯 Use Cases

- **Music Producers**: Generate inspiration for new tracks
- **Content Creators**: Create copyright-free background music
- **Educators**: Teach music theory and synthesis
- **Hobbyists**: Experiment with AI-assisted music creation
- **Researchers**: Study AI-driven creative processes

## ⚠️ Legal Notice

This tool generates **transformative, original compositions** inspired by musical styles. It does not:
- Reproduce existing copyrighted works
- Sample copyrighted audio
- Copy specific melodies or recordings

All generated music is **original** and based on synthesis. However:
- Verify licensing requirements for commercial use
- Understand local copyright laws
- Use responsibly and ethically

## 🛠️ Development

### Project Structure
```
Claude-Code/
├── server/
│   └── index.js          # Express API server
├── src/
│   ├── components/
│   │   ├── MusicRecreationApp.jsx   # Main app component
│   │   └── MusicGenerator.jsx       # Music synthesis component
│   ├── main.jsx          # React entry point
│   └── index.css         # Tailwind styles
├── package.json
├── vite.config.js
└── .env.example
```

### Scripts
- `npm run dev`: Start frontend development server
- `npm run build`: Build for production
- `npm run server`: Start backend API server
- `npm run preview`: Preview production build

## 🐛 Troubleshooting

**"Failed to connect to the API server"**
- Make sure the backend is running (`npm run server`)
- Check that the API URL in the frontend matches your backend port
- Verify your `.env` file has a valid API key

**"No sound playing"**
- Check browser audio permissions
- Adjust volume slider
- Try a different browser (Chrome/Firefox recommended)
- Check browser console for errors

**AI analysis fails**
- Verify your Anthropic API key is correct
- Check API key has sufficient credits
- Ensure stable internet connection

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- More sophisticated music generation algorithms
- Additional synthesis engines
- Recording/export functionality
- Preset library
- MIDI export
- More musical styles and genres

## 📄 License

This project is for educational and creative purposes. Generated music is copyright-free, but verify licensing requirements for your specific use case.

## 🙏 Acknowledgments

- **Anthropic** for Claude AI
- **Tone.js** for Web Audio synthesis
- **React** and **Vite** for the frontend framework
- **Tailwind CSS** for styling

## 📧 Support

For issues or questions, please open an issue on GitHub or consult the documentation.

---

**Remember**: This tool is designed to create original music inspired by styles. Always respect copyright laws and use ethically. The music generated is transformative and original, not a copy of existing works.
