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
      <p class="page-sub">Klick zum Öffnen · Gedrückt halten für Rad</p>
    </div>

    <!-- Server error -->
    <div class="error-bar" v-if="store.error">⚠ {{ store.error }}</div>

    <!-- Playlist-Liste -->
    <div class="playlist-list">

      <!-- Lieblingssongs (fixed) -->
      <div
        class="playlist-row"
        :style="{ '--i': 0, '--color': '#ff5a32' }"
        @click="router.push('/playlists/favorites')"
      >
        <div class="row-thumb" :style="{ background: '#ff5a32' }"><span>♡</span></div>
        <div class="row-info">
          <div class="row-name-wrap">
            <span class="row-name">Lieblingssongs</span>
            <span class="row-pin">♥ Favoriten</span>
          </div>
          <span class="row-meta">{{ likedCount }} Songs</span>
        </div>
      </div>

      <!-- Loading skeletons -->
      <div v-if="store.loading" v-for="i in 3" :key="'sk'+i" class="playlist-row playlist-row--skeleton" :style="{ '--i': i }">
        <div class="row-thumb-sk"></div>
        <div class="row-info">
          <div class="sk-line sk-line--name"></div>
          <div class="sk-line sk-line--meta"></div>
        </div>
      </div>

      <!-- Server playlists -->
      <div
        v-for="(pl, idx) in store.playlists"
        :key="pl.id"
        class="playlist-row"
        :style="{ '--i': idx + 1, '--color': pl.color }"
        @click="router.push(`/playlists/${pl.id}`)"
      >
        <div class="row-thumb" :style="{ background: pl.color }">
          <span>{{ pl.icon }}</span>
        </div>
        <div class="row-info">
          <span class="row-name">{{ pl.name }}</span>
          <span class="row-meta">{{ pl.songs?.length ?? 0 }} Songs</span>
        </div>
        <button class="row-delete" @click.stop="deletePlaylist(pl.id)" title="Löschen">✕</button>
      </div>

      <!-- Create new -->
      <button class="create-row" @click="showCreate = true">
        <span class="cr-plus">+</span>
        <span class="cr-label">Neue Playlist erstellen</span>
      </button>
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
      :playlists="allPlaylists"
      @select="onWheelSelect"
      @cancel="wheelOpen = false"
    />

    <!-- Create Modal -->
    <transition name="modal-fade">
      <div class="modal-overlay" v-if="showCreate" @click.self="showCreate = false">
        <div class="modal-card">
          <h2 class="modal-title">Neue Playlist</h2>

          <!-- Icon picker -->
          <div class="icon-picker">
            <button
              v-for="ic in iconOptions" :key="ic"
              class="icon-opt" :class="{ active: newIcon === ic }"
              @click="newIcon = ic"
            >{{ ic }}</button>
          </div>

          <!-- Color picker -->
          <div class="color-picker">
            <button
              v-for="col in colorOptions" :key="col"
              class="color-opt" :class="{ active: newColor === col }"
              :style="{ background: col }"
              @click="newColor = col"
            ></button>
          </div>

          <!-- Name input -->
          <input
            v-model="newName"
            class="modal-input"
            placeholder="Name der Playlist..."
            maxlength="40"
            @keydown.enter="submitCreate"
            ref="nameInputRef"
          />

          <!-- Preview -->
          <div class="modal-preview" :style="{ borderColor: newColor + '55' }">
            <div class="mp-thumb" :style="{ background: newColor + '33' }">{{ newIcon }}</div>
            <span class="mp-name">{{ newName || 'Playlist Name' }}</span>
          </div>

          <div class="modal-actions">
            <button class="modal-cancel" @click="showCreate = false">Abbrechen</button>
            <button
              class="modal-submit"
              :style="newName.trim() ? { background: newColor, boxShadow: `0 0 20px ${newColor}55` } : {}"
              :disabled="!newName.trim() || creating"
              @click="submitCreate"
            >
              {{ creating ? 'Erstelle...' : 'Erstellen' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PlaylistWheel from '@/components/PlaylistWheel.vue'
import { usePlaylistsStore } from '@/stores/playlists'
import { usePlayerStore } from '@/stores/player'

const router = useRouter()
const route  = useRoute()
const store  = usePlaylistsStore()
const player = usePlayerStore()

onMounted(async () => {
  await store.load()
  await player.loadFavorites()
})

const likedCount   = computed(() => player.likedSongs.length)
const favPlaylist = { id: 'favorites', name: 'Lieblingssongs', icon: '♡', color: '#ff5a32', songs: [] }
const allPlaylists = computed(() => [favPlaylist, ...store.playlists])

async function deletePlaylist(id) {
  if (!confirm('Playlist wirklich löschen?')) return
  await store.remove(id)
}

// ── Create Modal ────────────────────────────────────────
const showCreate   = ref(false)
const newName      = ref('')
const newIcon      = ref('▤')
const newColor     = ref('#5b6aff')
const creating     = ref(false)
const nameInputRef = ref(null)

const iconOptions  = ['▤','♩','⚡','🌙','◎','⊹','◇','🌿','◈','⬡','♡','🎵']
const colorOptions = ['#5b6aff','#ff5a32','#32c8a0','#c864f0','#f0c832','#ff8c55','#32a8c8','#a0c832']

watch(showCreate, (val) => {
  if (val) {
    newName.value  = ''
    newIcon.value  = '▤'
    newColor.value = '#5b6aff'
    nextTick(() => nameInputRef.value?.focus())
  }
})

async function submitCreate() {
  if (!newName.value.trim() || creating.value) return
  creating.value = true
  try {
    const pl = await store.create({ name: newName.value, icon: newIcon.value, color: newColor.value })
    showCreate.value = false
    router.push(`/playlists/${pl.id}`)
  } catch (e) {
    alert('Fehler: ' + e.message)
  } finally {
    creating.value = false
  }
}

// ── Wheel ───────────────────────────────────────────────
const wheelOpen    = ref(false)
const wheelOriginX = ref(0)
const wheelOriginY = ref(0)
const isHolding    = ref(false)
const holdProgress = ref(0)

const HOLD_MS       = 500
const CIRCUMFERENCE = 2 * Math.PI * 24
const ringOffset    = computed(() => CIRCUMFERENCE * (1 - holdProgress.value))

let progressRAF = null, holdStart = 0, didOpen = false

function startHold(e) {
  didOpen = false; isHolding.value = true; holdProgress.value = 0
  holdStart = performance.now()
  const btn = e.currentTarget.getBoundingClientRect()
  wheelOriginX.value = btn.left + btn.width / 2
  wheelOriginY.value = btn.top  + btn.height / 2
  function tick() {
    holdProgress.value = Math.min((performance.now() - holdStart) / HOLD_MS, 1)
    if (holdProgress.value < 1) { progressRAF = requestAnimationFrame(tick) }
    else { didOpen = true; isHolding.value = false; holdProgress.value = 0; wheelOpen.value = true }
  }
  progressRAF = requestAnimationFrame(tick)
}
function cancelHold() {
  if (didOpen) return
  cancelAnimationFrame(progressRAF); isHolding.value = false; holdProgress.value = 0
}
function onWheelSelect(id) {
  wheelOpen.value = false
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

.row-delete { background: none; border: none; color: rgba(240,237,230,0.2); cursor: pointer; font-size: 0.75rem; padding: 0.2rem 0.4rem; transition: color 0.2s; flex-shrink: 0; }
.row-delete:hover { color: #ff5a32; }

.error-bar { position: relative; z-index: 1; width: 100%; max-width: 480px; background: rgba(255,90,50,0.1); border: 1px solid rgba(255,90,50,0.3); border-radius: 3px; padding: 0.55rem 1rem; font-size: 0.78rem; color: #ff8060; margin-bottom: 1rem; text-align: center; }

/* Skeleton */
.playlist-row--skeleton { pointer-events: none; }
.row-thumb-sk { width: 42px; height: 42px; border-radius: 4px; background: rgba(240,237,230,0.06); flex-shrink: 0; animation: shimmer 1.5s infinite; }
.sk-line { height: 10px; border-radius: 2px; background: linear-gradient(90deg, rgba(240,237,230,0.06) 25%, rgba(240,237,230,0.1) 50%, rgba(240,237,230,0.06) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; }
.sk-line--name { width: 55%; margin-bottom: 0.4rem; }
.sk-line--meta { width: 28%; }

/* Create row */
.create-row { display: flex; align-items: center; gap: 0.85rem; width: 100%; background: none; border: 1px dashed rgba(240,237,230,0.1); border-radius: 3px; padding: 0.9rem 1.1rem; cursor: pointer; color: rgba(240,237,230,0.3); font-family: 'DM Sans', sans-serif; transition: border-color 0.2s, color 0.2s, background 0.2s; margin-top: 0.2rem; }
.create-row:hover { border-color: rgba(91,106,255,0.4); color: #f0ede6; background: rgba(91,106,255,0.05); }
.cr-plus { font-size: 1.3rem; width: 42px; height: 42px; border-radius: 4px; background: rgba(91,106,255,0.1); border: 1px solid rgba(91,106,255,0.2); display: flex; align-items: center; justify-content: center; color: #5b6aff; flex-shrink: 0; }
.cr-label { font-size: 0.9rem; font-weight: 500; }

/* Modal */
.modal-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
.modal-card { background: #0e0e1a; border: 1px solid rgba(240,237,230,0.1); border-radius: 10px; padding: 2rem 1.75rem; width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 1.1rem; animation: modalPop 0.35s cubic-bezier(0.34,1.4,0.64,1) both; }
.modal-title { font-family: 'Bebas Neue', cursive; font-size: 1.5rem; letter-spacing: 0.15em; color: #f0ede6; }

.icon-picker { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.icon-opt { width: 36px; height: 36px; border-radius: 6px; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.08); cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.icon-opt:hover { border-color: rgba(240,237,230,0.2); }
.icon-opt.active { background: rgba(91,106,255,0.15); border-color: rgba(91,106,255,0.5); }

.color-picker { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.color-opt { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform 0.15s, border-color 0.15s; }
.color-opt:hover { transform: scale(1.15); }
.color-opt.active { border-color: white; transform: scale(1.15); }

.modal-input { width: 100%; background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.12); border-radius: 3px; padding: 0.75rem 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.95rem; color: #f0ede6; outline: none; transition: border-color 0.2s; }
.modal-input:focus { border-color: rgba(91,106,255,0.45); }
.modal-input::placeholder { color: rgba(240,237,230,0.22); }

.modal-preview { display: flex; align-items: center; gap: 0.85rem; border: 1px solid; border-radius: 4px; padding: 0.75rem 1rem; }
.mp-thumb { width: 40px; height: 40px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; flex-shrink: 0; }
.mp-name { font-family: 'Bebas Neue', cursive; font-size: 1rem; letter-spacing: 0.08em; color: rgba(240,237,230,0.7); }

.modal-actions { display: flex; gap: 0.75rem; }
.modal-cancel { flex: 1; background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.1); color: rgba(240,237,230,0.4); border-radius: 3px; padding: 0.7rem; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; transition: all 0.2s; }
.modal-cancel:hover { color: #f0ede6; border-color: rgba(240,237,230,0.2); }
.modal-submit { flex: 2; background: rgba(240,237,230,0.08); border: none; color: #0a0a0f; border-radius: 3px; padding: 0.7rem; cursor: pointer; font-family: 'Bebas Neue', cursive; font-size: 1rem; letter-spacing: 0.1em; transition: transform 0.15s; }
.modal-submit:not(:disabled):hover { transform: scale(1.02); }
.modal-submit:disabled { background: rgba(240,237,230,0.06); color: rgba(240,237,230,0.2); cursor: default; }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.25s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }

@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
@keyframes modalPop { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }

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