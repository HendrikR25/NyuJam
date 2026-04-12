<template>
  <div class="donation-page">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>

    <NavBar back-to="/" />

    <!-- Header -->
    <div class="page-header">
      <span class="header-icon">€</span>
      <h1 class="page-title">SUPPORT</h1>
      <p class="page-sub">Unterstütze Musik direkt — 100% beim Künstler</p>
    </div>

    <!-- Mode Tabs -->
    <div class="mode-tabs">
      <button class="mode-tab" :class="{ active: mode === 'platform' }" @click="mode = 'platform'; resetForm()">
        <span class="mt-icon">◈</span> NyuJam
      </button>
      <button class="mode-tab" :class="{ active: mode === 'artist' }" @click="mode = 'artist'; resetForm()">
        <span class="mt-icon">♩</span> Künstler
      </button>
    </div>

    <!-- ── Platform Donation ── -->
    <transition name="panel" mode="out-in">
      <div class="donation-panel" key="platform" v-if="mode === 'platform'">
        <div class="panel-intro">
          <div class="pi-logo">◈ NyuJam</div>
          <p class="pi-text">Dein Support hilft uns, NyuJam weiterzuentwickeln, Server zu betreiben und Musik für alle zugänglich zu halten.</p>
        </div>

        <div class="amount-grid">
          <button v-for="a in platformAmounts" :key="a" class="amount-btn" :class="{ active: selectedAmount === a && !customActive }" @click="selectAmount(a)">{{ a }} €</button>
          <button class="amount-btn amount-btn--custom" :class="{ active: customActive }" @click="customActive = true; selectedAmount = null">Eigener Betrag</button>
        </div>

        <input v-if="customActive" v-model="customAmount" class="custom-input" type="number" min="1" max="999" placeholder="Betrag in €" />

        <textarea v-model="message" class="message-input" placeholder="Optionale Nachricht an das NyuJam-Team..." rows="3"></textarea>

        <div class="error-msg" v-if="errorMsg">⚠ {{ errorMsg }}</div>

        <button class="donate-btn" @click="startPayment" :disabled="!canDonate || paying">
          <span v-if="paying"><span class="spinner"></span> Wird verarbeitet...</span>
          <span v-else>{{ canDonate ? `${finalAmount} € senden` : 'Betrag wählen' }}</span>
        </button>
      </div>

      <!-- ── Artist Donation ── -->
      <div class="donation-panel" key="artist" v-else>
        <div class="panel-intro">
          <p class="pi-text">Schick deinem Lieblingskünstler ein Tip — 100% landet direkt bei ihm, ohne Abzüge.</p>
        </div>

        <div class="artist-search-wrap" :class="{ focused: artistFocused }">
          <span class="as-icon">♩</span>
          <input v-model="artistQuery" class="artist-input" placeholder="Künstler suchen..." @focus="artistFocused = true" @blur="artistFocused = false" @input="searchArtists" />
          <button v-if="artistQuery" class="as-clear" @click="artistQuery = ''; selectedArtist = null; artistResults = []">✕</button>
        </div>

        <div class="artist-results" v-if="artistResults.length && !selectedArtist">
          <div v-for="(a, idx) in artistResults" :key="a.id" class="artist-result" :style="{ '--i': idx }" @click="pickArtist(a)">
            <div class="ar-avatar">{{ a.name[0] }}</div>
            <span class="ar-name">{{ a.name }}</span>
            <span class="ar-arrow">→</span>
          </div>
        </div>

        <transition name="artist-pop">
          <div class="selected-artist" v-if="selectedArtist">
            <div class="sa-avatar">{{ selectedArtist.name[0] }}</div>
            <div class="sa-info">
              <span class="sa-name">{{ selectedArtist.name }}</span>
              <span class="sa-sub" :class="{ 'sa-sub--warn': !selectedArtist.stripe_connect_enabled }">
                {{ selectedArtist.stripe_connect_enabled ? '✓ Zahlungen aktiviert' : '⚠ Zahlungen noch nicht aktiviert' }}
              </span>
            </div>
            <button class="sa-change" @click="selectedArtist = null; artistQuery = ''">Ändern</button>
          </div>
        </transition>

        <!-- Warning if artist has no Connect -->
        <div class="connect-warning" v-if="selectedArtist && !selectedArtist.stripe_connect_enabled">
          Dieser Künstler hat noch kein Zahlungskonto verknüpft. Bitte wähle einen anderen Künstler oder bitte ihn, Zahlungen in seinem Profil zu aktivieren.
        </div>

        <template v-if="selectedArtist && selectedArtist.stripe_connect_enabled">
          <div class="amount-grid">
            <button v-for="a in platformAmounts" :key="a" class="amount-btn" :class="{ active: selectedAmount === a && !customActive }" @click="selectAmount(a)">{{ a }} €</button>
            <button class="amount-btn amount-btn--custom" :class="{ active: customActive }" @click="customActive = true; selectedAmount = null">Eigener Betrag</button>
          </div>

          <input v-if="customActive" v-model="customAmount" class="custom-input" type="number" min="1" max="999" placeholder="Betrag in €" />

          <textarea v-model="message" class="message-input" placeholder="Nachricht an den Künstler..." rows="3"></textarea>

          <div class="error-msg" v-if="errorMsg">⚠ {{ errorMsg }}</div>

          <button class="donate-btn donate-btn--artist" @click="startPayment" :disabled="!canDonate || paying">
            <span v-if="paying"><span class="spinner"></span> Wird verarbeitet...</span>
            <span v-else>{{ canDonate ? `${finalAmount} € Tip an ${selectedArtist.name}` : 'Betrag wählen' }}</span>
          </button>
        </template>
      </div>
    </transition>

    <!-- ── Success (nach Redirect zurück) ── -->
    <transition name="overlay-fade">
      <div class="payment-overlay" v-if="showSuccess">
        <div class="success-card">
          <div class="sc-icon">✓</div>
          <h2 class="sc-title">Danke!</h2>
          <p class="sc-text">Dein Support ist angekommen. Du bist großartig! 🎵</p>
          <button class="sc-close" @click="showSuccess = false; resetForm()">Schließen</button>
        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import NavBar from '@/components/NavBar.vue'
