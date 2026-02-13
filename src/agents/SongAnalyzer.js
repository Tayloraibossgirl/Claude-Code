/**
 * SongAnalyzer Agent
 *
 * Takes a song title (and optionally artist) and determines:
 * - Estimated genre, BPM, key, energy level
 * - Structural characteristics (verse/chorus pattern, drop potential)
 * - Remixability score and recommendations
 *
 * Uses heuristic analysis + a built-in knowledge base of popular songs.
 * In production, this would call Spotify/Apple Music APIs for real metadata.
 */

import { GENRE_BPM_MAP, KEY_RELATIONSHIPS } from '../styles/artistProfiles.js';

// Knowledge base of well-known songs with pre-analyzed attributes
const SONG_DATABASE = {
  // Pop
  'blinding lights':       { artist: 'The Weeknd',       bpm: 171, key: 'Fm',  genre: 'pop',     energy: 0.7, year: 2020 },
  'levitating':            { artist: 'Dua Lipa',         bpm: 103, key: 'Bm',  genre: 'disco',   energy: 0.7, year: 2020 },
  'bad guy':               { artist: 'Billie Eilish',    bpm: 135, key: 'Gm',  genre: 'pop',     energy: 0.4, year: 2019 },
  'shape of you':          { artist: 'Ed Sheeran',       bpm: 96,  key: 'C#m', genre: 'pop',     energy: 0.6, year: 2017 },
  'as it was':             { artist: 'Harry Styles',     bpm: 174, key: 'F#m', genre: 'pop',     energy: 0.6, year: 2022 },
  'flowers':               { artist: 'Miley Cyrus',      bpm: 118, key: 'Am',  genre: 'pop',     energy: 0.6, year: 2023 },
  'anti-hero':             { artist: 'Taylor Swift',     bpm: 97,  key: 'E',   genre: 'pop',     energy: 0.5, year: 2022 },
  'stay':                  { artist: 'The Kid LAROI',    bpm: 170, key: 'C#m', genre: 'pop',     energy: 0.7, year: 2021 },
  'uptown funk':           { artist: 'Bruno Mars',       bpm: 115, key: 'Dm',  genre: 'funk',    energy: 0.8, year: 2014 },
  'old town road':         { artist: 'Lil Nas X',        bpm: 136, key: 'G',   genre: 'country', energy: 0.5, year: 2019 },

  // Hip-Hop / Trap
  'sicko mode':            { artist: 'Travis Scott',     bpm: 155, key: 'Am',  genre: 'trap',    energy: 0.7, year: 2018 },
  'humble':                { artist: 'Kendrick Lamar',   bpm: 150, key: 'F#m', genre: 'hiphop',  energy: 0.7, year: 2017 },
  'gods plan':             { artist: 'Drake',            bpm: 77,  key: 'Dbm', genre: 'hiphop',  energy: 0.5, year: 2018 },
  'starboy':               { artist: 'The Weeknd',       bpm: 186, key: 'Fm',  genre: 'pop',     energy: 0.6, year: 2016 },
  'montero':               { artist: 'Lil Nas X',        bpm: 179, key: 'Am',  genre: 'pop',     energy: 0.6, year: 2021 },

  // EDM / Dance
  'sandstorm':             { artist: 'Darude',           bpm: 136, key: 'Bm',  genre: 'trance',  energy: 0.9, year: 1999 },
  'animals':               { artist: 'Martin Garrix',    bpm: 128, key: 'F#m', genre: 'edm',     energy: 0.9, year: 2013 },
  'titanium':              { artist: 'David Guetta',     bpm: 126, key: 'D#m', genre: 'edm',     energy: 0.8, year: 2011 },
  'levels':                { artist: 'Avicii',           bpm: 126, key: 'Fm',  genre: 'edm',     energy: 0.8, year: 2011 },
  'clarity':               { artist: 'Zedd',             bpm: 128, key: 'Gm',  genre: 'edm',     energy: 0.7, year: 2012 },
  'scary monsters':        { artist: 'Skrillex',         bpm: 140, key: 'Fm',  genre: 'dubstep', energy: 0.9, year: 2010 },
  'strobe':                { artist: 'Deadmau5',         bpm: 128, key: 'C',   genre: 'house',   energy: 0.6, year: 2009 },
  'one more time':         { artist: 'Daft Punk',        bpm: 123, key: 'A#',  genre: 'house',   energy: 0.7, year: 2000 },
  'around the world':      { artist: 'Daft Punk',        bpm: 121, key: 'Bm',  genre: 'house',   energy: 0.7, year: 1997 },

  // Rock
  'enter sandman':         { artist: 'Metallica',        bpm: 123, key: 'Em',  genre: 'metal',   energy: 0.9, year: 1991 },
  'smells like teen spirit':{ artist: 'Nirvana',         bpm: 117, key: 'Fm',  genre: 'rock',    energy: 0.8, year: 1991 },
  'bohemian rhapsody':     { artist: 'Queen',            bpm: 72,  key: 'Bb',  genre: 'rock',    energy: 0.6, year: 1975 },
  'thunderstruck':         { artist: 'AC/DC',            bpm: 133, key: 'B',   genre: 'rock',    energy: 0.9, year: 1990 },
  'seven nation army':     { artist: 'White Stripes',    bpm: 124, key: 'Em',  genre: 'rock',    energy: 0.7, year: 2003 },

  // R&B
  'blinding lights':       { artist: 'The Weeknd',       bpm: 171, key: 'Fm',  genre: 'pop',     energy: 0.7, year: 2020 },
  'kiss me more':          { artist: 'Doja Cat',         bpm: 111, key: 'A#m', genre: 'rnb',     energy: 0.6, year: 2021 },

  // Latin
  'despacito':             { artist: 'Luis Fonsi',       bpm: 89,  key: 'Bm',  genre: 'latin',   energy: 0.6, year: 2017 },
  'dákiti':                { artist: 'Bad Bunny',        bpm: 110, key: 'Gm',  genre: 'latin',   energy: 0.6, year: 2020 },
};

