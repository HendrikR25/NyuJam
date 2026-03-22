<template>
  <div class="friends-page">
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
      <h1 class="page-title">FREUNDE</h1>
      <p class="page-sub">{{ friends.length }} Freunde</p>
    </div>

    <!-- Add friend bar -->
    <div class="add-bar">
      <div class="add-input-wrap" :class="{ focused: addFocused }">
        <span class="add-input-icon">◎</span>
        <input
          v-model="searchQuery"
          class="add-input"
          type="text"
          placeholder="Nutzername suchen..."
          @focus="addFocused = true"
          @blur="addFocused = false"
          @keydown.enter="sendRequest"
        />
        <button class="add-send-btn" :class="{ ready: searchQuery.trim() }" @click="sendRequest">
          + Hinzufügen
        </button>
      </div>
      <transition name="req-fade">
        <div class="req-sent" v-if="requestSent">
          ✓ Anfrage gesendet an <strong>{{ lastRequested }}</strong>
        </div>
      </transition>
    </div>

    <!-- Pending requests -->
    <div class="section" v-if="pending.length">
      <h2 class="section-title">Anfragen <span class="badge">{{ pending.length }}</span></h2>
      <div class="friend-list">
        <div v-for="(p, idx) in pending" :key="p.id" class="friend-row" :style="{ '--i': idx }">
          <div class="friend-avatar" :style="{ background: p.color }">{{ p.initials }}</div>
          <div class="friend-info">
            <span class="friend-name">{{ p.name }}</span>
            <span class="friend-meta">möchte dich hinzufügen</span>
          </div>
          <div class="friend-actions">
            <button class="action-btn action-btn--accept" @click="acceptFriend(p)">✓</button>
            <button class="action-btn action-btn--decline" @click="declineFriend(p)">✕</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Friends list -->
    <div class="section">
      <h2 class="section-title">Alle Freunde</h2>
      <div class="friend-list" v-if="friends.length">
        <div
          v-for="(f, idx) in friends"
          :key="f.id"
          class="friend-row"
          :style="{ '--i': idx }"
        >
          <div class="friend-avatar" :style="{ background: f.color }">
            {{ f.initials }}
            <span class="online-dot" v-if="f.online"></span>
          </div>
          <div class="friend-info">
            <span class="friend-name">{{ f.name }}</span>
            <div class="friend-now-playing" v-if="f.nowPlaying">
              <span class="np-dot-small"></span>
              <span class="friend-meta np-text">{{ f.nowPlaying.song }} · {{ f.nowPlaying.artist }}</span>
            </div>
            <span class="friend-meta" v-else>{{ f.online ? 'Online' : 'Zuletzt aktiv ' + f.lastSeen }}</span>
          </div>
          <button class="chat-friend-btn" title="Nachricht senden" @click="router.push('/chats')">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </button>
        </div>
      </div>
      <div class="empty-state" v-else>
        <span class="empty-icon">◎</span>
        <p class="empty-title">Noch keine Freunde</p>
        <p class="empty-sub">Suche nach Nutzernamen oben, um Freunde hinzuzufügen.</p>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const searchQuery  = ref('')
const addFocused   = ref(false)
const requestSent  = ref(false)
const lastRequested = ref('')

const pending = ref([
  { id: 101, name: 'lena_m',    initials: 'LM', color: '#c864f0', online: true },
  { id: 102, name: 'jan.beats', initials: 'JB', color: '#f0c832', online: false },
])

const friends = ref([
  { id: 1,  name: 'maxmuster',   initials: 'MM', color: '#5b6aff', online: true,  nowPlaying: { song: 'Midnight City', artist: 'M83' },    lastSeen: '' },
  { id: 2,  name: 'sara.wav',    initials: 'SW', color: '#32c8a0', online: true,  nowPlaying: { song: 'Kiara',         artist: 'Bonobo' },  lastSeen: '' },
  { id: 3,  name: 'tom_radio',   initials: 'TR', color: '#ff8c55', online: false, nowPlaying: null, lastSeen: 'vor 2 Std.' },
  { id: 4,  name: 'n.soundz',    initials: 'NS', color: '#c864f0', online: false, nowPlaying: null, lastSeen: 'gestern' },
])

