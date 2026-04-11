<template>
  <div class="support-page">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>
    <AdBanner ad-slot="1918440727" />

    <button class="dismiss-btn" @click="goBack" aria-label="Zurück">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>

    <!-- Not logged in -->
    <div class="not-logged-in" v-if="!auth.isLoggedIn">
      <span class="nil-icon">⌘</span>
      <p>Du musst eingeloggt sein um den Support zu kontaktieren.</p>
      <button @click="router.push('/profile')">Anmelden →</button>
    </div>

    <!-- SUPPORT ADMIN VIEW -->
    <template v-else-if="isSupport">
      <template v-if="!activeTicket">
        <div class="page-header">
          <h1 class="page-title">SUPPORT INBOX</h1>
          <p class="page-sub">{{ openTickets.length }} offene Anfragen</p>
        </div>
        <div class="ticket-list" v-if="openTickets.length">
          <div v-for="t in openTickets" :key="t.id" class="ticket-item" @click="openTicketChat(t)">
            <div class="ti-avatar" :style="{ background: avatarColor(t.users?.username) }">
              {{ t.users?.username?.slice(0,2).toUpperCase() }}
            </div>
            <div class="ti-info">
              <span class="ti-user">{{ t.users?.username }}</span>
              <span class="ti-preview">{{ t.lastMessage || 'Keine Nachrichten' }}</span>
            </div>
            <div class="ti-meta">
              <span class="ti-time">{{ formatDate(t.created_at) }}</span>
            </div>
            <span class="ti-arrow">→</span>
          </div>
        </div>
        <div class="empty-state" v-else>
          <span style="font-size:2rem;opacity:0.2">✓</span>
          <p>Keine offenen Anfragen</p>
        </div>
      </template>

      <!-- Admin chat -->
      <template v-else>
        <div class="chat-header">
          <button class="back-btn" @click="activeTicket = null; loadTickets()">← Zurück</button>
          <span class="chat-header-user">{{ activeTicket.users?.username }}</span>
          <button class="resolve-btn-top" @click="resolveTicketAdmin">✓ Lösen</button>
        </div>
        <div class="chat-wrap">
          <div class="chat-messages" ref="chatRef">
            <div v-for="msg in activeMessages" :key="msg.id" class="chat-msg" :class="msg.sender_id === 'support' ? 'chat-msg--me' : 'chat-msg--support'">
              <div class="cm-avatar" :class="msg.sender_id === 'support' ? 'support-avatar' : ''" :style="msg.sender_id !== 'support' ? { background: avatarColor(msg.users?.username) } : {}">
                {{ msg.sender_id === 'support' ? 'S' : msg.users?.username?.slice(0,1).toUpperCase() }}
              </div>
              <div class="cm-bubble">
                <span class="cm-name">{{ msg.sender_id === 'support' ? 'Support' : msg.users?.username }}</span>
                <p>{{ msg.text }}</p>
                <span class="cm-time">{{ formatTime(msg.created_at) }}</span>
              </div>
            </div>
          </div>
          <div class="chat-input-wrap">
            <textarea v-model="newMessage" class="chat-input" placeholder="Antwort schreiben... (Strg+Enter)" rows="2" maxlength="1000" @keydown.ctrl.enter="sendAdminReply" />
            <div class="chat-input-actions">
              <span class="input-hint">Strg+Enter zum Senden</span>
              <button class="send-btn" @click="sendAdminReply" :disabled="!newMessage.trim() || sending">
                <span v-if="sending"><span class="spinner"></span></span>
                <span v-else>Senden ↑</span>
              </button>
            </div>
          </div>
        </div>
      </template>
    </template>

    <!-- NORMAL USER VIEW -->
    <template v-else>
      <div class="page-header">
        <h1 class="page-title">SUPPORT</h1>
        <p class="page-sub" v-if="!ticket || ticket.status === 'open'">Wie können wir helfen?</p>
        <p class="page-sub resolved" v-else>✓ Gelöst — danke für deine Nachricht!</p>
      </div>
      <div class="chat-wrap">
        <div class="chat-messages" ref="chatRef">
          <div class="chat-msg chat-msg--support">
            <div class="cm-avatar support-avatar">S</div>
            <div class="cm-bubble">
              <span class="cm-name">Support</span>
              <p>Hallo! Wie können wir dir helfen? Beschreibe dein Anliegen und wir melden uns so schnell wie möglich.</p>
            </div>
          </div>
          <div v-for="msg in messages" :key="msg.id" class="chat-msg" :class="msg.sender_id === auth.user?.id ? 'chat-msg--me' : 'chat-msg--support'">
            <div class="cm-avatar" :class="msg.sender_id !== auth.user?.id ? 'support-avatar' : ''" :style="msg.sender_id === auth.user?.id ? { background: avatarColor(auth.user.username) } : {}">
              <span>{{ msg.sender_id === auth.user?.id ? auth.user.username.slice(0,1).toUpperCase() : 'S' }}</span>
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
        <div class="resolved-banner" v-if="ticket?.status === 'resolved'">
          <span>✓ Als gelöst markiert</span>
          <button @click="ticket.status = 'open'">Erneut öffnen</button>
        </div>
        <div class="chat-input-wrap" v-else>
          <textarea v-model="newMessage" class="chat-input" placeholder="Nachricht schreiben... (Strg+Enter)" rows="2" maxlength="1000" @keydown.ctrl.enter="sendMessage" />
          <div class="chat-input-actions">
            <button class="resolve-btn" v-if="ticket && messages.length > 0" @click="resolveTicket">✓ Als gelöst markieren</button>
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import AdBanner from '@/components/AdBanner.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth   = useAuthStore()
const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'
const isSupport = computed(() => auth.user?.username === 'Support' || auth.user?.is_admin)

