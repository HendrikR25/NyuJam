<template>
  <div class="playlists-page">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>

    <!-- Werbebanner oben -->
    <div class="ad-banner">
      <span class="ad-label">Anzeige</span>
      <slot name="ad-top">
        <div class="ad-placeholder">Advertisement</div>
      </slot>
    </div>

    <button class="back-btn" @click="router.push('/')">← Zurück</button>

    <div class="page-header">
      <h1 class="page-title">PLAYLISTS</h1>
      <p class="page-sub">Klick zum Auswählen · Gedrückt halten für Rad</p>
    </div>

    <!-- Playlist-Liste -->
    <div class="playlist-list">
      <div
        v-for="(pl, idx) in playlists"
        :key="pl.id"
        class="playlist-row"
        :class="{ selected: selectedId === pl.id }"
        :style="{ '--i': idx, '--color': pl.color }"
        @click="selectPlaylist(pl.id)"
      >
        <div class="row-thumb" :style="{ background: pl.color }">
          <span>{{ pl.icon }}</span>
        </div>
        <div class="row-info">
          <div class="row-name-wrap">
            <span class="row-name">{{ pl.name }}</span>
            <span class="row-pin" v-if="pl.pinned">♥ Favoriten</span>
          </div>
          <span class="row-meta">{{ pl.count }} Songs</span>
        </div>
        <transition name="check-pop">
          <span class="row-check" v-if="selectedId === pl.id">✓</span>
        </transition>
      </div>
    </div>

    <!-- "Playlist wählen" Button mit Long-Press -->
    <div class="wheel-btn-wrap">
      <button
        class="wheel-btn"
        :class="{ holding: isHolding }"
        @mousedown="startHold"
        @mouseup="cancelHold"
        @mouseleave="cancelHold"
        @touchstart.prevent="startHold"
        @touchend="cancelHold"
      >
        <span class="wb-icon">▤</span>
        <span class="wb-label">Playlist wählen</span>
        <span class="wb-hint">gedrückt halten</span>
        <svg class="wb-ring" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="24" />
          <circle
            cx="28" cy="28" r="24"
            class="wb-ring-progress"
            :style="{ strokeDashoffset: ringOffset }"
          />
        </svg>
      </button>
    </div>

    <!-- Aktuell ausgewählt -->
    <transition name="sel-fade">
      <div class="selected-display" v-if="selectedPlaylist">
        <span class="sd-label">Aktuelle Playlist</span>
        <div class="sd-card" :style="{ borderColor: selectedPlaylist.color }">
          <div class="sd-thumb" :style="{ background: selectedPlaylist.color }">
            {{ selectedPlaylist.icon }}
          </div>
          <div class="sd-info">
            <span class="sd-name">{{ selectedPlaylist.name }}</span>
            <span class="sd-meta">{{ selectedPlaylist.count }} Songs</span>
          </div>
        </div>
      </div>
    </transition>

    <!-- Rad -->
    <PlaylistWheel
      :open="wheelOpen"
      :origin-x="wheelOriginX"
      :origin-y="wheelOriginY"
      :playlists="playlists"
      @select="onWheelSelect"
      @cancel="wheelOpen = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PlaylistWheel from '@/components/PlaylistWheel.vue'

const router = useRouter()
const route  = useRoute()

const playlists = [
  { id: 0, name: 'Lieblingssongs',    icon: '♡',  count:  0, color: '#ff5a32', pinned: true },
  { id: 1, name: 'Chill Vibes',       icon: '🌙', count: 24, color: '#5b6aff' },
  { id: 2, name: 'Workout',           icon: '⚡', count: 18, color: '#ff5a32' },
  { id: 3, name: 'Deep Focus',        icon: '◎',  count: 31, color: '#32c8a0' },
  { id: 4, name: 'Late Night',        icon: '◈',  count: 12, color: '#c864f0' },
  { id: 5, name: 'Road Trip',         icon: '◇',  count: 40, color: '#f0c832' },
  { id: 6, name: 'Neue Entdeckungen', icon: '⊹',  count:  9, color: '#ff8c55' },
]

