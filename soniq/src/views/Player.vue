<template>
  <div class="player-page">
    <div class="bg-noise"></div>

    <!-- Ambient cover glow -->
    <div class="cover-glow" :style="{ background: `radial-gradient(ellipse 70% 50% at 50% 0%, ${accentColor}22 0%, transparent 70%)` }"></div>

    <!-- Werbebanner oben -->
    <div class="ad-banner">
      <span class="ad-label">Anzeige</span>
      <slot name="ad-top">
        <div class="ad-placeholder">Advertisement</div>
      </slot>
    </div>

    <!-- Back -->
    <button class="back-btn" @click="router.push('/')">← Zurück</button>

    <!-- Cover -->
    <div class="cover-wrap">
      <div class="cover" :class="{ playing: isPlaying }">
        <div class="cover-inner" :style="{ background: coverGradient }">
          <span class="cover-icon">{{ song.icon }}</span>
        </div>
        <div class="cover-shadow"></div>
      </div>
    </div>

    <!-- Song info -->
    <div class="song-info">
      <h1 class="song-title">{{ song.name }}</h1>
      <span class="song-sep">—</span>
      <span class="song-artist">{{ song.artist }}</span>
    </div>

    <!-- Progress section -->
    <div class="progress-section">

      <!-- Duration + Chat row -->
      <div class="progress-meta">
        <span class="time-current">{{ formatTime(currentTime) }}</span>
        <div class="meta-right">
          <span class="time-total">{{ formatTime(song.duration) }}</span>
          <button class="chat-btn" title="Chat">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </button>
        </div>
      </div>

      <!-- Scrubber -->
      <div
        class="scrubber"
        ref="scrubberRef"
        @mousedown="startScrub"
        @touchstart.prevent="startScrub"
      >
        <div class="scrubber-track">
          <div class="scrubber-fill" :style="{ width: progressPct + '%', background: accentColor }"></div>
        </div>
        <div
          class="scrubber-dot"
          :style="{ left: progressPct + '%', background: accentColor, boxShadow: `0 0 10px ${accentColor}88` }"
        ></div>
      </div>
    </div>

    <!-- Controls -->
    <div class="controls">

      <!-- € tip button -->
      <button class="ctrl-btn ctrl-tip" title="Tip the artist">
        <span class="tip-symbol">€</span>
      </button>

      <!-- Previous -->
      <button class="ctrl-btn ctrl-skip" title="Vorheriger Song" @click="prevSong">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
        </svg>
      </button>

      <!-- Play / Pause -->
      <button class="ctrl-btn ctrl-play" :style="{ '--accent': accentColor }" @click="togglePlay">
        <transition name="icon-switch" mode="out-in">
          <svg v-if="isPlaying" key="pause" width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
          <svg v-else key="play" width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
        </transition>
      </button>

      <!-- Next -->
      <button class="ctrl-btn ctrl-skip" title="Nächster Song" @click="nextSong">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 18l8.5-6L6 6v12zm9-12v12h2V6h-2z"/>
        </svg>
      </button>

      <!-- Heart / Favourite -->
      <button class="ctrl-btn ctrl-heart" :class="{ liked: isLiked }" @click="isLiked = !isLiked" title="Favorit">
        <svg width="20" height="20" viewBox="0 0 24 24" :fill="isLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

// Demo song data
const song = ref({
  name:     'Kiara',
  artist:   'Bonobo',
  duration: 237,
  icon:     '🌿',
  accent:   '#32c8a0',
})

const coverGradients = [
  'linear-gradient(135deg, #1a2a1a 0%, #0d3d2e 50%, #0a1a12 100%)',
]

const coverGradient = computed(() => coverGradients[0])
const accentColor   = computed(() => song.value.accent)

const currentTime = ref(41)
const isPlaying   = ref(false)
const isLiked     = ref(false)
const scrubberRef = ref(null)

const progressPct = computed(() =>
  Math.min((currentTime.value / song.value.duration) * 100, 100)
)

// Playback ticker
let ticker = null
function togglePlay() {
  isPlaying.value = !isPlaying.value
  if (isPlaying.value) {
    ticker = setInterval(() => {
      if (currentTime.value < song.value.duration) {
        currentTime.value += 1
      } else {
        isPlaying.value = false
        clearInterval(ticker)
      }
    }, 1000)
  } else {
    clearInterval(ticker)
  }
}

