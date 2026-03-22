<template>
  <transition name="bar-slide">
    <button
      v-if="player.currentSong && !isHidden"
      class="now-playing-bar"
      @click="router.push('/player')"
    >
      <span class="npb-dot" :class="{ paused: !player.isPlaying }"></span>
      <div class="npb-info">
        <span class="npb-label">{{ player.isPlaying ? 'now playing' : 'pausiert' }}</span>
        <span class="npb-text">{{ player.currentSong.artist }} · {{ player.currentSong.name }}</span>
      </div>
      <div class="npb-progress">
        <div class="npb-fill" :style="{ width: player.progressPct + '%' }"></div>
      </div>
      <span class="npb-arrow">▶</span>
    </button>
  </transition>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { usePlayerStore } from '@/stores/player'

const router = useRouter()
const route  = useRoute()
const player = usePlayerStore()

const isHidden = computed(() => false)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');

.now-playing-bar {
  position: fixed;
  bottom: 1.25rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 900;

  display: flex; align-items: center; gap: 0.75rem;
  background: rgba(14, 14, 22, 0.92);
  border: 1px solid rgba(240,237,230,0.12);
  border-radius: 99px;
  padding: 0.55rem 1.1rem 0.55rem 0.85rem;
  cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  color: #f0ede6;
  backdrop-filter: blur(16px);
  box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(240,237,230,0.05);
  transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
  min-width: 220px; max-width: min(420px, 88vw);
  overflow: hidden;
}
.now-playing-bar:hover {
  background: rgba(20,20,32,0.97);
  transform: translateX(-50%) translateY(-2px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(240,237,230,0.1);
}

.npb-dot {
  width: 7px; height: 7px; flex-shrink: 0;
  border-radius: 50%; background: #ff5a32;
  animation: pulse 1.6s ease infinite;
}
.npb-dot.paused {
  background: rgba(240,237,230,0.3);
  animation: none;
}

.npb-info {
  display: flex; flex-direction: column; gap: 0.05rem;
  flex: 1; min-width: 0; text-align: left;
}
.npb-label {
  font-size: 0.55rem; letter-spacing: 0.15em;
  text-transform: uppercase; color: rgba(240,237,230,0.3);
  line-height: 1;
}
.npb-text {
  font-size: 0.8rem; font-weight: 500;
  color: rgba(240,237,230,0.85);
  letter-spacing: 0.02em; line-height: 1.2;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

/* thin progress line at bottom */
.npb-progress {
  position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
  background: rgba(240,237,230,0.06);
}
.npb-fill {
  height: 100%; background: #ff5a32; border-radius: 0 99px 99px 0;
  transition: width 0.25s linear;
}

.npb-arrow {
  font-size: 0.55rem; color: rgba(240,237,230,0.25);
  flex-shrink: 0; transition: color 0.2s, transform 0.2s;
}
.now-playing-bar:hover .npb-arrow {
  color: #ff5a32; transform: translateX(2px);
}

/* Transition */
.bar-slide-enter-active, .bar-slide-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.bar-slide-enter-from, .bar-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(16px);
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.4; transform: scale(0.7); }
}
</style>