// Vorauswahl wenn via HomeView-Rad navigiert
const selectedId = ref(route.query.id ? Number(route.query.id) : null)

const selectedPlaylist = computed(() =>
  playlists.find(p => p.id === selectedId.value) ?? null
)

function selectPlaylist(id) {
  router.push(`/playlists/${id}`)
}

// ── Wheel ──
const wheelOpen    = ref(false)
const wheelOriginX = ref(0)
const wheelOriginY = ref(0)
const isHolding    = ref(false)
const holdProgress = ref(0)

const HOLD_MS      = 500
const CIRCUMFERENCE = 2 * Math.PI * 24
const ringOffset   = computed(() => CIRCUMFERENCE * (1 - holdProgress.value))

let progressRAF = null
let holdStart   = 0
let didOpen     = false

function startHold(e) {
  didOpen = false
  isHolding.value    = true
  holdProgress.value = 0
  holdStart = performance.now()

  const btn = e.currentTarget.getBoundingClientRect()
  wheelOriginX.value = btn.left + btn.width  / 2
  wheelOriginY.value = btn.top  + btn.height / 2

  function tick() {
    const elapsed = performance.now() - holdStart
    holdProgress.value = Math.min(elapsed / HOLD_MS, 1)
    if (holdProgress.value < 1) {
      progressRAF = requestAnimationFrame(tick)
    } else {
      didOpen            = true
      isHolding.value    = false
      holdProgress.value = 0
      wheelOpen.value    = true
    }
  }
  progressRAF = requestAnimationFrame(tick)
}

function cancelHold() {
  if (didOpen) return
  cancelAnimationFrame(progressRAF)
  isHolding.value    = false
  holdProgress.value = 0
}

