<template>
  <div class="home">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>

    <!-- Werbebanner oben -->
    <div class="ad-banner">
      <span class="ad-label">Anzeige</span>
      <slot name="ad-top">
        <!-- Hier Werbe-Component oder Skript einfügen -->
        <div class="ad-placeholder">Advertisement</div>
      </slot>
    </div>

    <header class="header">
      <div class="logo">
        <span class="logo-icon">◈</span>
        <span class="logo-text">NyuJam</span>
      </div>
      <div class="header-sub">your universe of sound</div>
      <!-- Profile button -->
      <button class="profile-btn" @click="router.push('/profile')" title="Profil">
        <div class="pb-avatar" v-if="auth.user">
          <img v-if="auth.user.avatar" :src="auth.user.avatar" class="pb-img" />
          <span v-else class="pb-initials">{{ auth.user.username.slice(0,2).toUpperCase() }}</span>
        </div>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </button>
    </header>

    <main class="nav-grid">
      <button
        v-for="(item, index) in navItems"
        :key="item.id"
        class="nav-btn"
        :class="`nav-btn--${item.id}`"
        :style="{ '--delay': `${index * 80}ms` }"
        @mousedown="onBtnMousedown($event, item.id)"
        @mouseup="onBtnMouseup($event, item.id)"
        @mouseleave="onBtnMouseleave(item.id)"
        @touchstart.prevent="onBtnMousedown($event, item.id)"
        @touchend="onBtnMouseup($event, item.id)"
        @mouseenter="hovered = item.id"
      >
        <div class="btn-bg"></div>
        <div class="btn-inner">
          <span class="btn-icon">{{ item.icon }}</span>
          <span class="btn-label">{{ item.label }}</span>
          <span class="btn-arrow">→</span>
        </div>
        <div class="btn-accent" :class="{ active: hovered === item.id }"></div>
        <!-- Hold progress bar (only on playlists) -->
        <div
          v-if="item.id === 'playlists'"
          class="hold-bar"
          :style="{ transform: `scaleX(${holdProgress})` }"
        ></div>
      </button>
    </main>

    <PlaylistWheel
      :open="wheelOpen"
      :origin-x="wheelOriginX"
      :origin-y="wheelOriginY"
      :playlists="playlists"
      @select="onWheelSelect"
      @cancel="onWheelCancel"
    />

    <footer class="footer">
      <button class="now-playing" v-if="player.currentSong" @click="router.push('/player')">
        <span class="np-dot" :class="{ paused: !player.isPlaying }"></span>
        <div class="np-info">
          <span class="np-label">{{ player.isPlaying ? 'now playing' : 'pausiert' }}</span>
          <span class="np-text">{{ player.currentSong.artist }} · {{ player.currentSong.name }}</span>
        </div>
        <span class="np-arrow">▶</span>
      </button>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import PlaylistWheel from '@/components/PlaylistWheel.vue'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistsStore } from '@/stores/playlists'
import { useAuthStore } from '@/stores/auth'

const router  = useRouter()
const player  = usePlayerStore()
const plStore = usePlaylistsStore()
const auth    = useAuthStore()
const hovered = ref(null)

const navItems = [
  { id: 'radio',     icon: '⌇',  label: 'Radio' },
  { id: 'search',    icon: '⊹',  label: 'Suche' },
  { id: 'playlists', icon: '▤',  label: 'Playlists' },
  { id: 'community', icon: '◎',  label: 'Freunde' },
  { id: 'chats',     icon: '⌲',  label: 'Chats' },
  { id: 'donation',  icon: '€',  label: 'Spende' },
]

// ── Playlist Wheel — echte Daten vom Server ──
const favPlaylist = { id: 'favorites', name: 'Lieblingssongs', icon: '♡', color: '#ff5a32' }
const playlists = computed(() => [favPlaylist, ...plStore.playlists])

onMounted(() => {
  if (!plStore.playlists.length) plStore.load()
})

const wheelOpen    = ref(false)
const wheelOriginX = ref(0)
const wheelOriginY = ref(0)
const holdProgress = ref(0)
const selectedPlaylistId = ref(null)

const HOLD_MS = 500
let progressRAF = null
let holdStart   = 0
let didOpenWheel = false

