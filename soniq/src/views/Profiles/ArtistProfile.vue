<template>
  <div class="artist-page">
    <div class="bg-noise"></div>

    <!-- Hero backdrop -->
    <div class="hero-backdrop" :style="{ background: `linear-gradient(180deg, ${artist.color}30 0%, #08090f 65%)` }"></div>

    <!-- Ad Banner -->
    <AdBanner ad-slot="1918440727" />

    <!-- Back -->
    <NavBar back-label="← Suche" back-to="/search" />

    <!-- Hero -->
    <div class="hero">
      <div class="artist-avatar" :style="{ background: `linear-gradient(135deg, ${artist.color}55, ${artist.color}22)`, borderColor: artist.color + '66' }">
        <span class="avatar-icon">{{ artist.icon }}</span>
        <div class="avatar-ring" :style="{ boxShadow: `0 0 40px ${artist.color}44` }"></div>
      </div>
      <div class="hero-info">
        <span class="artist-tag">Künstler</span>
        <h1 class="artist-name">{{ artist.name }}</h1>
        <p class="artist-genre">{{ artist.genre }}</p>
        <div class="hero-stats">
          <div class="hero-stat">
            <span class="hs-value">{{ formatStreams(artist.allTimeStreams) }}</span>
            <span class="hs-label">All-Time Streams</span>
          </div>
          <div class="stat-divider"></div>
          <div class="hero-stat">
            <span class="hs-value">{{ artist.songs.length }}</span>
            <span class="hs-label">Songs</span>
          </div>
          <div class="stat-divider"></div>
          <div class="hero-stat">
            <span class="hs-value">{{ artist.albums.length }}</span>
            <span class="hs-label">Alben</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Stream counter gimmick -->
    <div class="stream-counter" :style="{ borderColor: artist.color + '33' }">
      <div class="sc-left">
        <span class="sc-label">All-Time Streams</span>
        <span class="sc-number" :style="{ color: artist.color }">{{ displayStreams }}</span>
      </div>
      <div class="sc-bars">
        <div v-for="(h, i) in streamBars" :key="i" class="sc-bar" :style="{ height: h + '%', background: artist.color, animationDelay: i * 0.08 + 's' }"></div>
      </div>
    </div>

    <!-- Tabs -->
    <div class="tabs">
      <button class="tab" :class="{ active: activeTab === 'songs' }"  @click="activeTab = 'songs'">
        <span>♩</span> Songs
      </button>
      <button class="tab" :class="{ active: activeTab === 'albums' }" @click="activeTab = 'albums'">
        <span>▣</span> Alben
      </button>
    </div>

    <!-- Songs Tab -->
    <transition name="tab-swap" mode="out-in">
      <div class="tab-content" key="songs" v-if="activeTab === 'songs'">
        <div
          v-for="(song, idx) in artist.songs"
          :key="song.id"
          class="song-row"
          :style="{ '--i': idx, '--color': artist.color }"
          :class="{ active: player.currentSong?.id === song.id }"
          @click="playSong(song)"
        >
          <div class="sr-num">
            <span v-if="player.currentSong?.id === song.id && player.isPlaying" class="sr-wave">
              <span></span><span></span><span></span>
            </span>
            <span v-else class="sr-idx">{{ idx + 1 }}</span>
          </div>
          <div class="sr-cover">
            <img v-if="song.cover" :src="song.cover" class="sr-cover-img" />
            <span v-else class="sr-cover-icon">♩</span>
          </div>
          <div class="sr-info">
            <span class="sr-name" :class="{ 'sr-name--playing': player.currentSong?.id === song.id }">{{ song.name }}</span>
            <span class="sr-meta">{{ song.album }} · {{ song.year }}</span>
          </div>
          <span class="sr-streams">{{ formatStreams(song.streams) }}</span>
          <SongMenu :song="song" @feedback="apFeedback = $event; clearApFeedback()" @deleted="onSongDeleted" />
        </div>
      </div>

      <!-- Albums Tab -->
      <div class="tab-content" key="albums" v-else>
        <div v-if="!artist.albums.length" class="empty-albums">
          <span style="font-size:2rem;opacity:0.3">▣</span>
          <p style="font-size:0.8rem;color:rgba(240,237,230,0.3);margin-top:0.5rem">Noch keine Alben</p>
        </div>
        <div class="albums-list" v-else>
          <div v-for="(album, idx) in artist.albums" :key="album.id" class="album-card" :style="{ '--i': idx, '--color': artist.color }">
            <div class="ac-cover" :style="{ background: album.coverUrl ? 'none' : `linear-gradient(135deg, ${artist.color}44, ${artist.color}11)` }">
              <img v-if="album.coverUrl" :src="album.coverUrl" class="ac-cover-img" />
              <span v-else class="ac-icon">▣</span>
            </div>
            <div class="ac-info">
              <span class="ac-name">{{ album.title }}</span>
              <span class="ac-year">{{ album.releasedAt?.slice(0,4) }} · {{ album.songs.length }} Tracks</span>
            </div>
            <!-- Track list -->
            <div class="ac-tracks">
              <div v-for="song in album.songs" :key="song.id" class="ac-track" @click="playSong(song)">
                <span class="act-nr">{{ song.trackNr }}</span>
                <span class="act-name">{{ song.name }}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="color:rgba(240,237,230,0.2);flex-shrink:0"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

  </div>

  <!-- Feedback toast -->
  <transition name="toast-fade">
    <div class="ap-toast" v-if="apFeedback">{{ apFeedback }}</div>
  </transition>
