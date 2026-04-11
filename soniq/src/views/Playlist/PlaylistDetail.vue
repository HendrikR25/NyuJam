<template>
  <div class="detail-page">
    <div class="bg-noise"></div>
    <div class="cover-glow" :style="playlist ? { background: `radial-gradient(ellipse 80% 50% at 50% 0%, ${playlist.color}20 0%, transparent 65%)` } : {}"></div>

    <!-- Ad Banner -->
    <div class="ad-banner">
      <span class="ad-label">Anzeige</span>
      <slot name="ad-top">
        <div class="ad-placeholder">Advertisement</div>
      </slot>
    </div>

    <!-- Back -->
    <NavBar back-to="/playlists" back-label="Playlists" />

    <!-- Loading -->
    <div class="loading-state" v-if="loading">
      <span class="load-dot"></span><span class="load-dot"></span><span class="load-dot"></span>
    </div>

    <template v-else-if="playlist">
      <!-- Header -->
      <div class="playlist-header">
        <div class="pl-cover" :style="{ background: playlist.color + '33', borderColor: playlist.color + '55' }">
          <span class="pl-cover-icon">{{ playlist.icon }}</span>
        </div>
        <div class="pl-meta">
          <span class="pl-tag" v-if="playlist.pinned">♥ Favoriten</span>
          <h1 class="pl-title">{{ playlist.name }}</h1>
          <p class="pl-info">{{ totalDuration }}</p>
        </div>
      </div>

      <!-- Play all -->
      <div class="pl-actions" v-if="songs.length">
        <button class="btn-play-all" :style="{ '--color': playlist.color }" @click="playSong(songs[0])">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
          Alle abspielen
        </button>
        <button class="btn-shuffle">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/></svg>
          Shuffle
        </button>
      </div>

      <!-- Song list -->
      <div class="song-list" v-if="songs.length">
        <div
          v-for="(song, idx) in songs"
          :key="song.id"
          class="song-row"
          :class="{ playing: currentlyPlaying === song.id }"
          :style="{ '--i': idx, '--color': playlist.color }"
          @click="playSong(song)"
        >
          <div class="song-num">
            <span v-if="currentlyPlaying !== song.id" class="num-text">{{ idx + 1 }}</span>
            <span v-else class="num-wave"><span></span><span></span><span></span></span>
          </div>
          <div class="song-cover">
            <img v-if="song.cover" :src="song.cover" class="song-cover-img" />
            <span v-else class="song-cover-icon">♩</span>
          </div>
          <div class="song-info">
            <span class="song-name" :class="{ 'song-name--playing': currentlyPlaying === song.id }">{{ song.name }}</span>
            <span class="song-artist">{{ song.artist }}</span>
          </div>
          <SongMenu :song="song" @feedback="plFeedback = $event; clearPlFeedback()" @deleted="removeSong(song)" @click.stop />
          <button class="song-remove" @click.stop="removeSong(song)" title="Aus Playlist entfernen">✕</button>
        </div>
      </div>

      <!-- Empty state -->
      <div class="empty-state" v-else>
        <span class="empty-icon">{{ playlist.pinned ? '♡' : '▤' }}</span>
        <p class="empty-title">{{ playlist.pinned ? 'Noch keine Lieblingssongs' : 'Playlist ist leer' }}</p>
        <p class="empty-sub" v-if="playlist.pinned">Drücke das Herz-Symbol im Player, um Songs hier zu speichern.</p>
        <p class="empty-sub" v-else>Füge Songs über den Player hinzu (··· → Zu Playlist hinzufügen).</p>
      </div>
    </template>

    <!-- Not found -->
    <div class="empty-state" v-else>
      <span class="empty-icon">▤</span>
      <p class="empty-title">Playlist nicht gefunden</p>
    </div>

  </div>

  <transition name="toast-fade">
    <div class="pl-toast" v-if="plFeedback">{{ plFeedback }}</div>
  </transition>
</template>

<script setup>
const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePlaylistsStore } from '@/stores/playlists'
import NavBar    from '@/components/NavBar.vue'
import SongMenu  from '@/components/SongMenu.vue'
import { usePlayerStore } from '@/stores/player'

const router  = useRouter()
const route   = useRoute()
const plStore = usePlaylistsStore()
const player  = usePlayerStore()

const playlistId = route.params.id  // string id from server, or 'favorites'

// ── Load data ──────────────────────────────────────────
const loading = ref(true)
const playlist = ref(null)

