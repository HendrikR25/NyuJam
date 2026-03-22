<template>
  <div class="detail-page">
    <div class="bg-noise"></div>
    <div class="cover-glow" :style="{ background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${playlist.color}20 0%, transparent 65%)` }"></div>

    <!-- Ad Banner -->
    <div class="ad-banner">
      <span class="ad-label">Anzeige</span>
      <slot name="ad-top">
        <div class="ad-placeholder">Advertisement</div>
      </slot>
    </div>

    <!-- Back -->
    <button class="back-btn" @click="router.push('/playlists')">← Playlists</button>

    <!-- Header -->
    <div class="playlist-header">
      <div class="pl-cover" :style="{ background: playlist.color + '33', borderColor: playlist.color + '55' }">
        <span class="pl-cover-icon">{{ playlist.icon }}</span>
      </div>
      <div class="pl-meta">
        <span class="pl-tag" v-if="playlist.pinned">♥ Favoriten</span>
        <h1 class="pl-title">{{ playlist.name }}</h1>
        <p class="pl-info">{{ playlist.songs.length }} Songs · {{ totalDuration }}</p>
      </div>
    </div>

    <!-- Play all button -->
    <div class="pl-actions">
      <button class="btn-play-all" :style="{ '--color': playlist.color }">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        Alle abspielen
      </button>
      <button class="btn-shuffle">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
          <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
          <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
        </svg>
        Shuffle
      </button>
    </div>

    <!-- Song list -->
    <div class="song-list" v-if="playlist.songs.length > 0">
      <div
        v-for="(song, idx) in playlist.songs"
        :key="song.id"
        class="song-row"
        :class="{ playing: currentlyPlaying === song.id }"
        :style="{ '--i': idx, '--color': playlist.color }"
        @click="playSong(song)"
      >
        <div class="song-num">
          <span v-if="currentlyPlaying !== song.id" class="num-text">{{ idx + 1 }}</span>
          <span v-else class="num-wave">
            <span></span><span></span><span></span>
          </span>
        </div>
        <div class="song-info">
          <span class="song-name" :class="{ 'song-name--playing': currentlyPlaying === song.id }">{{ song.name }}</span>
          <span class="song-artist">{{ song.artist }}</span>
        </div>
        <span class="song-duration">{{ song.duration }}</span>
        <button class="song-more" @click.stop>···</button>
      </div>
    </div>

    <!-- Empty state (Lieblingssongs) -->
    <div class="empty-state" v-else>
      <span class="empty-icon">♡</span>
      <p class="empty-title">Noch keine Lieblingssongs</p>
      <p class="empty-sub">Drücke das Herz-Symbol im Player, um Songs hier zu speichern.</p>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route  = useRoute()
const id     = Number(route.params.id)