</template>

<script setup>
import AdBanner from '@/components/AdBanner.vue'
import SongMenu from '@/components/SongMenu.vue'
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import { usePlayerStore } from '@/stores/player'

const router = useRouter()
const route  = useRoute()
const player = usePlayerStore()
const apFeedback = ref('')
let apFeedbackTimer = null
function clearApFeedback() {
  clearTimeout(apFeedbackTimer)
  apFeedbackTimer = setTimeout(() => { apFeedback.value = '' }, 2500)
}
function onSongDeleted(id) {
  player.songs = player.songs.filter(s => s.id !== id)
}

const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

const activeTab      = ref('songs')
const artistName     = route.params.name ?? 'Unbekannt'
const totalStreams    = ref(0)
const songStreamMap  = ref({})
const realAlbums     = ref([])

// Accent colors per artist
const artistColors = {
  'Bonobo':'#32c8a0','M83':'#5b6aff','Frank Ocean':'#c864f0',
  'Petit Biscuit':'#ff8c55','Daft Punk':'#f0c832','Jon Hopkins':'#ff5a32',
  'YOASOBI':'#ff5a32','Odesza':'#5b6aff','Kendrick Lamar':'#ff5a32','The Weeknd':'#c864f0',
}
const artistIcons = {
  'Bonobo':'🌿','M83':'◈','Frank Ocean':'🌊','Petit Biscuit':'☁️',
  'Daft Punk':'⚡','Jon Hopkins':'◎','YOASOBI':'🌸','Odesza':'⊹',
  'Kendrick Lamar':'◇','The Weeknd':'🌙',
}
const artistGenres = {
  'Bonobo':'Electronic · Jazz','M83':'Synthpop · Dream Pop',
  'Frank Ocean':'R&B · Soul','Petit Biscuit':'Electronic',
  'Daft Punk':'House · Electronic','Jon Hopkins':'Ambient · Techno',
  'YOASOBI':'J-Pop','Odesza':'Electronic',
  'Kendrick Lamar':'Hip-Hop','The Weeknd':'R&B · Pop',
}

const artistSongs = computed(() =>
  player.songs
    .filter(s => s.artist === artistName)
    .map(s => ({
      ...s,
      album:   'Unknown Album',
      year:    2024,
      streams: songStreamMap.value[String(s.id)] || 0,
    }))
    .sort((a, b) => b.streams - a.streams)
)

const artist = computed(() => ({
  name:          artistName,
  icon:          artistIcons[artistName]  ?? '◉',
  color:         artistColors[artistName] ?? '#5b6aff',
  genre:         artistGenres[artistName] ?? 'Music',
  allTimeStreams: totalStreams.value,
  songs:         artistSongs.value,
  albums:        realAlbums.value,
}))