onMounted(async () => {
  try {
    if (!player.songs.length) await player.loadSongs()
    if (player.loadFavorites) await player.loadFavorites()

    if (playlistId === 'favorites') {
      playlist.value = {
        id:     'favorites',
        name:   'Lieblingssongs',
        icon:   '♡',
        color:  '#ff5a32',
        pinned: true,
        songs:  player.likedSongs ?? [],
      }
      loading.value = false
      return
    }

    // Load from server directly — don't rely on store cache
    const res = await fetch(`${BASE_URL}/api/playlists/${playlistId}`)
    if (res.ok) {
      playlist.value = await res.json()
    } else {
      // Fallback to store
      if (!plStore.playlists.length) await plStore.load()
      playlist.value = plStore.playlists.find(p => p.id === playlistId) ?? null
    }
  } catch (e) {
    console.error('PlaylistDetail error:', e)
    // Try store as fallback
    if (!plStore.playlists.length) await plStore.load().catch(() => {})
    playlist.value = plStore.playlists.find(p => p.id === playlistId) ?? null
  } finally {
    loading.value = false
  }
})

// ── Computed ───────────────────────────────────────────
// For favorites: use player.likedSongs directly (reactive)
// For playlists: use playlist.value.songs
const songs = computed(() => {
  if (playlistId === 'favorites') return player.likedSongs
  const raw = playlist.value?.songs ?? []
  // playlist_songs has song_id — match against player.songs for full data
  return raw.map(ps => {
    const songId = ps.song_id || ps.id
    const full = player.songs.find(s =>
      String(s.id) === `u_${songId}` || String(s.id) === String(songId)
    )
    return full || { id: ps.song_id, name: ps.song_name, artist: ps.song_artist, cover: null, url: null }
  }).filter(s => s.name)
})

const totalDuration = computed(() => {
  const count = songs.value.length
  return count === 0 ? '0 Songs' : `${count} Song${count !== 1 ? 's' : ''}`
})

// ── Actions ────────────────────────────────────────────
const currentlyPlaying = ref(null)
const plFeedback = ref('')
let plFeedbackTimer = null
function clearPlFeedback() {
  clearTimeout(plFeedbackTimer)
  plFeedbackTimer = setTimeout(() => { plFeedback.value = '' }, 2500)
}

function playSong(song) {
  const fullSong = player.songs.find(s => String(s.id) === String(song.id))
  if (fullSong) {
    player.fromRoute = `/playlists/${playlistId}`
    player.play(fullSong)
    router.push(`/player?from=playlists/${playlistId}`)
  }
  currentlyPlaying.value = song.id
}

async function removeSong(song) {
  if (playlistId === 'favorites') {
    await fetch(`${BASE_URL}/api/favorites/${song.id}`, { method: 'DELETE' })
    // mutate the reactive ref directly
    player.likedSongs.splice(0, player.likedSongs.length, ...player.likedSongs.filter(f => String(f.id) !== String(song.id)))
  } else {
    await plStore.removeSong(playlistId, String(song.id))
    if (playlist.value?.songs) {
      playlist.value.songs = playlist.value.songs.filter(s => String(s.id) !== String(song.id))
    }
  }
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
.song-cover { width: 38px; height: 38px; border-radius: 4px; background: rgba(240,237,230,0.06); flex-shrink: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; font-size: 0.9rem; color: rgba(240,237,230,0.3); }
.song-cover-img { width: 100%; height: 100%; object-fit: cover; }
.pl-toast { position: fixed; bottom: 5rem; left: 50%; transform: translateX(-50%); background: rgba(14,14,24,0.95); border: 1px solid rgba(240,237,230,0.15); border-radius: 6px; padding: 0.6rem 1.2rem; font-size: 0.82rem; color: #f0ede6; z-index: 200; white-space: nowrap; font-family: 'DM Sans', sans-serif; }
.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }
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

.song-remove {
  background: none; border: none; color: rgba(240,237,230,0.15);
  cursor: pointer; font-size: 0.7rem; padding: 0.2rem 0.4rem;
  transition: color 0.2s; flex-shrink: 0; opacity: 0;
}
.song-row:hover .song-remove { opacity: 1; }
.song-remove:hover { color: #ff5a32; }

.loading-state {
  position: relative; z-index: 1;
  display: flex; gap: 0.5rem; justify-content: center; padding: 3rem;
}
.load-dot {
  width: 8px; height: 8px; border-radius: 50%; background: #5b6aff;
  animation: loadBounce 0.7s ease-in-out infinite;
}
.load-dot:nth-child(2) { animation-delay: 0.15s; }
.load-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes loadBounce { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-8px); opacity: 1; } }

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