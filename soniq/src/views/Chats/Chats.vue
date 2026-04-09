<template>
  <div class="chats-page">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>
    <AdBanner ad-slot="1918440727" />

    <!-- Chat window -->
    <transition name="chat-slide">
      <div class="chat-window" v-if="activeChat">
        <div class="cw-header">
          <button class="cw-back" @click="closeChat">← Zurück</button>
          <div class="cw-avatar" :style="activeChatStyle">
            <img v-if="activeChat.avatar" :src="activeChat.avatar" class="av-img" />
            <span v-else>{{ activeChat.name.slice(0,2).toUpperCase() }}</span>
          </div>
          <div class="cw-meta">
            <span class="cw-name">{{ activeChat.name }}</span>
            <span class="cw-type">{{ activeChat.type === 'group' ? 'Gruppe' : 'DM' }}</span>
          </div>
        </div>

        <div class="cw-messages" ref="msgRef">
          <div class="cw-loading" v-if="loadingMsgs">Lädt...</div>
          <template v-else>
            <div v-if="!social.messages.length" class="cw-empty">Noch keine Nachrichten. Schreib etwas!</div>
            <div v-for="msg in social.messages" :key="msg.id" class="msg-row" :class="{ 'msg-row--me': msg.fromId === auth.user?.id }">
              <div class="msg-bubble" :class="{ 'msg-bubble--me': msg.fromId === auth.user?.id }">
                <span class="msg-author" v-if="msg.fromId !== auth.user?.id && activeChat.type === 'group'">{{ msg.fromName }}</span>
                <span v-if="msg.songId" class="msg-song" @click="playSharedSong(msg)">
                  <span class="ms-icon">♩</span>
                  <span class="ms-info">
                    <span class="ms-name">{{ msg.songName }}</span>
                    <span class="ms-artist">{{ msg.songArtist }}</span>
                  </span>
                  <span class="ms-play">▶</span>
                </span>
                <span v-else>{{ msg.text }}</span>
                <span class="msg-time">{{ formatTime(msg.createdAt) }}</span>
              </div>
            </div>
          </template>
        </div>

        <div class="cw-input-wrap">
          <button class="cw-share-btn" title="Song teilen" @click="shareCurrentSong">♩</button>
          <input v-model="newMsg" class="cw-input" :placeholder="`Nachricht...`" @keydown.enter="sendMsg" />
          <button class="cw-send" :class="{ ready: newMsg.trim() }" @click="sendMsg">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    </transition>

    <!-- Main list -->
    <div class="lists-wrap" v-show="!activeChat">
      <div class="top-bar">
        <button class="back-btn" @click="router.push('/')">← Home</button>
        <h1 class="page-title">CHATS</h1>
        <div style="width:40px"></div>
      </div>

      <div class="not-logged-in" v-if="!auth.isLoggedIn">
        <p>Du musst eingeloggt sein.</p>
        <button class="login-btn" @click="router.push('/profile')">Zum Profil →</button>
      </div>

      <template v-else>
        <!-- Unread -->
        <section class="section" v-if="unread.length">
          <div class="section-header">
            <h2 class="section-title">Neue Nachrichten</h2>
            <span class="unread-badge">{{ unread.length }}</span>
          </div>
          <div class="chat-list">
            <div v-for="(c, idx) in unread" :key="c.id" class="chat-row chat-row--unread" :style="{ '--i': idx }" @click="openChat(c)">
              <div class="chat-avatar" :style="chatAvatarStyle(c)">
                <img v-if="c.avatar" :src="c.avatar" class="av-img" />
                <span v-else>{{ c.name.slice(0,2).toUpperCase() }}</span>
              </div>
              <div class="chat-info">
                <div class="chat-name-row"><span class="chat-name">{{ c.name }}</span><span class="chat-time">{{ formatTime(c.lastMessage?.createdAt) }}</span></div>
                <span class="chat-preview">{{ previewText(c.lastMessage) }}</span>
              </div>
              <span class="unread-dot"></span>
            </div>
          </div>
        </section>

        <!-- Tabs -->
        <section class="section">
          <div class="tabs">
            <button class="tab" :class="{ active: tab === 'dms' }"    @click="tab = 'dms'">DMs</button>
            <button class="tab" :class="{ active: tab === 'groups' }" @click="tab = 'groups'">Gruppenchats</button>
          </div>

          <div class="cw-loading" v-if="loadingConvos">Lädt...</div>

          <div class="chat-list" v-else-if="tab === 'dms'">
            <div v-if="!social.convos.dms?.length" class="empty-hint">Keine DMs. Füge Freunde hinzu!</div>
            <div v-for="(c, idx) in social.convos.dms" :key="c.id" class="chat-row" :style="{ '--i': idx }" @click="openChat(c)">
              <div class="chat-avatar" :style="chatAvatarStyle(c)">
                <img v-if="c.avatar" :src="c.avatar" class="av-img" />
                <span v-else>{{ c.name.slice(0,2).toUpperCase() }}</span>
              </div>
              <div class="chat-info">
                <div class="chat-name-row"><span class="chat-name">{{ c.name }}</span><span class="chat-time">{{ formatTime(c.lastMessage?.createdAt) }}</span></div>
                <span class="chat-preview">{{ previewText(c.lastMessage) }}</span>
              </div>
            </div>
          </div>

          <div class="chat-list" v-else>
            <div v-if="!social.convos.groups?.length" class="empty-hint">Keine Gruppen. Tritt einer bei!</div>
            <div v-for="(c, idx) in social.convos.groups" :key="c.id" class="chat-row" :style="{ '--i': idx }" @click="openChat(c)">
              <div class="chat-avatar chat-avatar--group" :style="{ background: (c.color||'#32c8a0')+'33', borderColor: (c.color||'#32c8a0')+'66' }">{{ c.icon || '⬡' }}</div>
              <div class="chat-info">
                <div class="chat-name-row"><span class="chat-name">{{ c.name }}</span><span class="chat-time">{{ formatTime(c.lastMessage?.createdAt) }}</span></div>
                <span class="chat-preview"><span class="preview-author" v-if="c.lastMessage?.fromName">{{ c.lastMessage.fromName }}: </span>{{ previewText(c.lastMessage) }}</span>
              </div>
              <span class="member-count">{{ c.members }}👤</span>
            </div>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>