// ── Demo song data per playlist ────────────────────────
const allPlaylists = [
  {
    id: 0, name: 'Lieblingssongs', icon: '♡', color: '#ff5a32', pinned: true,
    songs: [],
  },
  {
    id: 1, name: 'Chill Vibes', icon: '🌙', color: '#5b6aff',
    songs: [
      { id: 101, name: 'Kiara',            artist: 'Bonobo',         duration: '3:57' },
      { id: 102, name: 'Sunset Lover',     artist: 'Petit Biscuit',  duration: '3:43' },
      { id: 103, name: 'Bloom',            artist: 'Odesza',         duration: '4:12' },
      { id: 104, name: 'Numb',             artist: 'Portishead',     duration: '3:54' },
      { id: 105, name: 'Thinkin Bout You', artist: 'Frank Ocean',    duration: '3:21' },
      { id: 106, name: 'Re: Stacks',       artist: 'Bon Iver',       duration: '4:19' },
      { id: 107, name: 'Motion Picture',   artist: 'Everything Everything', duration: '3:48' },
    ],
  },
  {
    id: 2, name: 'Workout', icon: '⚡', color: '#ff5a32',
    songs: [
      { id: 201, name: 'HUMBLE.',          artist: 'Kendrick Lamar', duration: '2:57' },
      { id: 202, name: 'Power',            artist: 'Kanye West',     duration: '4:52' },
      { id: 203, name: 'Lose Yourself',    artist: 'Eminem',         duration: '5:26' },
      { id: 204, name: 'Pump It',          artist: 'Black Eyed Peas',duration: '3:33' },
      { id: 205, name: 'Stronger',         artist: 'Kanye West',     duration: '5:11' },
      { id: 206, name: 'Eye of the Tiger', artist: 'Survivor',       duration: '4:03' },
    ],
  },
  {
    id: 3, name: 'Deep Focus', icon: '◎', color: '#32c8a0',
    songs: [
      { id: 301, name: 'Experience',       artist: 'Ludovico Einaudi', duration: '5:14' },
      { id: 302, name: 'Divenire',         artist: 'Ludovico Einaudi', duration: '6:51' },
      { id: 303, name: 'Comptine',         artist: 'Yann Tiersen',     duration: '2:22' },
      { id: 304, name: 'Avril 14th',       artist: 'Aphex Twin',       duration: '2:05' },
      { id: 305, name: 'On the Nature',    artist: 'Jon Hopkins',      duration: '9:02' },
      { id: 306, name: 'Gymnopédie No.1',  artist: 'Erik Satie',       duration: '3:07' },
      { id: 307, name: 'Open Eye Signal',  artist: 'Jon Hopkins',      duration: '8:41' },
      { id: 308, name: 'An Ending',        artist: 'Brian Eno',        duration: '4:14' },
    ],
  },
  {
    id: 4, name: 'Late Night', icon: '◈', color: '#c864f0',
    songs: [
      { id: 401, name: 'Nights',           artist: 'Frank Ocean',    duration: '5:07' },
      { id: 402, name: 'After Hours',      artist: 'The Weeknd',     duration: '6:01' },
      { id: 403, name: 'Ivy',              artist: 'Frank Ocean',    duration: '4:09' },
      { id: 404, name: 'Midnight City',    artist: 'M83',            duration: '4:03' },
      { id: 405, name: 'Digital Love',     artist: 'Daft Punk',      duration: '4:58' },
    ],
  },
  {
    id: 5, name: 'Road Trip', icon: '◇', color: '#f0c832',
    songs: [
      { id: 501, name: 'Mr. Brightside',   artist: 'The Killers',    duration: '3:42' },
      { id: 502, name: 'Take Me Home',     artist: 'John Denver',    duration: '3:13' },
      { id: 503, name: 'Life is a Highway',artist: 'Tom Cochrane',   duration: '4:33' },
      { id: 504, name: 'Africa',           artist: 'Toto',           duration: '4:55' },
      { id: 505, name: 'Don\'t Stop Me',   artist: 'Queen',          duration: '3:29' },
      { id: 506, name: 'Born to Run',      artist: 'Springsteen',    duration: '4:31' },
      { id: 507, name: 'Fast Car',         artist: 'Tracy Chapman',  duration: '4:57' },
      { id: 508, name: 'On the Road Again',artist: 'Willie Nelson',  duration: '2:34' },
    ],
  },
  {
    id: 6, name: 'Neue Entdeckungen', icon: '⊹', color: '#ff8c55',
    songs: [
      { id: 601, name: 'Idol',             artist: 'YOASOBI',        duration: '3:29' },
      { id: 602, name: 'Glimpse of Us',    artist: 'Joji',           duration: '3:43' },
      { id: 603, name: 'Escapism',         artist: 'RAYE',           duration: '3:47' },
    ],
  },
]

const playlist = computed(() => allPlaylists.find(p => p.id === id) ?? allPlaylists[0])

const totalDuration = computed(() => {
  const songs = playlist.value.songs
  if (!songs.length) return '0 min'
  let total = 0
  songs.forEach(s => {
    const [m, sec] = s.duration.split(':').map(Number)
    total += m * 60 + sec
  })
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  return h > 0 ? `${h} Std. ${m} Min.` : `${m} Min.`
})