function onBtnMousedown(e, id) {
  if (id !== 'playlists') return
  didOpenWheel = false
  holdProgress.value = 0
  holdStart = performance.now()
  const pos = e.touches ? e.touches[0] : e
  wheelOriginX.value = pos.clientX
  wheelOriginY.value = pos.clientY

  function tick() {
    const elapsed = performance.now() - holdStart
    holdProgress.value = Math.min(elapsed / HOLD_MS, 1)
    if (holdProgress.value < 1) {
      progressRAF = requestAnimationFrame(tick)
    } else {
      didOpenWheel = true
      wheelOpen.value = true
      holdProgress.value = 0
    }
  }
  progressRAF = requestAnimationFrame(tick)
}

function onBtnMouseup(e, id) {
  cancelAnimationFrame(progressRAF)
  holdProgress.value = 0
  // only navigate on short click (no wheel opened)
  if (id !== 'playlists' || !didOpenWheel) {
    navigate(id)
  }
}

function onBtnMouseleave(id) {
  if (id !== 'playlists' || wheelOpen.value) return
  cancelAnimationFrame(progressRAF)
  holdProgress.value = 0
}

function onWheelSelect(id) {
  selectedPlaylistId.value = id
  wheelOpen.value = false
  router.push(`/playlists/${id}`)
}

function onWheelCancel() {
  wheelOpen.value = false
}