<script setup>
import AdBanner from '@/components/AdBanner.vue'
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useSocialStore } from '@/stores/social'
import { useAuthStore }   from '@/stores/auth'
import { usePlayerStore } from '@/stores/player'

const router = useRouter()
const social = useSocialStore()
const auth   = useAuthStore()
const player = usePlayerStore()

const tab          = ref('dms')
const activeChat   = ref(null)
const newMsg       = ref('')
const msgRef       = ref(null)
const loadingConvos = ref(false)
const loadingMsgs  = ref(false)

let pollInterval = null

const unread = computed(() => {
  const all = [...(social.convos.dms || []), ...(social.convos.groups || [])]
  return all.filter(c => c.unread > 0)
})

onMounted(async () => {
  if (!auth.isLoggedIn) return
  loadingConvos.value = true
  await social.loadConversations()
  loadingConvos.value = false
})
onUnmounted(() => clearInterval(pollInterval))

const avatarColors = ['#5b6aff','#32c8a0','#ff5a32','#c864f0','#f0c832','#ff8c55']
function colorFor(name) { return avatarColors[name.charCodeAt(0) % avatarColors.length] }

const activeChatStyle = computed(() => {
  if (!activeChat.value) return {}
  if (activeChat.value.color) return { background: activeChat.value.color + '33', border: `1px solid ${activeChat.value.color}66`, borderRadius: '8px' }
  return { background: colorFor(activeChat.value.name) }
})

