<script lang="ts">
  import type { SearchResponse, TrackResult } from '$lib/types';

  let artists = $state(['']);
  let advanced = $state(false);
  let minBpm = $state(40);
  let maxBpm = $state(220);
  let selectedKey = $state('');
  let tracks = $state<TrackResult[]>([]);
  let loading = $state(false);
  let searched = $state(false);
  let error = $state('');
  let unmatchedCount = $state(0);

  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60_000);
    const seconds = Math.floor((ms % 60_000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  async function search(event: SubmitEvent) {
    event.preventDefault();
    const requestedArtists = artists.map((artist) => artist.trim()).filter(Boolean);
    if (!requestedArtists.length || loading) return;

    loading = true;
    error = '';
    unmatchedCount = 0;

    try {
      const params = new URLSearchParams();
      requestedArtists.forEach((artist) => params.append('artist', artist));
      params.set('minBpm', String(minBpm));
      params.set('maxBpm', String(maxBpm));
      if (selectedKey) {
        const [key, mode] = selectedKey.split('|');
        params.set('key', key);
        params.set('mode', mode);
      }
      const response = await fetch(`/api/search?${params}`);
      const data = (await response.json()) as SearchResponse | { message: string };
      if (!response.ok) throw new Error('message' in data ? data.message : 'Search failed.');
      const result = data as SearchResponse;
      tracks = result.tracks;
      unmatchedCount = result.unmatchedCount;
      searched = true;
    } catch (cause) {
      error = cause instanceof Error ? cause.message : 'Search failed. Please try again.';
      tracks = [];
      searched = true;
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>TempoKey — Find any song's BPM & key</title>
  <meta name="description" content="Search Spotify tracks and instantly find their tempo, musical key, and time signature." />
</svelte:head>

<header class="site-header">
  <a class="brand" href="/" aria-label="TempoKey home">
    <span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
    <span>tempo<span>key</span></span>
  </a>
  <div class="spotify-note"><span></span> Catalog by Spotify · tempo by GetSongBPM</div>
</header>

<main>
  <section class="hero" class:compact={searched}>
    <div class="eyebrow"><span></span> Your mix starts here</div>
    <h1>Find the rhythm.<br /><em>Know the key.</em></h1>
    <p>Search an artist's catalog, compare up to five artists, and narrow the results by tempo and musical key.</p>

    <form onsubmit={search} class="search-panel" role="search">
      <div class="search-form">
        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m21 21-4.35-4.35m2.35-5.15a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0Z" /></svg>
        <input bind:value={artists[0]} aria-label="Artist name" placeholder="Artist name, e.g. Ariana Grande" autocomplete="off" />
        <button type="submit" disabled={loading || artists.every((artist) => artist.trim().length < 2)}>
          {#if loading}<span class="spinner" aria-label="Searching"></span>{:else}Find songs{/if}
        </button>
      </div>
      <button class="advanced-toggle" type="button" onclick={() => advanced = !advanced}>{advanced ? 'Hide' : 'Show'} advanced search</button>
      {#if advanced}
        <div class="advanced-search">
          <div class="artist-fields">
            {#each artists.slice(1) as _, index}
              <input bind:value={artists[index + 1]} aria-label={`Artist ${index + 2}`} placeholder={`Additional artist ${index + 2}`} />
            {/each}
            {#if artists.length < 5}<button type="button" onclick={() => artists = [...artists, '']}>+ Add artist</button>{/if}
          </div>
          <label>Minimum BPM <input type="number" bind:value={minBpm} min="40" max="220" /></label>
          <label>Maximum BPM <input type="number" bind:value={maxBpm} min="40" max="220" /></label>
          <label>Key
            <select bind:value={selectedKey}>
              <option value="">Any key</option>
              {#each ['C', 'C#', 'Db', 'D', 'D#', 'Eb', 'E', 'F', 'F#', 'Gb', 'G', 'G#', 'Ab', 'A', 'A#', 'Bb', 'B'] as key}
                <option value={`${key}|major`}>{key} major</option><option value={`${key}|minor`}>{key} minor</option>
              {/each}
            </select>
          </label>
        </div>
      {/if}
    </form>
    <div class="suggestions">
      <span>Try</span>
      {#each ['Ariana Grande', 'Disclosure', 'Billie Eilish'] as suggestion}
        <button onclick={() => { artists[0] = suggestion; }}>{suggestion}</button>
      {/each}
    </div>
  </section>

  {#if error}
    <div class="notice error" role="alert"><strong>Search unavailable</strong><span>{error}</span></div>
  {/if}

  {#if unmatchedCount > 0}
    <div class="notice warning" role="status">
      <strong>{unmatchedCount} catalog {unmatchedCount === 1 ? 'track was' : 'tracks were'} skipped</strong>
      <span>GetSongBPM did not have a confident BPM/key match for {unmatchedCount === 1 ? 'it' : 'them'}.</span>
    </div>
  {/if}

  {#if loading}
    <section class="results" aria-label="Loading results">
      <div class="results-heading"><h2>Searching the catalog</h2></div>
      {#each Array(4) as _}
        <div class="track skeleton"><div></div><span></span><span></span></div>
      {/each}
    </section>
  {:else if searched && tracks.length}
    <section class="results">
      <div class="results-heading">
        <div><span class="line"></span><h2>Search results</h2></div>
        <span>{tracks.length} tracks</span>
      </div>
      <div class="track-list">
        {#each tracks as track, index (track.id)}
          <article class="track" style={`--delay: ${index * 35}ms`}>
            <div class="track-main">
              {#if track.image}<img src={track.image} alt="" />{:else}<div class="album-placeholder">♪</div>{/if}
              <div class="track-copy">
                <h3>{track.name}</h3>
                <p>{track.artists}</p>
                <span>{track.album} · {track.releaseDate.slice(0, 4)} · {formatDuration(track.durationMs)}</span>
              </div>
            </div>
            <div class="metrics">
              <div><span>BPM</span><strong>{track.bpm ?? '—'}</strong></div>
              <div><span>KEY</span><strong>{track.key ?? '—'}</strong><small>{track.mode ?? 'unknown'}</small></div>
              <div><span>TIME</span><strong>{track.timeSignature ? `${track.timeSignature}/4` : '—'}</strong></div>
            </div>
            <a class="spotify-link" href={track.spotifyUrl} target="_blank" rel="noreferrer" aria-label={`Open ${track.name} on Spotify`}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10.2c3.7-1.1 7.8-.8 11.2 1m-10.3 2c3.2-.8 6.6-.6 9.5.8m-8.6 2c2.6-.6 5.3-.4 7.7.7M12 2.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19Z" /></svg>
            </a>
          </article>
        {/each}
      </div>
    </section>
  {:else if searched && !error}
    <div class="empty"><span>♫</span><h2>No matching tracks found</h2><p>Try another artist or widen the BPM and key filters.</p></div>
  {/if}

  {#if !searched}
    <section class="feature-strip">
      <div><b>01</b><span><strong>Fast discovery</strong>Search millions of tracks</span></div>
      <div><b>02</b><span><strong>Precise details</strong>Tempo, key & time signature</span></div>
      <div><b>03</b><span><strong>No account needed</strong>Just search and create</span></div>
    </section>
  {/if}
</main>

<footer><span>Built for DJs, producers & music lovers.</span><span>Catalog © Spotify AB · <a href="https://getsongbpm.com" target="_blank" rel="noreferrer">BPM & key by GetSongBPM</a></span></footer>

<style>
  :global(*){box-sizing:border-box} :global(html){background:#f3f1e9;color:#17161a;font-family:Inter,ui-sans-serif,system-ui,-apple-system,sans-serif} :global(body){margin:0;min-width:320px;background:radial-gradient(circle at 82% 8%,rgba(208,255,0,.16),transparent 25rem),#f3f1e9} :global(button),:global(input),:global(select){font:inherit}
  .site-header{height:86px;padding:0 clamp(24px,6vw,96px);display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #d8d5ca}.brand{display:flex;gap:12px;align-items:center;color:#17161a;text-decoration:none;font-size:23px;font-weight:800;letter-spacing:-1.2px}.brand>span:last-child span{color:#6654d9}.brand-mark{display:flex;gap:2px;height:25px;align-items:center}.brand-mark i{display:block;width:4px;border-radius:4px;background:#6654d9}.brand-mark i:nth-child(1){height:10px}.brand-mark i:nth-child(2){height:22px}.brand-mark i:nth-child(3){height:16px}.brand-mark i:nth-child(4){height:7px}.spotify-note{font-size:11px;text-transform:uppercase;letter-spacing:1.3px;font-weight:700;color:#77736d;display:flex;gap:8px;align-items:center}.spotify-note span{width:7px;height:7px;border-radius:50%;background:#1ed760}
  main{min-height:calc(100vh - 156px)}.hero{text-align:center;max-width:960px;margin:0 auto;padding:110px 24px 78px;transition:padding .3s}.hero.compact{padding-top:70px;padding-bottom:45px}.eyebrow{font-size:11px;font-weight:800;letter-spacing:2.2px;text-transform:uppercase;color:#6654d9;display:flex;justify-content:center;align-items:center;gap:9px;margin-bottom:22px}.eyebrow span,.line{display:inline-block;width:27px;height:2px;background:#c9ed25}.hero h1{font-family:Georgia,'Times New Roman',serif;font-size:clamp(54px,8vw,94px);line-height:.91;letter-spacing:-5px;margin:0;font-weight:400}.hero h1 em{color:#6654d9;font-weight:400}.hero>p{font-size:17px;line-height:1.6;color:#68655f;max-width:590px;margin:27px auto 38px}
  .search-panel{max-width:760px;margin:auto}.search-form{height:70px;background:#fff;border:1px solid #cfccc2;box-shadow:0 17px 45px rgba(32,26,20,.09);display:flex;align-items:center;padding:7px 7px 7px 22px;border-radius:3px}.search-form:focus-within{outline:2px solid #6654d9;outline-offset:2px}.search-form svg{width:22px;fill:none;stroke:#77736d;stroke-width:1.8}.search-form input{border:0;outline:0;background:transparent;flex:1;min-width:0;padding:0 16px;font-size:16px;color:#17161a}.search-form button{height:54px;min-width:116px;border:0;border-radius:2px;background:#6654d9;color:#fff;font-weight:800;cursor:pointer}.search-form button:hover{background:#5544c5}.search-form button:disabled{opacity:.65;cursor:not-allowed}.advanced-toggle{margin-top:14px;border:0;background:transparent;color:#6654d9;font-size:12px;font-weight:750;cursor:pointer}.advanced-search{margin-top:12px;padding:16px;background:#e9e6dc;border:1px solid #d5d1c6;display:grid;grid-template-columns:1fr 125px 125px 145px;gap:12px;text-align:left}.advanced-search label{font-size:10px;text-transform:uppercase;letter-spacing:.8px;color:#6f6b65;font-weight:750}.advanced-search input,.advanced-search select{display:block;width:100%;height:38px;margin-top:5px;border:1px solid #cbc6ba;background:#fff;padding:0 9px;color:#262329}.artist-fields{display:grid;gap:7px}.artist-fields input{margin:0}.artist-fields button{border:1px dashed #aaa39a;background:transparent;height:34px;color:#6654d9;cursor:pointer}.spinner{display:inline-block;width:19px;height:19px;border:2px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite}.suggestions{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:8px;margin-top:17px;font-size:11px;color:#89857f}.suggestions>span{text-transform:uppercase;letter-spacing:1px}.suggestions button{background:transparent;border:1px solid #d5d1c6;padding:5px 10px;border-radius:20px;color:#67635d;cursor:pointer;font-size:11px}.suggestions button:hover{border-color:#6654d9;color:#6654d9}
  .results{max-width:1160px;margin:0 auto;padding:0 24px 80px}.results-heading{display:flex;align-items:center;justify-content:space-between;margin-bottom:17px;color:#77736d;font-size:12px;text-transform:uppercase;letter-spacing:1.2px}.results-heading>div{display:flex;align-items:center;gap:10px}.results-heading h2{font-size:12px;margin:0;color:#252329;letter-spacing:1.5px}.track-list{display:grid;gap:9px}.track{position:relative;display:grid;grid-template-columns:minmax(330px,1fr) auto 38px;gap:25px;align-items:center;background:#fff;border:1px solid #ddd9ce;padding:13px 18px 13px 13px;min-height:95px;animation:rise .35s both;animation-delay:var(--delay)}.track:hover{border-color:#bfb7e9;box-shadow:0 8px 24px rgba(50,40,30,.07)}.track-main{display:flex;align-items:center;gap:16px;min-width:0}.track-main img,.album-placeholder{width:67px;height:67px;object-fit:cover;flex:0 0 auto}.album-placeholder{display:grid;place-items:center;background:#e8e4da;font-size:25px}.track-copy{min-width:0}.track-copy h3{font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin:0 0 5px}.track-copy p{font-size:13px;color:#6654d9;margin:0 0 7px;font-weight:650}.track-copy span{display:block;font-size:10px;color:#8c8881;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.metrics{display:flex}.metrics>div{min-width:92px;padding:0 21px;border-left:1px solid #e6e2da;text-align:center}.metrics span{display:block;font-size:9px;letter-spacing:1.3px;color:#98948d;margin-bottom:3px}.metrics strong{font-family:Georgia,serif;font-size:25px;font-weight:400;color:#242127}.metrics small{display:block;color:#8b8780;font-size:9px;text-transform:uppercase}.spotify-link{display:grid;place-items:center;color:#1c1b1d}.spotify-link svg{width:25px;fill:none;stroke:currentColor;stroke-width:1.5}.spotify-link:hover{color:#1db954}
  .notice{max-width:1112px;margin:0 auto 25px;padding:15px 18px;display:flex;gap:12px;align-items:baseline;border-left:3px solid}.notice strong{font-size:13px;white-space:nowrap}.notice span{font-size:12px;line-height:1.5}.notice.warning{background:#eeeade;border-color:#d1e93b;color:#565149}.notice.error{background:#f8e6e3;border-color:#c8483b;color:#792c24}.empty{text-align:center;padding:30px 24px 100px}.empty>span{font-size:40px;color:#6654d9}.empty h2{font-family:Georgia,serif;font-size:30px;margin:12px 0 5px}.empty p{color:#77736d}.feature-strip{border-top:1px solid #d8d5ca;border-bottom:1px solid #d8d5ca;display:grid;grid-template-columns:repeat(3,1fr);max-width:1160px;margin:0 auto 80px}.feature-strip>div{padding:28px 35px;display:flex;gap:18px;align-items:center;border-right:1px solid #d8d5ca}.feature-strip>div:last-child{border:0}.feature-strip b{font-family:Georgia,serif;font-size:25px;color:#6654d9;font-weight:400}.feature-strip span{font-size:11px;color:#77736d}.feature-strip strong{display:block;color:#29272a;font-size:12px;margin-bottom:3px}.skeleton{height:95px;display:flex;gap:16px}.skeleton div{width:67px;height:67px;background:#ece9e1}.skeleton span{width:25%;height:13px;background:#ece9e1}.skeleton div,.skeleton span{animation:pulse 1.2s ease-in-out infinite}
  footer{height:70px;border-top:1px solid #d8d5ca;padding:0 clamp(24px,6vw,96px);display:flex;justify-content:space-between;align-items:center;color:#88847d;font-size:10px;text-transform:uppercase;letter-spacing:1px}
  @keyframes spin{to{transform:rotate(360deg)}}@keyframes rise{from{opacity:0;transform:translateY(7px)}}@keyframes pulse{50%{opacity:.45}}
  @media(max-width:760px){.site-header{height:70px}.spotify-note{display:none}.hero{padding-top:70px}.hero h1{font-size:52px;letter-spacing:-3px}.hero>p{font-size:15px}.search-form{height:62px;padding-left:15px}.search-form button{height:46px;min-width:90px}.track{grid-template-columns:1fr 28px;gap:10px}.metrics{grid-column:1/-1;border-top:1px solid #ece8df;padding-top:12px}.metrics>div{flex:1}.metrics>div:first-child{border-left:0}.spotify-link{grid-column:2;grid-row:1}.feature-strip{grid-template-columns:1fr}.feature-strip>div{border-right:0;border-bottom:1px solid #d8d5ca}.notice{margin-left:24px;margin-right:24px;align-items:flex-start;flex-direction:column;gap:4px}.notice strong{white-space:normal}footer{justify-content:center}footer span:last-child{display:none}}
</style>
