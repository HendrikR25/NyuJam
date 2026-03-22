<template>
  <div class="groups-page">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>

    <!-- Ad Banner -->
    <div class="ad-banner">
      <span class="ad-label">Anzeige</span>
      <slot name="ad-top">
        <div class="ad-placeholder">Advertisement</div>
      </slot>
    </div>

    <button class="back-btn" @click="router.push('/community')">← Community</button>

    <div class="page-header">
      <h1 class="page-title">GRUPPEN</h1>
      <p class="page-sub">{{ myGroups.length }} Gruppen</p>
    </div>

    <!-- Search / Join bar -->
    <div class="join-bar">
      <div class="join-input-wrap" :class="{ focused: joinFocused }">
        <span class="join-icon">⬡</span>
        <input
          v-model="joinQuery"
          class="join-input"
          type="text"
          placeholder="Gruppenname oder Code eingeben..."
          @focus="joinFocused = true"
          @blur="joinFocused = false"
          @keydown.enter="joinGroup"
        />
        <button class="join-btn" :class="{ ready: joinQuery.trim() }" @click="joinGroup">
          Beitreten
        </button>
      </div>
      <transition name="req-fade">
        <div class="join-feedback" v-if="joinFeedback">{{ joinFeedback }}</div>
      </transition>
    </div>

    <!-- My Groups -->
    <div class="section">
      <h2 class="section-title">Meine Gruppen</h2>

      <div class="groups-grid" v-if="myGroups.length">
        <div
          v-for="(g, idx) in myGroups"
          :key="g.id"
          class="group-card"
          :style="{ '--i': idx, '--color': g.color }"
          @click="openGroup(g)"
        >
          <div class="gc-header">
            <div class="gc-icon" :style="{ background: g.color + '22', borderColor: g.color + '44' }">
              {{ g.icon }}
            </div>
            <div class="gc-badges">
              <span class="gc-badge" v-if="g.live">
                <span class="live-dot"></span>Live
              </span>
            </div>
          </div>
          <div class="gc-name">{{ g.name }}</div>
          <div class="gc-meta">{{ g.members }} Mitglieder</div>
          <div class="gc-now" v-if="g.nowPlaying">
            <span class="np-dot-small"></span>
            <span class="gc-now-text">{{ g.nowPlaying }}</span>
          </div>
          <div class="gc-accent"></div>
        </div>
      </div>

      <div class="empty-state" v-else>
        <span class="empty-icon">⬡</span>
        <p class="empty-title">Noch keine Gruppen</p>
        <p class="empty-sub">Tritt einer Gruppe bei oder lass dir von Freunden einen Code schicken.</p>
      </div>
    </div>

    <!-- Suggested groups -->
    <div class="section">
      <h2 class="section-title">Entdecken</h2>
      <div class="groups-grid">
        <div
          v-for="(g, idx) in suggested"
          :key="g.id"
          class="group-card group-card--discover"
          :style="{ '--i': idx, '--color': g.color }"
        >
          <div class="gc-header">
            <div class="gc-icon" :style="{ background: g.color + '22', borderColor: g.color + '44' }">{{ g.icon }}</div>
          </div>
          <div class="gc-name">{{ g.name }}</div>
          <div class="gc-meta">{{ g.members }} Mitglieder</div>
          <button class="gc-join-btn" @click.stop="quickJoin(g)">+ Beitreten</button>
          <div class="gc-accent"></div>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const joinQuery   = ref('')
const joinFocused = ref(false)
const joinFeedback = ref('')

const myGroups = ref([
  { id: 1, name: 'Berliner Beats',   icon: '⚡', color: '#ff5a32', members: 12, live: true,  nowPlaying: 'Bonobo · Kiara' },
  { id: 2, name: 'Lo-Fi Study',      icon: '◎',  color: '#5b6aff', members: 34, live: false, nowPlaying: null },
  { id: 3, name: 'Weekend Roadtrip', icon: '◇',  color: '#f0c832', members: 6,  live: false, nowPlaying: null },
])

