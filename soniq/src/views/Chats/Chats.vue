<template>
  <div class="chats-page">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>

    <!-- Ad Banner -->
    <div class="ad-banner">
      <span class="ad-label">Anzeige</span>
      <slot name="ad-top">
        <div class="ad-placeholder">Advertisement</div>
      </slot>
    </div>

    <!-- Header -->
    <div class="top-bar">
      <button class="back-btn" @click="router.push('/')">← Zurück</button>
      <h1 class="page-title">CHATS</h1>
      <button class="compose-btn" @click="composing = true" title="Neue Nachricht">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
      </button>
    </div>

    <!-- Chat window (overlay) -->
    <transition name="chat-slide">
      <div class="chat-window" v-if="activeChat">
        <div class="cw-header">
          <button class="cw-back" @click="activeChat = null">← Zurück</button>
          <div class="cw-avatar" :style="{ background: activeChat.color }">
            {{ activeChat.initials }}
            <span class="online-dot" v-if="activeChat.online"></span>
          </div>
          <div class="cw-meta">
            <span class="cw-name">{{ activeChat.name }}</span>
            <span class="cw-status">{{ activeChat.online ? 'Online' : 'Offline' }}</span>
          </div>
          <button class="cw-more">···</button>
        </div>

        <!-- Now playing shared song -->
        <div class="cw-np" v-if="activeChat.sharedSong">
          <span class="np-dot-sm"></span>
          <span class="cw-np-text">hört gerade: <strong>{{ activeChat.sharedSong }}</strong></span>
          <button class="cw-np-listen" @click="router.push('/player')">▶</button>
        </div>

        <!-- Messages -->
        <div class="cw-messages" ref="msgContainer">
          <div
            v-for="msg in activeChat.messages"
            :key="msg.id"
            class="msg-row"
            :class="{ 'msg-row--me': msg.me }"
          >
            <div class="msg-bubble" :class="{ 'msg-bubble--me': msg.me }">
              <span v-if="msg.type === 'song'" class="msg-song">
                <span class="ms-icon">♩</span>
                <span class="ms-info">
                  <span class="ms-name">{{ msg.songName }}</span>
                  <span class="ms-artist">{{ msg.songArtist }}</span>
                </span>
                <button class="ms-play" @click="router.push('/player')">▶</button>
              </span>
              <span v-else>{{ msg.text }}</span>
              <span class="msg-time">{{ msg.time }}</span>
            </div>
          </div>
        </div>

        <!-- Input -->
        <div class="cw-input-wrap">
          <button class="cw-share-song" title="Song teilen" @click="shareCurrentSong">♩</button>
          <input
            v-model="newMessage"
            class="cw-input"
            :placeholder="`Nachricht an ${activeChat.name}...`"
            @keydown.enter="sendMessage"
          />
          <button class="cw-send" :class="{ ready: newMessage.trim() }" @click="sendMessage">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    </transition>

    <!-- Main list view -->
    <div class="lists-wrap" v-show="!activeChat">

      <!-- New messages -->
      <section class="section" v-if="newMsgs.length">
        <div class="section-header">
          <h2 class="section-title">Neue Nachrichten</h2>
          <span class="unread-badge">{{ newMsgs.length }}</span>
        </div>
        <div class="chat-list">
          <div
            v-for="(chat, idx) in newMsgs"
            :key="chat.id"
            class="chat-row chat-row--unread"
            :style="{ '--i': idx, '--color': chat.color }"
            @click="openChat(chat)"
          >
            <div class="chat-avatar" :style="{ background: chat.color }">
              {{ chat.initials }}
              <span class="online-dot" v-if="chat.online"></span>
            </div>
            <div class="chat-info">
              <div class="chat-name-row">
                <span class="chat-name">{{ chat.name }}</span>
                <span class="chat-time">{{ chat.time }}</span>
              </div>
              <span class="chat-preview">{{ chat.preview }}</span>
            </div>
            <span class="unread-dot"></span>
          </div>
        </div>
      </section>

      <!-- Tabs: DMs / Gruppen -->
      <section class="section">
        <div class="tabs">
          <button class="tab" :class="{ active: tab === 'dms' }"    @click="tab = 'dms'">DMs</button>
          <button class="tab" :class="{ active: tab === 'groups' }" @click="tab = 'groups'">Gruppenchats</button>
        </div>

        <!-- DMs -->
        <div class="chat-list" v-if="tab === 'dms'">
          <div
            v-for="(chat, idx) in dms"
            :key="chat.id"
            class="chat-row"
            :style="{ '--i': idx, '--color': chat.color }"
            @click="openChat(chat)"
          >
            <div class="chat-avatar" :style="{ background: chat.color }">
              {{ chat.initials }}
              <span class="online-dot" v-if="chat.online"></span>
            </div>
            <div class="chat-info">
              <div class="chat-name-row">
                <span class="chat-name">{{ chat.name }}</span>
                <span class="chat-time">{{ chat.time }}</span>
              </div>
              <div class="chat-preview-row">
                <span class="chat-preview" :class="{ 'chat-preview--song': chat.isSong }">
                  <span v-if="chat.isSong">♩ </span>{{ chat.preview }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Group chats -->
        <div class="chat-list" v-if="tab === 'groups'">
          <div
            v-for="(chat, idx) in groupChats"
            :key="chat.id"
            class="chat-row"
            :style="{ '--i': idx, '--color': chat.color }"
            @click="openChat(chat)"
          >
            <div class="chat-avatar chat-avatar--group" :style="{ background: chat.color + '33', borderColor: chat.color + '66' }">
              {{ chat.icon }}
            </div>
            <div class="chat-info">
              <div class="chat-name-row">
                <span class="chat-name">{{ chat.name }}</span>
                <span class="chat-time">{{ chat.time }}</span>
              </div>
              <div class="chat-preview-row">
                <span class="chat-preview">
                  <span class="preview-author">{{ chat.lastAuthor }}: </span>{{ chat.preview }}
                </span>
              </div>
            </div>
            <span class="member-count">{{ chat.members }}👤</span>
          </div>
        </div>
      </section>
    </div>

  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useRouter } from 'vue-router'

