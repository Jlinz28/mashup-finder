# TempoKey

TempoKey is a personal, non-commercial SvelteKit application for searching
Spotify's catalog and displaying track tempo, musical key, and time signature.

This application is a private development project. It runs only on my local
computer at `http://localhost:5173` and will not be deployed as a public
website. Because a localhost address cannot be reached by an external backlink
validator, this public repository page serves as the project's information and
attribution page.

## Data attribution

BPM, musical-key, and time-signature data is provided by
[GetSongBPM](https://getsongbpm.com/).

Spotify is used only for music-catalog metadata such as track names, artists,
albums, artwork, and Spotify links.

## Requirements

- Node.js 20.19+ or 22.12+
- A Spotify developer app
- `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`
- A GetSongBPM API key
- `GETSONGBPM_API_KEY`

Copy `.env.example` to `.env`, add your credentials, then run:

```sh
npm install
npm run dev
```

Credentials are read only by the SvelteKit server and are never sent to the browser.

## Spotify Audio Features limitation

Spotify stopped allowing new or development-mode apps to access Audio Features
on November 27, 2024. TempoKey therefore uses Spotify for catalog search and
GetSongBPM for BPM and musical-key information.