const suggested = ref([
  { id: 101, name: 'Jazz & Chill',    icon: '🎷', color: '#c864f0', members: 128 },
  { id: 102, name: 'Techno Underground', icon: '◈', color: '#32c8a0', members: 89 },
  { id: 103, name: 'Acoustic Mornings', icon: '🌙', color: '#ff8c55', members: 203 },
  { id: 104, name: 'Rap Kollektiv',   icon: '⊹',  color: '#5b6aff', members: 441 },
])

let fbTimer = null
function joinGroup() {
  const q = joinQuery.value.trim()
  if (!q) return
  joinFeedback.value = `Gruppe „${q}" nicht gefunden. Prüfe den Code.`
  joinQuery.value = ''
  clearTimeout(fbTimer)
  fbTimer = setTimeout(() => { joinFeedback.value = '' }, 3500)
}

function quickJoin(g) {
  myGroups.value.unshift({ ...g, live: false, nowPlaying: null })
  suggested.value = suggested.value.filter(x => x.id !== g.id)
}

function openGroup(g) {
  // placeholder — Gruppendetail noch nicht implementiert
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.groups-page {
  min-height: 100vh; background: #0a0a0f; color: #f0ede6;
  font-family: 'DM Sans', sans-serif;
  display: flex; flex-direction: column; align-items: center;
  padding: 0 1.5rem 4rem; position: relative; overflow-x: hidden;
}
.bg-noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size: 180px; opacity: 0.6; }
.bg-glow { position: fixed; inset: 0; pointer-events: none; z-index: 0; background: radial-gradient(ellipse 60% 45% at 70% 25%, rgba(50,200,160,0.06) 0%, transparent 70%); }

/* Ad */
.ad-banner { position: relative; z-index: 1; width: 100%; max-width: 728px; min-height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 1px solid rgba(240,237,230,0.07); padding: 0.75rem 0; margin-bottom: 1rem; }
.ad-label { position: absolute; top: 4px; left: 0; font-size: 0.6rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.2); }
.ad-placeholder { width: 100%; max-width: 728px; height: 90px; background: rgba(240,237,230,0.03); border: 1px dashed rgba(240,237,230,0.1); border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,237,230,0.15); }

