<template>
  <div class="fr-page">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>

    <div class="ad-banner"><span class="ad-label">Anzeige</span><slot name="ad-top"><div class="ad-placeholder">Advertisement</div></slot></div>

    <!-- Session view -->
    <div class="session-view" v-if="session">
      <div class="sv-header">
        <button class="sv-back" @click="leaveSession">← Verlassen</button>
        <div class="sv-title-wrap">
          <h1 class="sv-title">{{ session.host_name }}'s Radio</h1>
          <span class="live-badge"><span class="live-dot"></span>LIVE</span>
        </div>
        <button class="sv-home" @click="router.push('/')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        </button>
      </div>

      <div class="sv-body">
        <!-- Chat -->
        <div class="sv-chat">
          <div class="chat-messages" ref="chatRef">
            <div v-for="msg in chatMessages" :key="msg.id"
              class="chat-msg" :class="{ 'chat-msg--system': msg.system, 'chat-msg--me': msg.fromId === auth.user?.id }">
              <span class="cm-name" v-if="!msg.system && msg.fromId !== auth.user?.id">{{ msg.fromName }}</span>
              <span class="cm-text">{{ msg.text }}</span>
            </div>
          </div>
          <div class="chat-input-wrap">
            <input v-model="chatInput" class="chat-input" placeholder="Nachricht..." @keydown.enter="sendChat" />
            <button class="chat-send" :class="{ ready: chatInput.trim() }" @click="sendChat">▶</button>
          </div>
        </div>

        <!-- Mini Player -->
        <div class="sv-player" v-if="currentSong">
          <div class="mp-cover">
            <img v-if="currentSong.cover" :src="currentSong.cover" class="mp-cover-img" />
            <span v-else class="mp-cover-icon">♩</span>
          </div>
          <div class="mp-info">
            <span class="mp-name">{{ currentSong.name }}</span>
            <span class="mp-artist">{{ currentSong.artist }}</span>
          </div>
          <div class="mp-controls">
            <!-- Mute button — pause locally but song continues for others -->
            <button class="mp-btn mp-play" @click="toggleMute" :title="isMuted ? 'Ton an' : 'Stummschalten'">
              <svg v-if="!isMuted" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
            </button>
            <div class="mp-vote">
              <button class="vote-btn" @click="voteSkip" :class="{ voted: hasVoted }">
                ⏭ {{ voteCount }}/{{ votesNeeded }}
              </button>
            </div>
            <button class="host-next" v-if="isHost" @click="hostNext">→</button>
          </div>
        </div>
        <div class="sv-player sv-player--empty" v-else>
          <p>Warten auf Songs in der Warteschlange...</p>
        </div>

        <!-- Queue -->
        <div class="sv-queue">
          <div class="queue-header">
            <span class="queue-title">Warteschlange ({{ (session.queue || []).length }})</span>
          </div>
          <div class="queue-search-wrap">
            <input v-model="queueInput" class="queue-input" placeholder="Song zur Warteschlange hinzufügen..." @input="searchQueue" @keydown.enter="queueResults[0] && addToQueue(queueResults[0])" />
          </div>
          <div class="queue-results" v-if="queueResults.length">
            <div v-for="s in queueResults" :key="s.id" class="queue-result" @click="addToQueue(s)">
              <span class="qr-name">{{ s.name }}</span>
              <span class="qr-artist">{{ s.artist }}</span>
              <span class="qr-add">+</span>
            </div>
          </div>
          <div class="queue-list" v-if="(session.queue || []).length">
            <div v-for="(s, i) in (session.queue || []).slice(0, 5)" :key="i" class="queue-item">
              <span class="qi-nr">{{ i + 1 }}</span>
              <span class="qi-name">{{ s.name }}</span>
              <span class="qi-artist">{{ s.artist }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Members -->
      <div class="sv-members">
        <div v-for="uid in (session.listeners || [])" :key="uid" class="member-chip">
          <div class="mc-avatar" :style="{ background: avatarColor(String(uid)) }">
            <span>{{ memberName(uid).slice(0,2).toUpperCase() }}</span>
          </div>
          <span class="mc-name">{{ memberName(uid) }}</span>
          <span class="mc-host" v-if="uid === session.host_id">♛</span>
        </div>
      </div>
    </div>

    <!-- Lobby -->
    <div class="lobby" v-else>
      <button class="back-btn" @click="router.push('/radio')">← Radio</button>
      <button class="home-btn" @click="router.push('/')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        Home
      </button>

      <div class="page-header">
        <h1 class="page-title">FREUNDE RADIO</h1>
        <p class="page-sub">Hör gemeinsam Musik</p>
      </div>

      <div class="not-logged-in" v-if="!auth.isLoggedIn">
        <p>Du musst eingeloggt sein.</p>
        <button class="nil-btn" @click="router.push('/profile')">Zum Profil →</button>
      </div>

      <template v-else>
        <!-- Create session -->
        <div class="create-card">
          <h2 class="cc-title">Eigene Session starten</h2>
          <div class="cc-input-wrap">
            <input v-model="newSessionName" class="cc-input" :placeholder="`${auth.user?.username}'s Radio`" @keydown.enter="createSession" maxlength="40" />
          </div>
          <button class="cc-btn" :class="{ loading: creating }" @click="createSession" :disabled="creating">
            {{ creating ? 'Erstelle...' : '+ Session erstellen' }}
          </button>
          <p class="cc-hint" v-if="!player.songs.length">⚠ Keine Songs verfügbar — lade zuerst Songs über Upload hoch.</p>
        </div>

        <!-- Active sessions -->
        <div class="sessions-section">
          <div class="sec-header">
            <h2 class="sec-title">Aktive Sessions</h2>
            <button class="refresh-btn" @click="loadSessions" :class="{ spinning: loadingSessions }">↻</button>
          </div>
          <div class="sessions-list" v-if="sessions.length">
            <div v-for="(s, idx) in sessions" :key="s.id" class="session-card" :style="{ '--i': idx }">
              <div class="sc-info">
                <span class="sc-name">{{ s.name }}</span>
                <span class="sc-host">von {{ s.hostName }}</span>
                <span class="sc-meta">{{ (s.listeners || s.members || []).length }} Hörer · {{ s.current_song?.name || s.currentSong?.name || 'Kein Song' }}</span>
              </div>
              <button class="sc-join" @click="joinSession(s.id)">Beitreten →</button>
            </div>
          </div>
          <div class="sessions-empty" v-else-if="!loadingSessions">
            <span>Keine aktiven Sessions</span>
          </div>
          <div class="sessions-empty" v-else>Lädt...</div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore }   from '@/stores/auth'