import { ref } from 'vue'
const currentlyPlaying = ref(null)

function playSong(song) {
  currentlyPlaying.value = song.id
  router.push('/player')
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.detail-page {
  min-height: 100vh;
  background: #0a0a0f; color: #f0ede6;
  font-family: 'DM Sans', sans-serif;
  display: flex; flex-direction: column; align-items: center;
  padding: 0 1.5rem 4rem;
  position: relative; overflow-x: hidden;
}

.bg-noise {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  background-size: 180px; opacity: 0.6;
}
.cover-glow { position: fixed; inset: 0; pointer-events: none; z-index: 0; }

/* ── Ad Banner ── */
.ad-banner {
  position: relative; z-index: 1;
  width: 100%; max-width: 728px; min-height: 90px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border-bottom: 1px solid rgba(240,237,230,0.07);
  padding: 0.75rem 0; margin-bottom: 0.75rem;
}
.ad-label {
  position: absolute; top: 4px; left: 0;
  font-size: 0.6rem; letter-spacing: 0.15em;
  text-transform: uppercase; color: rgba(240,237,230,0.2);
}
.ad-placeholder {
  width: 100%; max-width: 728px; height: 90px;
  background: rgba(240,237,230,0.03);
  border: 1px dashed rgba(240,237,230,0.1); border-radius: 2px;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; letter-spacing: 0.12em;
  text-transform: uppercase; color: rgba(240,237,230,0.15);
}

.back-btn {
  position: relative; z-index: 1; align-self: flex-start;
  background: none; border: none; cursor: pointer;
  color: rgba(240,237,230,0.35); font-family: 'DM Sans', sans-serif;
  font-size: 0.78rem; letter-spacing: 0.1em;
  padding: 0.4rem 0; margin-bottom: 1.5rem; transition: color 0.2s;
}
.back-btn:hover { color: #ff5a32; }

/* ── Header ── */
.playlist-header {
  position: relative; z-index: 1;
  width: 100%; max-width: 520px;
  display: flex; align-items: center; gap: 1.5rem;
  margin-bottom: 1.75rem;
  animation: fadeDown 0.5s ease both;
}

.pl-cover {
  width: 88px; height: 88px; flex-shrink: 0;
  border-radius: 10px; border: 1px solid;
  display: flex; align-items: center; justify-content: center;
  font-size: 2.8rem;
  box-shadow: 0 12px 32px rgba(0,0,0,0.4);
}

.pl-meta { display: flex; flex-direction: column; gap: 0.3rem; }
.pl-tag {
  font-size: 0.6rem; letter-spacing: 0.15em; text-transform: uppercase;
  color: #ff5a32; background: rgba(255,90,50,0.12);
  border: 1px solid rgba(255,90,50,0.25); border-radius: 3px;
  padding: 0.1rem 0.45rem; align-self: flex-start;
}
.pl-title {
  font-family: 'Bebas Neue', cursive;
  font-size: 2rem; letter-spacing: 0.1em; color: #f0ede6; line-height: 1;
}
.pl-info {
  font-size: 0.75rem; color: rgba(240,237,230,0.3); letter-spacing: 0.04em;
}

/* ── Actions ── */
.pl-actions {
  position: relative; z-index: 1;
  width: 100%; max-width: 520px;
  display: flex; gap: 0.75rem;
  margin-bottom: 2rem;
  animation: fadeDown 0.5s 0.08s ease both;
}

.btn-play-all {
  display: flex; align-items: center; gap: 0.5rem;
  font-family: 'Bebas Neue', cursive; font-size: 1rem; letter-spacing: 0.12em;
  background: var(--color); color: #0a0a0f;
  border: none; border-radius: 3px; padding: 0.65rem 1.4rem;
  cursor: pointer;
  box-shadow: 0 0 20px color-mix(in srgb, var(--color) 40%, transparent);
  transition: transform 0.15s, box-shadow 0.2s;
}
.btn-play-all:hover { transform: scale(1.04); }

.btn-shuffle {
  display: flex; align-items: center; gap: 0.5rem;
  font-family: 'DM Sans', sans-serif; font-size: 0.82rem; letter-spacing: 0.06em;
  background: rgba(240,237,230,0.05);
  border: 1px solid rgba(240,237,230,0.12);
  color: rgba(240,237,230,0.55);
  border-radius: 3px; padding: 0.65rem 1.2rem;
  cursor: pointer; transition: color 0.2s, border-color 0.2s, background 0.2s;
}
.btn-shuffle:hover {
  color: #f0ede6; border-color: rgba(240,237,230,0.25);
  background: rgba(240,237,230,0.08);
}

/* ── Song List ── */
.song-list {
  position: relative; z-index: 1;
  width: 100%; max-width: 520px;
  display: flex; flex-direction: column;
}

.song-row {
  display: flex; align-items: center; gap: 0.9rem;
  padding: 0.75rem 0.6rem;
  border-radius: 3px; cursor: pointer;
  opacity: 0; transform: translateY(5px);
  animation: slideUp 0.35s ease forwards;
  animation-delay: calc(var(--i) * 40ms);
  transition: background 0.15s;
  border-bottom: 1px solid rgba(240,237,230,0.04);
}
.song-row:last-child { border-bottom: none; }
.song-row:hover { background: rgba(240,237,230,0.04); }
.song-row.playing { background: rgba(255,255,255,0.03); }

.song-num {
  width: 24px; flex-shrink: 0; text-align: center;
}
.num-text {
  font-size: 0.75rem; color: rgba(240,237,230,0.25);
  font-variant-numeric: tabular-nums;
}
.num-wave {
  display: flex; align-items: flex-end; gap: 1.5px;
  height: 14px; justify-content: center;
}
.num-wave span {
  display: block; width: 2.5px; border-radius: 2px;
  background: var(--color);
  animation: waveBar 0.7s ease-in-out infinite;
}
.num-wave span:nth-child(1) { height: 6px; }
.num-wave span:nth-child(2) { height: 12px; animation-delay: 0.15s; }
.num-wave span:nth-child(3) { height: 8px;  animation-delay: 0.3s; }

.song-info { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
.song-name {
  font-size: 0.9rem; font-weight: 500; color: #f0ede6;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  transition: color 0.2s;
}
.song-name--playing { color: var(--color); }
.song-artist {
  font-size: 0.7rem; color: rgba(240,237,230,0.35);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.song-duration {
  font-size: 0.72rem; color: rgba(240,237,230,0.25);
  font-variant-numeric: tabular-nums; flex-shrink: 0;
}
.song-more {
  background: none; border: none; cursor: pointer;
  color: rgba(240,237,230,0.2); font-size: 1rem; line-height: 1;
  padding: 0 0.2rem; transition: color 0.2s; flex-shrink: 0;
  letter-spacing: 1px;
}
.song-row:hover .song-more { color: rgba(240,237,230,0.5); }

/* ── Empty State ── */
.empty-state {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; align-items: center; gap: 0.75rem;
  padding: 3.5rem 1.5rem;
  color: rgba(240,237,230,0.25);
  text-align: center;
}
.empty-icon { font-size: 3rem; opacity: 0.4; }
.empty-title { font-family: 'Bebas Neue', cursive; font-size: 1.4rem; letter-spacing: 0.12em; }
.empty-sub { font-size: 0.78rem; max-width: 260px; line-height: 1.6; }

/* ── Keyframes ── */
@keyframes fadeDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideUp {
  to { opacity: 1; transform: translateY(0); }
}
@keyframes waveBar {
  0%, 100% { transform: scaleY(0.5); }
  50%       { transform: scaleY(1.2); }
}

@media (max-width: 480px) {
  .pl-cover { width: 68px; height: 68px; font-size: 2.2rem; }
  .pl-title { font-size: 1.6rem; }
}
</style>