function prevSong() { currentTime.value = 0 }
function nextSong() { currentTime.value = 0 }

// Scrubbing
let scrubbing = false
function startScrub(e) {
  scrubbing = true
  moveScrub(e)
  window.addEventListener('mousemove', moveScrub)
  window.addEventListener('mouseup',   endScrub)
  window.addEventListener('touchmove', moveScrub)
  window.addEventListener('touchend',  endScrub)
}
function moveScrub(e) {
  if (!scrubbing || !scrubberRef.value) return
  const rect = scrubberRef.value.getBoundingClientRect()
  const clientX = e.touches ? e.touches[0].clientX : e.clientX
  const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
  currentTime.value = Math.round(pct * song.value.duration)
}
function endScrub() {
  scrubbing = false
  window.removeEventListener('mousemove', moveScrub)
  window.removeEventListener('mouseup',   endScrub)
  window.removeEventListener('touchmove', moveScrub)
  window.removeEventListener('touchend',  endScrub)
}

function formatTime(s) {
  const m = Math.floor(s / 60)
  const sec = String(s % 60).padStart(2, '0')
  return `${m}:${sec}`
}

onUnmounted(() => { clearInterval(ticker) })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.player-page {
  min-height: 100vh;
  background: #080b0a;
  color: #f0ede6;
  font-family: 'DM Sans', sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 1.5rem 3rem;
  position: relative;
  overflow-x: hidden;
}

.bg-noise {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  background-size: 180px; opacity: 0.7;
}
.cover-glow {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  transition: background 1s ease;
}

