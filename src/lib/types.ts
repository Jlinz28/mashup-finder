export type TrackResult = {
  id: string;
  name: string;
  artists: string;
  album: string;
  image: string | null;
  releaseDate: string;
  durationMs: number;
  explicit: boolean;
  spotifyUrl: string;
  bpm: number | null;
  key: string | null;
  mode: 'major' | 'minor' | null;
  timeSignature: number | null;
  featuresAvailable: boolean;
};

export type SearchResponse = {
  tracks: TrackResult[];
  unmatchedCount: number;
};