import { usePlayerStore } from '@/stores/player'

const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'
const player = usePlayerStore()

// ── State ──────────────────────────────────────────────
const mode           = ref('platform')
const selectedAmount = ref(null)
const customActive   = ref(false)
const customAmount   = ref('')
const message        = ref('')
const artistQuery    = ref('')
const artistFocused  = ref(false)
const artistResults  = ref([])
const selectedArtist = ref(null)
const errorMsg       = ref('')
const paying         = ref(false)
const showSuccess    = ref(false)

const platformAmounts = [1, 3, 5, 10, 20, 50]

onMounted(() => {
  if (!player.songs.length) player.loadSongs()
  if (window.location.search.includes('success=1')) {
    showSuccess.value = true
    window.history.replaceState({}, '', '/donation')
  }
})

const finalAmount = computed(() => {
  if (customActive.value) return parseFloat(customAmount.value) || 0
  return selectedAmount.value || 0
})

const canDonate = computed(() => finalAmount.value >= 1 && finalAmount.value <= 999)

function selectAmount(a) {
  selectedAmount.value = a
  customActive.value   = false
  customAmount.value   = ''
}

// ── Artist search ──────────────────────────────────────
async function searchArtists() {
  const q = artistQuery.value.trim().toLowerCase()
  if (!q) { artistResults.value = []; return }
  // Search users who have uploaded songs
  try {
    const res = await fetch(`${BASE_URL}/api/artists/search?q=${encodeURIComponent(q)}`)
    artistResults.value = res.ok ? await res.json() : []
  } catch {
    // Fallback: search from player songs
    const seen = new Set()
    artistResults.value = player.songs
      .filter(s => s.artist.toLowerCase().includes(q))
      .filter(s => { if (seen.has(s.artist)) return false; seen.add(s.artist); return true })
      .slice(0, 5)
      .map(s => ({ id: s.uploadedBy || s.id, name: s.artist, stripe_connect_enabled: false }))
  }
}