import { usePlayerStore } from '@/stores/player'

const router = useRouter()
const auth   = useAuthStore()
const player = usePlayerStore()

const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

// ── State ──────────────────────────────────────────────
const session         = ref(null)
const sessions        = ref([])
const newSessionName  = ref('')
const creating        = ref(false)
const loadingSessions = ref(false)
const hasVoted        = ref(false)
const chatMessages    = ref([])
const chatInput       = ref('')
const chatRef         = ref(null)
const queueInput      = ref('')
const queueResults    = ref([])
const isMuted         = ref(false)
const memberNames     = ref({})  // { userId: username }
let   pollTimer       = null
let   radioAudio      = null  // dedicated Audio element for radio

function authHeader() {
  const token = localStorage.getItem('nyujam_token') || ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
}

// ── Computed ───────────────────────────────────────────
const isHost      = computed(() => session.value?.host_id === auth.user?.id)
const voteCount   = computed(() => (session.value?.votes || []).length)
const votesNeeded = computed(() => Math.ceil(((session.value?.listeners || []).length || 1) / 2))
const currentSong = computed(() => session.value?.current_song || null)

// ── Load ───────────────────────────────────────────────
onMounted(async () => {
  if (!player.songs.length) await player.loadSongs()
  await loadSessions()
})

