<template>
  <div class="fr-page">
    <div class="bg-noise"></div>
    <div class="bg-glow" :style="glowStyle"></div>

    <!-- Ad Banner -->
    <div class="ad-banner">
      <span class="ad-label">Anzeige</span>
      <slot name="ad-top"><div class="ad-placeholder">Advertisement</div></slot>
    </div>

    <!-- ── LOBBY ── -->
    <template v-if="!activeSession">
      <div class="top-bar">
        <button class="back-btn" @click="router.push('/radio')">← Radio</button>
        <h1 class="page-title">FREUNDE RADIO</h1>
      </div>

      <div class="create-card">
        <div class="cc-left">
          <span class="cc-icon">◈</span>
          <div class="cc-text">
            <span class="cc-title">Neue Session</span>
            <span class="cc-sub">Erstelle eine Session und lade Freunde ein</span>
          </div>
        </div>
        <button class="cc-btn" @click="createSession">+ Erstellen</button>
      </div>

      <div class="section">
        <h2 class="section-title">Sessions von Freunden</h2>
        <div class="session-list">
          <div
            v-for="(s, idx) in friendSessions" :key="s.id"
            class="session-row"
            :style="{ '--i': idx, '--color': s.color }"
            @click="joinSession(s)"
          >
            <div class="sr-cover" :style="{ background: s.color+'22', borderColor: s.color+'44' }">{{ s.icon }}</div>
            <div class="sr-info">
              <span class="sr-name">{{ s.name }}</span>
              <span class="sr-meta">von {{ s.host }} · {{ s.members }} Hörer</span>
              <div class="sr-now">
                <span class="np-dot"></span>
                <span class="sr-song">{{ s.currentSong }} · {{ s.currentArtist }}</span>
              </div>
            </div>
            <button class="sr-join-btn">Beitreten →</button>
          </div>
        </div>
      </div>
    </template>

    <!-- ── SESSION ── -->
    <template v-else>
      <div class="session-wrap">

        <!-- Top: title + back -->
        <div class="sess-topbar">
          <button class="back-btn" @click="leaveSession">← Verlassen</button>
          <div class="sess-title-block">
            <span class="sh-live"><span class="live-dot"></span>LIVE</span>
            <h1 class="sh-title">{{ activeSession.name }}</h1>
            <span class="sh-meta">{{ activeSession.members }} Hörer · von {{ activeSession.host }}</span>
          </div>
          <div style="width:64px"></div>
        </div>

        <!-- Main content area -->
        <div class="sess-body">

          <!-- LEFT: Chat -->
          <div class="chat-panel" :class="{ expanded: chatExpanded }">
            <div class="cp-header" @click="chatExpanded = !chatExpanded">
              <span class="cp-title">Chat</span>
              <span class="cp-unread" v-if="unreadChat > 0 && !chatExpanded">{{ unreadChat }}</span>
              <span class="cp-toggle">{{ chatExpanded ? '▼' : '▲' }}</span>
            </div>
            <div class="cp-messages" ref="miniChatRef">
              <div
                v-for="msg in chatMessages" :key="msg.id"
                class="cp-msg" :class="{ 'cp-msg--me': msg.me }"
              >
                <span class="cp-author" v-if="!msg.me">{{ msg.author }}: </span>
                <span class="cp-text">{{ msg.text }}</span>
              </div>
            </div>
            <div class="cp-input-row">
              <input
                v-model="chatInput"
                class="cp-input"
                placeholder="Nachricht..."
                @keydown.enter="sendChatMsg"
                @focus="unreadChat = 0"
              />
              <button class="cp-send" :class="{ ready: chatInput.trim() }" @click="sendChatMsg">→</button>
            </div>
          </div>

          <!-- RIGHT: Mini Player -->
          <div class="mini-player" @click="router.push('/player?from=friends-radio')">
            <div class="mp-cover" :style="{ background: activeSession.color+'33' }">
              <span class="mp-cover-icon">{{ activeSession.icon }}</span>
            </div>
            <div class="mp-song-info">
              <span class="mp-name">{{ activeSession.currentSong }}</span>
              <span class="mp-artist">{{ activeSession.currentArtist }}</span>
            </div>
            <!-- Progress bar -->
            <div class="mp-progress">
              <div class="mp-fill" :style="{ width: progressPct+'%', background: activeSession.color }"></div>
              <div class="mp-dot"  :style="{ left: progressPct+'%',  background: activeSession.color }"></div>
            </div>
            <!-- Controls -->
            <div class="mp-controls">
              <button class="mp-tip" @click.stop title="Künstler unterstützen">€</button>
              <button class="mp-ctrl" @click.stop>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
              </button>
              <button class="mp-play-btn" :style="{ background: activeSession.color }" @click.stop="togglePlay">
                <svg v-if="isPlaying" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
              </button>
              <button class="mp-ctrl" @click.stop>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm9-12v12h2V6h-2z"/></svg>
              </button>
              <button class="mp-heart" :class="{ liked: isLiked }" @click.stop="isLiked = !isLiked">
                <svg width="13" height="13" viewBox="0 0 24 24" :fill="isLiked?'currentColor':'none'" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Action buttons row (above chat/player) -->
        <div class="action-row">
          <button class="action-pill" :class="{ active: showQueue }" @click="showQueue = !showQueue">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
            Warteschlange
          </button>
          <button class="action-pill action-pill--vote" :class="{ voted: hasVoted }" @click="voteSkip">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M6 18l8.5-6L6 6v12zm9-12v12h2V6h-2z"/></svg>
            Next Song Vote
            <span class="vote-count">{{ voteCount }}/{{ Math.ceil(activeSession.memberList.length / 2) }}</span>
          </button>
        </div>

        <!-- Queue panel (slides in above action row) -->
        <transition name="queue-slide">
          <div class="queue-panel" v-if="showQueue">
            <div class="qp-head">
              <span class="qp-title">Warteschlange</span>
              <button class="qp-add" @click="addToQueue">+ Song hinzufügen</button>
              <button class="qp-close" @click="showQueue = false">✕</button>
            </div>
            <div class="queue-list">
              <div
                v-for="(item, idx) in queue" :key="item.id"
                class="qi" :class="{ 'qi--current': idx===0 }"
                :style="{ '--i': idx }"
              >
                <span class="qi-num">{{ idx===0 ? '▶' : idx }}</span>
                <div class="qi-info">
                  <span class="qi-name">{{ item.name }}</span>
                  <span class="qi-artist">{{ item.artist }}</span>
                </div>
                <span class="qi-by">{{ item.addedBy }}</span>
              </div>
            </div>
          </div>
        </transition>

        <!-- Members -->
        <div class="members-row">
          <div v-for="m in activeSession.memberList" :key="m.id" class="member-chip">
            <div class="mc-av" :style="{ background: m.color }">{{ m.initials }}</div>
            <span class="mc-name">{{ m.name }}</span>
          </div>
        </div>

      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const friendSessions = ref([
  { id:1, name:'Berliner Beats Live', host:'maxmuster', members:4, icon:'⚡', color:'#ff5a32', currentSong:'Midnight City', currentArtist:'M83' },
  { id:2, name:'Lo-Fi Abend',         host:'sara.wav',  members:7, icon:'🌙', color:'#5b6aff', currentSong:'Kiara',         currentArtist:'Bonobo' },
  { id:3, name:'Workout Mix',          host:'tom_radio', members:2, icon:'⚡', color:'#32c8a0', currentSong:'Power',         currentArtist:'Kanye West' },
])