function pickArtist(a) {
  selectedArtist.value = a
  artistQuery.value    = a.name
  artistResults.value  = []
}

// ── Payment ────────────────────────────────────────────
async function startPayment() {
  if (!canDonate.value) return
  errorMsg.value = ''
  paying.value   = true
  try {
    const body = mode.value === 'artist'
      ? { amount: finalAmount.value, message: message.value, artistId: selectedArtist.value.id }
      : { amount: finalAmount.value, message: message.value }

    const res  = await fetch(`${BASE_URL}/api/donations/create-payment-intent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    window.location.href = data.url
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    paying.value = false
  }
}

function resetForm() {
  selectedAmount.value = null
  customActive.value   = false
  customAmount.value   = ''
  message.value        = ''
  artistQuery.value    = ''
  artistResults.value  = []
  selectedArtist.value = null
  errorMsg.value       = ''
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.donation-page { min-height: 100vh; background: #0a0a0f; color: #f0ede6; font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; align-items: center; padding: 0 1.5rem 4rem; position: relative; overflow-x: hidden; }
.bg-noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size: 180px; opacity: 0.6; }
.bg-glow { position: fixed; inset: 0; pointer-events: none; z-index: 0; background: radial-gradient(ellipse 60% 45% at 50% 20%, rgba(240,200,50,0.06) 0%, transparent 70%); }

.page-header { position: relative; z-index: 1; text-align: center; margin-bottom: 2rem; animation: fadeDown 0.5s ease both; }
.header-icon { font-size: 2rem; color: #f0c832; display: block; margin-bottom: 0.3rem; }
.page-title { font-family: 'Bebas Neue', cursive; font-size: 3rem; letter-spacing: 0.2em; }
.page-sub { font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(240,237,230,0.25); margin-top: 0.35rem; }

.mode-tabs { position: relative; z-index: 1; display: flex; gap: 0.6rem; margin-bottom: 2rem; }
.mode-tab { display: flex; align-items: center; gap: 0.5rem; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 500; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.1); color: rgba(240,237,230,0.4); border-radius: 3px; padding: 0.65rem 1.5rem; cursor: pointer; transition: all 0.2s; }
.mode-tab:hover { color: #f0ede6; border-color: rgba(240,237,230,0.2); }
.mode-tab.active { background: rgba(240,200,50,0.1); border-color: rgba(240,200,50,0.35); color: #f0c832; }

.donation-panel { position: relative; z-index: 1; width: 100%; max-width: 460px; display: flex; flex-direction: column; gap: 1.1rem; }

.panel-intro { background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.07); border-radius: 6px; padding: 1.1rem 1.2rem; }
.pi-logo { font-family: 'Bebas Neue', cursive; font-size: 1.2rem; letter-spacing: 0.15em; color: #f0c832; margin-bottom: 0.5rem; }
.pi-text { font-size: 0.82rem; color: rgba(240,237,230,0.45); line-height: 1.65; }

.amount-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.55rem; }
.amount-btn { font-family: 'Bebas Neue', cursive; font-size: 1.1rem; letter-spacing: 0.1em; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.1); color: rgba(240,237,230,0.5); border-radius: 3px; padding: 0.7rem; cursor: pointer; transition: all 0.2s; }
.amount-btn:hover { border-color: rgba(240,200,50,0.3); color: #f0ede6; background: rgba(240,200,50,0.06); }
.amount-btn.active { background: rgba(240,200,50,0.12); border-color: rgba(240,200,50,0.45); color: #f0c832; }
.amount-btn--custom { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; }

.custom-input { width: 100%; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,200,50,0.25); border-radius: 3px; padding: 0.75rem 1rem; font-family: 'DM Sans', sans-serif; font-size: 1rem; color: #f0ede6; outline: none; }
.custom-input:focus { border-color: rgba(240,200,50,0.5); }
.custom-input::placeholder { color: rgba(240,237,230,0.2); }

.message-input { width: 100%; background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.09); border-radius: 3px; padding: 0.75rem 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: #f0ede6; outline: none; resize: none; }
.message-input:focus { border-color: rgba(240,237,230,0.2); }
.message-input::placeholder { color: rgba(240,237,230,0.18); }

.donate-btn { display: flex; align-items: center; justify-content: center; gap: 0.6rem; font-family: 'Bebas Neue', cursive; font-size: 1.1rem; letter-spacing: 0.14em; background: #f0c832; color: #0a0a0f; border: none; border-radius: 3px; padding: 0.9rem 1.5rem; cursor: pointer; transition: transform 0.15s, box-shadow 0.2s; box-shadow: 0 0 24px rgba(240,200,50,0.35); }
.donate-btn:hover:not(:disabled) { transform: scale(1.03); box-shadow: 0 0 36px rgba(240,200,50,0.5); }
.donate-btn:disabled { background: rgba(240,237,230,0.08); color: rgba(240,237,230,0.25); box-shadow: none; cursor: default; }
.donate-btn--artist { background: #32c8a0; box-shadow: 0 0 24px rgba(50,200,160,0.35); }
.donate-btn--artist:hover:not(:disabled) { box-shadow: 0 0 36px rgba(50,200,160,0.5); }

.artist-search-wrap { display: flex; align-items: center; gap: 0.75rem; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.1); border-radius: 3px; padding: 0.75rem 1rem; transition: border-color 0.2s; }
.artist-search-wrap.focused { border-color: rgba(240,200,50,0.35); }
.as-icon { font-size: 1rem; color: #f0c832; opacity: 0.7; }
.artist-input { flex: 1; background: none; border: none; outline: none; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: #f0ede6; }
.artist-input::placeholder { color: rgba(240,237,230,0.22); }
.as-clear { background: none; border: none; color: rgba(240,237,230,0.3); cursor: pointer; font-size: 0.75rem; }
.as-clear:hover { color: #ff5a32; }

.artist-results { display: flex; flex-direction: column; gap: 0.4rem; }
.artist-result { display: flex; align-items: center; gap: 0.85rem; background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.07); border-radius: 3px; padding: 0.7rem 0.9rem; cursor: pointer; opacity: 0; transform: translateY(5px); animation: slideUp 0.3s ease forwards; animation-delay: calc(var(--i)*40ms); transition: background 0.15s; }
.artist-result:hover { background: rgba(240,237,230,0.06); }
.ar-avatar { width: 36px; height: 36px; border-radius: 8px; background: rgba(91,106,255,0.2); display: flex; align-items: center; justify-content: center; font-family: 'Bebas Neue', cursive; font-size: 1.1rem; color: #5b6aff; flex-shrink: 0; }
.ar-name { flex: 1; font-size: 0.9rem; font-weight: 500; }
.ar-arrow { font-size: 0.8rem; color: rgba(240,237,230,0.2); }

.selected-artist { display: flex; align-items: center; gap: 0.85rem; background: rgba(50,200,160,0.08); border: 1px solid rgba(50,200,160,0.25); border-radius: 6px; padding: 0.85rem 1rem; }
.sa-avatar { width: 46px; height: 46px; border-radius: 8px; background: rgba(50,200,160,0.2); display: flex; align-items: center; justify-content: center; font-family: 'Bebas Neue', cursive; font-size: 1.4rem; color: #32c8a0; flex-shrink: 0; }
.sa-info { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; }
.sa-name { font-family: 'Bebas Neue', cursive; font-size: 1.1rem; letter-spacing: 0.08em; }
.sa-sub { font-size: 0.65rem; color: rgba(240,237,230,0.3); }
.sa-sub--warn { color: rgba(255,200,50,0.7) !important; }
.sa-change { background: none; border: 1px solid rgba(240,237,230,0.15); border-radius: 3px; color: rgba(240,237,230,0.4); font-size: 0.7rem; padding: 0.25rem 0.6rem; cursor: pointer; transition: all 0.2s; }
.sa-change:hover { color: #f0ede6; border-color: rgba(240,237,230,0.3); }

.connect-warning { background: rgba(255,200,50,0.06); border: 1px solid rgba(255,200,50,0.2); border-radius: 4px; padding: 0.65rem 0.9rem; font-size: 0.75rem; color: rgba(255,200,50,0.8); line-height: 1.6; }

.error-msg { background: rgba(255,90,50,0.1); border: 1px solid rgba(255,90,50,0.3); border-radius: 3px; padding: 0.55rem 1rem; font-size: 0.78rem; color: #ff8060; }

/* Payment overlay */
.payment-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); display: flex; align-items: flex-start; justify-content: center; padding: 1.5rem; overflow-y: auto; }
.payment-card { background: #0e0e18; border: 1px solid rgba(240,237,230,0.1); border-radius: 12px; padding: 2rem; width: 100%; max-width: 420px; position: relative; animation: successPop 0.3s ease both; margin: auto; }
.pc-close { position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: rgba(240,237,230,0.3); cursor: pointer; font-size: 1rem; transition: color 0.2s; }
.pc-close:hover { color: #ff5a32; }
.pc-title { font-family: 'Bebas Neue', cursive; font-size: 1.8rem; letter-spacing: 0.15em; margin-bottom: 0.3rem; }
.pc-amount { font-size: 0.85rem; color: rgba(240,237,230,0.4); margin-bottom: 1.5rem; }
.stripe-element { min-height: 120px; margin-bottom: 1.2rem; }
.confirm-btn { width: 100%; font-family: 'Bebas Neue', cursive; font-size: 1.1rem; letter-spacing: 0.15em; background: #f0c832; color: #0a0a0f; border: none; border-radius: 3px; padding: 0.9rem; cursor: pointer; transition: opacity 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; margin-top: 0.5rem; }
.confirm-btn:disabled { opacity: 0.5; cursor: default; }

/* Success */
.success-card { background: #0e0e18; border: 1px solid rgba(240,200,50,0.25); border-radius: 12px; padding: 2.5rem 2rem; max-width: 340px; width: 100%; text-align: center; display: flex; flex-direction: column; gap: 0.85rem; align-items: center; animation: successPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
.sc-icon { width: 56px; height: 56px; border-radius: 50%; background: rgba(240,200,50,0.15); border: 1px solid rgba(240,200,50,0.35); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #f0c832; }
.sc-title { font-family: 'Bebas Neue', cursive; font-size: 2rem; letter-spacing: 0.15em; }
.sc-text { font-size: 0.85rem; color: rgba(240,237,230,0.55); line-height: 1.6; }
.sc-text strong { color: #f0ede6; }
.sc-close { font-family: 'Bebas Neue', cursive; font-size: 0.95rem; letter-spacing: 0.12em; background: rgba(240,200,50,0.1); border: 1px solid rgba(240,200,50,0.3); color: #f0c832; border-radius: 3px; padding: 0.55rem 1.8rem; cursor: pointer; transition: background 0.2s; }
.sc-close:hover { background: rgba(240,200,50,0.2); }

.spinner { width: 14px; height: 14px; border: 2px solid rgba(0,0,0,0.3); border-top-color: #0a0a0f; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }

.panel-enter-active, .panel-leave-active { transition: opacity 0.25s, transform 0.25s; }
.panel-enter-from { opacity: 0; transform: translateX(12px); }
.panel-leave-to { opacity: 0; transform: translateX(-12px); }
.artist-pop-enter-active { transition: opacity 0.3s, transform 0.3s cubic-bezier(0.34,1.4,0.64,1); }
.artist-pop-enter-from { opacity: 0; transform: scale(0.95) translateY(6px); }
.overlay-fade-enter-active, .overlay-fade-leave-active { transition: opacity 0.25s; }
.overlay-fade-enter-from, .overlay-fade-leave-to { opacity: 0; }

@keyframes fadeDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
@keyframes successPop { from { opacity: 0; transform: scale(0.88); } to { opacity: 1; transform: scale(1); } }
@keyframes spin { to { transform: rotate(360deg); } }
</style>