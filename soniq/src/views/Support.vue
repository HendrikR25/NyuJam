<template>
  <div class="support-page">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>
    <AdBanner ad-slot="1918440727" />

    <!-- Dismiss (same as player) -->
    <button class="dismiss-btn" @click="router.push('/')" aria-label="Zurück">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>

    <!-- Not logged in -->
    <div class="not-logged-in" v-if="!auth.isLoggedIn">
      <span style="font-size:2.5rem;opacity:0.3">💬</span>
      <p>Du musst eingeloggt sein um den Support zu kontaktieren.</p>
      <button @click="router.push('/profile')">Anmelden →</button>
    </div>

    <template v-else>
      <div class="page-header">
        <span class="ph-icon">💬</span>
        <h1 class="page-title">SUPPORT</h1>
        <p class="page-sub" v-if="!ticket || ticket.status === 'open'">Wie können wir helfen?</p>
        <p class="page-sub resolved" v-else>✓ Gelöst — danke für deine Nachricht!</p>
      </div>

      <!-- Chat -->
      <div class="chat-wrap">
        <div class="chat-messages" ref="chatRef">
          <!-- Welcome message -->
          <div class="chat-msg chat-msg--support">
            <div class="cm-avatar support-avatar">S</div>
            <div class="cm-bubble">
              <span class="cm-name">Support</span>
              <p>Hallo! Wie können wir dir helfen? Beschreibe dein Anliegen und wir melden uns so schnell wie möglich.</p>
            </div>
          </div>

          <!-- Messages -->
          <div
            v-for="msg in messages"
            :key="msg.id"
            class="chat-msg"
            :class="msg.sender_id === auth.user?.id ? 'chat-msg--me' : 'chat-msg--support'"
          >
            <div class="cm-avatar" :class="msg.sender_id === auth.user?.id ? 'user-avatar' : 'support-avatar'" :style="msg.sender_id !== auth.user?.id ? {} : { background: avatarColor(auth.user.username) }">
              <img v-if="msg.users?.avatar && msg.sender_id === auth.user?.id" :src="msg.users.avatar" class="cm-avatar-img" />
              <span v-else>{{ msg.sender_id === auth.user?.id ? auth.user.username.slice(0,1).toUpperCase() : 'S' }}</span>
            </div>
            <div class="cm-bubble">
              <span class="cm-name">{{ msg.sender_id === auth.user?.id ? auth.user.username : 'Support' }}</span>
              <p>{{ msg.text }}</p>
              <span class="cm-time">{{ formatTime(msg.created_at) }}</span>
            </div>
          </div>

          <div class="chat-loading" v-if="loading">
            <span class="dot"></span><span class="dot"></span><span class="dot"></span>
          </div>
        </div>

        <!-- Resolved banner -->
        <div class="resolved-banner" v-if="ticket?.status === 'resolved'">
          <span>✓ Dieses Ticket wurde als gelöst markiert.</span>
          <button @click="reopenTicket">Erneut öffnen</button>
        </div>

        <!-- Input -->
        <div class="chat-input-wrap" v-else>
          <textarea
            v-model="newMessage"
            class="chat-input"
            placeholder="Nachricht schreiben..."
            rows="2"
            maxlength="1000"
            @keydown.ctrl.enter="sendMessage"
          ></textarea>
          <div class="chat-input-actions">
            <button class="resolve-btn" v-if="ticket && messages.length > 0" @click="resolveTicket">
              ✓ Als gelöst markieren
            </button>
            <button class="send-btn" @click="sendMessage" :disabled="!newMessage.trim() || sending">
              <span v-if="sending"><span class="spinner"></span></span>
              <span v-else>Senden ↑</span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import AdBanner from '@/components/AdBanner.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth   = useAuthStore()
const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

const ticket     = ref(null)
const messages   = ref([])
const newMessage = ref('')
const sending    = ref(false)
const loading    = ref(true)
const chatRef    = ref(null)

function authHeader() {
  const t = localStorage.getItem('nyujam_token') || ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }
}

onMounted(async () => {
  if (!auth.isLoggedIn) return
  await loadTicket()
  // Poll every 5s for new messages
  setInterval(loadTicket, 5000)
})

async function loadTicket() {
  try {
    const res = await fetch(`${BASE_URL}/api/support/ticket`, { headers: authHeader() })
    const data = await res.json()
    if (data) {
      ticket.value   = data
      messages.value = data.messages || []
      nextTick(() => scrollToBottom())
    }
  } catch {} finally { loading.value = false }
}

async function sendMessage() {
  if (!newMessage.value.trim() || sending.value) return
  sending.value = true
  try {
    const res  = await fetch(`${BASE_URL}/api/support/ticket`, {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({ text: newMessage.value.trim() }),
    })
    const msg = await res.json()
    if (res.ok) {
      messages.value.push(msg)
      newMessage.value = ''
      if (!ticket.value) await loadTicket()
      nextTick(() => scrollToBottom())
    }
  } catch {} finally { sending.value = false }
}

async function resolveTicket() {
  if (!confirm('Ticket als gelöst markieren?')) return
  await fetch(`${BASE_URL}/api/support/ticket/resolve`, { method: 'PATCH', headers: authHeader() })
  if (ticket.value) ticket.value.status = 'resolved'
}

async function reopenTicket() {
  // Delete old ticket so a new one can be created
  ticket.value   = null
  messages.value = []
}

function scrollToBottom() {
  if (chatRef.value) chatRef.value.scrollTop = chatRef.value.scrollHeight
}