// ── Stream counter animation ───────────────────────────
const displayStreams = ref('0')
const streamBars    = ref(Array.from({ length: 24 }, () => Math.floor(Math.random() * 70) + 20))

onMounted(async () => {
  if (!player.songs.length) await player.loadSongs()

  const [artistRes, songsRes, albumsRes] = await Promise.all([
    fetch(`${BASE_URL}/api/streams/artist/${encodeURIComponent(artistName)}`),
    fetch(`${BASE_URL}/api/streams/artist/${encodeURIComponent(artistName)}/songs`),
    fetch(`${BASE_URL}/api/albums/artist/${encodeURIComponent(artistName)}`),
  ])
  const artistData = await artistRes.json()
  const songsData  = await songsRes.json()
  const albumsData = await albumsRes.json()

  totalStreams.value  = artistData.streams || 0
  songStreamMap.value = songsData || {}
  realAlbums.value    = Array.isArray(albumsData) ? albumsData : []
  animateCounter(totalStreams.value)

  setInterval(() => {
    streamBars.value = streamBars.value.map(v => Math.max(10, Math.min(100, v + (Math.random() - 0.5) * 20)))
  }, 2000)
})

function animateCounter(target) {
  const duration = 1800
  const start    = performance.now()
  function step(now) {
    const progress = Math.min((now - start) / duration, 1)
    const ease     = 1 - Math.pow(1 - progress, 3)
    displayStreams.value = formatStreams(Math.floor(target * ease))
    if (progress < 1) requestAnimationFrame(step)
    else displayStreams.value = formatStreams(target)
  }
  requestAnimationFrame(step)
}

function formatStreams(n) {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'Mrd.'
  if (n >= 1_000_000)     return (n / 1_000_000).toFixed(1) + 'Mio.'
  if (n >= 1_000)         return (n / 1_000).toFixed(0) + 'K'
  return String(n)
}

// ── Playback ───────────────────────────────────────────
function playSong(song) {
  const full = player.songs.find(s => s.id === song.id)
  if (full) {
    player.fromRoute = `/artist/${encodeURIComponent(artistName)}`
    player.play(full)
    router.push(`/player?from=artist/${encodeURIComponent(artistName)}`)
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.artist-page {
  min-height: 100vh; background: #08090f; color: #f0ede6;
  font-family: 'DM Sans', sans-serif;
  display: flex; flex-direction: column; align-items: center;
  padding: 0 1.5rem 4rem; position: relative; overflow-x: hidden;
}
.bg-noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size: 180px; opacity: 0.6; }
.hero-backdrop {
  position: absolute; top: 0; left: 0; right: 0; height: 420px;
  pointer-events: none; z-index: 0;
}

/* Ad */
.ad-banner { position: relative; z-index: 1; width: 100%; max-width: 728px; min-height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 1px solid rgba(240,237,230,0.07); padding: 0.75rem 0; margin-bottom: 0.5rem; }
.ad-label { position: absolute; top: 4px; left: 0; font-size: 0.6rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.2); }
.ad-placeholder { width: 100%; max-width: 728px; height: 90px; background: rgba(240,237,230,0.03); border: 1px dashed rgba(240,237,230,0.1); border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,237,230,0.15); }

