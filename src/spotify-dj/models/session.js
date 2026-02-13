/**
 * DJ Session State - tracks the current session's state, history, and preferences
 */

export class DJSession {
  constructor() {
    this.id = `session_${Date.now()}`;
    this.startedAt = Date.now();
    this.state = 'idle'; // idle | playing | paused | transitioning

    // Track history for this session
    this.history = [];           // QueuedTrack[] - tracks that have been played
    this.queue = [];             // QueuedTrack[] - upcoming tracks
    this.currentTrack = null;    // QueuedTrack | null

    // Session preferences (can be adjusted during session)
    this.targetMood = 'auto';    // auto | euphoric | chill | melancholy | etc.
    this.energyCurve = 'wave';   // wave | build | descend | steady | random
    this.currentEnergy = 0.5;    // Current target energy level (0.0 - 1.0)
    this.diversityLevel = 0.5;   // How much to explore vs. stay in comfort zone
    this.tempoRange = [80, 160]; // BPM bounds

    // Algorithm tuning
    this.weights = {
      harmonicCompatibility: 0.20,
      tempoSimilarity: 0.15,
      energyFit: 0.20,
      moodContinuity: 0.15,
      artistDiversity: 0.10,
      genreDiversity: 0.10,
      discovery: 0.10,
    };

    // Feedback tracking
    this.skippedTracks = new Set();  // Track IDs the user skipped
    this.likedInSession = new Set(); // Track IDs the user liked during session
    this.genresPlayed = {};          // genre -> count
    this.artistsPlayed = {};         // artistId -> count

    // Energy curve state
    this.energyHistory = [];         // { timestamp, energy } for tracking the arc
  }

  addToHistory(queuedTrack) {
    queuedTrack.played = true;
    this.history.push(queuedTrack);

    // Track genres and artists for diversity
    const track = queuedTrack.track;
    const artistId = track.primaryArtistId;
    if (artistId) {
      this.artistsPlayed[artistId] = (this.artistsPlayed[artistId] || 0) + 1;
    }

    // Record energy level
    if (track.energy !== undefined) {
      this.energyHistory.push({
        timestamp: Date.now(),
        energy: track.energy,
      });
    }
  }

  markSkipped(trackId) {
    this.skippedTracks.add(trackId);
    const inQueue = this.queue.find(q => q.track.id === trackId);
    if (inQueue) inQueue.skipped = true;
  }

  markLiked(trackId) {
    this.likedInSession.add(trackId);
  }

  getNextFromQueue() {
    return this.queue.shift() || null;
  }

  get playedTrackIds() {
    return new Set(this.history.map(q => q.track.id));
  }

  get recentArtistIds() {
    // Last 10 tracks' artists to avoid repetition
    return new Set(
      this.history.slice(-10).flatMap(q => q.track.artists.map(a => a.id))
    );
  }

  get averageRecentEnergy() {
    const recent = this.history.slice(-5);
    if (recent.length === 0) return 0.5;
    return recent.reduce((sum, q) => sum + (q.track.energy || 0.5), 0) / recent.length;
  }

  get sessionDurationMinutes() {
    return (Date.now() - this.startedAt) / 60000;
  }

  /**
   * Compute the target energy for the next track based on the energy curve setting
   */
  getTargetEnergy() {
    const minutesIn = this.sessionDurationMinutes;
    const tracksPlayed = this.history.length;

    switch (this.energyCurve) {
      case 'build':
        // Gradually build energy over 60 minutes
        return Math.min(0.3 + (minutesIn / 60) * 0.6, 0.95);

      case 'descend':
        // Start high and wind down
        return Math.max(0.95 - (minutesIn / 60) * 0.6, 0.2);

      case 'wave': {
        // Sinusoidal energy wave with 20-minute period
        const phase = (minutesIn / 20) * Math.PI * 2;
        return 0.5 + 0.3 * Math.sin(phase);
      }

      case 'peak': {
        // Build to a peak at ~30 min, then come down
        const peakPoint = 30;
        if (minutesIn < peakPoint) {
          return 0.3 + (minutesIn / peakPoint) * 0.6;
        }
        return Math.max(0.9 - ((minutesIn - peakPoint) / 30) * 0.5, 0.3);
      }

      case 'steady':
        return this.currentEnergy;

      case 'random':
        // Slight random walk from current energy
        return Math.max(0.1, Math.min(0.95,
          this.averageRecentEnergy + (Math.random() - 0.5) * 0.2
        ));

      case 'auto':
      default:
        // Adaptive: use wave as baseline but adjust based on user feedback
        if (this.skippedTracks.size > tracksPlayed * 0.3 && tracksPlayed > 5) {
          // Too many skips - change direction
          return this.averageRecentEnergy > 0.6 ? 0.4 : 0.7;
        }
        const autoPhase = (minutesIn / 25) * Math.PI * 2;
        return 0.5 + 0.25 * Math.sin(autoPhase);
    }
  }

  toJSON() {
    return {
      id: this.id,
      state: this.state,
      targetMood: this.targetMood,
      energyCurve: this.energyCurve,
      currentEnergy: this.currentEnergy,
      diversityLevel: this.diversityLevel,
      tracksPlayed: this.history.length,
      tracksQueued: this.queue.length,
      skippedCount: this.skippedTracks.size,
      likedCount: this.likedInSession.size,
      durationMinutes: Math.round(this.sessionDurationMinutes),
    };
  }
}
