import { json } from '@sveltejs/kit';
import { addMusicalFeatures } from '$lib/server/getsongbpm';
import { searchArtistTracks, SpotifyError } from '$lib/server/spotify';
import type { RequestHandler } from './$types';

const KEYS = new Set(['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B']);

export const GET: RequestHandler = async ({ url, setHeaders }) => {
  const artists = url.searchParams.getAll('artist').map((value) => value.trim()).filter(Boolean);
  const minBpm = Number(url.searchParams.get('minBpm') || 40), maxBpm = Number(url.searchParams.get('maxBpm') || 220);
  const key = url.searchParams.get('key')?.trim() ?? '';
  const mode = url.searchParams.get('mode')?.trim() ?? '';
  if (!artists.length) return json({ message: 'Enter at least one artist.' }, { status: 400 });
  if (artists.length > 5) return json({ message: 'Search up to five artists at a time.' }, { status: 400 });
  if (artists.some((artist) => artist.length < 2 || artist.length > 100)) return json({ message: 'Artist names must be between 2 and 100 characters.' }, { status: 400 });
  if (!Number.isFinite(minBpm) || !Number.isFinite(maxBpm) || minBpm < 40 || maxBpm > 220 || minBpm > maxBpm) return json({ message: 'Choose a BPM range between 40 and 220.' }, { status: 400 });
  if (key && !KEYS.has(key)) return json({ message: 'Choose a valid musical key.' }, { status: 400 });
  if (mode && mode !== 'major' && mode !== 'minor') return json({ message: 'Choose a valid key mode.' }, { status: 400 });
  try {
    const enriched = await addMusicalFeatures(await searchArtistTracks(artists));
    const tracks = enriched.filter((track) => track.bpm !== null && track.bpm >= minBpm && track.bpm <= maxBpm && (!key || track.key === key) && (!mode || track.mode === mode));
    setHeaders({ 'cache-control': 'private, max-age=300' });
    return json({ tracks, unmatchedCount: enriched.filter((track) => !track.featuresAvailable).length });
  } catch (error) {
    if (error instanceof SpotifyError) return json({ message: error.message }, { status: error.status >= 500 ? 500 : 502 });
    return json({ message: error instanceof Error ? error.message : 'Song lookup failed.' }, { status: 500 });
  }
};
