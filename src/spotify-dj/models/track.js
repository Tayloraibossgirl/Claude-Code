/**
 * Track model - normalized representation of a Spotify track with audio features
 */

export class Track {
  constructor(spotifyTrack, audioFeatures = null) {
    this.id = spotifyTrack.id;
    this.uri = spotifyTrack.uri;
    this.name = spotifyTrack.name;
    this.artists = (spotifyTrack.artists || []).map(a => ({
      id: a.id,
      name: a.name,
    }));
    this.album = {
      id: spotifyTrack.album?.id,
      name: spotifyTrack.album?.name,
      images: spotifyTrack.album?.images || [],
    };
    this.durationMs = spotifyTrack.duration_ms;
    this.popularity = spotifyTrack.popularity || 0;
    this.explicit = spotifyTrack.explicit || false;
    this.previewUrl = spotifyTrack.preview_url;

    // Audio features (from Spotify audio features endpoint)
    if (audioFeatures) {
      this.setAudioFeatures(audioFeatures);
    }
  }

  setAudioFeatures(features) {
    this.tempo = features.tempo;               // BPM
    this.key = features.key;                   // 0-11 (C to B)
    this.mode = features.mode;                 // 0 = minor, 1 = major
    this.energy = features.energy;             // 0.0 - 1.0
    this.valence = features.valence;           // 0.0 - 1.0 (musical positivity)
    this.danceability = features.danceability; // 0.0 - 1.0
    this.acousticness = features.acousticness; // 0.0 - 1.0
    this.instrumentalness = features.instrumentalness; // 0.0 - 1.0
    this.liveness = features.liveness;         // 0.0 - 1.0
    this.speechiness = features.speechiness;   // 0.0 - 1.0
    this.loudness = features.loudness;         // dB (typically -60 to 0)
    this.timeSignature = features.time_signature;
    this.hasAudioFeatures = true;
  }

  get artistNames() {
    return this.artists.map(a => a.name).join(', ');
  }

  get primaryArtistId() {
    return this.artists[0]?.id;
  }

  get artworkUrl() {
    return this.album.images[0]?.url || null;
  }

  get normalizedTempo() {
    // Normalize tempo to handle half-time/double-time
    // Most dance music is 60-180 BPM, normalize to 80-160 range
    let t = this.tempo || 120;
    while (t > 160) t /= 2;
    while (t < 80) t *= 2;
    return t;
  }

  /**
   * Compute a feature vector for similarity calculations
   * Returns [energy, valence, danceability, normalizedTempo, acousticness, instrumentalness]
   */
  get featureVector() {
    if (!this.hasAudioFeatures) return null;
    return [
      this.energy,
      this.valence,
      this.danceability,
      (this.normalizedTempo - 80) / 80, // normalize tempo to 0-1 range
      this.acousticness,
      this.instrumentalness,
    ];
  }

  toJSON() {
    return {
      id: this.id,
      uri: this.uri,
      name: this.name,
      artists: this.artists,
      album: this.album,
      durationMs: this.durationMs,
      popularity: this.popularity,
      tempo: this.tempo,
      key: this.key,
      mode: this.mode,
      energy: this.energy,
      valence: this.valence,
      danceability: this.danceability,
      acousticness: this.acousticness,
      instrumentalness: this.instrumentalness,
    };
  }
}

export class QueuedTrack {
  constructor(track, reason = '', score = 0) {
    this.track = track;
    this.reason = reason;          // Why this track was chosen
    this.score = score;            // Composite score from algorithm
    this.addedAt = Date.now();
    this.played = false;
    this.skipped = false;
  }
}
