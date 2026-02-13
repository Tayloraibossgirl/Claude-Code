/**
 * Spotify Web API Client
 * Handles authentication (PKCE flow) and all API calls for the DJ agent.
 */

import SPOTIFY_CONFIG from '../config/spotify-config.js';
import { Track } from '../models/track.js';

export class SpotifyClient {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiry = null;
    this.userId = null;
  }

  // ─── Authentication (PKCE Flow) ───────────────────────────────────────

  async generateCodeChallenge(codeVerifier) {
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const digest = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  generateCodeVerifier() {
    const array = new Uint8Array(64);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(36).padStart(2, '0')).join('').slice(0, 128);
  }

  async initiateAuth() {
    const codeVerifier = this.generateCodeVerifier();
    sessionStorage.setItem('spotify_code_verifier', codeVerifier);
    const codeChallenge = await this.generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      client_id: SPOTIFY_CONFIG.clientId,
      response_type: 'code',
      redirect_uri: SPOTIFY_CONFIG.redirectUri,
      scope: SPOTIFY_CONFIG.scopes.join(' '),
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    });

    window.location.href = `${SPOTIFY_CONFIG.authUrl}?${params}`;
  }

  async handleCallback(code) {
    const codeVerifier = sessionStorage.getItem('spotify_code_verifier');
    if (!codeVerifier) throw new Error('Missing code verifier');

    const response = await fetch(SPOTIFY_CONFIG.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SPOTIFY_CONFIG.clientId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: SPOTIFY_CONFIG.redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    if (!response.ok) throw new Error('Token exchange failed');
    const data = await response.json();
    this.setTokens(data);
    sessionStorage.removeItem('spotify_code_verifier');
    return data;
  }

  setTokens({ access_token, refresh_token, expires_in }) {
    this.accessToken = access_token;
    if (refresh_token) this.refreshToken = refresh_token;
    this.tokenExpiry = Date.now() + expires_in * 1000;

    localStorage.setItem('spotify_tokens', JSON.stringify({
      accessToken: this.accessToken,
      refreshToken: this.refreshToken,
      tokenExpiry: this.tokenExpiry,
    }));
  }

  loadTokens() {
    try {
      const stored = JSON.parse(localStorage.getItem('spotify_tokens'));
      if (stored) {
        this.accessToken = stored.accessToken;
        this.refreshToken = stored.refreshToken;
        this.tokenExpiry = stored.tokenExpiry;
        return this.isAuthenticated;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  get isAuthenticated() {
    return this.accessToken && this.tokenExpiry > Date.now();
  }

  async ensureToken() {
    if (!this.accessToken) throw new Error('Not authenticated');
    if (Date.now() > this.tokenExpiry - 60000) {
      await this.refreshAccessToken();
    }
  }

  async refreshAccessToken() {
    if (!this.refreshToken) throw new Error('No refresh token');
    const response = await fetch(SPOTIFY_CONFIG.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SPOTIFY_CONFIG.clientId,
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
      }),
    });
    if (!response.ok) throw new Error('Token refresh failed');
    this.setTokens(await response.json());
  }

  async api(endpoint, options = {}) {
    await this.ensureToken();
    const url = endpoint.startsWith('http') ? endpoint : `${SPOTIFY_CONFIG.apiBaseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '1', 10);
      await new Promise(r => setTimeout(r, retryAfter * 1000));
      return this.api(endpoint, options);
    }

    if (response.status === 204) return null;
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(`Spotify API error ${response.status}: ${JSON.stringify(error)}`);
    }
    return response.json();
  }

  // ─── User Profile ─────────────────────────────────────────────────────

  async getMe() {
    const data = await this.api('/me');
    this.userId = data.id;
    return data;
  }

  // ─── Liked Songs / Library ────────────────────────────────────────────

  async getLikedSongs(limit = 50, offset = 0) {
    const data = await this.api(`/me/tracks?limit=${limit}&offset=${offset}`);
    return {
      tracks: data.items.map(item => new Track(item.track)),
      total: data.total,
      next: data.next,
    };
  }

  async getAllLikedSongs(maxTracks = 500) {
    const allTracks = [];
    let offset = 0;
    const limit = 50;

    while (offset < maxTracks) {
      const { tracks, total } = await this.getLikedSongs(limit, offset);
      allTracks.push(...tracks);
      offset += limit;
      if (offset >= total || tracks.length < limit) break;
    }

    return allTracks;
  }

  async isTrackLiked(trackId) {
    const data = await this.api(`/me/tracks/contains?ids=${trackId}`);
    return data[0];
  }

  async likeTrack(trackId) {
    await this.api('/me/tracks', {
      method: 'PUT',
      body: JSON.stringify({ ids: [trackId] }),
    });
  }

  async unlikeTrack(trackId) {
    await this.api('/me/tracks', {
      method: 'DELETE',
      body: JSON.stringify({ ids: [trackId] }),
    });
  }

  // ─── Playlists ────────────────────────────────────────────────────────

  async getMyPlaylists(limit = 50, offset = 0) {
    return this.api(`/me/playlists?limit=${limit}&offset=${offset}`);
  }

  async getAllMyPlaylists() {
    const playlists = [];
    let offset = 0;
    let total = Infinity;

    while (offset < total) {
      const data = await this.getMyPlaylists(50, offset);
      playlists.push(...data.items);
      total = data.total;
      offset += 50;
    }
    return playlists;
  }

  async getPlaylistTracks(playlistId, limit = 100, offset = 0) {
    const data = await this.api(`/playlists/${playlistId}/tracks?limit=${limit}&offset=${offset}`);
    return {
      tracks: data.items.filter(item => item.track).map(item => new Track(item.track)),
      total: data.total,
      next: data.next,
    };
  }

  async getAllPlaylistTracks(playlistId, maxTracks = 500) {
    const allTracks = [];
    let offset = 0;

    while (offset < maxTracks) {
      const { tracks, total } = await this.getPlaylistTracks(playlistId, 100, offset);
      allTracks.push(...tracks);
      offset += 100;
      if (offset >= total || tracks.length < 100) break;
    }
    return allTracks;
  }

  async createPlaylist(name, description = '', isPublic = false) {
    if (!this.userId) await this.getMe();
    return this.api(`/users/${this.userId}/playlists`, {
      method: 'POST',
      body: JSON.stringify({ name, description, public: isPublic }),
    });
  }

  async addTracksToPlaylist(playlistId, trackUris) {
    // Spotify limits to 100 URIs per request
    for (let i = 0; i < trackUris.length; i += 100) {
      await this.api(`/playlists/${playlistId}/tracks`, {
        method: 'POST',
        body: JSON.stringify({ uris: trackUris.slice(i, i + 100) }),
      });
    }
  }

  async removeTracksFromPlaylist(playlistId, trackUris) {
    await this.api(`/playlists/${playlistId}/tracks`, {
      method: 'DELETE',
      body: JSON.stringify({
        tracks: trackUris.map(uri => ({ uri })),
      }),
    });
  }

  async reorderPlaylist(playlistId, rangeStart, insertBefore, rangeLength = 1) {
    await this.api(`/playlists/${playlistId}/tracks`, {
      method: 'PUT',
      body: JSON.stringify({ range_start: rangeStart, insert_before: insertBefore, range_length: rangeLength }),
    });
  }

  // ─── Audio Features ───────────────────────────────────────────────────

  async getAudioFeatures(trackIds) {
    // Spotify limits to 100 IDs per request
    const allFeatures = [];
    for (let i = 0; i < trackIds.length; i += 100) {
      const batch = trackIds.slice(i, i + 100);
      const data = await this.api(`/audio-features?ids=${batch.join(',')}`);
      allFeatures.push(...(data.audio_features || []));
    }
    return allFeatures;
  }

  async enrichTracksWithFeatures(tracks) {
    const ids = tracks.map(t => t.id);
    const features = await this.getAudioFeatures(ids);

    features.forEach((feat, idx) => {
      if (feat && tracks[idx]) {
        tracks[idx].setAudioFeatures(feat);
      }
    });

    return tracks;
  }

  // ─── Playback Control ─────────────────────────────────────────────────

  async getPlaybackState() {
    return this.api('/me/player');
  }

  async getAvailableDevices() {
    const data = await this.api('/me/player/devices');
    return data.devices || [];
  }

  async play(options = {}) {
    const params = options.deviceId ? `?device_id=${options.deviceId}` : '';
    const body = {};
    if (options.uris) body.uris = options.uris;
    if (options.contextUri) body.context_uri = options.contextUri;
    if (options.positionMs !== undefined) body.position_ms = options.positionMs;
    if (options.offset !== undefined) body.offset = options.offset;

    await this.api(`/me/player/play${params}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async pause() {
    await this.api('/me/player/pause', { method: 'PUT' });
  }

  async skipToNext() {
    await this.api('/me/player/next', { method: 'POST' });
  }

  async skipToPrevious() {
    await this.api('/me/player/previous', { method: 'POST' });
  }

  async seek(positionMs) {
    await this.api(`/me/player/seek?position_ms=${positionMs}`, { method: 'PUT' });
  }

  async setVolume(volumePercent) {
    await this.api(`/me/player/volume?volume_percent=${volumePercent}`, { method: 'PUT' });
  }

  async setShuffle(state) {
    await this.api(`/me/player/shuffle?state=${state}`, { method: 'PUT' });
  }

  async setRepeat(state) {
    await this.api(`/me/player/repeat?state=${state}`, { method: 'PUT' });
  }

  async addToQueue(trackUri) {
    await this.api(`/me/player/queue?uri=${encodeURIComponent(trackUri)}`, { method: 'POST' });
  }

  async getCurrentlyPlaying() {
    const data = await this.api('/me/player/currently-playing');
    if (data?.item) {
      return new Track(data.item);
    }
    return null;
  }

  // ─── Recommendations & Discovery ──────────────────────────────────────

  async getRecommendations({ seedTracks = [], seedArtists = [], seedGenres = [], limit = 20, ...targetFeatures } = {}) {
    const params = new URLSearchParams({ limit });
    if (seedTracks.length) params.set('seed_tracks', seedTracks.slice(0, 5).join(','));
    if (seedArtists.length) params.set('seed_artists', seedArtists.slice(0, 5).join(','));
    if (seedGenres.length) params.set('seed_genres', seedGenres.slice(0, 5).join(','));

    // Target audio features for tuning recommendations
    Object.entries(targetFeatures).forEach(([key, value]) => {
      if (value !== undefined) params.set(key, value);
    });

    const data = await this.api(`/recommendations?${params}`);
    return (data.tracks || []).map(t => new Track(t));
  }

  async getTopTracks(timeRange = 'medium_term', limit = 50) {
    const data = await this.api(`/me/top/tracks?time_range=${timeRange}&limit=${limit}`);
    return data.items.map(t => new Track(t));
  }

  async getTopArtists(timeRange = 'medium_term', limit = 50) {
    const data = await this.api(`/me/top/artists?time_range=${timeRange}&limit=${limit}`);
    return data.items;
  }

  async getRecentlyPlayed(limit = 50) {
    const data = await this.api(`/me/player/recently-played?limit=${limit}`);
    return data.items.map(item => new Track(item.track));
  }

  async getRelatedArtists(artistId) {
    const data = await this.api(`/artists/${artistId}/related-artists`);
    return data.artists;
  }

  async getArtistTopTracks(artistId, market = 'US') {
    const data = await this.api(`/artists/${artistId}/top-tracks?market=${market}`);
    return data.tracks.map(t => new Track(t));
  }

  async search(query, types = ['track'], limit = 20) {
    const params = new URLSearchParams({
      q: query,
      type: types.join(','),
      limit,
    });
    return this.api(`/search?${params}`);
  }

  // ─── Available Genre Seeds ────────────────────────────────────────────

  async getAvailableGenreSeeds() {
    const data = await this.api('/recommendations/available-genre-seeds');
    return data.genres;
  }
}