const router      = useRouter()
const tab         = ref('dms')
const activeChat  = ref(null)
const newMessage  = ref('')
const composing   = ref(false)
const msgContainer = ref(null)

// ── New messages ───────────────────────────────────────
const newMsgs = ref([
  {
    id: 1, name: 'maxmuster', initials: 'MM', color: '#5b6aff', online: true,
    preview: 'Hör dir das mal an 🔥', time: '2 Min',
    sharedSong: 'Bonobo · Kiara',
    messages: [
      { id: 1, me: false, text: 'Hey! Hör dir das mal an 🔥', time: '14:21' },
      { id: 2, me: false, type: 'song', songName: 'Kiara', songArtist: 'Bonobo', time: '14:21' },
    ],
  },
  {
    id: 2, name: 'sara.wav', initials: 'SW', color: '#32c8a0', online: true,
    preview: 'Kommst du heute Abend?', time: '12 Min',
    sharedSong: null,
    messages: [
      { id: 1, me: false, text: 'Kommst du heute Abend?', time: '14:10' },
    ],
  },
])

// ── DMs ───────────────────────────────────────────────
const dms = ref([
  {
    id: 10, name: 'maxmuster',  initials: 'MM', color: '#5b6aff', online: true,
    preview: 'Hör dir das mal an 🔥', time: '2 Min', isSong: true,
    sharedSong: 'Bonobo · Kiara',
    messages: [
      { id: 1, me: true,  text: 'Was hörst du gerade?', time: '14:20' },
      { id: 2, me: false, text: 'Hey! Hör dir das mal an 🔥', time: '14:21' },
      { id: 3, me: false, type: 'song', songName: 'Kiara', songArtist: 'Bonobo', time: '14:21' },
    ],
  },
  {
    id: 11, name: 'sara.wav',   initials: 'SW', color: '#32c8a0', online: true,
    preview: 'Kommst du heute Abend?', time: '12 Min', isSong: false,
    sharedSong: null,
    messages: [
      { id: 1, me: false, text: 'Kommst du heute Abend?', time: '14:10' },
      { id: 2, me: true,  text: 'Ja, gegen 20 Uhr!', time: '14:11' },
      { id: 3, me: false, text: 'Super 🎉', time: '14:11' },
    ],
  },
  {
    id: 12, name: 'tom_radio',  initials: 'TR', color: '#ff8c55', online: false,
    preview: 'nice playlist bro', time: 'gestern', isSong: false,
    sharedSong: null,
    messages: [
      { id: 1, me: true,  text: 'Check mal meine neue Playlist', time: 'gestern' },
      { id: 2, me: false, text: 'nice playlist bro', time: 'gestern' },
    ],
  },
  {
    id: 13, name: 'n.soundz',   initials: 'NS', color: '#c864f0', online: false,
    preview: 'Welcher Song war das?', time: 'Mo', isSong: false,
    sharedSong: null,
    messages: [
      { id: 1, me: false, text: 'Welcher Song war das gerade?', time: 'Mo' },
    ],
  },
])

