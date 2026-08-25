import { env } from '$env/dynamic/private';
import type { TrackResult } from '$lib/types';

const API = 'https://api.getsong.co';
type GetSongResult = { title: string; tempo?: string | number; time_sig?: string | number; key_of?: string; artist?: { name?: string } };

function normalized(value: string): string {
  return value.toLocaleLowerCase().replace(/\([^)]*(remaster|version|edit|mix|live)[^)]*\)/g, '').replace(/\[[^\]]*(remaster|version|edit|mix|live)[^\]]*\]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function scoreMatch(track: TrackResult, result: GetSongResult): number {
  const wantedTitle = normalized(track.name), foundTitle = normalized(result.title);
  const wantedArtist = normalized(track.artists.split(',')[0] ?? ''), foundArtist = normalized(result.artist?.name ?? '');
  let score = wantedTitle === foundTitle ? 4 : wantedTitle.includes(foundTitle) || foundTitle.includes(wantedTitle) ? 2 : 0;
  score += wantedArtist === foundArtist ? 3 : wantedArtist.includes(foundArtist) || foundArtist.includes(wantedArtist) ? 1 : 0;
  return score;
}

function parseKey(value?: string): { key: string | null; mode: 'major' | 'minor' | null } {
  const key = value?.trim().replaceAll('♯', '#').replaceAll('♭', 'b');
  if (!key) return { key: null, mode: null };
  const minor = key.endsWith('m');
  return { key: minor ? key.slice(0, -1) : key, mode: minor ? 'minor' : 'major' };
}

async function lookup(track: TrackResult, apiKey: string): Promise<TrackResult> {
  const params = new URLSearchParams({ type: 'both', lookup: `song:${track.name} artist:${track.artists.split(',')[0]}`, limit: '5' });
  const response = await fetch(`${API}/search/?${params}`, { headers: { 'X-API-KEY': apiKey } });
  if (!response.ok) return track;
  const data = (await response.json()) as { search?: GetSongResult[] };
  const match = (data.search ?? []).map((result) => ({ result, score: scoreMatch(track, result) })).sort((a, b) => b.score - a.score)[0];
  if (!match || match.score < 5) return track;
  const bpm = Number(match.result.tempo), timeSignature = Number.parseInt(String(match.result.time_sig ?? ''), 10);
  const parsedKey = parseKey(match.result.key_of);
  return { ...track, bpm: Number.isFinite(bpm) ? bpm : null, key: parsedKey.key, mode: parsedKey.mode, timeSignature: Number.isFinite(timeSignature) ? timeSignature : null, featuresAvailable: Number.isFinite(bpm) || parsedKey.key !== null };
}

export async function addMusicalFeatures(tracks: TrackResult[]): Promise<TrackResult[]> {
  const apiKey = env.GETSONGBPM_API_KEY;
  if (!apiKey) throw new Error('GETSONGBPM_API_KEY is not configured. Add it to your .env file.');
  const enriched: TrackResult[] = [];
  for (let index = 0; index < tracks.length; index += 5) enriched.push(...(await Promise.all(tracks.slice(index, index + 5).map((track) => lookup(track, apiKey)))));
  return enriched;
}