const activeSession = ref(null)
const showQueue     = ref(false)
const hasVoted      = ref(false)
const voteCount     = ref(1)
const votesNeeded   = ref(3)
const isPlaying     = ref(true)
const isLiked       = ref(false)
const currentTime   = ref(67)
const songDuration  = ref(243)
const progressPct   = computed(() => (currentTime.value / songDuration.value) * 100)

const queue = ref([
  { id:1, name:'Midnight City',  artist:'M83',         addedBy:'max' },
  { id:2, name:'Kiara',          artist:'Bonobo',      addedBy:'sara' },
  { id:3, name:'Nights',         artist:'Frank Ocean', addedBy:'du' },
  { id:4, name:'Digital Love',   artist:'Daft Punk',   addedBy:'max' },
])

// Chat
const chatExpanded = ref(true)
const chatInput    = ref('')
const unreadChat   = ref(0)
const miniChatRef  = ref(null)
const chatMessages = ref([
  { id:1, me:false, author:'max',  text:'krasser song!' },
  { id:2, me:false, author:'sara', text:'ja mega drop 🔥' },
  { id:3, me:true,  author:'du',   text:'nächster ist auch gut' },
  { id:4, me:false, author:'tom',  text:'wer hat den hinzugefügt?' },
])

let ticker = null, incomingTimer = null