.back-btn { position: relative; z-index: 1; align-self: flex-start; background: none; border: none; cursor: pointer; color: rgba(240,237,230,0.35); font-family: 'DM Sans', sans-serif; font-size: 0.78rem; letter-spacing: 0.1em; padding: 0.4rem 0; margin-bottom: 1.5rem; transition: color 0.2s; }
.back-btn:hover { color: #ff5a32; }

/* ── Hero ── */
.hero { position: relative; z-index: 1; width: 100%; max-width: 560px; display: flex; gap: 1.5rem; align-items: flex-end; margin-bottom: 2rem; animation: fadeDown 0.6s ease both; }

.artist-avatar {
  width: 110px; height: 110px; flex-shrink: 0;
  border-radius: 50%; border: 2px solid;
  display: flex; align-items: center; justify-content: center;
  font-size: 3rem; position: relative;
  box-shadow: 0 12px 40px rgba(0,0,0,0.5);
}
.avatar-ring { position: absolute; inset: -6px; border-radius: 50%; pointer-events: none; }

.hero-info { flex: 1; display: flex; flex-direction: column; gap: 0.3rem; padding-bottom: 0.25rem; }
.artist-tag { font-size: 0.6rem; letter-spacing: 0.2em; text-transform: uppercase; color: rgba(240,237,230,0.3); }
.artist-name { font-family: 'Bebas Neue', cursive; font-size: 2.4rem; letter-spacing: 0.1em; color: #f0ede6; line-height: 1; }
.artist-genre { font-size: 0.72rem; color: rgba(240,237,230,0.35); letter-spacing: 0.05em; margin-bottom: 0.5rem; }

.hero-stats { display: flex; align-items: center; gap: 0.9rem; }
.hero-stat { display: flex; flex-direction: column; gap: 0.1rem; }
.hs-value { font-family: 'Bebas Neue', cursive; font-size: 1.1rem; letter-spacing: 0.08em; color: #f0ede6; }
.hs-label { font-size: 0.58rem; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(240,237,230,0.28); }
.stat-divider { width: 1px; height: 28px; background: rgba(240,237,230,0.1); }

/* ── Stream Counter ── */
.stream-counter {
  position: relative; z-index: 1;
  width: 100%; max-width: 560px;
  display: flex; align-items: center; justify-content: space-between;
  background: rgba(240,237,230,0.03);
  border: 1px solid; border-radius: 8px;
  padding: 1rem 1.25rem;
  margin-bottom: 2rem;
  overflow: hidden;
  animation: fadeDown 0.6s 0.1s ease both;
}
.sc-left { display: flex; flex-direction: column; gap: 0.25rem; }
.sc-label { font-size: 0.6rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(240,237,230,0.3); }
.sc-number { font-family: 'Bebas Neue', cursive; font-size: 2.2rem; letter-spacing: 0.08em; line-height: 1; transition: color 0.5s; }

.sc-bars { display: flex; align-items: flex-end; gap: 3px; height: 48px; }
.sc-bar {
  width: 4px; border-radius: 2px 2px 0 0; opacity: 0.6;
  transition: height 2s ease;
  animation: barPulse 2s ease-in-out infinite;
}

/* ── Tabs ── */
.tabs { position: relative; z-index: 1; display: flex; gap: 0.5rem; margin-bottom: 1.25rem; width: 100%; max-width: 560px; }
.tab { display: flex; align-items: center; gap: 0.4rem; font-family: 'DM Sans', sans-serif; font-size: 0.82rem; letter-spacing: 0.06em; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.09); color: rgba(240,237,230,0.4); padding: 0.45rem 1.1rem; border-radius: 99px; cursor: pointer; transition: all 0.2s; }
.tab:hover { color: #f0ede6; border-color: rgba(240,237,230,0.2); }
.tab.active { background: rgba(255,90,50,0.12); border-color: rgba(255,90,50,0.4); color: #ff5a32; }

/* ── Tab content ── */
.tab-content { position: relative; z-index: 1; width: 100%; max-width: 560px; }

/* Songs */
.song-row {
  display: flex; align-items: center; gap: 0.85rem;
  padding: 0.7rem 0.5rem; border-radius: 4px; cursor: pointer;
  opacity: 0; transform: translateY(5px);
  animation: slideUp 0.35s ease forwards;
  animation-delay: calc(var(--i) * 40ms);
  border-bottom: 1px solid rgba(240,237,230,0.04);
  transition: background 0.15s;
}
.song-row:hover { background: rgba(240,237,230,0.04); }
.song-row.active { background: color-mix(in srgb, var(--color) 8%, transparent); }
.sr-num { width: 22px; flex-shrink: 0; text-align: center; }
.sr-cover { width: 36px; height: 36px; border-radius: 3px; background: rgba(240,237,230,0.06); flex-shrink: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; font-size: 0.9rem; color: rgba(240,237,230,0.3); }
.sr-cover-img { width: 100%; height: 100%; object-fit: cover; }
.sr-cover-icon { font-size: 0.9rem; }
.sr-idx { font-size: 0.7rem; color: rgba(240,237,230,0.22); }
.sr-wave { display: flex; align-items: flex-end; gap: 1.5px; height: 14px; justify-content: center; }
.sr-wave span { display: block; width: 2.5px; border-radius: 2px; background: var(--color); animation: waveBar 0.7s ease-in-out infinite; }
.sr-wave span:nth-child(2) { animation-delay: 0.15s; }
.sr-wave span:nth-child(3) { animation-delay: 0.3s; }
.sr-info { flex: 1; display: flex; flex-direction: column; gap: 0.12rem; min-width: 0; }
.sr-name { font-size: 0.88rem; font-weight: 500; color: #f0ede6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sr-name--playing { color: var(--color); }
.sr-meta { font-size: 0.65rem; color: rgba(240,237,230,0.3); }
.sr-streams { font-size: 0.68rem; color: rgba(240,237,230,0.25); flex-shrink: 0; font-variant-numeric: tabular-nums; }
.sr-like { background: none; border: none; color: rgba(240,237,230,0.25); cursor: pointer; padding: 0.2rem; transition: color 0.2s; flex-shrink: 0; line-height: 0; }
.sr-like:hover { color: #ff5a32; }
.sr-like.liked { color: #ff5a32; }

/* Albums */
.empty-albums { display: flex; flex-direction: column; align-items: center; padding: 3rem 1rem; }
.albums-list { display: flex; flex-direction: column; gap: 1.5rem; width: 100%; }
.album-card { display: flex; flex-direction: column; opacity: 0; transform: translateY(8px); animation: slideUp 0.4s ease forwards; animation-delay: calc(var(--i) * 80ms); }
.ac-cover { width: 100%; aspect-ratio: 1; border-radius: 6px 6px 0 0; display: flex; align-items: center; justify-content: center; overflow: hidden; background: linear-gradient(135deg, rgba(91,106,255,0.3), rgba(91,106,255,0.1)); }
.ac-cover-img { width: 100%; height: 100%; object-fit: cover; }
.ac-icon { font-size: 3rem; opacity: 0.4; }
.ac-info { background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.07); border-top: none; padding: 0.85rem 1rem; display: flex; justify-content: space-between; align-items: center; }
.ac-name { font-family: 'Bebas Neue', cursive; font-size: 1.1rem; letter-spacing: 0.1em; color: #f0ede6; }
.ac-year { font-size: 0.68rem; color: rgba(240,237,230,0.3); }
.ac-tracks { border: 1px solid rgba(240,237,230,0.07); border-top: none; border-radius: 0 0 6px 6px; overflow: hidden; }
.ac-track { display: flex; align-items: center; gap: 0.75rem; padding: 0.6rem 1rem; cursor: pointer; transition: background 0.15s; border-bottom: 1px solid rgba(240,237,230,0.04); }
.ac-track:last-child { border-bottom: none; }
.ac-track:hover { background: rgba(240,237,230,0.04); }
.act-nr { font-size: 0.7rem; color: rgba(240,237,230,0.2); width: 1.2rem; text-align: center; flex-shrink: 0; }
.act-name { flex: 1; font-size: 0.88rem; color: rgba(240,237,230,0.7); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* Tab transition */
.tab-swap-enter-active, .tab-swap-leave-active { transition: opacity 0.2s, transform 0.2s; }
.tab-swap-enter-from { opacity: 0; transform: translateY(6px); }
.tab-swap-leave-to   { opacity: 0; transform: translateY(-6px); }

@keyframes fadeDown  { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideUp   { to { opacity: 1; transform: translateY(0); } }
@keyframes waveBar   { 0%, 100% { height: 6px; } 50% { height: 12px; } }
@keyframes barPulse  { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
.ap-toast { position: fixed; bottom: 5rem; left: 50%; transform: translateX(-50%); background: rgba(14,14,24,0.95); border: 1px solid rgba(240,237,230,0.15); border-radius: 6px; padding: 0.6rem 1.2rem; font-size: 0.82rem; color: #f0ede6; z-index: 200; white-space: nowrap; }
.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }
</style>