// ── Group Chats ────────────────────────────────────────
const groupChats = ref([
  {
    id: 20, name: 'Berliner Beats', icon: '⚡', color: '#ff5a32',
    preview: 'krasser drop omg', lastAuthor: 'max', time: '1 Std', members: 12,
    sharedSong: null,
    messages: [
      { id: 1, me: false, text: 'habt ihr den neuen track gehört?', time: '13:00' },
      { id: 2, me: true,  text: 'ja mega!', time: '13:01' },
      { id: 3, me: false, text: 'krasser drop omg', time: '13:45' },
    ],
  },
  {
    id: 21, name: 'Lo-Fi Study', icon: '◎', color: '#5b6aff',
    preview: 'guter mix heute', lastAuthor: 'sara', time: '3 Std', members: 34,
    sharedSong: null,
    messages: [
      { id: 1, me: false, text: 'wer hat den stream gestartet?', time: '11:00' },
      { id: 2, me: false, text: 'guter mix heute', time: '11:30' },
    ],
  },
  {
    id: 22, name: 'Weekend Roadtrip', icon: '◇', color: '#f0c832',
    preview: 'ich füge noch 3 songs hinzu', lastAuthor: 'du', time: 'gestern', members: 6,
    sharedSong: null,
    messages: [
      { id: 1, me: true, text: 'ich füge noch 3 songs hinzu', time: 'gestern' },
    ],
  },
])

// ── Actions ────────────────────────────────────────────
function openChat(chat) {
  activeChat.value = chat
  // Remove from new messages if present
  newMsgs.value = newMsgs.value.filter(m => m.id !== chat.id)
  nextTick(() => scrollToBottom())
}

function sendMessage() {
  const text = newMessage.value.trim()
  if (!text || !activeChat.value) return
  const now = new Date()
  const time = `${now.getHours()}:${String(now.getMinutes()).padStart(2,'0')}`
  activeChat.value.messages.push({ id: Date.now(), me: true, text, time })
  newMessage.value = ''
  nextTick(() => scrollToBottom())
}

function shareCurrentSong() {
  if (!activeChat.value) return
  activeChat.value.messages.push({
    id: Date.now(), me: true, type: 'song',
    songName: 'Kiara', songArtist: 'Bonobo',
    time: new Date().toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' }),
  })
  nextTick(() => scrollToBottom())
}

function scrollToBottom() {
  if (msgContainer.value) {
    msgContainer.value.scrollTop = msgContainer.value.scrollHeight
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.chats-page {
  min-height: 100vh; background: #0a0a0f; color: #f0ede6;
  font-family: 'DM Sans', sans-serif;
  display: flex; flex-direction: column; align-items: center;
  padding: 0 0 4rem; position: relative; overflow-x: hidden;
}
.bg-noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size: 180px; opacity: 0.6; }
.bg-glow { position: fixed; inset: 0; pointer-events: none; z-index: 0; background: radial-gradient(ellipse 55% 40% at 20% 20%, rgba(91,106,255,0.06) 0%, transparent 70%); }

/* Ad */
.ad-banner { position: relative; z-index: 1; width: 100%; max-width: 728px; min-height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 1px solid rgba(240,237,230,0.07); padding: 0.75rem 1.5rem; margin-bottom: 0; }
.ad-label { position: absolute; top: 4px; left: 1.5rem; font-size: 0.6rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.2); }
.ad-placeholder { width: 100%; max-width: 728px; height: 90px; background: rgba(240,237,230,0.03); border: 1px dashed rgba(240,237,230,0.1); border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,237,230,0.15); }