let reqTimer = null
function sendRequest() {
  const q = searchQuery.value.trim()
  if (!q) return
  lastRequested.value = q
  requestSent.value   = true
  searchQuery.value   = ''
  clearTimeout(reqTimer)
  reqTimer = setTimeout(() => { requestSent.value = false }, 3000)
}

function acceptFriend(p) {
  friends.value.unshift({ ...p, online: true, nowPlaying: null, lastSeen: '' })
  pending.value = pending.value.filter(x => x.id !== p.id)
}
function declineFriend(p) {
  pending.value = pending.value.filter(x => x.id !== p.id)
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.friends-page {
  min-height: 100vh; background: #0a0a0f; color: #f0ede6;
  font-family: 'DM Sans', sans-serif;
  display: flex; flex-direction: column; align-items: center;
  padding: 0 1.5rem 4rem; position: relative; overflow-x: hidden;
}
.bg-noise {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  background-size: 180px; opacity: 0.6;
}
.bg-glow {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background: radial-gradient(ellipse 60% 45% at 30% 25%, rgba(91,106,255,0.07) 0%, transparent 70%);
}

/* Ad */
.ad-banner {
  position: relative; z-index: 1; width: 100%; max-width: 728px; min-height: 90px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border-bottom: 1px solid rgba(240,237,230,0.07); padding: 0.75rem 0; margin-bottom: 1rem;
}
.ad-label { position: absolute; top: 4px; left: 0; font-size: 0.6rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.2); }
.ad-placeholder { width: 100%; max-width: 728px; height: 90px; background: rgba(240,237,230,0.03); border: 1px dashed rgba(240,237,230,0.1); border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,237,230,0.15); }