onUnmounted(() => {
  clearInterval(pollTimer)
  if (radioAudio) { radioAudio.pause(); radioAudio = null }
})

async function loadSessions() {
  if (!auth.isLoggedIn) return
  loadingSessions.value = true
  try {
    const res  = await fetch(`${BASE_URL}/api/radio/sessions`, { headers: authHeader() })
    sessions.value = await res.json()
  } catch {} finally { loadingSessions.value = false }
}

// ── Load member usernames ──────────────────────────────
async function loadMemberNames(listenerIds) {
  for (const uid of listenerIds) {
    if (memberNames.value[uid]) continue
    try {
      const res  = await fetch(`${BASE_URL}/api/users/${uid}`, { headers: authHeader() })
      if (res.ok) {
        const u = await res.json()
        memberNames.value = { ...memberNames.value, [uid]: u.username || uid }
      }
    } catch { memberNames.value = { ...memberNames.value, [uid]: uid } }
  }
}

// ── Session management ─────────────────────────────────
async function createSession() {
  if (creating.value || !auth.isLoggedIn) return
  creating.value = true
  try {
    const res = await fetch(`${BASE_URL}/api/radio/sessions`, {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({ isPublic: true }),
    })
    const s = await res.json()
    if (s.error) { alert(s.error); return }
    enterSession(s)
  } catch (e) { alert(e.message) }
  finally { creating.value = false }
}

async function joinSession(id) {
  try {
    const res = await fetch(`${BASE_URL}/api/radio/sessions/${id}/join`, {
      method: 'POST', headers: authHeader(),
    })
    const s = await res.json()
    if (s.error) { alert(s.error); return }
    enterSession(s)
  } catch (e) { alert(e.message) }
}

function enterSession(s) {
  session.value      = s
  hasVoted.value     = false
  isMuted.value      = false
  chatMessages.value = s.chat_messages || []
  addSystemMsg('Du bist der Session beigetreten')
  loadMemberNames(s.listeners || [])
  if (s.current_song) startSyncedPlayback(s)
  clearInterval(pollTimer)
  pollTimer = setInterval(pollSession, 3000)
}

async function pollSession() {
  if (!session.value) return
  try {
    const res = await fetch(`${BASE_URL}/api/radio/sessions/${session.value.id}`, { headers: authHeader() })
    if (!res.ok) { stopRadioAudio(); session.value = null; clearInterval(pollTimer); return }
    const updated = await res.json()
    const songChanged = updated.current_song?.id !== session.value.current_song?.id
    chatMessages.value = updated.chat_messages || []
    session.value = updated
    loadMemberNames(updated.listeners || [])
    if (songChanged) {
      hasVoted.value = false
      if (updated.current_song) {
        addSystemMsg(`▶ ${updated.current_song.name} — ${updated.current_song.artist}`)
        startSyncedPlayback(updated)
      } else {
        stopRadioAudio()
      }
    }
  } catch {}
}

async function leaveSession() {
  if (!session.value) return
  clearInterval(pollTimer)
  stopRadioAudio()
  await fetch(`${BASE_URL}/api/radio/sessions/${session.value.id}/leave`, {
    method: 'POST', headers: authHeader(),
  }).catch(() => {})
  session.value = null
  chatMessages.value = []
  queueResults.value = []
  memberNames.value  = {}
}

// ── Synced Playback ────────────────────────────────────
function startSyncedPlayback(s) {
  const song = s.current_song
  if (!song?.url) return

  // Calculate how many seconds into the song we should be
  const startedAt = s.song_started_at ? new Date(s.song_started_at).getTime() : Date.now()
  const elapsed   = (Date.now() - startedAt) / 1000

  stopRadioAudio()
  radioAudio     = new Audio(song.url)
  radioAudio.volume = isMuted.value ? 0 : 1
  radioAudio.currentTime = Math.max(0, elapsed)
  radioAudio.play().catch(() => {})

  // Auto-advance when song ends
  radioAudio.onended = () => {
    if (isHost.value) hostNext()
  }
}

