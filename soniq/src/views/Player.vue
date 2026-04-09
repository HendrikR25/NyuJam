<template>
  <div class="player-page">
    <div class="bg-noise"></div>
    <div class="cover-glow" :style="glowStyle"></div>

    <!-- Ad Banner -->
    <AdBanner ad-slot="1918440727" />

    <!-- Dismiss -->
    <button class="dismiss-btn" @click="goBack" aria-label="Schließen">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>

    <!-- Error -->
    <div class="error-bar" v-if="player.error">
      ⚠ {{ player.error }}
    </div>

    <!-- Cover -->
    <div class="cover-wrap">
      <div class="cover" :class="{ playing: player.isPlaying, loading: player.isLoading }">
        <div class="cover-inner" :style="{ background: coverGradient }">
          <img v-if="player.currentSong?.cover && !player.isLoading" :src="player.currentSong.cover" class="cover-img" />
          <span v-else-if="player.isLoading" class="cover-spinner"></span>
          <span v-else class="cover-icon">{{ songIcon }}</span>
        </div>
        <div class="cover-shadow"></div>
      </div>
    </div>

    <!-- Song info -->
    <div class="song-info" v-if="player.currentSong">
      <h1 class="song-title">{{ player.currentSong.name }}</h1>
      <span class="song-sep">—</span>
      <button class="song-artist-btn" @click="router.push(`/artist/${encodeURIComponent(player.currentSong.artist)}`)">
        {{ player.currentSong.artist }}
      </button>
    </div>
    <div class="song-info song-info--empty" v-else>
      <span class="song-artist">Kein Song ausgewählt</span>
    </div>

    <!-- Progress -->
    <div class="progress-section">
      <div class="progress-meta">
        <span class="time-current">{{ player.formatTime(player.currentTime) }}</span>
        <div class="meta-right">
          <span class="time-total">{{ player.formatTime(player.duration) }}</span>
          <button class="chat-btn" title="Chat" @click="router.push('/chats')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
      </div>

      <!-- Scrubber -->
      <div class="scrubber" ref="scrubberRef" @mousedown="startScrub" @touchstart.prevent="startScrub">
        <div class="scrubber-track">
          <div class="scrubber-fill" :style="{ width: player.progressPct + '%' }"></div>
        </div>
        <div class="scrubber-dot" :style="{ left: player.progressPct + '%' }"></div>
      </div>
    </div>

    <!-- Controls -->
    <div class="controls">
      <button class="ctrl-btn ctrl-tip" title="Tip the artist" @click="router.push('/donation')">
        <span class="tip-symbol">€</span>
      </button>

      <button class="ctrl-btn ctrl-skip" @click="player.prev()" :disabled="!player.hasPrev">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
      </button>

      <button class="ctrl-btn ctrl-play" @click="player.togglePlay()">
        <transition name="icon-switch" mode="out-in">
          <svg v-if="player.isPlaying" key="pause" width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          <svg v-else key="play" width="26" height="26" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </transition>
      </button>

      <button class="ctrl-btn ctrl-skip" @click="player.next()" :disabled="!player.hasNext">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm9-12v12h2V6h-2z"/></svg>
      </button>

      <button class="ctrl-btn ctrl-heart" :class="{ liked: player.isLiked }" @click="player.toggleLike()">
        <svg width="20" height="20" viewBox="0 0 24 24" :fill="player.isLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
      </button>

      <!-- Three dots menu -->
      <div class="more-wrap" ref="moreWrapRef">
        <button class="ctrl-btn ctrl-more" @click="toggleMenu" title="Mehr">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5"  cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
          </svg>
        </button>

        <transition name="menu-pop">
          <div class="more-menu" v-if="menuOpen">
            <!-- Zu Lieblingssongs -->
            <button class="menu-item" @click="addToFavorites">
              <svg width="15" height="15" viewBox="0 0 24 24" :fill="player.isLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              <span>{{ player.isLiked ? 'Aus Lieblingssongs entfernen' : 'Zu Lieblingssongs' }}</span>
            </button>

            <!-- Zu Playlist hinzufügen -->
            <button class="menu-item" @click="showPlaylistSub = !showPlaylistSub">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              <span>Zu Playlist hinzufügen</span>
              <span class="menu-arrow" :class="{ open: showPlaylistSub }">›</span>
            </button>

            <!-- Playlist sub-list -->
            <transition name="sub-expand">
              <div class="menu-sub" v-if="showPlaylistSub">
                <div class="menu-sub-loading" v-if="playlistsStore.loading">Lade...</div>
                <div class="menu-sub-empty" v-else-if="!playlistsStore.playlists.length">
                  Noch keine Playlists
                </div>
                <button
                  v-for="pl in playlistsStore.playlists"
                  :key="pl.id"
                  class="menu-sub-item"
                  :class="{ added: pl.songs?.some(s => String(s.id) === String(player.currentSong?.id)) }"
                  @click="addToPlaylist(pl)"
                >
                  <span class="msi-icon" :style="{ background: pl.color + '33' }">{{ pl.icon }}</span>
                  <span class="msi-name">{{ pl.name }}</span>
                  <span class="msi-check" v-if="pl.songs?.some(s => String(s.id) === String(player.currentSong?.id))">✓</span>
                </button>
              </div>
            </transition>

            <div class="menu-divider"></div>

            <!-- Zum Künstler -->
            <button class="menu-item" @click="goToArtist" :disabled="!player.currentSong">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              <span>Zum Künstler</span>
            </button>

            <!-- Delete song (own songs or admin) -->
            <template v-if="canDeleteSong">
              <div class="menu-divider"></div>
              <button class="menu-item menu-item--danger" @click="deleteSong">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                <span>Song löschen</span>
              </button>
            </template>
          </div>
        </transition>
      </div>
    </div>

    <!-- Feedback toast -->
    <transition name="toast-fade">
      <div class="feedback-toast" v-if="feedbackMsg">{{ feedbackMsg }}</div>
    </transition>

    <!-- Song list (if songs loaded) -->
    <div class="song-list" v-if="player.songs.length">
      <h2 class="sl-title">Alle Songs</h2>
      <div
        v-for="(song, idx) in player.songs"
        :key="song.id"
        class="sl-row"
        :class="{ active: player.currentSong?.id === song.id }"
        :style="{ '--i': idx }"
        @click="player.play(song)"
      >
        <div class="sl-num">
          <span v-if="player.currentSong?.id === song.id && player.isPlaying" class="sl-wave">
            <span></span><span></span><span></span>
          </span>
          <span v-else class="sl-idx">{{ idx + 1 }}</span>
        </div>
        <div class="sl-cover">
          <img v-if="song.cover" :src="song.cover" class="sl-cover-img" />
          <span v-else class="sl-cover-icon">♩</span>
        </div>
        <div class="sl-info">
          <span class="sl-name">{{ song.name }}</span>
          <span class="sl-artist">{{ song.artist }}</span>
        </div>
      </div>
    </div>

    <!-- No songs / server offline -->
    <div class="no-songs" v-else-if="!player.isLoading && !player.error">
      <p>Keine Songs gefunden.</p>
      <p class="no-songs-hint">Lege MP3s in <code>server/music/</code> ab und starte den Server.</p>
    </div>

  </div>