function formatTime(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function avatarColor(name) {
  const colors = ['#5b6aff','#32c8a0','#ff5a32','#c864f0','#f0c832']
  return colors[(name?.charCodeAt(0) || 0) % colors.length]
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.support-page { min-height: 100vh; background: #0a0a0f; color: #f0ede6; font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; align-items: center; padding: 0 1.25rem 2rem; position: relative; overflow-x: hidden; }
.bg-noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size: 180px; opacity: 0.6; }
.bg-glow { position: fixed; inset: 0; pointer-events: none; z-index: 0; background: radial-gradient(ellipse 60% 45% at 50% 20%, rgba(91,106,255,0.07) 0%, transparent 70%); }

.dismiss-btn { position: relative; z-index: 1; background: none; border: none; cursor: pointer; color: rgba(240,237,230,0.25); padding: 0.5rem; margin-bottom: 0.5rem; margin-top: 0.75rem; transition: color 0.2s, transform 0.2s; display: flex; align-items: center; justify-content: center; align-self: flex-start; }
.dismiss-btn:hover { color: rgba(240,237,230,0.6); transform: translateY(-2px); }

.not-logged-in { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem 1rem; text-align: center; color: rgba(240,237,230,0.4); font-size: 0.88rem; }
.not-logged-in button { background: none; border: 1px solid rgba(91,106,255,0.3); color: #5b6aff; border-radius: 3px; padding: 0.5rem 1.5rem; cursor: pointer; font-family: 'DM Sans', sans-serif; }

.page-header { position: relative; z-index: 1; text-align: center; margin-bottom: 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.3rem; }
.ph-icon { font-size: 1.8rem; }
.page-title { font-family: 'Bebas Neue', cursive; font-size: 2.2rem; letter-spacing: 0.2em; }
.page-sub { font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.25); }
.page-sub.resolved { color: #32c8a0; }

.chat-wrap { position: relative; z-index: 1; width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: 0; background: rgba(240,237,230,0.02); border: 1px solid rgba(240,237,230,0.08); border-radius: 10px; overflow: hidden; flex: 1; min-height: 400px; }
.chat-messages { flex: 1; overflow-y: auto; padding: 1rem; display: flex; flex-direction: column; gap: 1rem; min-height: 320px; max-height: 55vh; }
.chat-msg { display: flex; gap: 0.65rem; align-items: flex-start; }
.chat-msg--me { flex-direction: row-reverse; }
.cm-avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700; color: white; flex-shrink: 0; overflow: hidden; }
.support-avatar { background: rgba(91,106,255,0.3); color: #5b6aff; border: 1px solid rgba(91,106,255,0.3); }
.cm-avatar-img { width: 100%; height: 100%; object-fit: cover; }
.cm-bubble { max-width: 75%; display: flex; flex-direction: column; gap: 0.25rem; }
.chat-msg--me .cm-bubble { align-items: flex-end; }
.cm-name { font-size: 0.65rem; color: rgba(240,237,230,0.35); letter-spacing: 0.05em; }
.cm-bubble p { background: rgba(240,237,230,0.06); border: 1px solid rgba(240,237,230,0.08); border-radius: 8px; border-top-left-radius: 2px; padding: 0.6rem 0.85rem; font-size: 0.85rem; color: rgba(240,237,230,0.85); line-height: 1.55; word-break: break-word; }
.chat-msg--me .cm-bubble p { background: rgba(91,106,255,0.15); border-color: rgba(91,106,255,0.2); border-top-left-radius: 8px; border-top-right-radius: 2px; }
.cm-time { font-size: 0.58rem; color: rgba(240,237,230,0.2); }
.chat-loading { display: flex; gap: 0.3rem; padding: 0.5rem; }
.dot { width: 6px; height: 6px; border-radius: 50%; background: rgba(240,237,230,0.2); animation: dotPulse 1.2s infinite; }
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

.resolved-banner { padding: 0.85rem 1rem; background: rgba(50,200,160,0.08); border-top: 1px solid rgba(50,200,160,0.2); display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; color: #32c8a0; }
.resolved-banner button { background: none; border: 1px solid rgba(50,200,160,0.3); color: #32c8a0; border-radius: 3px; padding: 0.25rem 0.75rem; font-size: 0.72rem; cursor: pointer; font-family: 'DM Sans', sans-serif; }

.chat-input-wrap { border-top: 1px solid rgba(240,237,230,0.07); padding: 0.75rem; display: flex; flex-direction: column; gap: 0.5rem; }
.chat-input { width: 100%; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.1); border-radius: 6px; padding: 0.65rem 0.85rem; color: #f0ede6; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; resize: none; outline: none; }
.chat-input:focus { border-color: rgba(91,106,255,0.35); }
.chat-input::placeholder { color: rgba(240,237,230,0.2); }
.chat-input-actions { display: flex; justify-content: space-between; align-items: center; }
.resolve-btn { background: none; border: 1px solid rgba(50,200,160,0.25); color: rgba(50,200,160,0.6); border-radius: 3px; padding: 0.3rem 0.75rem; font-size: 0.72rem; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
.resolve-btn:hover { color: #32c8a0; border-color: rgba(50,200,160,0.4); }
.send-btn { font-family: 'Bebas Neue', cursive; font-size: 0.9rem; letter-spacing: 0.12em; background: #5b6aff; color: white; border: none; border-radius: 3px; padding: 0.45rem 1.2rem; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; transition: opacity 0.2s; }
.send-btn:disabled { opacity: 0.4; cursor: default; }

.spinner { width: 12px; height: 12px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes dotPulse { 0%, 100% { opacity: 0.3; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1); } }
</style>