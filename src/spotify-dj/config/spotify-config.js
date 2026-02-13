/**
 * Spotify API Configuration
 *
 * Required scopes for full DJ functionality:
 * - user-read-playback-state
 * - user-modify-playback-state
 * - user-read-currently-playing
 * - user-library-read
 * - user-library-modify
 * - playlist-read-private
 * - playlist-read-collaborative
 * - playlist-modify-public
 * - playlist-modify-private
 * - user-top-read
 * - user-read-recently-played
 */

const SPOTIFY_CONFIG = {
  clientId: import.meta.env.VITE_SPOTIFY_CLIENT_ID || '',
  redirectUri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI || 'http://localhost:5173/callback',
  scopes: [
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'user-library-read',
    'user-library-modify',
    'playlist-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-modify-private',
    'user-top-read',
    'user-read-recently-played',
  ],
  apiBaseUrl: 'https://api.spotify.com/v1',
  authUrl: 'https://accounts.spotify.com/authorize',
  tokenUrl: 'https://accounts.spotify.com/api/token',
};

// Camelot Wheel for harmonic mixing - maps musical keys to Camelot notation
export const CAMELOT_WHEEL = {
  // Minor keys (A column)
  '0_1': '5A',   // C minor -> 5A
  '1_1': '12A',  // C# minor -> 12A
  '2_1': '7A',   // D minor -> 7A
  '3_1': '2A',   // Eb minor -> 2A
  '4_1': '9A',   // E minor -> 9A
  '5_1': '4A',   // F minor -> 4A
  '6_1': '11A',  // F# minor -> 11A
  '7_1': '6A',   // G minor -> 6A
  '8_1': '1A',   // Ab minor -> 1A
  '9_1': '8A',   // A minor -> 8A
  '10_1': '3A',  // Bb minor -> 3A
  '11_1': '10A', // B minor -> 10A
  // Major keys (B column)
  '0_0': '8B',   // C major -> 8B
  '1_0': '3B',   // C# major -> 3B
  '2_0': '10B',  // D major -> 10B
  '3_0': '5B',   // Eb major -> 5B
  '4_0': '12B',  // E major -> 12B
  '5_0': '7B',   // F major -> 7B
  '6_0': '2B',   // F# major -> 2B
  '7_0': '9B',   // G major -> 9B
  '8_0': '4B',   // Ab major -> 4B
  '9_0': '11B',  // A major -> 11B
  '10_0': '6B',  // Bb major -> 6B
  '11_0': '1B',  // B major -> 1B
};

// Compatible Camelot transitions (same number +/-1, or same letter swap)
export const CAMELOT_COMPATIBLE = (camelot) => {
  const num = parseInt(camelot);
  const letter = camelot.slice(-1);
  const compatible = [];

  // Same position
  compatible.push(camelot);
  // +1 semitone
  compatible.push(`${num === 12 ? 1 : num + 1}${letter}`);
  // -1 semitone
  compatible.push(`${num === 1 ? 12 : num - 1}${letter}`);
  // Relative major/minor
  compatible.push(`${num}${letter === 'A' ? 'B' : 'A'}`);

  return compatible;
};

// Audio feature ranges for mood classification
export const MOOD_PROFILES = {
  euphoric: { energy: [0.7, 1.0], valence: [0.7, 1.0], danceability: [0.6, 1.0], tempo: [120, 140] },
  happy: { energy: [0.5, 0.8], valence: [0.6, 1.0], danceability: [0.5, 0.9], tempo: [100, 130] },
  chill: { energy: [0.1, 0.5], valence: [0.3, 0.7], danceability: [0.3, 0.6], tempo: [70, 110] },
  melancholy: { energy: [0.1, 0.4], valence: [0.0, 0.3], danceability: [0.2, 0.5], tempo: [60, 100] },
  intense: { energy: [0.7, 1.0], valence: [0.0, 0.5], danceability: [0.4, 0.8], tempo: [130, 180] },
  dreamy: { energy: [0.1, 0.4], valence: [0.3, 0.6], danceability: [0.2, 0.5], tempo: [80, 120] },
  groovy: { energy: [0.5, 0.8], valence: [0.4, 0.8], danceability: [0.7, 1.0], tempo: [95, 125] },
  dark: { energy: [0.3, 0.7], valence: [0.0, 0.3], danceability: [0.3, 0.7], tempo: [100, 140] },
  uplifting: { energy: [0.5, 0.9], valence: [0.5, 0.9], danceability: [0.4, 0.8], tempo: [110, 135] },
  aggressive: { energy: [0.8, 1.0], valence: [0.0, 0.4], danceability: [0.3, 0.7], tempo: [140, 200] },
};

// Genre groupings for diversity scoring
export const GENRE_FAMILIES = {
  electronic: ['edm', 'house', 'techno', 'trance', 'drum and bass', 'dubstep', 'ambient', 'electro', 'synthwave', 'electronica'],
  hiphop: ['hip hop', 'rap', 'trap', 'boom bap', 'conscious hip hop', 'underground hip hop', 'dirty south'],
  rock: ['rock', 'alternative', 'indie rock', 'punk', 'metal', 'grunge', 'post-rock', 'shoegaze', 'classic rock'],
  pop: ['pop', 'synth-pop', 'indie pop', 'art pop', 'dance pop', 'electropop', 'k-pop', 'j-pop'],
  rnb: ['r&b', 'soul', 'neo soul', 'funk', 'motown', 'contemporary r&b'],
  jazz: ['jazz', 'smooth jazz', 'bebop', 'fusion', 'acid jazz', 'nu jazz'],
  classical: ['classical', 'orchestral', 'chamber music', 'opera', 'contemporary classical', 'minimalism'],
  latin: ['latin', 'reggaeton', 'salsa', 'bachata', 'cumbia', 'bossa nova', 'latin pop'],
  folk: ['folk', 'indie folk', 'acoustic', 'singer-songwriter', 'americana', 'country'],
  world: ['afrobeats', 'reggae', 'dancehall', 'world', 'african', 'indian', 'middle eastern'],
};

export default SPOTIFY_CONFIG;