/* Top bar */
.top-bar { position: relative; z-index: 1; width: 100%; max-width: 520px; display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.5rem 0.75rem; }
.back-btn { background: none; border: none; cursor: pointer; color: rgba(240,237,230,0.35); font-family: 'DM Sans', sans-serif; font-size: 0.78rem; letter-spacing: 0.1em; padding: 0; transition: color 0.2s; }
.back-btn:hover { color: #ff5a32; }
.page-title { font-family: 'Bebas Neue', cursive; font-size: 1.8rem; letter-spacing: 0.2em; color: #f0ede6; }
.compose-btn { background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.1); border-radius: 6px; padding: 0.4rem 0.5rem; color: rgba(240,237,230,0.45); cursor: pointer; display: flex; align-items: center; transition: color 0.2s, border-color 0.2s; line-height: 0; }
.compose-btn:hover { color: #f0ede6; border-color: rgba(240,237,230,0.25); }

/* Lists */
.lists-wrap { position: relative; z-index: 1; width: 100%; max-width: 520px; padding: 0 1.5rem; }

.section { margin-bottom: 1.75rem; }
.section-header { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.75rem; }
.section-title { font-family: 'Bebas Neue', cursive; font-size: 0.95rem; letter-spacing: 0.18em; color: rgba(240,237,230,0.35); }
.unread-badge { background: #ff5a32; color: #0a0a0f; font-size: 0.6rem; font-weight: 700; border-radius: 99px; padding: 0.1rem 0.45rem; }

/* Tabs */
.tabs { display: flex; gap: 0.4rem; margin-bottom: 0.9rem; }
.tab { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; letter-spacing: 0.06em; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.09); color: rgba(240,237,230,0.4); padding: 0.42rem 1.1rem; border-radius: 99px; cursor: pointer; transition: all 0.2s; }
.tab:hover { color: #f0ede6; border-color: rgba(240,237,230,0.2); }
.tab.active { background: rgba(255,90,50,0.12); border-color: rgba(255,90,50,0.4); color: #ff5a32; }

/* Chat rows */
.chat-list { display: flex; flex-direction: column; gap: 0.3rem; }
.chat-row { display: flex; align-items: center; gap: 0.85rem; padding: 0.75rem 0.8rem; border-radius: 4px; cursor: pointer; opacity: 0; transform: translateY(5px); animation: slideUp 0.35s ease forwards; animation-delay: calc(var(--i) * 40ms); transition: background 0.15s; position: relative; }
.chat-row:hover { background: rgba(240,237,230,0.04); }
.chat-row--unread { background: rgba(255,90,50,0.04); border: 1px solid rgba(255,90,50,0.1); border-radius: 4px; }
.chat-row--unread:hover { background: rgba(255,90,50,0.08); }

.chat-avatar { width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; color: #0a0a0f; position: relative; }
.chat-avatar--group { border-radius: 10px; border: 1px solid; font-size: 1.1rem; color: inherit; }
.online-dot { position: absolute; bottom: 1px; right: 1px; width: 9px; height: 9px; border-radius: 50%; background: #32c8a0; border: 2px solid #0a0a0f; }
.unread-dot { width: 8px; height: 8px; border-radius: 50%; background: #ff5a32; flex-shrink: 0; box-shadow: 0 0 6px #ff5a32; }

.chat-info { flex: 1; display: flex; flex-direction: column; gap: 0.18rem; min-width: 0; }
.chat-name-row { display: flex; align-items: center; justify-content: space-between; }
.chat-name { font-size: 0.9rem; font-weight: 500; color: #f0ede6; }
.chat-time { font-size: 0.65rem; color: rgba(240,237,230,0.25); flex-shrink: 0; }
.chat-preview-row { display: flex; align-items: center; }
.chat-preview { font-size: 0.72rem; color: rgba(240,237,230,0.35); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chat-preview--song { color: #5b6aff; }
.preview-author { color: rgba(240,237,230,0.5); }
.member-count { font-size: 0.62rem; color: rgba(240,237,230,0.2); flex-shrink: 0; }

/* ── Chat Window ── */
.chat-window {
  position: fixed; inset: 0; z-index: 100;
  background: #0a0a0f;
  display: flex; flex-direction: column;
}

.cw-header {
  display: flex; align-items: center; gap: 0.8rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(240,237,230,0.07);
  background: rgba(10,10,15,0.95);
  backdrop-filter: blur(10px);
  flex-shrink: 0;
}
.cw-back { background: none; border: none; cursor: pointer; color: rgba(240,237,230,0.4); font-family: 'DM Sans', sans-serif; font-size: 0.78rem; letter-spacing: 0.08em; padding: 0; transition: color 0.2s; flex-shrink: 0; }
.cw-back:hover { color: #ff5a32; }
.cw-avatar { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; color: #0a0a0f; position: relative; }
.cw-meta { flex: 1; display: flex; flex-direction: column; gap: 0.08rem; }
.cw-name { font-size: 0.92rem; font-weight: 600; color: #f0ede6; }
.cw-status { font-size: 0.62rem; color: rgba(240,237,230,0.3); }
.cw-more { background: none; border: none; color: rgba(240,237,230,0.3); cursor: pointer; font-size: 1.1rem; letter-spacing: 2px; padding: 0 0.3rem; }

/* Now playing bar */
.cw-np { display: flex; align-items: center; gap: 0.6rem; padding: 0.55rem 1.25rem; background: rgba(91,106,255,0.08); border-bottom: 1px solid rgba(91,106,255,0.15); flex-shrink: 0; }
.np-dot-sm { width: 6px; height: 6px; border-radius: 50%; background: #32c8a0; animation: pulse 1.4s ease infinite; flex-shrink: 0; }
.cw-np-text { font-size: 0.72rem; color: rgba(240,237,230,0.5); flex: 1; }
.cw-np-text strong { color: rgba(240,237,230,0.75); }
.cw-np-listen { background: rgba(91,106,255,0.2); border: 1px solid rgba(91,106,255,0.35); border-radius: 4px; color: #5b6aff; font-size: 0.7rem; padding: 0.2rem 0.5rem; cursor: pointer; transition: background 0.2s; }
.cw-np-listen:hover { background: rgba(91,106,255,0.35); }

/* Messages */
.cw-messages { flex: 1; overflow-y: auto; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.6rem; }
.cw-messages::-webkit-scrollbar { width: 3px; }
.cw-messages::-webkit-scrollbar-thumb { background: rgba(240,237,230,0.1); border-radius: 2px; }

.msg-row { display: flex; }
.msg-row--me { justify-content: flex-end; }

.msg-bubble {
  max-width: 72%; background: rgba(240,237,230,0.07); border: 1px solid rgba(240,237,230,0.08);
  border-radius: 12px 12px 12px 3px; padding: 0.6rem 0.85rem;
  font-size: 0.88rem; color: #f0ede6; line-height: 1.45;
  display: flex; flex-direction: column; gap: 0.25rem;
  animation: msgPop 0.2s cubic-bezier(0.34,1.56,0.64,1) both;
}
.msg-bubble--me { background: rgba(91,106,255,0.18); border-color: rgba(91,106,255,0.25); border-radius: 12px 12px 3px 12px; }

.msg-time { font-size: 0.6rem; color: rgba(240,237,230,0.25); align-self: flex-end; }

/* Song message */
.msg-song { display: flex; align-items: center; gap: 0.65rem; }
.ms-icon { font-size: 1.1rem; color: #5b6aff; flex-shrink: 0; }
.ms-info { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; }
.ms-name { font-size: 0.82rem; font-weight: 500; color: #f0ede6; }
.ms-artist { font-size: 0.65rem; color: rgba(240,237,230,0.4); }
.ms-play { width: 28px; height: 28px; border-radius: 50%; background: #5b6aff; border: none; cursor: pointer; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; flex-shrink: 0; transition: transform 0.15s; }
.ms-play:hover { transform: scale(1.1); }

/* Input */
.cw-input-wrap { display: flex; align-items: center; gap: 0.6rem; padding: 0.9rem 1.25rem; border-top: 1px solid rgba(240,237,230,0.07); background: rgba(10,10,15,0.95); flex-shrink: 0; }
.cw-share-song { background: rgba(91,106,255,0.1); border: 1px solid rgba(91,106,255,0.2); border-radius: 6px; color: #5b6aff; font-size: 1rem; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: background 0.2s; }
.cw-share-song:hover { background: rgba(91,106,255,0.2); }
.cw-input { flex: 1; background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.1); border-radius: 20px; padding: 0.55rem 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; color: #f0ede6; outline: none; transition: border-color 0.2s; }
.cw-input:focus { border-color: rgba(91,106,255,0.4); }
.cw-input::placeholder { color: rgba(240,237,230,0.22); }
.cw-send { width: 36px; height: 36px; border-radius: 50%; background: rgba(240,237,230,0.08); border: 1px solid rgba(240,237,230,0.1); color: rgba(240,237,230,0.3); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s; }
.cw-send.ready { background: #5b6aff; border-color: #5b6aff; color: white; box-shadow: 0 0 14px rgba(91,106,255,0.5); }

/* Transitions */
.chat-slide-enter-active, .chat-slide-leave-active { transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s; }
.chat-slide-enter-from { transform: translateX(100%); opacity: 0; }
.chat-slide-leave-to   { transform: translateX(100%); opacity: 0; }

@keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
@keyframes msgPop { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
