<template>
  <Teleport to="body">
    <transition name="wheel-fade">
      <div
        v-if="open"
        class="wheel-overlay"
        @mousemove="onMouseMove"
        @mouseup="confirmSelection"
        @touchmove.prevent="onTouchMove"
        @touchend="confirmSelection"
      >
        <div class="wheel-backdrop"></div>

        <div class="wheel-wrap" :style="wrapStyle">
          <!-- SVG connector lines -->
          <svg class="wheel-svg" :viewBox="`0 0 ${SIZE} ${SIZE}`">
            <line
              v-for="(pl, idx) in playlists"
              :key="pl.id"
              :x1="SIZE / 2" :y1="SIZE / 2"
              :x2="lineEnd(idx).x" :y2="lineEnd(idx).y"
              :stroke="hoveredId === pl.id ? pl.color : 'rgba(240,237,230,0.08)'"
              stroke-width="1"
            />
          </svg>

          <!-- Center -->
          <div class="wheel-center">
            <span class="wc-icon">{{ hoveredPlaylist?.icon ?? '▤' }}</span>
            <span class="wc-name">{{ hoveredPlaylist?.name ?? 'Playlists' }}</span>
          </div>

          <!-- Items -->
          <div
            v-for="(pl, idx) in playlists"
            :key="pl.id"
            class="wheel-item"
            :style="itemStyle(idx, pl.id)"
          >
            <div
              class="wi-card"
              :style="{
                borderColor: hoveredId === pl.id ? pl.color : 'transparent',
                boxShadow:   hoveredId === pl.id ? `0 0 22px ${pl.color}55` : 'none',
              }"
            >
              <div class="wi-thumb" :style="{ background: pl.color }">{{ pl.icon }}</div>
              <span class="wi-name">{{ pl.name }}</span>
              <span class="wi-meta">{{ pl.count }} Songs</span>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  open:    { type: Boolean, default: false },
  originX: { type: Number, default: 0 },
  originY: { type: Number, default: 0 },
  playlists: { type: Array, required: true },
})

const emit = defineEmits(['select', 'cancel'])

const SIZE   = 440
const RADIUS = 152
const ITEM_W = 90

const hoveredId = ref(null)

// Reset hovered when wheel opens
watch(() => props.open, (val) => {
  if (!val) hoveredId.value = null
})

const hoveredPlaylist = computed(() =>
  props.playlists.find(p => p.id === hoveredId.value) ?? null
)

const wrapStyle = computed(() => ({
  left:   `${props.originX - SIZE / 2}px`,
  top:    `${props.originY - SIZE / 2}px`,
  width:  `${SIZE}px`,
  height: `${SIZE}px`,
}))

function angle(idx) {
  return (idx / props.playlists.length) * Math.PI * 2 - Math.PI / 2
}
function lineEnd(idx) {
  const a = angle(idx)
  return { x: Math.cos(a) * RADIUS + SIZE / 2, y: Math.sin(a) * RADIUS + SIZE / 2 }
}
function itemStyle(idx, id) {
  const a   = angle(idx)
  const x   = Math.cos(a) * RADIUS + SIZE / 2 - ITEM_W / 2
  const y   = Math.sin(a) * RADIUS + SIZE / 2 - ITEM_W / 2
  const act = hoveredId.value === id
  return {
    left:      `${x}px`,
    top:       `${y}px`,
    width:     `${ITEM_W}px`,
    transform: act ? 'scale(1.3)' : 'scale(1)',
    zIndex:    act ? 10 : 1,
  }
}

function onMouseMove(e)  { pick(e.clientX, e.clientY) }
function onTouchMove(e)  { pick(e.touches[0].clientX, e.touches[0].clientY) }

function pick(cx, cy) {
  const dx = cx - props.originX
  const dy = cy - props.originY
  if (Math.sqrt(dx * dx + dy * dy) < 32) { hoveredId.value = null; return }
  const a = Math.atan2(dy, dx)
  let best = null, bestDiff = Infinity
  props.playlists.forEach((pl, idx) => {
    let diff = Math.abs(norm(a - angle(idx)))
    if (diff < bestDiff) { bestDiff = diff; best = pl.id }
  })
  hoveredId.value = best
}

function norm(a) {
  while (a >  Math.PI) a -= Math.PI * 2
  while (a < -Math.PI) a += Math.PI * 2
  return a
}

function confirmSelection() {
  if (hoveredId.value !== null) emit('select', hoveredId.value)
  else emit('cancel')
}
</script>

<style scoped>
.wheel-overlay {
  position: fixed; inset: 0; z-index: 9999; cursor: none;
}
.wheel-backdrop {
  position: absolute; inset: 0;
  background: rgba(10,10,15,0.82);
  backdrop-filter: blur(6px);
}
.wheel-wrap { position: absolute; }
.wheel-svg  { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }

.wheel-center {
  position: absolute; left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  display: flex; flex-direction: column; align-items: center; gap: 0.3rem;
  z-index: 5; pointer-events: none;
}
.wc-icon { font-size: 2rem; }
.wc-name {
  font-family: 'Bebas Neue', cursive;
  font-size: 1rem; letter-spacing: 0.15em;
  color: rgba(240,237,230,0.7);
  max-width: 100px; text-align: center;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.wheel-item {
  position: absolute;
  transition: transform 0.18s cubic-bezier(0.34,1.56,0.64,1);
}
.wi-card {
  width: 90px; background: rgba(18,18,26,0.95);
  border: 1px solid transparent; border-radius: 7px;
  padding: 0.6rem 0.5rem;
  display: flex; flex-direction: column; align-items: center; gap: 0.35rem;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.wi-thumb {
  width: 36px; height: 36px; border-radius: 4px;
  display: flex; align-items: center; justify-content: center; font-size: 1.1rem;
}
.wi-name {
  font-size: 0.64rem; font-weight: 500; color: #f0ede6;
  text-align: center; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis; max-width: 78px;
}
.wi-meta { font-size: 0.57rem; color: rgba(240,237,230,0.3); }

.wheel-fade-enter-active, .wheel-fade-leave-active { transition: opacity 0.2s ease; }
.wheel-fade-enter-from,   .wheel-fade-leave-to     { opacity: 0; }
</style>