// Musical keys (chromatic)
const ALL_KEYS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const ALL_MODES = ['', 'm']; // major and minor

export class SongAnalyzer {
  constructor() {
    this.status = 'idle';
    this.result = null;
  }

  /**
   * Analyze a song by title (and optional artist)
   * Returns structured metadata for the RemixEngine
   */
  async analyze(songTitle, artistName = null) {
    this.status = 'analyzing';

    // Normalize the input
    const normalizedTitle = songTitle.trim().toLowerCase().replace(/['"]/g, '');
    const normalizedArtist = artistName?.trim().toLowerCase() || null;

    // Step 1: Check knowledge base
    let songData = this._lookupSong(normalizedTitle, normalizedArtist);

    // Step 2: If not found, use heuristic analysis
    if (!songData) {
      songData = this._heuristicAnalysis(normalizedTitle, normalizedArtist);
    }

    // Step 3: Compute remix-specific attributes
    const analysis = this._computeRemixAttributes(songData, normalizedTitle);

    this.status = 'complete';
    this.result = analysis;
    return analysis;
  }

  /**
   * Look up song in the knowledge base
   */
  _lookupSong(title, artist) {
    const entry = SONG_DATABASE[title];
    if (!entry) return null;

    // If artist is provided, verify it matches
    if (artist && !entry.artist.toLowerCase().includes(artist)) {
      return null;
    }

    return { ...entry, source: 'database', confidence: 0.95 };
  }

  /**
   * Heuristic analysis when song isn't in the database.
   * Uses title keywords, common patterns, and randomized-but-plausible defaults.
   */
  _heuristicAnalysis(title, artist) {
    // Try to detect genre from title/artist keywords
    const genre = this._detectGenre(title, artist);
    const genreInfo = GENRE_BPM_MAP[genre] || GENRE_BPM_MAP.unknown;

    // Generate plausible BPM within genre range
    const bpmRange = genreInfo.range;
    const bpm = this._seededRandom(title, bpmRange[0], bpmRange[1]);

    // Pick a plausible key based on title hash
    const keyIndex = this._hashString(title) % ALL_KEYS.length;
    const mode = this._hashString(title + 'mode') % 2 === 0 ? '' : 'm';
    const key = ALL_KEYS[keyIndex] + mode;

    // Energy from genre baseline + title sentiment
    const titleEnergy = this._analyzeTitleEnergy(title);
    const energy = Math.min(1, Math.max(0, genreInfo.energy + titleEnergy));

    return {
      artist: artist || 'Unknown Artist',
      bpm,
      key,
      genre,
      energy,
      year: 2024,
      source: 'heuristic',
      confidence: 0.5,
    };
  }

  /**
   * Detect genre from title/artist keywords
   */
  _detectGenre(title, artist) {
    const text = `${title} ${artist || ''}`.toLowerCase();

    const genreKeywords = {
      trap:    ['trap', 'gang', 'drip', 'lit', 'flex', 'savage'],
      hiphop:  ['rap', 'flow', 'beat', 'rhyme', 'mic', 'cypher'],
      edm:     ['drop', 'rave', 'bass', 'synth', 'festival', 'dj'],
      house:   ['house', 'groove', 'disco', 'club', 'dance'],
      techno:  ['techno', 'industrial', 'machine', 'acid'],
      dubstep: ['wobble', 'filth', 'step', 'wub'],
      dnb:     ['jungle', 'breakbeat', 'liquid'],
      trance:  ['trance', 'euphoria', 'dream', 'astral'],
      rock:    ['rock', 'guitar', 'riff', 'electric', 'thunder'],
      metal:   ['metal', 'death', 'heavy', 'scream', 'destroy'],
      pop:     ['love', 'heart', 'baby', 'tonight', 'dance', 'party'],
      rnb:     ['soul', 'smooth', 'bedroom', 'slow', 'vibe'],
      latin:   ['reggaeton', 'salsa', 'cumbia', 'latin', 'fuego'],
      country: ['country', 'truck', 'road', 'cowboy', 'whiskey'],
    };

    for (const [genre, keywords] of Object.entries(genreKeywords)) {
      if (keywords.some(kw => text.includes(kw))) {
        return genre;
      }
    }

    return 'unknown';
  }

  /**
   * Analyze title for energy indicators
   */
  _analyzeTitleEnergy(title) {
    const highEnergy = ['fire', 'rage', 'smash', 'blast', 'thunder', 'lightning', 'war',
                        'power', 'beast', 'monster', 'turbo', 'hyper', 'savage', 'wild'];
    const lowEnergy  = ['slow', 'dream', 'sleep', 'quiet', 'soft', 'gentle', 'rain',
                        'whisper', 'calm', 'peace', 'lullaby', 'midnight'];

    let modifier = 0;
    for (const word of highEnergy) {
      if (title.includes(word)) modifier += 0.15;
    }
    for (const word of lowEnergy) {
      if (title.includes(word)) modifier -= 0.15;
    }
    return Math.max(-0.3, Math.min(0.3, modifier));
  }

  /**
   * Compute remix-specific attributes from raw song data
   */
  _computeRemixAttributes(songData, title) {
    const { bpm, key, genre, energy } = songData;

    // Determine compatible remix keys (Camelot-style)
    const baseKey = key.replace('m', '');
    const isMinor = key.includes('m');
    const keyRels = KEY_RELATIONSHIPS[baseKey] || KEY_RELATIONSHIPS['C'];

    const compatibleKeys = [
      key,
      keyRels.relative + (isMinor ? '' : 'm'),
      keyRels.dominant + (isMinor ? 'm' : ''),
    ];

    // Calculate how well this song adapts to each artist style
    const hyperTechnoFit = this._calculateStyleFit(songData, 'hyperTechno');
    const fastBasstonFit = this._calculateStyleFit(songData, 'fastBasston');

    // Determine which parts to isolate for remix
    const stemPriority = this._determineStemPriority(genre, energy);

    // Build the analysis result
    return {
      // Original song info
      original: {
        title: title,
        artist: songData.artist,
        bpm,
        key,
        genre,
        energy,
        confidence: songData.confidence,
        source: songData.source,
      },

      // Remix parameters
      remix: {
        compatibleKeys,
        suggestedKey: isMinor ? key : keyRels.parallel, // Go minor for darkness
        stemPriority,
        bpmMultiplier: this._calculateBpmMultiplier(bpm),
        energyHeadroom: Math.max(0, 1 - energy),
      },

      // Style compatibility scores
      styleFit: {
        hyperTechno: hyperTechnoFit,
        fastBasston: fastBasstonFit,
        recommended: hyperTechnoFit > fastBasstonFit ? 'hyper-techno' : 'fast-basston',
      },

      // Structural suggestions
      structure: {
        hasVocals: ['pop', 'rnb', 'hiphop', 'rock', 'country', 'latin'].includes(genre),
        hasMelodicContent: !['trap', 'techno'].includes(genre),
        dropPotential: energy > 0.5 ? 'high' : 'medium',
        breakdownStyle: energy > 0.7 ? 'tension-release' : 'atmospheric',
      },
    };
  }

  /**
   * Calculate how well a song fits a remix style
   */
  _calculateStyleFit(songData, styleId) {
    const { bpm, energy, genre } = songData;
    let score = 0.5;

    if (styleId === 'hyperTechno') {
      // Hyper techno likes fast songs, high energy
      if (bpm >= 130) score += 0.15;
      if (bpm >= 150) score += 0.1;
      if (energy >= 0.7) score += 0.1;
      if (['edm', 'techno', 'trance', 'rock', 'metal'].includes(genre)) score += 0.1;
      if (['rnb', 'jazz', 'classical', 'reggae'].includes(genre)) score -= 0.15;
    } else if (styleId === 'fastBasston') {
      // Fast basston likes bass-heavy genres, moderate-to-high tempo
      if (bpm >= 100 && bpm <= 160) score += 0.1;
      if (energy >= 0.5) score += 0.1;
      if (['dubstep', 'dnb', 'trap', 'hiphop', 'edm'].includes(genre)) score += 0.15;
      if (['pop', 'latin', 'funk'].includes(genre)) score += 0.05;
      if (['classical', 'jazz', 'country'].includes(genre)) score -= 0.1;
    }

    return Math.min(1, Math.max(0, score));
  }

  /**
   * Determine which stems to prioritize for isolation
   */
  _determineStemPriority(genre, energy) {
    if (['pop', 'rnb', 'hiphop', 'latin'].includes(genre)) {
      return ['vocals', 'drums', 'bass', 'other'];
    }
    if (['rock', 'metal', 'country'].includes(genre)) {
      return ['drums', 'vocals', 'other', 'bass'];
    }
    if (['edm', 'techno', 'house', 'trance'].includes(genre)) {
      return ['drums', 'bass', 'other', 'vocals'];
    }
    if (['dubstep', 'dnb', 'trap'].includes(genre)) {
      return ['bass', 'drums', 'other', 'vocals'];
    }
    return ['drums', 'vocals', 'bass', 'other'];
  }

  /**
   * Calculate how to scale the original BPM for remix
   * Returns multiplier options (e.g. 2x for double-time)
   */
  _calculateBpmMultiplier(originalBpm) {
    const options = [];

    // Direct use
    if (originalBpm >= 130 && originalBpm <= 180) {
      options.push({ multiplier: 1, resultBpm: originalBpm, label: 'Original tempo' });
    }

    // Double time (for slow songs)
    if (originalBpm < 130) {
      const doubled = originalBpm * 2;
      if (doubled >= 130 && doubled <= 185) {
        options.push({ multiplier: 2, resultBpm: doubled, label: 'Double time' });
      }
    }

    // Half time (for very fast songs)
    if (originalBpm > 160) {
      const halved = Math.round(originalBpm / 2);
      options.push({ multiplier: 0.5, resultBpm: halved, label: 'Half time' });
    }

    // Tempo shift to target range
    const targetBpm = 160;
    const ratio = targetBpm / originalBpm;
    if (ratio > 1.1 || ratio < 0.9) {
      options.push({ multiplier: ratio, resultBpm: targetBpm, label: `Shift to ${targetBpm}` });
    }

    return options.length > 0 ? options : [{ multiplier: 1, resultBpm: originalBpm, label: 'Original tempo' }];
  }

  // --- Utility functions ---

  _seededRandom(seed, min, max) {
    const hash = this._hashString(seed);
    const normalized = (hash % 1000) / 1000;
    return Math.round(min + normalized * (max - min));
  }

  _hashString(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}