function chatAvatarStyle(c) {
  if (c.color) return { background: c.color + '33', borderColor: c.color + '66' }
  return { background: colorFor(c.name) }
}

async function openChat(c) {
  activeChat.value = c
  loadingMsgs.value = true
  await social.loadMessages(c.id)
  loadingMsgs.value = false
  nextTick(() => scrollBottom())
  // Poll for new messages every 3s
  clearInterval(pollInterval)
  pollInterval = setInterval(async () => {
    await social.pollMessages()
    nextTick(() => scrollBottom())
  }, 3000)
}

function closeChat() {
  clearInterval(pollInterval)
  activeChat.value = null
  social.activeChatId.value = null
}

async function sendMsg() {
  const text = newMsg.value.trim()
  if (!text || !activeChat.value) return
  const payload = activeChat.value.type === 'group'
    ? { groupId: activeChat.value.id, text }
    : { toId: activeChat.value.id, text }
  await social.sendMessage(payload)
  newMsg.value = ''
  nextTick(() => scrollBottom())
}

async function shareCurrentSong() {
  if (!player.currentSong || !activeChat.value) return
  const payload = {
    ...(activeChat.value.type === 'group' ? { groupId: activeChat.value.id } : { toId: activeChat.value.id }),
    songId: String(player.currentSong.id),
    songName: player.currentSong.name,
    songArtist: player.currentSong.artist,
    text: null,
  }
  await social.sendMessage(payload)
  nextTick(() => scrollBottom())
}

function playSharedSong(msg) {
  const song = player.songs.find(s => String(s.id) === String(msg.songId))
  if (song) player.play(song)
}

function scrollBottom() {
  if (msgRef.value) msgRef.value.scrollTop = msgRef.value.scrollHeight
}