function onWheelSelect(id) {
  wheelOpen.value  = false
  router.push(`/playlists/${id}`)
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.playlists-page {
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
.bg-glow {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background:
    radial-gradient(ellipse 60% 45% at 30% 25%, rgba(91,106,255,0.08) 0%, transparent 70%),
    radial-gradient(ellipse 50% 55% at 75% 75%, rgba(255,90,50,0.06) 0%, transparent 70%);
}

/* ── Ad Banner ── */
.ad-banner {
  position: relative; z-index: 1;
  width: 100%; max-width: 728px; min-height: 90px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border-bottom: 1px solid rgba(240,237,230,0.07);
  padding: 0.75rem 0; margin-bottom: 1rem;
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
  font-size: 0.8rem; letter-spacing: 0.1em;
  padding: 0.4rem 0; margin-bottom: 1.5rem; transition: color 0.2s;
}
.back-btn:hover { color: #ff5a32; }

.page-header {
  position: relative; z-index: 1;
  text-align: center; margin-bottom: 2.5rem;
  animation: fadeDown 0.5s ease both;
}
.page-title {
  font-family: 'Bebas Neue', cursive;
  font-size: 3rem; letter-spacing: 0.2em; color: #f0ede6;
}
.page-sub {
  font-size: 0.68rem; letter-spacing: 0.14em;
  text-transform: uppercase; color: rgba(240,237,230,0.22); margin-top: 0.3rem;
}

/* ── List ── */
.playlist-list {
  position: relative; z-index: 1;
  width: 100%; max-width: 480px;
  display: flex; flex-direction: column; gap: 0.55rem;
}
.playlist-row {
  position: relative;
  display: flex; align-items: center; gap: 1rem;
  background: rgba(240,237,230,0.03);
  border: 1px solid rgba(240,237,230,0.08);
  border-radius: 3px; padding: 0.9rem 1.1rem;
  cursor: pointer; user-select: none;
  opacity: 0; transform: translateY(8px);
  animation: slideUp 0.4s ease forwards;
  animation-delay: calc(var(--i) * 55ms);
  transition: border-color 0.2s, background 0.2s;
}
.playlist-row:hover {
  background: rgba(240,237,230,0.06);
  border-color: rgba(240,237,230,0.14);
}
.playlist-row.selected {
  border-color: var(--color);
  background: rgba(255,255,255,0.04);
}

.row-thumb {
  width: 42px; height: 42px; border-radius: 4px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 1.3rem;
}
.row-info { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; }
.row-name-wrap { display: flex; align-items: center; gap: 0.5rem; }
.row-name  { font-size: 0.95rem; font-weight: 500; color: #f0ede6; }
.row-pin {
  font-size: 0.58rem; letter-spacing: 0.12em; text-transform: uppercase;
  color: #ff5a32; background: rgba(255,90,50,0.12);
  border: 1px solid rgba(255,90,50,0.25); border-radius: 3px;
  padding: 0.1rem 0.4rem; line-height: 1.4;
}
.row-meta  { font-size: 0.72rem; color: rgba(240,237,230,0.3); letter-spacing: 0.05em; }
.row-check { color: #ff5a32; font-size: 1rem; font-weight: 600; }

.check-pop-enter-active { transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.2s; }
.check-pop-enter-from   { transform: scale(0); opacity: 0; }

/* ── Wheel Button ── */
.wheel-btn-wrap {
  position: relative; z-index: 1; margin-top: 2rem;
}
.wheel-btn {
  position: relative;
  display: flex; flex-direction: column; align-items: center; gap: 0.25rem;
  background: rgba(240,237,230,0.04);
  border: 1px solid rgba(240,237,230,0.1);
  border-radius: 4px; padding: 1.1rem 2.4rem;
  cursor: pointer; color: #f0ede6;
  font-family: 'DM Sans', sans-serif;
  transition: background 0.2s, border-color 0.2s;
  user-select: none; overflow: hidden;
}
.wheel-btn:hover, .wheel-btn.holding {
  background: rgba(255,90,50,0.08);
  border-color: rgba(255,90,50,0.35);
}
.wb-icon  { font-size: 1.3rem; color: #ff5a32; }
.wb-label {
  font-family: 'Bebas Neue', cursive;
  font-size: 1.1rem; letter-spacing: 0.14em;
}
.wb-hint {
  font-size: 0.62rem; letter-spacing: 0.12em;
  text-transform: uppercase; color: rgba(240,237,230,0.25);
}

/* Progress ring overlay */
.wb-ring {
  position: absolute; inset: 0; width: 100%; height: 100%;
  pointer-events: none; opacity: 0; transition: opacity 0.15s;
}
.wheel-btn.holding .wb-ring { opacity: 1; }
.wb-ring circle { fill: none; stroke: rgba(255,90,50,0.12); stroke-width: 2; }
.wb-ring-progress {
  stroke: #ff5a32 !important;
  stroke-dasharray: 150.8;
  stroke-linecap: round;
  transform-origin: center;
  transform: rotate(-90deg);
  transition: stroke-dashoffset 0.05s linear;
}

/* ── Selected Display ── */
.selected-display {
  position: relative; z-index: 1;
  width: 100%; max-width: 480px;
  margin-top: 2rem;
  display: flex; flex-direction: column; gap: 0.6rem;
}
.sd-label {
  font-size: 0.68rem; letter-spacing: 0.15em;
  text-transform: uppercase; color: rgba(240,237,230,0.25);
}
.sd-card {
  display: flex; align-items: center; gap: 1rem;
  background: rgba(240,237,230,0.04);
  border: 1px solid; border-radius: 3px; padding: 1rem 1.2rem;
}
.sd-thumb {
  width: 48px; height: 48px; border-radius: 4px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; font-size: 1.4rem;
}
.sd-info { display: flex; flex-direction: column; gap: 0.25rem; }
.sd-name { font-family: 'Bebas Neue', cursive; font-size: 1.4rem; letter-spacing: 0.1em; }
.sd-meta { font-size: 0.72rem; color: rgba(240,237,230,0.3); }

/* ── Transitions ── */
.sel-fade-enter-active { transition: opacity 0.35s ease, transform 0.35s ease; }
.sel-fade-enter-from   { opacity: 0; transform: translateY(6px); }

@keyframes fadeDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideUp {
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 480px) {
  .page-title { font-size: 2.4rem; }
}
</style>