function startTicker() {
  ticker = setInterval(() => { if (isPlaying.value && currentTime.value < songDuration.value) currentTime.value++ }, 1000)
}
function togglePlay() { isPlaying.value = !isPlaying.value }
function formatTime(s) { return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}` }

function simulateIncoming() {
  const msgs = ['nice!','🎵','wann kommt der drop?','legendär','skip!','🔥🔥']
  const authors = ['max','sara','tom']
  incomingTimer = setInterval(() => {
    if (!chatExpanded.value) unreadChat.value++
    chatMessages.value.push({ id:Date.now(), me:false, author:authors[Math.floor(Math.random()*authors.length)], text:msgs[Math.floor(Math.random()*msgs.length)] })
    nextTick(() => scrollChat())
  }, 7000)
}

function sendChatMsg() {
  const text = chatInput.value.trim()
  if (!text) return
  chatMessages.value.push({ id:Date.now(), me:true, author:'du', text })
  chatInput.value = ''
  nextTick(() => scrollChat())
}
function scrollChat() { if (miniChatRef.value) miniChatRef.value.scrollTop = miniChatRef.value.scrollHeight }

function createSession() {
  activeSession.value = { id:99, name:'Meine Session', host:'du', members:1, icon:'◈', color:'#c864f0', currentSong:'Kiara', currentArtist:'Bonobo', memberList:[{ id:1, name:'du', initials:'DU', color:'#c864f0' }] }
  startTicker(); simulateIncoming()
  nextTick(scrollChat)
}
function joinSession(s) {
  activeSession.value = { ...s, memberList:[{ id:1, name:s.host, initials:s.host.slice(0,2).toUpperCase(), color:s.color },{ id:2, name:'du', initials:'DU', color:'#f0c832' },{ id:3, name:'n.soundz', initials:'NS', color:'#c864f0' }] }
  startTicker(); simulateIncoming()
  nextTick(scrollChat)
}
function leaveSession() {
  activeSession.value = null; clearInterval(ticker); clearInterval(incomingTimer)
  showQueue.value = false; isPlaying.value = false
}
function voteSkip() {
  if (hasVoted.value) return
  hasVoted.value = true
  voteCount.value++
  // Check majority: more than half of members voted
  const majority = Math.ceil(activeSession.value.memberList.length / 2)
  if (voteCount.value >= majority) {
    // Skip song: rotate queue
    if (queue.value.length > 1) queue.value.push(queue.value.shift())
    activeSession.value.currentSong   = queue.value[0].name
    activeSession.value.currentArtist = queue.value[0].artist
    currentTime.value = 0
    // Reset all votes
    voteCount.value  = 0
    hasVoted.value   = false
    // Visual feedback in chat
    chatMessages.value.push({ id: Date.now(), me: false, author: 'System', text: '⏭ Song übersprungen — Mehrheit hat gevoted!' })
    nextTick(() => scrollChat())
  }
}
function addToQueue() {
  const songs = [{ name:'Thinkin Bout You', artist:'Frank Ocean' },{ name:'Sunset Lover', artist:'Petit Biscuit' },{ name:'Experience', artist:'Einaudi' }]
  const pick = songs[Math.floor(Math.random()*songs.length)]
  queue.value.push({ id:Date.now(), ...pick, addedBy:'du' })
}

const glowStyle = computed(() => activeSession.value
  ? { background:`radial-gradient(ellipse 70% 50% at 50% 80%, ${activeSession.value.color}15 0%, transparent 70%)` }
  : { background:'radial-gradient(ellipse 60% 40% at 30% 20%, rgba(91,106,255,0.07) 0%, transparent 70%)' }
)

onUnmounted(() => { clearInterval(ticker); clearInterval(incomingTimer) })
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.fr-page {
  min-height: 100vh; background: #0a0a0f; color: #f0ede6;
  font-family: 'DM Sans', sans-serif;
  display: flex; flex-direction: column; align-items: center;
  padding: 0 1rem 2rem; position: relative; overflow-x: hidden;
}
.bg-noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size: 180px; opacity: 0.6; }
.bg-glow { position: fixed; inset: 0; pointer-events: none; z-index: 0; transition: background 0.8s; }

/* Ad */
.ad-banner { position: relative; z-index: 1; width: 100%; max-width: 728px; min-height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 1px solid rgba(240,237,230,0.07); padding: 0.75rem 0; margin-bottom: 1rem; }
.ad-label { position: absolute; top: 4px; left: 0; font-size: 0.6rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.2); }
.ad-placeholder { width: 100%; max-width: 728px; height: 90px; background: rgba(240,237,230,0.03); border: 1px dashed rgba(240,237,230,0.1); border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,237,230,0.15); }

.back-btn { background: none; border: none; cursor: pointer; color: rgba(240,237,230,0.35); font-family: 'DM Sans', sans-serif; font-size: 0.78rem; letter-spacing: 0.1em; padding: 0; transition: color 0.2s; flex-shrink: 0; }
.back-btn:hover { color: #ff5a32; }

/* ── LOBBY ── */
.top-bar { position: relative; z-index: 1; width: 100%; max-width: 520px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 2rem; padding-top: 0.5rem; }
.page-title { font-family: 'Bebas Neue', cursive; font-size: 2rem; letter-spacing: 0.2em; color: #f0ede6; }
.create-card { position: relative; z-index: 1; width: 100%; max-width: 520px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: rgba(200,100,240,0.08); border: 1px solid rgba(200,100,240,0.25); border-radius: 6px; padding: 1.1rem 1.3rem; margin-bottom: 2rem; animation: fadeDown 0.5s ease both; }
.cc-left { display: flex; align-items: center; gap: 0.85rem; }
.cc-icon { font-size: 1.6rem; color: #c864f0; }
.cc-text { display: flex; flex-direction: column; gap: 0.15rem; }
.cc-title { font-family: 'Bebas Neue', cursive; font-size: 1.1rem; letter-spacing: 0.1em; color: #f0ede6; }
.cc-sub { font-size: 0.7rem; color: rgba(240,237,230,0.35); }
.cc-btn { font-family: 'Bebas Neue', cursive; font-size: 0.95rem; letter-spacing: 0.12em; background: #c864f0; border: none; border-radius: 3px; padding: 0.55rem 1.2rem; color: #0a0a0f; cursor: pointer; white-space: nowrap; transition: transform 0.15s; box-shadow: 0 0 18px rgba(200,100,240,0.4); }
.cc-btn:hover { transform: scale(1.04); }
.section { position: relative; z-index: 1; width: 100%; max-width: 520px; }
.section-title { font-family: 'Bebas Neue', cursive; font-size: 0.95rem; letter-spacing: 0.18em; color: rgba(240,237,230,0.3); margin-bottom: 0.85rem; }
.session-list { display: flex; flex-direction: column; gap: 0.6rem; }
.session-row { display: flex; align-items: center; gap: 1rem; background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.08); border-left: 3px solid var(--color); border-radius: 4px; padding: 0.9rem 1rem; cursor: pointer; opacity: 0; transform: translateY(6px); animation: slideUp 0.38s ease forwards; animation-delay: calc(var(--i)*60ms); transition: background 0.2s; }
.session-row:hover { background: rgba(240,237,230,0.05); }
.sr-cover { width: 46px; height: 46px; border-radius: 8px; border: 1px solid; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 1.4rem; }
.sr-info { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
.sr-name { font-family: 'Bebas Neue', cursive; font-size: 1rem; letter-spacing: 0.08em; color: #f0ede6; }
.sr-meta { font-size: 0.68rem; color: rgba(240,237,230,0.3); }
.sr-now { display: flex; align-items: center; gap: 0.4rem; }
.np-dot { width: 5px; height: 5px; border-radius: 50%; background: #32c8a0; animation: pulse 1.4s ease infinite; flex-shrink: 0; }
.sr-song { font-size: 0.7rem; color: rgba(240,237,230,0.5); }
.sr-join-btn { font-size: 0.72rem; color: var(--color); background: none; border: 1px solid color-mix(in srgb, var(--color) 40%, transparent); border-radius: 3px; padding: 0.3rem 0.65rem; cursor: pointer; white-space: nowrap; transition: background 0.2s; }
.sr-join-btn:hover { background: color-mix(in srgb, var(--color) 15%, transparent); }

/* ── SESSION ── */
.session-wrap { position: relative; z-index: 1; width: 100%; max-width: 560px; display: flex; flex-direction: column; gap: 0.85rem; animation: fadeDown 0.4s ease both; }

.sess-topbar { display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0 0; }
.sess-title-block { display: flex; flex-direction: column; align-items: center; gap: 0.2rem; text-align: center; }
.sh-live { display: inline-flex; align-items: center; gap: 0.35rem; background: rgba(255,50,50,0.15); border: 1px solid rgba(255,50,50,0.3); border-radius: 3px; padding: 0.15rem 0.45rem; font-size: 0.55rem; letter-spacing: 0.18em; color: #ff5050; font-weight: 600; }
.live-dot { width: 5px; height: 5px; border-radius: 50%; background: #ff5050; animation: pulse 1.2s ease infinite; }
.sh-title { font-family: 'Bebas Neue', cursive; font-size: 1.5rem; letter-spacing: 0.15em; color: #f0ede6; line-height: 1; }
.sh-meta { font-size: 0.62rem; color: rgba(240,237,230,0.3); }

/* ── MAIN BODY: chat left, player right ── */
.sess-body {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  align-items: stretch;
}

/* Chat panel */
.chat-panel {
  background: rgba(240,237,230,0.03);
  border: 1px solid rgba(240,237,230,0.08);
  border-radius: 8px; overflow: hidden;
  display: flex; flex-direction: column;
  min-height: 180px;
}
.cp-header { display: flex; align-items: center; gap: 0.5rem; padding: 0.55rem 0.85rem; cursor: pointer; background: rgba(240,237,230,0.03); border-bottom: 1px solid rgba(240,237,230,0.06); user-select: none; }
.cp-title { font-family: 'Bebas Neue', cursive; font-size: 0.82rem; letter-spacing: 0.12em; color: rgba(240,237,230,0.5); flex: 1; }
.cp-unread { background: #ff5a32; color: #0a0a0f; font-size: 0.55rem; font-weight: 700; border-radius: 99px; padding: 0.05rem 0.35rem; }
.cp-toggle { font-size: 0.55rem; color: rgba(240,237,230,0.25); }
.cp-messages { flex: 1; overflow-y: auto; padding: 0.6rem 0.85rem; display: flex; flex-direction: column; gap: 0.3rem; min-height: 100px; max-height: 160px; }
.cp-messages::-webkit-scrollbar { width: 2px; }
.cp-messages::-webkit-scrollbar-thumb { background: rgba(240,237,230,0.08); }
.cp-msg { font-size: 0.7rem; color: rgba(240,237,230,0.55); line-height: 1.4; word-break: break-word; }
.cp-msg--me { text-align: right; color: rgba(240,237,230,0.8); }
.cp-author { color: rgba(240,237,230,0.3); }
.cp-input-row { display: flex; gap: 0.4rem; padding: 0.5rem 0.7rem; border-top: 1px solid rgba(240,237,230,0.06); }
.cp-input { flex: 1; background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.1); border-radius: 99px; padding: 0.28rem 0.65rem; font-family: 'DM Sans', sans-serif; font-size: 0.7rem; color: #f0ede6; outline: none; }
.cp-input::placeholder { color: rgba(240,237,230,0.2); }
.cp-send { background: rgba(240,237,230,0.07); border: 1px solid rgba(240,237,230,0.1); border-radius: 50%; width: 24px; height: 24px; color: rgba(240,237,230,0.3); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; flex-shrink: 0; transition: all 0.2s; }
.cp-send.ready { background: #5b6aff; border-color: #5b6aff; color: white; }

/* Mini player */
.mini-player {
  background: rgba(240,237,230,0.03);
  border: 1px solid rgba(240,237,230,0.08);
  border-radius: 8px;
  padding: 0.85rem;
  display: flex; flex-direction: column; gap: 0.6rem;
  cursor: pointer; transition: background 0.2s;
}
.mini-player:hover { background: rgba(240,237,230,0.05); }
.mp-cover { width: 100%; aspect-ratio: 1; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 2.8rem; box-shadow: 0 8px 24px rgba(0,0,0,0.4); flex-shrink: 0; }
.mp-song-info { display: flex; flex-direction: column; gap: 0.15rem; }
.mp-name { font-family: 'Bebas Neue', cursive; font-size: 1rem; letter-spacing: 0.08em; color: #f0ede6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mp-artist { font-size: 0.65rem; color: rgba(240,237,230,0.4); }
.mp-progress { position: relative; height: 3px; background: rgba(240,237,230,0.1); border-radius: 99px; }
.mp-fill { height: 100%; border-radius: 99px; transition: width 1s linear; }
.mp-dot { position: absolute; width: 9px; height: 9px; border-radius: 50%; top: 50%; transform: translate(-50%,-50%); transition: left 1s linear; }
.mp-controls { display: flex; align-items: center; justify-content: center; gap: 0.6rem; }
.mp-tip { background: rgba(240,200,50,0.08); border: 1px solid rgba(240,200,50,0.2); border-radius: 6px; color: rgba(240,200,50,0.5); font-size: 0.78rem; font-weight: 600; width: 26px; height: 26px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.mp-tip:hover { background: rgba(240,200,50,0.18); border-color: rgba(240,200,50,0.45); color: #f0c832; }
.mp-ctrl { background: none; border: none; color: rgba(240,237,230,0.4); cursor: pointer; display: flex; align-items: center; transition: color 0.2s, transform 0.15s; padding: 0.2rem; }
.mp-ctrl:hover { color: #f0ede6; transform: scale(1.1); }
.mp-play-btn { width: 34px; height: 34px; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #0a0a0f; box-shadow: 0 0 12px currentColor; transition: transform 0.15s; }
.mp-play-btn:hover { transform: scale(1.08); }
.mp-heart { background: none; border: none; color: rgba(240,237,230,0.3); cursor: pointer; display: flex; align-items: center; padding: 0.2rem; transition: color 0.2s; }
.mp-heart.liked { color: #ff5a32; }

/* Action row */
.action-row { display: flex; gap: 0.6rem; }
.action-pill { display: flex; align-items: center; gap: 0.4rem; font-family: 'DM Sans', sans-serif; font-size: 0.72rem; letter-spacing: 0.05em; background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.1); color: rgba(240,237,230,0.45); border-radius: 99px; padding: 0.42rem 1rem; cursor: pointer; transition: all 0.2s; flex: 1; justify-content: center; }
.action-pill:hover, .action-pill.active { background: rgba(240,237,230,0.1); border-color: rgba(240,237,230,0.25); color: #f0ede6; }
.action-pill--vote.voted { background: rgba(255,90,50,0.15); border-color: rgba(255,90,50,0.4); color: #ff5a32; }
.vote-count { background: rgba(255,255,255,0.1); border-radius: 99px; padding: 0.05rem 0.38rem; font-size: 0.6rem; }

/* Queue panel */
.queue-panel { background: rgba(12,12,20,0.96); border: 1px solid rgba(240,237,230,0.1); border-radius: 8px; overflow: hidden; }
.qp-head { display: flex; align-items: center; gap: 0.6rem; padding: 0.7rem 1rem; border-bottom: 1px solid rgba(240,237,230,0.07); }
.qp-title { font-family: 'Bebas Neue', cursive; font-size: 0.88rem; letter-spacing: 0.15em; color: rgba(240,237,230,0.4); flex: 1; }
.qp-add { font-size: 0.7rem; background: rgba(240,237,230,0.06); border: 1px solid rgba(240,237,230,0.12); color: rgba(240,237,230,0.55); border-radius: 3px; padding: 0.25rem 0.6rem; cursor: pointer; transition: all 0.2s; }
.qp-add:hover { color: #f0ede6; border-color: rgba(240,237,230,0.25); }
.qp-close { background: none; border: none; color: rgba(240,237,230,0.25); cursor: pointer; font-size: 0.75rem; transition: color 0.2s; }
.qp-close:hover { color: #ff5a32; }
.queue-list { max-height: 200px; overflow-y: auto; }
.queue-list::-webkit-scrollbar { width: 3px; }
.queue-list::-webkit-scrollbar-thumb { background: rgba(240,237,230,0.08); }
.qi { display: flex; align-items: center; gap: 0.75rem; padding: 0.55rem 1rem; border-bottom: 1px solid rgba(240,237,230,0.04); opacity: 0; animation: slideUp 0.3s ease forwards; animation-delay: calc(var(--i)*35ms); }
.qi--current { background: rgba(240,237,230,0.03); }
.qi-num { width: 18px; font-size: 0.65rem; color: rgba(240,237,230,0.22); text-align: center; flex-shrink: 0; }
.qi--current .qi-num { color: #32c8a0; }
.qi-info { flex: 1; display: flex; flex-direction: column; gap: 0.08rem; }
.qi-name { font-size: 0.8rem; font-weight: 500; color: #f0ede6; }
.qi-artist { font-size: 0.62rem; color: rgba(240,237,230,0.3); }
.qi-by { font-size: 0.6rem; color: rgba(240,237,230,0.18); flex-shrink: 0; }

/* Members */
.members-row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.member-chip { display: flex; align-items: center; gap: 0.35rem; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.07); border-radius: 99px; padding: 0.22rem 0.65rem 0.22rem 0.28rem; }
.mc-av { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.55rem; font-weight: 700; color: #0a0a0f; }
.mc-name { font-size: 0.65rem; color: rgba(240,237,230,0.45); }

/* Transitions */
.queue-slide-enter-active, .queue-slide-leave-active { transition: max-height 0.35s ease, opacity 0.3s; overflow: hidden; }
.queue-slide-enter-from, .queue-slide-leave-to { max-height: 0; opacity: 0; }
.queue-slide-enter-to, .queue-slide-leave-from { max-height: 350px; opacity: 1; }

@keyframes fadeDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
