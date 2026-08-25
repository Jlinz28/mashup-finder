import { env } from '$env/dynamic/private';
import type { TrackResult } from '$lib/types';

const API = 'https://api.spotify.com/v1';
const TOKEN_URL = 'https://accounts.spotify.com/api/token';
let tokenCache: { value: string; expiresAt: number } | null = null;

type SpotifyTrack = { id: string; name: string; artists: { name: string }[]; album: { name: string; images: { url: string }[]; release_date: string }; duration_ms: number; explicit: boolean; external_urls: { spotify: string } };

export class SpotifyError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function accessToken(): Promise<string> {
  if (!env.SPOTIFY_CLIENT_ID || !env.SPOTIFY_CLIENT_SECRET) throw new SpotifyError(500, 'Spotify credentials are not configured.');
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.value;
  const basic = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64');
  const response = await fetch(TOKEN_URL, { method: 'POST', headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'client_credentials' }) });
  const data = (await response.json()) as { access_token?: string; expires_in?: number; error_description?: string };
  if (!response.ok || !data.access_token) throw new SpotifyError(response.status, data.error_description ?? 'Spotify authentication failed.');
  tokenCache = { value: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return tokenCache.value;
}

async function spotifyFetch<T>(path: string, retry = true): Promise<T> {
  const response = await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${await accessToken()}` } });
  if (response.status === 429 && retry) {
    const seconds = Math.min(Number(response.headers.get('retry-after') ?? 1), 5);
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000));
    return spotifyFetch<T>(path, false);
  }
  if (response.status === 401 && retry) { tokenCache = null; return spotifyFetch<T>(path, false); }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new SpotifyError(response.status, body?.error?.message ?? 'Spotify request failed.');
  }
  return (await response.json()) as T;
}

function toTrackResult(track: SpotifyTrack): TrackResult {
  return { id: track.id, name: track.name, artists: track.artists.map((artist) => artist.name).join(', '), album: track.album.name, image: track.album.images[1]?.url ?? track.album.images[0]?.url ?? null, releaseDate: track.album.release_date, durationMs: track.duration_ms, explicit: track.explicit, spotifyUrl: track.external_urls.spotify, bpm: null, key: null, mode: null, timeSignature: null, featuresAvailable: false };
}

export async function searchArtistTracks(artists: string[]): Promise<TrackResult[]> {
  const searches = artists.map(async (artist) => {
    const safeArtist = artist.replaceAll('"', '');
    const params = new URLSearchParams({ q: `artist:"${safeArtist}"`, type: 'track', limit: '10' });
    const result = await spotifyFetch<{ tracks: { items: SpotifyTrack[] } }>(`/search?${params}`);
    return result.tracks.items;
  });
  const unique = new Map<string, SpotifyTrack>();
  for (const track of (await Promise.all(searches)).flat()) unique.set(track.id, track);
  return [...unique.values()].map(toTrackResult);
}