function navigate(id) {
  router.push(`/${id}`)
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.home {
  min-height: 100vh;
  background: #0a0a0f;
  color: #f0ede6;
  font-family: 'DM Sans', sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 1.5rem 2rem;
  position: relative;
  overflow: hidden;
}

/* ── Ad Banner ── */
.ad-banner {
  position: relative;
  width: 100%;
  max-width: 728px;
  min-height: 90px;
  margin-bottom: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(240,237,230,0.07);
  padding: 0.75rem 0;
  align-self: center;
}
.ad-label {
  position: absolute;
  top: 4px;
  left: 0;
  font-size: 0.6rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(240,237,230,0.2);
}
.ad-placeholder {
  width: 100%;
  max-width: 728px;
  height: 90px;
  background: rgba(240,237,230,0.03);
  border: 1px dashed rgba(240,237,230,0.1);
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(240,237,230,0.15);
}

/* ── Background ── */
.bg-noise {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  background-size: 180px;
  opacity: 0.6;
}
.bg-glow {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background:
    radial-gradient(ellipse 60% 50% at 20% 30%, rgba(255,90,50,0.08) 0%, transparent 70%),
    radial-gradient(ellipse 50% 60% at 80% 70%, rgba(80,60,255,0.07) 0%, transparent 70%);
}

/* ── Header ── */
.header {
  position: relative; z-index: 1;
  text-align: center;
  margin-bottom: 3.5rem;
  animation: fadeDown 0.6s ease both;
  width: 100%; max-width: 420px;
}
.profile-btn {
  position: absolute; top: 0; right: 0;
  width: 38px; height: 38px; border-radius: 50%;
  background: rgba(240,237,230,0.06);
  border: 1px solid rgba(240,237,230,0.12);
  color: rgba(240,237,230,0.4);
  cursor: pointer; display: flex; align-items: center; justify-content: center;
  transition: all 0.2s;
}
.profile-btn:hover { color: #f0ede6; border-color: rgba(240,237,230,0.25); background: rgba(240,237,230,0.1); }
.pb-avatar { width: 100%; height: 100%; border-radius: 50%; overflow: hidden; display: flex; align-items: center; justify-content: center; }
.pb-img { width: 100%; height: 100%; object-fit: cover; }
.pb-initials { font-size: 0.65rem; font-weight: 700; color: #f0ede6; }
.logo {
  display: flex; align-items: center; gap: 0.5rem;
  justify-content: center;
  margin-bottom: 0.35rem;
}
.logo-icon {
  font-size: 1.8rem;
  color: #ff5a32;
  line-height: 1;
}
.logo-text {
  font-family: 'Bebas Neue', cursive;
  font-size: 2.8rem;
  letter-spacing: 0.18em;
  color: #f0ede6;
  line-height: 1;
}
.header-sub {
  font-size: 0.75rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(240,237,230,0.35);
  font-weight: 300;
}

/* ── Nav Grid ── */
.nav-grid {
  position: relative; z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  width: 100%;
  max-width: 420px;
}

.nav-btn {
  position: relative;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  border-radius: 2px;
  outline: none;
  opacity: 0;
  transform: translateY(12px);
  animation: slideUp 0.5s ease forwards;
  animation-delay: var(--delay);
}

.btn-bg {
  position: absolute; inset: 0;
  background: rgba(240,237,230,0.04);
  border: 1px solid rgba(240,237,230,0.08);
  border-radius: 2px;
  transition: background 0.25s, border-color 0.25s;
}
.nav-btn:hover .btn-bg {
  background: rgba(255,90,50,0.08);
  border-color: rgba(255,90,50,0.3);
}

.btn-inner {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1.1rem 1.5rem;
}

.btn-icon {
  font-size: 1.25rem;
  width: 1.5rem;
  text-align: center;
  color: #ff5a32;
  opacity: 0.8;
  transition: opacity 0.2s, transform 0.2s;
}
.nav-btn:hover .btn-icon {
  opacity: 1;
  transform: scale(1.15);
}

.btn-label {
  font-family: 'Bebas Neue', cursive;
  font-size: 1.55rem;
  letter-spacing: 0.12em;
  color: #f0ede6;
  flex: 1;
  text-align: left;
  transition: color 0.2s;
}
.nav-btn:hover .btn-label {
  color: #fff;
}

.btn-arrow {
  font-size: 0.9rem;
  color: rgba(240,237,230,0.2);
  transition: color 0.2s, transform 0.25s;
}
.nav-btn:hover .btn-arrow {
  color: #ff5a32;
  transform: translateX(4px);
}

.btn-accent {
  position: absolute;
  left: 0; top: 50%;
  transform: translateY(-50%) scaleY(0);
  width: 2px;
  height: 60%;
  background: #ff5a32;
  border-radius: 0 1px 1px 0;
  transition: transform 0.2s ease;
}
.btn-accent.active {
  transform: translateY(-50%) scaleY(1);
}

/* Hold progress bar */
.hold-bar {
  position: absolute; bottom: 0; left: 0;
  width: 100%; height: 2px;
  background: linear-gradient(90deg, #ff5a32, #ff8c55);
  transform-origin: left;
  transform: scaleX(0);
  border-radius: 0 0 2px 2px;
  pointer-events: none;
}

/* ── Footer ── */
.footer {
  position: relative; z-index: 1;
  margin-top: 3rem;
  animation: fadeUp 0.6s 0.5s ease both;
}
.now-playing {
  display: flex; align-items: center; gap: 0.75rem;
  background: rgba(240,237,230,0.04);
  border: 1px solid rgba(240,237,230,0.1);
  border-radius: 99px;
  padding: 0.55rem 1.1rem 0.55rem 0.85rem;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  color: #f0ede6;
  transition: background 0.2s, border-color 0.2s, transform 0.15s;
}
.now-playing:hover {
  background: rgba(255,90,50,0.08);
  border-color: rgba(255,90,50,0.3);
  transform: translateY(-1px);
}
.now-playing:active { transform: scale(0.97); }

.np-dot {
  width: 7px; height: 7px; flex-shrink: 0;
  border-radius: 50%;
  background: #ff5a32;
  animation: pulse 1.6s ease infinite;
}
.np-dot.paused {
  background: rgba(240,237,230,0.3);
  animation: none;
}
.np-info {
  display: flex; flex-direction: column; gap: 0.05rem; text-align: left;
}
.np-label {
  font-size: 0.58rem; letter-spacing: 0.15em;
  text-transform: uppercase; color: rgba(240,237,230,0.3);
  line-height: 1;
}
.np-text {
  font-size: 0.8rem; font-weight: 500;
  color: rgba(240,237,230,0.75);
  letter-spacing: 0.03em;
  line-height: 1.2;
}
.np-arrow {
  font-size: 0.55rem;
  color: rgba(240,237,230,0.25);
  margin-left: 0.2rem;
  transition: color 0.2s, transform 0.2s;
}
.now-playing:hover .np-arrow {
  color: #ff5a32;
  transform: translateX(2px);
}

/* ── Keyframes ── */
@keyframes fadeDown {
  from { opacity: 0; transform: translateY(-10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideUp {
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.7); }
}

/* ── Mobile ── */
@media (max-width: 480px) {
  .logo-text { font-size: 2.8rem; }
  .btn-label { font-size: 1.35rem; }
}
</style>