/* ── Ad Banner ── */
.ad-banner {
  position: relative; z-index: 1;
  width: 100%; max-width: 728px; min-height: 90px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border-bottom: 1px solid rgba(240,237,230,0.07);
  padding: 0.75rem 0; margin-bottom: 0.5rem;
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
  color: rgba(240,237,230,0.3); font-family: 'DM Sans', sans-serif;
  font-size: 0.78rem; letter-spacing: 0.1em;
  padding: 0.4rem 0; margin-bottom: 1.5rem; transition: color 0.2s;
}
.back-btn:hover { color: #32c8a0; }

/* ── Cover ── */
.cover-wrap {
  position: relative; z-index: 1;
  margin-bottom: 2.2rem;
  animation: coverDrop 0.7s cubic-bezier(0.34,1.3,0.64,1) both;
}
.cover {
  position: relative;
  width: min(280px, 72vw);
  aspect-ratio: 1;
  border-radius: 8px;
  transition: transform 0.4s ease;
}
.cover.playing {
  animation: floatPulse 3s ease-in-out infinite;
}
.cover-inner {
  width: 100%; height: 100%;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 4.5rem;
  box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 2px 0 rgba(255,255,255,0.04) inset;
}
.cover-shadow {
  position: absolute; bottom: -18px; left: 10%; right: 10%;
  height: 30px; border-radius: 50%;
  background: rgba(0,0,0,0.4);
  filter: blur(14px);
  z-index: -1;
}

/* ── Song Info ── */
.song-info {
  position: relative; z-index: 1;
  display: flex; align-items: baseline; gap: 0.5rem;
  margin-bottom: 2rem;
  animation: fadeUp 0.5s 0.15s ease both;
  max-width: 340px;
  flex-wrap: wrap; justify-content: center; text-align: center;
}
.song-title {
  font-family: 'Bebas Neue', cursive;
  font-size: 2rem; letter-spacing: 0.1em; color: #f0ede6;
  line-height: 1;
}
.song-sep {
  color: rgba(240,237,230,0.25); font-size: 1.1rem;
}
.song-artist {
  font-size: 0.9rem; font-weight: 300;
  color: rgba(240,237,230,0.5); letter-spacing: 0.06em;
}

/* ── Progress ── */
.progress-section {
  position: relative; z-index: 1;
  width: 100%; max-width: 380px;
  margin-bottom: 2.5rem;
  animation: fadeUp 0.5s 0.22s ease both;
}

.progress-meta {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 0.65rem;
}
.time-current {
  font-size: 0.72rem; letter-spacing: 0.08em;
  color: rgba(240,237,230,0.35); font-variant-numeric: tabular-nums;
}
.meta-right {
  display: flex; align-items: center; gap: 0.75rem;
}
.time-total {
  font-size: 0.72rem; letter-spacing: 0.08em;
  color: rgba(240,237,230,0.35); font-variant-numeric: tabular-nums;
}

/* Chat button */
.chat-btn {
  background: rgba(240,237,230,0.06);
  border: 1px solid rgba(240,237,230,0.1);
  border-radius: 6px; padding: 0.35rem 0.45rem;
  color: rgba(240,237,230,0.45); cursor: pointer;
  display: flex; align-items: center;
  transition: color 0.2s, border-color 0.2s, background 0.2s;
  line-height: 0;
}
.chat-btn:hover {
  color: #f0ede6;
  border-color: rgba(240,237,230,0.25);
  background: rgba(240,237,230,0.1);
}

/* Scrubber */
.scrubber {
  position: relative; height: 20px;
  display: flex; align-items: center;
  cursor: pointer;
}
.scrubber-track {
  position: absolute; left: 0; right: 0; height: 3px;
  background: rgba(240,237,230,0.1); border-radius: 99px; overflow: hidden;
}
.scrubber-fill {
  height: 100%; border-radius: 99px;
  transition: width 0.25s linear;
}
.scrubber-dot {
  position: absolute;
  width: 13px; height: 13px; border-radius: 50%;
  transform: translateX(-50%);
  transition: left 0.25s linear, transform 0.15s ease;
  cursor: grab;
  top: 50%; margin-top: -6.5px;
}
.scrubber:hover .scrubber-dot { transform: translateX(-50%) scale(1.3); }
.scrubber:active .scrubber-dot { cursor: grabbing; }

/* ── Controls ── */
.controls {
  position: relative; z-index: 1;
  display: flex; align-items: center; gap: 0.5rem;
  animation: fadeUp 0.5s 0.3s ease both;
}

.ctrl-btn {
  background: none; border: none; cursor: pointer;
  color: rgba(240,237,230,0.55);
  border-radius: 50%; display: flex; align-items: center; justify-content: center;
  transition: color 0.2s, transform 0.15s, background 0.2s;
  padding: 0.55rem;
}
.ctrl-btn:hover { color: #f0ede6; transform: scale(1.1); }
.ctrl-btn:active { transform: scale(0.94); }

/* Tip */
.ctrl-tip {
  background: rgba(240,237,230,0.05);
  border: 1px solid rgba(240,237,230,0.1) !important;
  border-radius: 8px !important;
  padding: 0.45rem 0.7rem !important;
  font-size: 0.78rem; letter-spacing: 0.05em;
  color: rgba(240,237,230,0.4);
}
.ctrl-tip:hover {
  background: rgba(240,200,50,0.1) !important;
  border-color: rgba(240,200,50,0.3) !important;
  color: #f0c832 !important;
}
.tip-symbol { font-size: 1rem; font-weight: 600; line-height: 1; }

/* Skip buttons */
.ctrl-skip { color: rgba(240,237,230,0.5); }

/* Play button */
.ctrl-play {
  width: 62px; height: 62px;
  background: var(--accent);
  color: #080b0a !important;
  border-radius: 50% !important;
  box-shadow: 0 0 28px var(--accent), 0 4px 16px rgba(0,0,0,0.4);
  margin: 0 0.35rem;
  transition: transform 0.15s, box-shadow 0.2s !important;
}
.ctrl-play:hover {
  transform: scale(1.08) !important;
  box-shadow: 0 0 40px var(--accent), 0 6px 20px rgba(0,0,0,0.5) !important;
}
.ctrl-play:active { transform: scale(0.96) !important; }

/* Heart */
.ctrl-heart { color: rgba(240,237,230,0.35); }
.ctrl-heart.liked { color: #ff5a32 !important; }
.ctrl-heart.liked:hover { color: #ff7a52 !important; }

/* icon transition */
.icon-switch-enter-active, .icon-switch-leave-active { transition: opacity 0.12s, transform 0.12s; }
.icon-switch-enter-from { opacity: 0; transform: scale(0.7); }
.icon-switch-leave-to   { opacity: 0; transform: scale(1.2); }

/* ── Keyframes ── */
@keyframes coverDrop {
  from { opacity: 0; transform: translateY(-20px) scale(0.92); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes floatPulse {
  0%, 100% { transform: translateY(0px); }
  50%       { transform: translateY(-6px); }
}

@media (max-width: 420px) {
  .song-title { font-size: 1.6rem; }
  .ctrl-play  { width: 54px; height: 54px; }
}
</style>