function authHeader() {
  const t = localStorage.getItem('nyujam_token') || ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }
}

const ticket      = ref(null)
const messages    = ref([])
const loading     = ref(true)
const newMessage  = ref('')
const sending     = ref(false)
const chatRef     = ref(null)
const openTickets    = ref([])
const activeTicket   = ref(null)
const activeMessages = ref([])
let pollInterval = null

onMounted(async () => {
  if (!auth.isLoggedIn) return
  if (isSupport.value) {
    await loadTickets()
    pollInterval = setInterval(loadTickets, 5000)
  } else {
    await loadUserTicket()
    pollInterval = setInterval(loadUserTicket, 5000)
  }
})
onUnmounted(() => clearInterval(pollInterval))

function goBack() {
  if (activeTicket.value) { activeTicket.value = null; loadTickets(); return }
  router.push('/')
}

async function loadTickets() {
  try {
    const res  = await fetch(`${BASE_URL}/api/support/tickets`, { headers: authHeader() })
    const data = await res.json()
    openTickets.value = (data || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  } catch {}
}

async function openTicketChat(t) {
  activeTicket.value   = t
  activeMessages.value = []
  clearInterval(pollInterval)
  const load = async () => {
    const res = await fetch(`${BASE_URL}/api/support/ticket/${t.id}/messages`, { headers: authHeader() }).catch(() => null)
    if (res?.ok) { activeMessages.value = await res.json(); nextTick(() => scrollToBottom()) }
  }
  await load()
  pollInterval = setInterval(load, 3000)
}

async function sendAdminReply() {
  if (!newMessage.value.trim() || sending.value || !activeTicket.value) return
  sending.value = true
  try {
    const res = await fetch(`${BASE_URL}/api/support/ticket/${activeTicket.value.id}/reply`, {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({ text: newMessage.value.trim() }),
    })
    const msg = await res.json()
    if (res.ok) { activeMessages.value.push(msg); newMessage.value = ''; nextTick(() => scrollToBottom()) }
  } catch {} finally { sending.value = false }
}

async function resolveTicketAdmin() {
  if (!confirm('Ticket als gelöst markieren?')) return
  await fetch(`${BASE_URL}/api/support/ticket/${activeTicket.value.id}/resolve`, { method: 'PATCH', headers: authHeader() })
  activeTicket.value = null
  await loadTickets()
}

async function loadUserTicket() {
  try {
    const res  = await fetch(`${BASE_URL}/api/support/ticket`, { headers: authHeader() })
    const data = await res.json()
    if (data) { ticket.value = data; messages.value = data.messages || []; nextTick(() => scrollToBottom()) }
  } catch {} finally { loading.value = false }
}

async function sendMessage() {
  if (!newMessage.value.trim() || sending.value) return
  sending.value = true
  try {
    const res = await fetch(`${BASE_URL}/api/support/ticket`, {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({ text: newMessage.value.trim() }),
    })
    const msg = await res.json()
    if (res.ok) { messages.value.push(msg); newMessage.value = ''; if (!ticket.value) await loadUserTicket(); nextTick(() => scrollToBottom()) }
  } catch {} finally { sending.value = false }
}

async function resolveTicket() {
  if (!confirm('Ticket als gelöst markieren?')) return
  await fetch(`${BASE_URL}/api/support/ticket/resolve`, { method: 'PATCH', headers: authHeader() })
  if (ticket.value) ticket.value.status = 'resolved'
}

function scrollToBottom() { if (chatRef.value) chatRef.value.scrollTop = chatRef.value.scrollHeight }
function formatTime(iso) { if (!iso) return ''; return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) }
function formatDate(iso) { if (!iso) return ''; return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }) }
function avatarColor(name) { const c = ['#5b6aff','#32c8a0','#ff5a32','#c864f0','#f0c832']; return c[(name?.charCodeAt(0)||0) % c.length] }
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
.support-page{min-height:100vh;background:#0a0a0f;color:#f0ede6;font-family:'DM Sans',sans-serif;display:flex;flex-direction:column;align-items:center;padding:0 1.25rem 2rem;position:relative;overflow-x:hidden}
.bg-noise{position:fixed;inset:0;pointer-events:none;z-index:0;background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");background-size:180px;opacity:.6}
.bg-glow{position:fixed;inset:0;pointer-events:none;z-index:0;background:radial-gradient(ellipse 60% 45% at 50% 20%,rgba(91,106,255,.07) 0%,transparent 70%)}
.dismiss-btn{position:relative;z-index:1;background:none;border:none;cursor:pointer;color:rgba(240,237,230,.25);padding:.5rem;margin-bottom:.5rem;margin-top:.75rem;transition:color .2s,transform .2s;display:flex;align-items:center;align-self:flex-start}
.dismiss-btn:hover{color:rgba(240,237,230,.6);transform:translateY(-2px)}
.not-logged-in{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:1rem;padding:3rem 1rem;text-align:center;color:rgba(240,237,230,.4);font-size:.88rem}
.nil-icon{font-size:2rem;opacity:.3}
.not-logged-in button{background:none;border:1px solid rgba(91,106,255,.3);color:#5b6aff;border-radius:3px;padding:.5rem 1.5rem;cursor:pointer;font-family:'DM Sans',sans-serif}
.page-header{position:relative;z-index:1;text-align:center;margin-bottom:1.5rem}
.page-title{font-family:'Bebas Neue',cursive;font-size:2.2rem;letter-spacing:.2em}
.page-sub{font-size:.7rem;letter-spacing:.15em;text-transform:uppercase;color:rgba(240,237,230,.25);margin-top:.3rem}
.page-sub.resolved{color:#32c8a0}
.ticket-list{position:relative;z-index:1;width:100%;max-width:520px;display:flex;flex-direction:column;gap:.5rem}
.ticket-item{display:flex;align-items:center;gap:.85rem;background:rgba(240,237,230,.03);border:1px solid rgba(240,237,230,.07);border-radius:8px;padding:.9rem 1rem;cursor:pointer;transition:border-color .2s,background .2s}
.ticket-item:hover{border-color:rgba(91,106,255,.3);background:rgba(91,106,255,.04)}
.ti-avatar{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.72rem;font-weight:700;color:white;flex-shrink:0}
.ti-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:.15rem}
.ti-user{font-size:.88rem;font-weight:600;color:#f0ede6}
.ti-preview{font-size:.72rem;color:rgba(240,237,230,.35);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ti-meta{display:flex;flex-direction:column;align-items:flex-end;gap:.15rem;flex-shrink:0}
.ti-time{font-size:.65rem;color:rgba(240,237,230,.25)}
.ti-arrow{color:rgba(240,237,230,.2);font-size:.9rem}
.empty-state{position:relative;z-index:1;display:flex;flex-direction:column;align-items:center;gap:.75rem;padding:3rem;color:rgba(240,237,230,.3);font-size:.82rem}
.chat-header{position:relative;z-index:1;width:100%;max-width:520px;display:flex;align-items:center;gap:.75rem;margin-bottom:.75rem}
.back-btn{background:none;border:1px solid rgba(240,237,230,.1);color:rgba(240,237,230,.4);border-radius:3px;padding:.35rem .75rem;font-size:.78rem;cursor:pointer;transition:all .2s;font-family:'DM Sans',sans-serif}
.back-btn:hover{color:#f0ede6;border-color:rgba(240,237,230,.25)}
.chat-header-user{flex:1;font-family:'Bebas Neue',cursive;font-size:1.1rem;letter-spacing:.1em}
.resolve-btn-top{background:rgba(50,200,160,.1);border:1px solid rgba(50,200,160,.25);color:#32c8a0;border-radius:3px;padding:.35rem .75rem;font-size:.75rem;cursor:pointer;transition:all .2s;font-family:'DM Sans',sans-serif}
.resolve-btn-top:hover{background:rgba(50,200,160,.2)}
.chat-wrap{position:relative;z-index:1;width:100%;max-width:520px;display:flex;flex-direction:column;background:rgba(240,237,230,.02);border:1px solid rgba(240,237,230,.08);border-radius:10px;overflow:hidden}
.chat-messages{overflow-y:auto;padding:1rem;display:flex;flex-direction:column;gap:1rem;min-height:320px;max-height:55vh}
.chat-msg{display:flex;gap:.65rem;align-items:flex-start}
.chat-msg--me{flex-direction:row-reverse}
.cm-avatar{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:.75rem;font-weight:700;color:white;flex-shrink:0}
.support-avatar{background:rgba(91,106,255,.25);color:#5b6aff;border:1px solid rgba(91,106,255,.3)}
.cm-bubble{max-width:75%;display:flex;flex-direction:column;gap:.25rem}
.chat-msg--me .cm-bubble{align-items:flex-end}
.cm-name{font-size:.65rem;color:rgba(240,237,230,.35)}
.cm-bubble p{background:rgba(240,237,230,.06);border:1px solid rgba(240,237,230,.08);border-radius:8px;border-top-left-radius:2px;padding:.6rem .85rem;font-size:.85rem;color:rgba(240,237,230,.85);line-height:1.55;word-break:break-word}
.chat-msg--me .cm-bubble p{background:rgba(91,106,255,.15);border-color:rgba(91,106,255,.2);border-top-left-radius:8px;border-top-right-radius:2px}
.cm-time{font-size:.58rem;color:rgba(240,237,230,.2)}
.chat-loading{display:flex;gap:.3rem;padding:.5rem}
.dot{width:6px;height:6px;border-radius:50%;background:rgba(240,237,230,.2);animation:dotPulse 1.2s infinite}
.dot:nth-child(2){animation-delay:.2s}
.dot:nth-child(3){animation-delay:.4s}
.resolved-banner{padding:.85rem 1rem;background:rgba(50,200,160,.08);border-top:1px solid rgba(50,200,160,.2);display:flex;align-items:center;justify-content:space-between;font-size:.8rem;color:#32c8a0}
.resolved-banner button{background:none;border:1px solid rgba(50,200,160,.3);color:#32c8a0;border-radius:3px;padding:.25rem .75rem;font-size:.72rem;cursor:pointer;font-family:'DM Sans',sans-serif}
.chat-input-wrap{border-top:1px solid rgba(240,237,230,.07);padding:.75rem;display:flex;flex-direction:column;gap:.5rem}
.chat-input{width:100%;background:rgba(240,237,230,.04);border:1px solid rgba(240,237,230,.1);border-radius:6px;padding:.65rem .85rem;color:#f0ede6;font-family:'DM Sans',sans-serif;font-size:.85rem;resize:none;outline:none}
.chat-input:focus{border-color:rgba(91,106,255,.35)}
.chat-input::placeholder{color:rgba(240,237,230,.2)}
.chat-input-actions{display:flex;justify-content:space-between;align-items:center}
.input-hint{font-size:.62rem;color:rgba(240,237,230,.2)}
.resolve-btn{background:none;border:1px solid rgba(50,200,160,.25);color:rgba(50,200,160,.6);border-radius:3px;padding:.3rem .75rem;font-size:.72rem;cursor:pointer;transition:all .2s;font-family:'DM Sans',sans-serif}
.resolve-btn:hover{color:#32c8a0;border-color:rgba(50,200,160,.4)}
.send-btn{font-family:'Bebas Neue',cursive;font-size:.9rem;letter-spacing:.12em;background:#5b6aff;color:white;border:none;border-radius:3px;padding:.45rem 1.2rem;cursor:pointer;display:flex;align-items:center;gap:.4rem;transition:opacity .2s}
.send-btn:disabled{opacity:.4;cursor:default}
.spinner{width:12px;height:12px;border:2px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:spin .7s linear infinite;display:inline-block}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes dotPulse{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}
</style>