function stopRadioAudio() {
  if (radioAudio) {
    radioAudio.pause()
    radioAudio.src = ''
    radioAudio = null
  }
}

function toggleMute() {
  isMuted.value = !isMuted.value
  if (radioAudio) radioAudio.volume = isMuted.value ? 0 : 1
}

// ── Queue ──────────────────────────────────────────────
function searchQueue() {
  const q = queueInput.value.trim().toLowerCase()
  if (!q) { queueResults.value = []; return }
  queueResults.value = player.songs
    .filter(s => s.name.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q))
    .slice(0, 5)
}

async function addToQueue(song) {
  if (!session.value) return
  queueInput.value   = ''
  queueResults.value = []
  await fetch(`${BASE_URL}/api/radio/sessions/${session.value.id}/queue`, {
    method: 'POST', headers: authHeader(),
    body: JSON.stringify({ song: { id: song.id, name: song.name, artist: song.artist, cover: song.cover || null, url: song.url } }),
  }).catch(() => {})
  addSystemMsg(`🎵 ${song.artist} — ${song.name} zur Warteschlange hinzugefügt`)
  await pollSession()
}

// ── Vote / Host controls ───────────────────────────────
async function voteSkip() {
  if (hasVoted.value || !session.value) return
  hasVoted.value = true
  try {
    const res     = await fetch(`${BASE_URL}/api/radio/sessions/${session.value.id}/vote`, { method: 'POST', headers: authHeader() })
    const updated = await res.json()
    session.value = updated
    if (updated.skipped) addSystemMsg('⏭ Song übersprungen')
  } catch { hasVoted.value = false }
}

async function hostNext() {
  if (!session.value) return
  try {
    const res     = await fetch(`${BASE_URL}/api/radio/sessions/${session.value.id}/next`, { method: 'POST', headers: authHeader() })
    const updated = await res.json()
    session.value  = updated
    hasVoted.value = false
    if (updated.current_song) {
      addSystemMsg(`⏭ ${updated.current_song.name} — ${updated.current_song.artist}`)
      startSyncedPlayback(updated)
    }
  } catch {}
}

// ── Chat ───────────────────────────────────────────────
function addSystemMsg(text) {
  chatMessages.value.push({ id: Date.now().toString(), system: true, text, createdAt: new Date().toISOString() })
  nextTick(() => { if (chatRef.value) chatRef.value.scrollTop = chatRef.value.scrollHeight })
}

async function sendChat() {
  const text = chatInput.value.trim()
  if (!text || !session.value) return
  chatInput.value = ''
  try {
    await fetch(`${BASE_URL}/api/radio/sessions/${session.value.id}/chat`, {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({ text }),
    })
    await pollSession()
  } catch {}
  nextTick(() => { if (chatRef.value) chatRef.value.scrollTop = chatRef.value.scrollHeight })
}

// ── Helpers ────────────────────────────────────────────
const avatarColors = ['#5b6aff','#32c8a0','#ff5a32','#c864f0','#f0c832']
function avatarColor(name) {
  if (!name) return avatarColors[0]
  return avatarColors[String(name).charCodeAt(0) % avatarColors.length]
}
function memberName(uid) { return memberNames.value[uid] || uid }
</script>


<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
.fr-page { min-height: 100vh; background: #0a0a0f; color: #f0ede6; font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; align-items: center; position: relative; overflow-x: hidden; }
.bg-noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size: 180px; opacity: 0.6; }
.bg-glow { position: fixed; inset: 0; pointer-events: none; z-index: 0; background: radial-gradient(ellipse 60% 40% at 50% 30%, rgba(255,90,50,0.06) 0%, transparent 70%); }
.ad-banner { position: relative; z-index: 1; width: 100%; max-width: 728px; min-height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 1px solid rgba(240,237,230,0.07); padding: 0.75rem 1.5rem; }
.ad-label { position: absolute; top: 4px; left: 1.5rem; font-size: 0.6rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.2); }
.ad-placeholder { width: 100%; max-width: 728px; height: 90px; background: rgba(240,237,230,0.03); border: 1px dashed rgba(240,237,230,0.1); border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,237,230,0.15); }