</template>

<script setup>
import AdBanner from '@/components/AdBanner.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistsStore } from '@/stores/playlists'
import { useAuthStore } from '@/stores/auth'

const router         = useRouter()
const route          = useRoute()
const player         = usePlayerStore()
const playlistsStore = usePlaylistsStore()
const auth           = useAuthStore()

onMounted(() => {
  if (!player.songs.length)             player.loadSongs()
  if (!player.likedSongs.length)        player.loadFavorites()
  if (!playlistsStore.playlists.length) playlistsStore.load()
  // Always update fromRoute based on current navigation context
  player.fromRoute = route.query.from ? `/${route.query.from}` : '/'
  document.addEventListener('click', onClickOutside)
})
onUnmounted(() => document.removeEventListener('click', onClickOutside))

function goBack() {
  router.replace(player.fromRoute || '/')
}

// ── Three-dots menu ────────────────────────────────
const menuOpen        = ref(false)
const showPlaylistSub = ref(false)
const moreWrapRef     = ref(null)
const feedbackMsg    = ref('')

function toggleMenu() {
  menuOpen.value = !menuOpen.value
  if (!menuOpen.value) showPlaylistSub.value = false
}

function onClickOutside(e) {
  if (moreWrapRef.value && !moreWrapRef.value.contains(e.target)) {
    menuOpen.value       = false
    showPlaylistSub.value = false
  }
}