.back-btn { position: relative; z-index: 1; align-self: flex-start; background: none; border: none; cursor: pointer; color: rgba(240,237,230,0.35); font-family: 'DM Sans', sans-serif; font-size: 0.78rem; letter-spacing: 0.1em; padding: 0.4rem 0; margin-bottom: 1.5rem; transition: color 0.2s; }
.back-btn:hover { color: #ff5a32; }

.page-header { position: relative; z-index: 1; text-align: center; margin-bottom: 2rem; animation: fadeDown 0.5s ease both; }
.page-title { font-family: 'Bebas Neue', cursive; font-size: 3rem; letter-spacing: 0.2em; color: #f0ede6; }
.page-sub { font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.25); margin-top: 0.3rem; }

/* Join bar */
.join-bar { position: relative; z-index: 1; width: 100%; max-width: 480px; margin-bottom: 2rem; display: flex; flex-direction: column; gap: 0.6rem; animation: fadeDown 0.5s 0.08s ease both; }
.join-input-wrap { display: flex; align-items: center; gap: 0.75rem; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.1); border-radius: 3px; padding: 0.75rem 1rem; transition: border-color 0.2s, background 0.2s; }
.join-input-wrap.focused { border-color: rgba(50,200,160,0.4); background: rgba(50,200,160,0.04); }
.join-icon { font-size: 1rem; color: #32c8a0; opacity: 0.7; flex-shrink: 0; }
.join-input { flex: 1; background: none; border: none; outline: none; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: #f0ede6; }
.join-input::placeholder { color: rgba(240,237,230,0.22); }
.join-btn { flex-shrink: 0; font-family: 'DM Sans', sans-serif; font-size: 0.75rem; letter-spacing: 0.06em; background: rgba(240,237,230,0.06); border: 1px solid rgba(240,237,230,0.1); color: rgba(240,237,230,0.3); border-radius: 3px; padding: 0.35rem 0.8rem; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.join-btn.ready { background: rgba(50,200,160,0.15); border-color: rgba(50,200,160,0.4); color: #f0ede6; }
.join-btn.ready:hover { background: rgba(50,200,160,0.25); }
.join-feedback { font-size: 0.75rem; color: rgba(240,237,230,0.4); letter-spacing: 0.04em; padding-left: 0.25rem; }

/* Sections */
.section { position: relative; z-index: 1; width: 100%; max-width: 480px; margin-bottom: 2.5rem; }
.section-title { font-family: 'Bebas Neue', cursive; font-size: 1rem; letter-spacing: 0.18em; color: rgba(240,237,230,0.35); margin-bottom: 0.9rem; }

/* Groups grid */
.groups-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; }

.group-card {
  position: relative; overflow: hidden;
  background: rgba(240,237,230,0.03);
  border: 1px solid rgba(240,237,230,0.08);
  border-radius: 6px; padding: 1rem;
  cursor: pointer;
  opacity: 0; transform: translateY(8px);
  animation: slideUp 0.38s ease forwards;
  animation-delay: calc(var(--i) * 55ms);
  transition: background 0.2s, border-color 0.2s;
}
.group-card:hover { background: rgba(240,237,230,0.055); border-color: rgba(240,237,230,0.14); }
.group-card--discover { cursor: default; }

.gc-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 0.7rem; }
.gc-icon { width: 40px; height: 40px; border-radius: 8px; border: 1px solid; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; }
.gc-badges { display: flex; flex-direction: column; gap: 0.3rem; align-items: flex-end; }
.gc-badge { display: flex; align-items: center; gap: 0.3rem; font-size: 0.58rem; letter-spacing: 0.1em; text-transform: uppercase; color: #ff5050; background: rgba(255,50,50,0.12); border: 1px solid rgba(255,50,50,0.25); border-radius: 3px; padding: 0.1rem 0.35rem; }
.live-dot { width: 5px; height: 5px; border-radius: 50%; background: #ff5050; animation: pulse 1.2s ease infinite; }

.gc-name { font-family: 'Bebas Neue', cursive; font-size: 1.05rem; letter-spacing: 0.08em; color: #f0ede6; margin-bottom: 0.2rem; }
.gc-meta { font-size: 0.65rem; color: rgba(240,237,230,0.3); letter-spacing: 0.04em; margin-bottom: 0.5rem; }

.gc-now { display: flex; align-items: center; gap: 0.35rem; }
.np-dot-small { width: 5px; height: 5px; border-radius: 50%; background: #32c8a0; flex-shrink: 0; animation: pulse 1.4s ease infinite; }
.gc-now-text { font-size: 0.65rem; color: rgba(240,237,230,0.45); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.gc-join-btn { margin-top: 0.4rem; font-family: 'DM Sans', sans-serif; font-size: 0.7rem; letter-spacing: 0.06em; background: color-mix(in srgb, var(--color) 12%, transparent); border: 1px solid color-mix(in srgb, var(--color) 35%, transparent); color: var(--color); border-radius: 3px; padding: 0.3rem 0.7rem; cursor: pointer; transition: background 0.2s; width: 100%; }
.gc-join-btn:hover { background: color-mix(in srgb, var(--color) 22%, transparent); }

.gc-accent { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: var(--color); opacity: 0.4; }

/* Empty */
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 2.5rem 1rem; color: rgba(240,237,230,0.2); text-align: center; }
.empty-icon { font-size: 2.5rem; opacity: 0.3; }
.empty-title { font-family: 'Bebas Neue', cursive; font-size: 1.3rem; letter-spacing: 0.12em; }
.empty-sub { font-size: 0.75rem; max-width: 240px; line-height: 1.6; }

.req-fade-enter-active, .req-fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.req-fade-enter-from, .req-fade-leave-to { opacity: 0; transform: translateY(-4px); }

@keyframes fadeDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