function previewText(msg) {
  if (!msg) return 'Noch keine Nachrichten'
  if (msg.songName) return `♩ ${msg.songName}`
  return msg.text || ''
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const now = new Date()
  const diff = now - d
  if (diff < 60000) return 'Gerade eben'
  if (diff < 3600000) return `${Math.floor(diff/60000)} Min`
  if (diff < 86400000) return d.toLocaleTimeString('de', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('de', { day: '2-digit', month: '2-digit' })
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
.chats-page { min-height: 100vh; background: #0a0a0f; color: #f0ede6; font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; align-items: center; padding: 0; position: relative; overflow-x: hidden; }
.bg-noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size: 180px; opacity: 0.6; }
.bg-glow { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
.ad-banner { position: relative; z-index: 1; width: 100%; max-width: 728px; min-height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 1px solid rgba(240,237,230,0.07); padding: 0.75rem 1.5rem; }
.ad-label { position: absolute; top: 4px; left: 1.5rem; font-size: 0.6rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.2); }
.ad-placeholder { width: 100%; max-width: 728px; height: 90px; background: rgba(240,237,230,0.03); border: 1px dashed rgba(240,237,230,0.1); border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,237,230,0.15); }
.lists-wrap { position: relative; z-index: 1; width: 100%; max-width: 520px; padding: 0 1.5rem 4rem; }
.top-bar { display: flex; align-items: center; justify-content: space-between; padding: 1rem 0 0.75rem; }
.back-btn { background: none; border: none; cursor: pointer; color: rgba(240,237,230,0.35); font-family: 'DM Sans', sans-serif; font-size: 0.78rem; letter-spacing: 0.1em; padding: 0; transition: color 0.2s; }
.back-btn:hover { color: #ff5a32; }
.page-title { font-family: 'Bebas Neue', cursive; font-size: 1.8rem; letter-spacing: 0.2em; color: #f0ede6; }
.not-logged-in { position: relative; z-index: 1; text-align: center; color: rgba(240,237,230,0.4); display: flex; flex-direction: column; gap: 1rem; align-items: center; padding: 2rem; width: 100%; }
.login-btn { background: rgba(91,106,255,0.15); border: 1px solid rgba(91,106,255,0.3); color: #5b6aff; border-radius: 3px; padding: 0.6rem 1.5rem; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; transition: all 0.2s; }
.section { margin-bottom: 1.75rem; }
.section-header { display: flex; align-items: center; gap: 0.6rem; margin-bottom: 0.75rem; }
.section-title { font-family: 'Bebas Neue', cursive; font-size: 0.95rem; letter-spacing: 0.18em; color: rgba(240,237,230,0.35); }
.unread-badge { background: #ff5a32; color: #0a0a0f; font-size: 0.6rem; font-weight: 700; border-radius: 99px; padding: 0.1rem 0.45rem; }
.tabs { display: flex; gap: 0.4rem; margin-bottom: 0.9rem; }
.tab { font-family: 'DM Sans', sans-serif; font-size: 0.82rem; letter-spacing: 0.06em; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.09); color: rgba(240,237,230,0.4); padding: 0.42rem 1.1rem; border-radius: 99px; cursor: pointer; transition: all 0.2s; }
.tab.active { background: rgba(255,90,50,0.12); border-color: rgba(255,90,50,0.4); color: #ff5a32; }
.chat-list { display: flex; flex-direction: column; gap: 0.3rem; }
.chat-row { display: flex; align-items: center; gap: 0.85rem; padding: 0.75rem 0.8rem; border-radius: 4px; cursor: pointer; opacity: 0; transform: translateY(5px); animation: slideUp 0.35s ease forwards; animation-delay: calc(var(--i) * 40ms); transition: background 0.15s; }
.chat-row:hover { background: rgba(240,237,230,0.04); }
.chat-row--unread { background: rgba(255,90,50,0.04); border: 1px solid rgba(255,90,50,0.1); border-radius: 4px; }
.chat-avatar { width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; color: #0a0a0f; position: relative; overflow: hidden; }
.chat-avatar--group { border-radius: 10px; border: 1px solid; font-size: 1.1rem; color: inherit; }
.av-img { width: 100%; height: 100%; object-fit: cover; }
.unread-dot { width: 8px; height: 8px; border-radius: 50%; background: #ff5a32; flex-shrink: 0; }
.chat-info { flex: 1; display: flex; flex-direction: column; gap: 0.18rem; min-width: 0; }
.chat-name-row { display: flex; align-items: center; justify-content: space-between; }
.chat-name { font-size: 0.9rem; font-weight: 500; color: #f0ede6; }
.chat-time { font-size: 0.65rem; color: rgba(240,237,230,0.25); flex-shrink: 0; }
.chat-preview { font-size: 0.72rem; color: rgba(240,237,230,0.35); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.preview-author { color: rgba(240,237,230,0.5); }
.member-count { font-size: 0.62rem; color: rgba(240,237,230,0.2); flex-shrink: 0; }
.empty-hint { font-size: 0.78rem; color: rgba(240,237,230,0.25); padding: 1.5rem 0; text-align: center; }
.cw-loading { font-size: 0.78rem; color: rgba(240,237,230,0.3); padding: 1rem 0; text-align: center; }
/* Chat window */
.chat-window { position: fixed; inset: 0; z-index: 100; background: #0a0a0f; display: flex; flex-direction: column; }
.cw-header { display: flex; align-items: center; gap: 0.8rem; padding: 1rem 1.25rem; border-bottom: 1px solid rgba(240,237,230,0.07); background: rgba(10,10,15,0.95); backdrop-filter: blur(10px); flex-shrink: 0; }
.cw-back { background: none; border: none; cursor: pointer; color: rgba(240,237,230,0.4); font-family: 'DM Sans', sans-serif; font-size: 0.78rem; letter-spacing: 0.08em; padding: 0; transition: color 0.2s; flex-shrink: 0; }
.cw-back:hover { color: #ff5a32; }
.cw-avatar { width: 36px; height: 36px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 700; color: #0a0a0f; overflow: hidden; }
.cw-meta { flex: 1; display: flex; flex-direction: column; gap: 0.08rem; }
.cw-name { font-size: 0.92rem; font-weight: 600; color: #f0ede6; }
.cw-type { font-size: 0.62rem; color: rgba(240,237,230,0.3); }
.cw-messages { flex: 1; overflow-y: auto; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.6rem; }
.cw-messages::-webkit-scrollbar { width: 3px; }
.cw-messages::-webkit-scrollbar-thumb { background: rgba(240,237,230,0.1); }
.cw-empty { font-size: 0.78rem; color: rgba(240,237,230,0.25); text-align: center; padding: 2rem 0; }
.msg-row { display: flex; }
.msg-row--me { justify-content: flex-end; }
.msg-bubble { max-width: 72%; background: rgba(240,237,230,0.07); border: 1px solid rgba(240,237,230,0.08); border-radius: 12px 12px 12px 3px; padding: 0.6rem 0.85rem; font-size: 0.88rem; color: #f0ede6; line-height: 1.45; display: flex; flex-direction: column; gap: 0.25rem; animation: msgPop 0.2s ease both; }
.msg-bubble--me { background: rgba(91,106,255,0.18); border-color: rgba(91,106,255,0.25); border-radius: 12px 12px 3px 12px; }
.msg-author { font-size: 0.6rem; color: rgba(240,237,230,0.4); text-transform: uppercase; letter-spacing: 0.08em; }
.msg-time { font-size: 0.6rem; color: rgba(240,237,230,0.25); align-self: flex-end; }
.msg-song { display: flex; align-items: center; gap: 0.65rem; cursor: pointer; }
.ms-icon { font-size: 1.1rem; color: #5b6aff; flex-shrink: 0; }
.ms-info { flex: 1; display: flex; flex-direction: column; gap: 0.1rem; }
.ms-name { font-size: 0.82rem; font-weight: 500; color: #f0ede6; }
.ms-artist { font-size: 0.65rem; color: rgba(240,237,230,0.4); }
.ms-play { width: 26px; height: 26px; border-radius: 50%; background: #5b6aff; display: flex; align-items: center; justify-content: center; font-size: 0.6rem; color: white; flex-shrink: 0; }
.cw-input-wrap { display: flex; align-items: center; gap: 0.6rem; padding: 0.9rem 1.25rem; border-top: 1px solid rgba(240,237,230,0.07); background: rgba(10,10,15,0.95); flex-shrink: 0; }
.cw-share-btn { background: rgba(91,106,255,0.1); border: 1px solid rgba(91,106,255,0.2); border-radius: 6px; color: #5b6aff; font-size: 1rem; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: background 0.2s; }
.cw-share-btn:hover { background: rgba(91,106,255,0.2); }
.cw-input { flex: 1; background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.1); border-radius: 20px; padding: 0.55rem 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; color: #f0ede6; outline: none; transition: border-color 0.2s; }
.cw-input:focus { border-color: rgba(91,106,255,0.4); }
.cw-input::placeholder { color: rgba(240,237,230,0.22); }
.cw-send { width: 36px; height: 36px; border-radius: 50%; background: rgba(240,237,230,0.08); border: 1px solid rgba(240,237,230,0.1); color: rgba(240,237,230,0.3); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s; }
.cw-send.ready { background: #5b6aff; border-color: #5b6aff; color: white; box-shadow: 0 0 12px rgba(91,106,255,0.4); }
.chat-slide-enter-active, .chat-slide-leave-active { transition: transform 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.3s; }
.chat-slide-enter-from { transform: translateX(100%); opacity: 0; }
.chat-slide-leave-to   { transform: translateX(100%); opacity: 0; }
@keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
@keyframes msgPop { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
</style>