function addToFavorites() {
  player.toggleLike()
  showFeedback(player.isLiked ? '♥ Zu Lieblingssongs hinzugefügt' : 'Aus Lieblingssongs entfernt')
  menuOpen.value = false
}

function goToArtist() {
  if (!player.currentSong) return
  menuOpen.value = false
  router.push(`/artist/${encodeURIComponent(player.currentSong.artist)}`)
}

// Only show delete for R2-uploaded songs (id starts with u_) where user is artist or admin
const canDeleteSong = computed(() => {
  if (!auth.isLoggedIn || !player.currentSong) return false
  const song = player.currentSong
  if (!String(song.id).startsWith('u_')) return false  // local MP3s can't be deleted
  const isAdmin  = auth.user?.isAdmin === true
  const isArtist = auth.user?.username?.toLowerCase() === song.artist?.toLowerCase()
  return isAdmin || isArtist
})

async function deleteSong() {
  if (!player.currentSong) return
  if (!confirm(`„${player.currentSong.name}" wirklich löschen?`)) return
  menuOpen.value = false
  try {
    await player.deleteSong(player.currentSong.id)
    showFeedback('✓ Song gelöscht')
    player.next()
  } catch (e) {
    showFeedback(`⚠ ${e.message}`)
  }
}

async function addToPlaylist(pl) {
  if (!player.currentSong) return
  // Check if song is already in this playlist
  const alreadyIn = pl.songs?.some(s => String(s.id) === String(player.currentSong.id))
  if (alreadyIn) { showFeedback('Song bereits in dieser Playlist'); return }
  try {
    await playlistsStore.addSong(pl.id, player.currentSong)
    showFeedback(`✓ Zu „${pl.name}" hinzugefügt`)
  } catch {
    showFeedback('Song bereits in dieser Playlist')
  }
}

let feedbackTimer = null
function showFeedback(msg) {
  feedbackMsg.value = msg
  clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(() => { feedbackMsg.value = '' }, 2500)
}

// ── Cover visuals ──────────────────────────────────
const coverGradients = [
  'linear-gradient(135deg, #1a2a1a 0%, #0d3d2e 50%, #0a1a12 100%)',
  'linear-gradient(135deg, #1a1a2e 0%, #0d1b3e 50%, #0a0a1a 100%)',
  'linear-gradient(135deg, #2e1a1a 0%, #3d0d0d 50%, #1a0a0a 100%)',
  'linear-gradient(135deg, #2a1a2e 0%, #1d0d3d 50%, #0e0a1a 100%)',
  'linear-gradient(135deg, #2a2a1a 0%, #3d3d0d 50%, #1a1a0a 100%)',
]
const accentColors = ['#32c8a0','#5b6aff','#ff5a32','#c864f0','#f0c832']

const songIndex    = computed(() => player.currentIndex)
const coverGradient = computed(() => coverGradients[songIndex.value % coverGradients.length])
const accentColor  = computed(() => accentColors[songIndex.value % accentColors.length])
const songIcon     = computed(() => ['🌿','◈','⚡','🌙','◎','⊹','◇','🌊'][songIndex.value % 8])