.back-btn { position: relative; z-index: 1; align-self: flex-start; background: none; border: none; cursor: pointer; color: rgba(240,237,230,0.35); font-family: 'DM Sans', sans-serif; font-size: 0.78rem; letter-spacing: 0.1em; padding: 0.4rem 0; margin-bottom: 1.5rem; transition: color 0.2s; }
.back-btn:hover { color: #ff5a32; }

.page-header { position: relative; z-index: 1; text-align: center; margin-bottom: 2rem; animation: fadeDown 0.5s ease both; }
.page-title { font-family: 'Bebas Neue', cursive; font-size: 3rem; letter-spacing: 0.2em; color: #f0ede6; }
.page-sub { font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.25); margin-top: 0.3rem; }

/* Add bar */
.add-bar { position: relative; z-index: 1; width: 100%; max-width: 480px; margin-bottom: 2rem; display: flex; flex-direction: column; gap: 0.6rem; animation: fadeDown 0.5s 0.08s ease both; }
.add-input-wrap { display: flex; align-items: center; gap: 0.75rem; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.1); border-radius: 3px; padding: 0.75rem 1rem; transition: border-color 0.2s, background 0.2s; }
.add-input-wrap.focused { border-color: rgba(91,106,255,0.4); background: rgba(91,106,255,0.05); }
.add-input-icon { font-size: 1rem; color: #5b6aff; opacity: 0.7; flex-shrink: 0; }
.add-input { flex: 1; background: none; border: none; outline: none; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: #f0ede6; }
.add-input::placeholder { color: rgba(240,237,230,0.22); }
.add-send-btn { flex-shrink: 0; font-family: 'DM Sans', sans-serif; font-size: 0.75rem; letter-spacing: 0.06em; background: rgba(240,237,230,0.06); border: 1px solid rgba(240,237,230,0.1); color: rgba(240,237,230,0.3); border-radius: 3px; padding: 0.35rem 0.8rem; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.add-send-btn.ready { background: rgba(91,106,255,0.15); border-color: rgba(91,106,255,0.4); color: #f0ede6; }
.add-send-btn.ready:hover { background: rgba(91,106,255,0.25); }
.req-sent { font-size: 0.75rem; color: #32c8a0; letter-spacing: 0.04em; padding-left: 0.25rem; }

/* Sections */
.section { position: relative; z-index: 1; width: 100%; max-width: 480px; margin-bottom: 2rem; }
.section-title { font-family: 'Bebas Neue', cursive; font-size: 1rem; letter-spacing: 0.18em; color: rgba(240,237,230,0.35); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem; }
.badge { background: rgba(255,90,50,0.2); border: 1px solid rgba(255,90,50,0.35); color: #ff5a32; font-family: 'DM Sans', sans-serif; font-size: 0.65rem; border-radius: 99px; padding: 0.05rem 0.45rem; font-weight: 600; }

/* Friend rows */
.friend-list { display: flex; flex-direction: column; gap: 0.45rem; }
.friend-row { display: flex; align-items: center; gap: 0.9rem; background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.07); border-radius: 3px; padding: 0.8rem 1rem; opacity: 0; transform: translateY(6px); animation: slideUp 0.38s ease forwards; animation-delay: calc(var(--i) * 50ms); transition: background 0.2s; }
.friend-row:hover { background: rgba(240,237,230,0.05); }

.friend-avatar { width: 40px; height: 40px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 600; color: #0a0a0f; position: relative; }
.online-dot { position: absolute; bottom: 1px; right: 1px; width: 9px; height: 9px; border-radius: 50%; background: #32c8a0; border: 2px solid #0a0a0f; }

.friend-info { flex: 1; display: flex; flex-direction: column; gap: 0.18rem; min-width: 0; }
.friend-name { font-size: 0.9rem; font-weight: 500; color: #f0ede6; }
.friend-meta { font-size: 0.68rem; color: rgba(240,237,230,0.3); }
.friend-now-playing { display: flex; align-items: center; gap: 0.4rem; }
.np-dot-small { width: 5px; height: 5px; border-radius: 50%; background: #32c8a0; flex-shrink: 0; animation: pulse 1.4s ease infinite; }
.np-text { color: rgba(240,237,230,0.5) !important; }

.friend-actions { display: flex; gap: 0.4rem; }
.action-btn { width: 30px; height: 30px; border-radius: 50%; border: 1px solid; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; transition: transform 0.15s, background 0.2s; }
.action-btn--accept { background: rgba(50,200,160,0.1); border-color: rgba(50,200,160,0.3); color: #32c8a0; }
.action-btn--accept:hover { background: rgba(50,200,160,0.25); transform: scale(1.1); }
.action-btn--decline { background: rgba(255,90,50,0.08); border-color: rgba(255,90,50,0.25); color: #ff5a32; }
.action-btn--decline:hover { background: rgba(255,90,50,0.2); transform: scale(1.1); }

.chat-friend-btn { background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.1); border-radius: 6px; padding: 0.4rem 0.5rem; color: rgba(240,237,230,0.35); cursor: pointer; display: flex; align-items: center; transition: color 0.2s, border-color 0.2s; line-height: 0; }
.chat-friend-btn:hover { color: #f0ede6; border-color: rgba(240,237,230,0.25); }

/* Empty */
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 3rem 1rem; color: rgba(240,237,230,0.2); text-align: center; }
.empty-icon { font-size: 2.5rem; opacity: 0.3; }
.empty-title { font-family: 'Bebas Neue', cursive; font-size: 1.3rem; letter-spacing: 0.12em; }
.empty-sub { font-size: 0.75rem; max-width: 240px; line-height: 1.6; }

/* Transitions */
.req-fade-enter-active, .req-fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.req-fade-enter-from, .req-fade-leave-to { opacity: 0; transform: translateY(-4px); }

@keyframes fadeDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