/* Lobby */
.lobby { position: relative; z-index: 1; width: 100%; max-width: 480px; padding: 0 1.5rem 4rem; display: flex; flex-direction: column; align-items: flex-start; }
.back-btn, .home-btn { background: none; border: none; cursor: pointer; color: rgba(240,237,230,0.35); font-family: 'DM Sans', sans-serif; font-size: 0.78rem; letter-spacing: 0.1em; padding: 0.4rem 0; transition: color 0.2s; }
.back-btn:hover, .home-btn:hover { color: #ff5a32; }
.home-btn { display: flex; align-items: center; gap: 0.3rem; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.08); border-radius: 4px; padding: 0.28rem 0.65rem; margin-left: 0.5rem; color: rgba(240,237,230,0.25); }
.page-header { text-align: center; width: 100%; margin: 1.5rem 0 2rem; }
.page-title { font-family: 'Bebas Neue', cursive; font-size: 3rem; letter-spacing: 0.2em; color: #f0ede6; }
.page-sub { font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.25); margin-top: 0.3rem; }
.not-logged-in { display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 2rem; width: 100%; text-align: center; color: rgba(240,237,230,0.4); }
.nil-btn { background: rgba(91,106,255,0.15); border: 1px solid rgba(91,106,255,0.3); color: #5b6aff; border-radius: 3px; padding: 0.6rem 1.5rem; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; transition: all 0.2s; }
.create-card { width: 100%; background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.08); border-radius: 6px; padding: 1.25rem; margin-bottom: 2rem; display: flex; flex-direction: column; gap: 0.85rem; }
.cc-title { font-family: 'Bebas Neue', cursive; font-size: 1.1rem; letter-spacing: 0.15em; color: rgba(240,237,230,0.6); }
.cc-input { width: 100%; background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.1); border-radius: 3px; padding: 0.65rem 0.9rem; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: #f0ede6; outline: none; }
.cc-input::placeholder { color: rgba(240,237,230,0.2); }
.cc-btn { font-family: 'Bebas Neue', cursive; font-size: 1rem; letter-spacing: 0.12em; background: rgba(255,90,50,0.15); border: 1px solid rgba(255,90,50,0.35); color: #ff5a32; border-radius: 3px; padding: 0.7rem; cursor: pointer; transition: all 0.2s; }
.cc-btn:hover:not(:disabled) { background: rgba(255,90,50,0.25); }
.cc-btn:disabled { opacity: 0.5; cursor: default; }
.cc-hint { font-size: 0.7rem; color: rgba(255,90,50,0.6); }
.sec-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
.sec-title { font-family: 'Bebas Neue', cursive; font-size: 1rem; letter-spacing: 0.18em; color: rgba(240,237,230,0.35); }
.refresh-btn { background: none; border: none; color: rgba(240,237,230,0.3); cursor: pointer; font-size: 1rem; transition: color 0.2s, transform 0.3s; padding: 0.2rem; }
.refresh-btn:hover { color: #f0ede6; }
.refresh-btn.spinning { animation: spin 0.7s linear infinite; }
.sessions-list { display: flex; flex-direction: column; gap: 0.5rem; }
.session-card { display: flex; align-items: center; gap: 0.9rem; background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.08); border-radius: 4px; padding: 0.85rem 1rem; opacity: 0; transform: translateY(5px); animation: slideUp 0.35s ease forwards; animation-delay: calc(var(--i) * 50ms); }
.sc-info { flex: 1; display: flex; flex-direction: column; gap: 0.18rem; min-width: 0; }
.sc-name { font-size: 0.92rem; font-weight: 500; color: #f0ede6; }
.sc-host { font-size: 0.65rem; color: rgba(240,237,230,0.3); }
.sc-meta { font-size: 0.65rem; color: rgba(240,237,230,0.25); }
.sc-join { background: rgba(255,90,50,0.12); border: 1px solid rgba(255,90,50,0.3); color: #ff5a32; border-radius: 3px; padding: 0.4rem 0.9rem; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.78rem; transition: all 0.2s; white-space: nowrap; }
.sc-join:hover { background: rgba(255,90,50,0.22); }
.sessions-empty { font-size: 0.78rem; color: rgba(240,237,230,0.25); padding: 1.5rem 0; text-align: center; width: 100%; }

/* Session view */
.session-view { position: relative; z-index: 1; width: 100%; max-width: 600px; display: flex; flex-direction: column; padding: 0 1rem 2rem; gap: 1rem; }
.sv-header { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 0; }
.sv-back { background: none; border: none; cursor: pointer; color: rgba(240,237,230,0.4); font-family: 'DM Sans', sans-serif; font-size: 0.78rem; letter-spacing: 0.1em; padding: 0; transition: color 0.2s; }
.sv-back:hover { color: #ff5a32; }
.sv-title-wrap { flex: 1; display: flex; align-items: center; gap: 0.6rem; }
.sv-title { font-family: 'Bebas Neue', cursive; font-size: 1.3rem; letter-spacing: 0.12em; color: #f0ede6; }
.sv-home { background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.1); border-radius: 6px; width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: rgba(240,237,230,0.3); transition: all 0.2s; }
.sv-home:hover { color: #f0ede6; }
.live-badge { display: flex; align-items: center; gap: 0.3rem; font-size: 0.6rem; letter-spacing: 0.15em; color: #ff5a32; }
.live-dot { width: 6px; height: 6px; border-radius: 50%; background: #ff5a32; animation: pulse 1.4s ease infinite; }
.sv-body { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
@media (max-width: 480px) { .sv-body { grid-template-columns: 1fr; } }

/* Chat */
.sv-chat { background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.07); border-radius: 6px; display: flex; flex-direction: column; height: 280px; }
.chat-messages { flex: 1; overflow-y: auto; padding: 0.85rem; display: flex; flex-direction: column; gap: 0.4rem; }
.chat-messages::-webkit-scrollbar { width: 3px; }
.chat-messages::-webkit-scrollbar-thumb { background: rgba(240,237,230,0.1); }
.chat-msg { font-size: 0.8rem; color: rgba(240,237,230,0.65); line-height: 1.4; }
.chat-msg--system { color: rgba(255,90,50,0.5); font-size: 0.68rem; font-style: italic; }
.chat-msg--me { text-align: right; color: rgba(240,237,230,0.85); }
.cm-name { font-weight: 600; color: rgba(240,237,230,0.45); margin-right: 0.4rem; font-size: 0.7rem; }
.chat-input-wrap { display: flex; gap: 0.5rem; padding: 0.65rem; border-top: 1px solid rgba(240,237,230,0.06); }
.chat-input { flex: 1; background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.08); border-radius: 3px; padding: 0.45rem 0.75rem; font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: #f0ede6; outline: none; }
.chat-input::placeholder { color: rgba(240,237,230,0.18); }
.chat-send { width: 30px; height: 30px; border-radius: 50%; background: rgba(240,237,230,0.06); border: none; color: rgba(240,237,230,0.25); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; transition: all 0.2s; flex-shrink: 0; }
.chat-send.ready { background: #5b6aff; color: white; }

/* Mini Player */
.sv-player { background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.07); border-radius: 6px; padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; height: 280px; }
.sv-player--empty { align-items: center; justify-content: center; font-size: 0.78rem; color: rgba(240,237,230,0.25); text-align: center; line-height: 1.6; }
.mp-cover { width: 80px; height: 80px; border-radius: 6px; overflow: hidden; align-self: center; background: rgba(240,237,230,0.05); display: flex; align-items: center; justify-content: center; }
.mp-cover-img { width: 100%; height: 100%; object-fit: cover; }
.mp-cover-icon { font-size: 2rem; color: rgba(240,237,230,0.2); }
.mp-info { display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
.mp-name { font-family: 'Bebas Neue', cursive; font-size: 1.05rem; letter-spacing: 0.08em; color: #f0ede6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mp-artist { font-size: 0.7rem; color: rgba(240,237,230,0.4); }
.mp-controls { display: flex; justify-content: center; }
.mp-play { width: 42px; height: 42px; border-radius: 50%; background: #ff5a32; border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 16px rgba(255,90,50,0.4); transition: transform 0.15s; }
.mp-play:hover { transform: scale(1.08); }
.mp-vote { display: flex; justify-content: center; }
.vote-btn { background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.1); color: rgba(240,237,230,0.4); border-radius: 3px; padding: 0.4rem 0.85rem; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.72rem; transition: all 0.2s; }
.vote-btn.voted { background: rgba(255,90,50,0.15); border-color: rgba(255,90,50,0.35); color: #ff5a32; }
.host-next { background: rgba(91,106,255,0.1); border: 1px solid rgba(91,106,255,0.25); color: #5b6aff; border-radius: 3px; padding: 0.45rem 0.85rem; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.78rem; transition: all 0.2s; }
.host-next:hover { background: rgba(91,106,255,0.2); }

/* Members */
.sv-members { display: flex; gap: 0.6rem; flex-wrap: wrap; padding: 0.25rem 0; }
.member-chip { display: flex; align-items: center; gap: 0.45rem; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.08); border-radius: 99px; padding: 0.3rem 0.7rem 0.3rem 0.3rem; }
.mc-avatar { width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; font-weight: 700; color: #0a0a0f; overflow: hidden; flex-shrink: 0; }
.mc-img { width: 100%; height: 100%; object-fit: cover; }
.mc-name { font-size: 0.75rem; color: rgba(240,237,230,0.7); }
.mc-host { font-size: 0.65rem; color: #f0c832; }

.sv-queue { width: 100%; max-width: 700px; margin-top: 1rem; padding: 0 1rem; }
.queue-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; }
.queue-title { font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,237,230,0.3); }
.queue-search-wrap { margin-bottom: 0.4rem; }
.queue-input { width: 100%; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.1); border-radius: 3px; padding: 0.6rem 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; color: #f0ede6; outline: none; transition: border-color 0.2s; }
.queue-input:focus { border-color: rgba(91,106,255,0.4); }
.queue-input::placeholder { color: rgba(240,237,230,0.2); }
.queue-results { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.5rem; }
.queue-result { display: flex; align-items: center; gap: 0.75rem; padding: 0.5rem 0.75rem; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.08); border-radius: 3px; cursor: pointer; transition: background 0.15s; }
.queue-result:hover { background: rgba(91,106,255,0.1); border-color: rgba(91,106,255,0.3); }
.qr-name { flex: 1; font-size: 0.85rem; font-weight: 500; color: #f0ede6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.qr-artist { font-size: 0.72rem; color: rgba(240,237,230,0.35); flex-shrink: 0; }
.qr-add { font-size: 1rem; color: #5b6aff; flex-shrink: 0; font-weight: 600; }
.queue-list { display: flex; flex-direction: column; gap: 0.2rem; }
.queue-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.45rem 0.75rem; border-radius: 3px; background: rgba(240,237,230,0.02); }
.qi-nr { font-size: 0.68rem; color: rgba(240,237,230,0.2); width: 1rem; text-align: center; flex-shrink: 0; }
.qi-name { flex: 1; font-size: 0.82rem; color: rgba(240,237,230,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.qi-artist { font-size: 0.68rem; color: rgba(240,237,230,0.3); flex-shrink: 0; }
@keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.7); } }
@keyframes spin { to { transform: rotate(360deg); } }
</style>