const glowStyle = computed(() => ({
  background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${accentColor.value}22 0%, transparent 70%)`,
}))

// ── Scrubber ───────────────────────────────────────
const scrubberRef = ref(null)
let scrubbing     = false

function startScrub(e) {
  scrubbing = true
  moveScrub(e)
  window.addEventListener('mousemove', moveScrub)
  window.addEventListener('mouseup',   endScrub)
  window.addEventListener('touchmove', moveScrub, { passive: false })
  window.addEventListener('touchend',  endScrub)
}
function moveScrub(e) {
  if (!scrubbing || !scrubberRef.value) return
  e.preventDefault()
  const rect    = scrubberRef.value.getBoundingClientRect()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const pct     = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100))
  player.seekByPct(pct)
}
function endScrub() {
  scrubbing = false
  window.removeEventListener('mousemove', moveScrub)
  window.removeEventListener('mouseup',   endScrub)
  window.removeEventListener('touchmove', moveScrub)
  window.removeEventListener('touchend',  endScrub)
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.player-page {
  min-height: 100vh; background: #080b0a; color: #f0ede6;
  font-family: 'DM Sans', sans-serif;
  display: flex; flex-direction: column; align-items: center;
  padding: 0 1.5rem 3rem; position: relative; overflow-x: hidden;
}
.bg-noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size: 180px; opacity: 0.7; }
.cover-glow { position: fixed; inset: 0; pointer-events: none; z-index: 0; transition: background 1s ease; }

/* Ad */
.ad-banner { position: relative; z-index: 1; width: 100%; max-width: 728px; min-height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 1px solid rgba(240,237,230,0.07); padding: 0.75rem 0; margin-bottom: 0.5rem; }
.ad-label { position: absolute; top: 4px; left: 0; font-size: 0.6rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.2); }
.ad-placeholder { width: 100%; max-width: 728px; height: 90px; background: rgba(240,237,230,0.03); border: 1px dashed rgba(240,237,230,0.1); border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,237,230,0.15); }

/* Dismiss */
.dismiss-btn { position: relative; z-index: 1; background: none; border: none; cursor: pointer; color: rgba(240,237,230,0.25); padding: 0.5rem; margin-bottom: 0.5rem; margin-top: 0.25rem; transition: color 0.2s, transform 0.2s; display: flex; align-items: center; justify-content: center; }
.dismiss-btn:hover { color: rgba(240,237,230,0.6); transform: translateY(-2px); }

/* Error */
.error-bar { position: relative; z-index: 1; width: 100%; max-width: 420px; background: rgba(255,90,50,0.1); border: 1px solid rgba(255,90,50,0.3); border-radius: 4px; padding: 0.6rem 1rem; font-size: 0.78rem; color: #ff8060; margin-bottom: 1rem; text-align: center; }

/* Cover */
.cover-wrap { position: relative; z-index: 1; margin-bottom: 2.2rem; animation: coverDrop 0.7s cubic-bezier(0.34,1.3,0.64,1) both; }
.cover { position: relative; width: min(280px, 72vw); aspect-ratio: 1; border-radius: 8px; }
.cover.playing { animation: floatPulse 3s ease-in-out infinite; }
.cover.loading { animation: none; }
.cover-inner { width: 100%; height: 100%; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 4.5rem; box-shadow: 0 24px 60px rgba(0,0,0,0.6); overflow: hidden; }
.cover-img { width: 100%; height: 100%; object-fit: cover; }
.cover-icon { }
.cover-spinner { width: 40px; height: 40px; border: 3px solid rgba(240,237,230,0.1); border-top-color: rgba(240,237,230,0.6); border-radius: 50%; animation: spin 0.8s linear infinite; }
.cover-shadow { position: absolute; bottom: -18px; left: 10%; right: 10%; height: 30px; border-radius: 50%; background: rgba(0,0,0,0.4); filter: blur(14px); z-index: -1; }

/* Song info */
.song-info { position: relative; z-index: 1; display: flex; align-items: baseline; gap: 0.5rem; margin-bottom: 2rem; animation: fadeUp 0.5s 0.15s ease both; max-width: 340px; flex-wrap: wrap; justify-content: center; text-align: center; }
.song-info--empty { opacity: 0.4; }
.song-title { font-family: 'Bebas Neue', cursive; font-size: 2rem; letter-spacing: 0.1em; color: #f0ede6; line-height: 1; }
.song-sep { color: rgba(240,237,230,0.25); font-size: 1.1rem; }
.song-artist-btn {
  background: none; border: none; cursor: pointer;
  font-size: 0.9rem; font-weight: 300;
  color: rgba(240,237,230,0.5); letter-spacing: 0.06em;
  font-family: 'DM Sans', sans-serif;
  padding: 0; transition: color 0.2s;
  text-decoration: underline; text-underline-offset: 3px;
  text-decoration-color: rgba(240,237,230,0.2);
}
.song-artist-btn:hover { color: #f0ede6; text-decoration-color: rgba(240,237,230,0.5); }

/* Progress */
.progress-section { position: relative; z-index: 1; width: 100%; max-width: 380px; margin-bottom: 2.5rem; animation: fadeUp 0.5s 0.22s ease both; }
.progress-meta { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.65rem; }
.time-current, .time-total { font-size: 0.72rem; letter-spacing: 0.08em; color: rgba(240,237,230,0.35); font-variant-numeric: tabular-nums; }
.meta-right { display: flex; align-items: center; gap: 0.75rem; }
.chat-btn { background: rgba(240,237,230,0.06); border: 1px solid rgba(240,237,230,0.1); border-radius: 6px; padding: 0.35rem 0.45rem; color: rgba(240,237,230,0.45); cursor: pointer; display: flex; align-items: center; transition: color 0.2s, border-color 0.2s; line-height: 0; }
.chat-btn:hover { color: #f0ede6; border-color: rgba(240,237,230,0.25); }

.scrubber { position: relative; height: 20px; display: flex; align-items: center; cursor: pointer; }
.scrubber-track { position: absolute; left: 0; right: 0; height: 3px; background: rgba(240,237,230,0.1); border-radius: 99px; overflow: hidden; }
.scrubber-fill { height: 100%; background: #32c8a0; border-radius: 99px; transition: width 0.25s linear; }
.scrubber-dot { position: absolute; width: 13px; height: 13px; border-radius: 50%; background: #32c8a0; transform: translateX(-50%); top: 50%; margin-top: -6.5px; transition: left 0.25s linear; box-shadow: 0 0 8px #32c8a055; }
.scrubber:hover .scrubber-dot { transform: translateX(-50%) scale(1.3); }

/* Controls */
.controls { position: relative; z-index: 1; display: flex; align-items: center; gap: 0.5rem; animation: fadeUp 0.5s 0.3s ease both; margin-bottom: 2.5rem; }
.ctrl-btn { background: none; border: none; cursor: pointer; color: rgba(240,237,230,0.55); border-radius: 50%; display: flex; align-items: center; justify-content: center; transition: color 0.2s, transform 0.15s; padding: 0.55rem; }
.ctrl-btn:hover:not(:disabled) { color: #f0ede6; transform: scale(1.1); }
.ctrl-btn:active:not(:disabled) { transform: scale(0.94); }
.ctrl-btn:disabled { opacity: 0.25; cursor: default; }
.ctrl-tip { background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.1) !important; border-radius: 8px !important; padding: 0.45rem 0.7rem !important; font-size: 0.78rem; color: rgba(240,237,230,0.4); }
.ctrl-tip:hover { background: rgba(240,200,50,0.1) !important; border-color: rgba(240,200,50,0.3) !important; color: #f0c832 !important; }
.tip-symbol { font-size: 1rem; font-weight: 600; line-height: 1; }
.ctrl-play { width: 62px; height: 62px; background: #32c8a0; color: #080b0a !important; border-radius: 50% !important; box-shadow: 0 0 28px #32c8a055; margin: 0 0.35rem; }
.ctrl-play:hover { transform: scale(1.08) !important; box-shadow: 0 0 40px #32c8a088 !important; }
.ctrl-heart { color: rgba(240,237,230,0.35); }
.ctrl-heart.liked { color: #ff5a32 !important; }

/* ── Three-dots menu ── */
.more-wrap { position: relative; }
.ctrl-more { color: rgba(240,237,230,0.4) !important; }
.ctrl-more:hover { color: #f0ede6 !important; }

.more-menu {
  position: absolute; bottom: calc(100% + 10px); right: 0;
  min-width: 230px;
  background: #121218;
  border: 1px solid rgba(240,237,230,0.12);
  border-radius: 8px;
  padding: 0.4rem 0;
  z-index: 100;
  box-shadow: 0 8px 32px rgba(0,0,0,0.6);
}

.menu-item {
  display: flex; align-items: center; gap: 0.7rem;
  width: 100%; background: none; border: none; cursor: pointer;
  color: rgba(240,237,230,0.7); font-family: 'DM Sans', sans-serif;
  font-size: 0.82rem; padding: 0.65rem 1rem;
  transition: background 0.15s, color 0.15s; text-align: left;
}
.menu-item:hover { background: rgba(240,237,230,0.06); color: #f0ede6; }
.menu-item--disabled { opacity: 0.4; cursor: default; }
.menu-item--disabled:hover { background: none; color: rgba(240,237,230,0.7); }
.menu-item--danger { color: rgba(255,90,50,0.7) !important; }
.menu-item--danger:hover { background: rgba(255,90,50,0.08) !important; color: #ff5a32 !important; }
.menu-arrow { margin-left: auto; font-size: 1rem; color: rgba(240,237,230,0.3); transition: transform 0.2s; }
.menu-arrow.open { transform: rotate(90deg); }
.menu-soon { margin-left: auto; font-size: 0.58rem; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(240,237,230,0.25); background: rgba(240,237,230,0.06); border-radius: 3px; padding: 0.1rem 0.38rem; }
.menu-divider { height: 1px; background: rgba(240,237,230,0.07); margin: 0.3rem 0; }

/* Playlist sub-list */
.menu-sub { background: rgba(0,0,0,0.2); border-top: 1px solid rgba(240,237,230,0.07); max-height: 180px; overflow-y: auto; }
.menu-sub::-webkit-scrollbar { width: 3px; }
.menu-sub::-webkit-scrollbar-thumb { background: rgba(240,237,230,0.1); }
.menu-sub-loading, .menu-sub-empty { font-size: 0.72rem; color: rgba(240,237,230,0.3); padding: 0.6rem 1rem; }

.menu-sub-item {
  display: flex; align-items: center; gap: 0.6rem;
  width: 100%; background: none; border: none; cursor: pointer;
  color: rgba(240,237,230,0.6); font-family: 'DM Sans', sans-serif;
  font-size: 0.78rem; padding: 0.55rem 1rem 0.55rem 1.2rem;
  transition: background 0.15s, color 0.15s;
}
.menu-sub-item:hover { background: rgba(240,237,230,0.05); color: #f0ede6; }
.menu-sub-item.added { color: #32c8a0; }
.msi-icon { width: 24px; height: 24px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 0.85rem; flex-shrink: 0; }
.msi-name { flex: 1; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.msi-check { color: #32c8a0; font-size: 0.75rem; flex-shrink: 0; }

/* Feedback toast */
.feedback-toast {
  position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
  background: rgba(18,18,28,0.95); border: 1px solid rgba(240,237,230,0.15);
  border-radius: 99px; padding: 0.55rem 1.3rem;
  font-size: 0.8rem; color: #f0ede6; letter-spacing: 0.04em;
  z-index: 500; white-space: nowrap;
  box-shadow: 0 4px 20px rgba(0,0,0,0.5);
}
.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.toast-fade-enter-from { opacity: 0; transform: translateX(-50%) translateY(8px); }
.toast-fade-leave-to   { opacity: 0; transform: translateX(-50%) translateY(8px); }

/* Menu transitions */
.menu-pop-enter-active, .menu-pop-leave-active { transition: opacity 0.18s, transform 0.18s; }
.menu-pop-enter-from, .menu-pop-leave-to { opacity: 0; transform: scale(0.95) translateY(4px); }
.sub-expand-enter-active, .sub-expand-leave-active { transition: max-height 0.25s ease, opacity 0.2s; overflow: hidden; }
.sub-expand-enter-from, .sub-expand-leave-to { max-height: 0; opacity: 0; }
.sub-expand-enter-to, .sub-expand-leave-from { max-height: 200px; opacity: 1; }

/* Song list */
.song-list { position: relative; z-index: 1; width: 100%; max-width: 420px; }
.sl-title { font-family: 'Bebas Neue', cursive; font-size: 0.9rem; letter-spacing: 0.18em; color: rgba(240,237,230,0.3); margin-bottom: 0.75rem; }
.sl-row { display: flex; align-items: center; gap: 0.9rem; padding: 0.7rem 0.6rem; border-radius: 3px; cursor: pointer; opacity: 0; transform: translateY(5px); animation: slideUp 0.35s ease forwards; animation-delay: calc(var(--i) * 35ms); border-bottom: 1px solid rgba(240,237,230,0.04); transition: background 0.15s; }
.sl-row:hover { background: rgba(240,237,230,0.04); }
.sl-row.active { background: rgba(50,200,160,0.06); }
.sl-num { width: 24px; flex-shrink: 0; text-align: center; }
.sl-idx { font-size: 0.72rem; color: rgba(240,237,230,0.22); }
.sl-wave { display: flex; align-items: flex-end; gap: 1.5px; height: 14px; justify-content: center; }
.sl-wave span { display: block; width: 2.5px; border-radius: 2px; background: #32c8a0; animation: waveBar 0.7s ease-in-out infinite; }
.sl-wave span:nth-child(2) { animation-delay: 0.15s; }
.sl-wave span:nth-child(3) { animation-delay: 0.3s; height: 8px; }
.sl-cover { width: 36px; height: 36px; border-radius: 4px; overflow: hidden; flex-shrink: 0; background: rgba(240,237,230,0.05); display: flex; align-items: center; justify-content: center; }
.sl-cover-img { width: 100%; height: 100%; object-fit: cover; }
.sl-cover-icon { font-size: 0.9rem; color: rgba(240,237,230,0.2); }
.sl-info { flex: 1; display: flex; flex-direction: column; gap: 0.12rem; min-width: 0; }
.sl-name { font-size: 0.88rem; font-weight: 500; color: #f0ede6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sl-row.active .sl-name { color: #32c8a0; }
.sl-artist { font-size: 0.68rem; color: rgba(240,237,230,0.32); }

.no-songs { position: relative; z-index: 1; text-align: center; color: rgba(240,237,230,0.3); padding: 2rem; }
.no-songs-hint { font-size: 0.75rem; margin-top: 0.5rem; color: rgba(240,237,230,0.2); }
.no-songs-hint code { background: rgba(240,237,230,0.08); border-radius: 3px; padding: 0.1rem 0.35rem; }

/* Transitions */
.icon-switch-enter-active, .icon-switch-leave-active { transition: opacity 0.12s, transform 0.12s; }
.icon-switch-enter-from { opacity: 0; transform: scale(0.7); }
.icon-switch-leave-to   { opacity: 0; transform: scale(1.2); }

@keyframes coverDrop { from { opacity: 0; transform: translateY(-20px) scale(0.92); } to { opacity: 1; transform: translateY(0) scale(1); } }
@keyframes fadeUp    { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes floatPulse { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
@keyframes slideUp   { to { opacity: 1; transform: translateY(0); } }
@keyframes waveBar   { 0%, 100% { transform: scaleY(0.5); height: 6px; } 50% { transform: scaleY(1.2); height: 12px; } }
@keyframes spin      { to { transform: rotate(360deg); } }
</style>