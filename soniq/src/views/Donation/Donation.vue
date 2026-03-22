<template>
  <div class="donation-page">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>

    <!-- Ad Banner -->
    <div class="ad-banner">
      <span class="ad-label">Anzeige</span>
      <slot name="ad-top"><div class="ad-placeholder">Advertisement</div></slot>
    </div>

    <NavBar back-to="/" />

    <!-- Header -->
    <div class="page-header">
      <span class="header-icon">€</span>
      <h1 class="page-title">SPENDE</h1>
      <p class="page-sub">Unterstütze Musik — direkt & transparent</p>
    </div>

    <!-- Mode Tabs -->
    <div class="mode-tabs">
      <button
        class="mode-tab"
        :class="{ active: mode === 'platform' }"
        @click="mode = 'platform'; resetForm()"
      >
        <span class="mt-icon">◈</span>
        NyuJam
      </button>
      <button
        class="mode-tab"
        :class="{ active: mode === 'artist' }"
        @click="mode = 'artist'; resetForm()"
      >
        <span class="mt-icon">♩</span>
        Künstler
      </button>
    </div>

    <!-- ── Platform Donation ── -->
    <transition name="panel" mode="out-in">
      <div class="donation-panel" key="platform" v-if="mode === 'platform'">
        <div class="panel-intro">
          <div class="pi-logo">◈ NyuJam</div>
          <p class="pi-text">
            Deine Spende hilft uns, NyuJam weiterzuentwickeln, Server zu betreiben
            und Musik für alle zugänglich zu halten.
          </p>
        </div>

        <!-- Amount presets -->
        <div class="amount-grid">
          <button
            v-for="a in platformAmounts" :key="a"
            class="amount-btn"
            :class="{ active: selectedAmount === a && !customActive }"
            @click="selectAmount(a)"
          >{{ a }} €</button>
          <button
            class="amount-btn amount-btn--custom"
            :class="{ active: customActive }"
            @click="customActive = true; selectedAmount = null"
          >Eigener Betrag</button>
        </div>

        <input
          v-if="customActive"
          v-model="customAmount"
          class="custom-input"
          type="number" min="1" placeholder="Betrag in €"
        />

        <!-- Message -->
        <textarea
          v-model="message"
          class="message-input"
          placeholder="Optionale Nachricht an das NyuJam-Team..."
          rows="3"
        ></textarea>

        <button class="donate-btn donate-btn--platform" @click="submitDonation" :disabled="!canDonate">
          <span class="db-icon">€</span>
          {{ canDonate ? `${finalAmount} € an NyuJam spenden` : 'Betrag wählen' }}
        </button>
      </div>

      <!-- ── Artist Donation ── -->
      <div class="donation-panel" key="artist" v-else>
        <div class="panel-intro">
          <p class="pi-text">
            Unterstütze deinen Lieblingskünstler direkt. 100% des Betrags
            gehen ohne Abzüge an den Künstler.
          </p>
        </div>

        <!-- Artist search -->
        <div class="artist-search-wrap" :class="{ focused: artistFocused }">
          <span class="as-icon">♩</span>
          <input
            v-model="artistQuery"
            class="artist-input"
            placeholder="Künstler suchen..."
            @focus="artistFocused = true"
            @blur="artistFocused = false"
            @input="searchArtists"
          />
          <button v-if="artistQuery" class="as-clear" @click="artistQuery = ''; selectedArtist = null; artistResults = []">✕</button>
        </div>

        <!-- Artist results -->
        <div class="artist-results" v-if="artistResults.length && !selectedArtist">
          <div
            v-for="(a, idx) in artistResults" :key="a.id"
            class="artist-result"
            :style="{ '--i': idx, '--color': a.color }"
            @click="pickArtist(a)"
          >
            <div class="ar-avatar" :style="{ background: a.color + '33', borderColor: a.color + '55' }">{{ a.icon }}</div>
            <div class="ar-info">
              <span class="ar-name">{{ a.name }}</span>
              <span class="ar-genre">{{ a.genre }}</span>
            </div>
            <span class="ar-arrow">→</span>
          </div>
        </div>

        <!-- Selected artist -->
        <transition name="artist-pop">
          <div class="selected-artist" v-if="selectedArtist" :style="{ '--color': selectedArtist.color }">
            <div class="sa-avatar" :style="{ background: selectedArtist.color + '33', borderColor: selectedArtist.color + '55' }">
              {{ selectedArtist.icon }}
            </div>
            <div class="sa-info">
              <span class="sa-name">{{ selectedArtist.name }}</span>
              <span class="sa-genre">{{ selectedArtist.genre }}</span>
            </div>
            <button class="sa-change" @click="selectedArtist = null; artistQuery = ''">Ändern</button>
          </div>
        </transition>

        <!-- Amount presets -->
        <div class="amount-grid" v-if="selectedArtist">
          <button
            v-for="a in artistAmounts" :key="a"
            class="amount-btn"
            :class="{ active: selectedAmount === a && !customActive }"
            :style="selectedAmount === a && !customActive ? { '--accent': selectedArtist.color } : {}"
            @click="selectAmount(a)"
          >{{ a }} €</button>
          <button
            class="amount-btn amount-btn--custom"
            :class="{ active: customActive }"
            @click="customActive = true; selectedAmount = null"
          >Eigener</button>
        </div>

        <input
          v-if="customActive && selectedArtist"
          v-model="customAmount"
          class="custom-input"
          type="number" min="1" placeholder="Betrag in €"
        />

        <textarea
          v-if="selectedArtist"
          v-model="message"
          class="message-input"
          placeholder="Optionale Nachricht an den Künstler..."
          rows="3"
        ></textarea>

        <button
          v-if="selectedArtist"
          class="donate-btn"
          :style="canDonate ? { background: selectedArtist.color, boxShadow: `0 0 24px ${selectedArtist.color}55` } : {}"
          @click="submitDonation"
          :disabled="!canDonate"
        >
          <span class="db-icon">♩</span>
          {{ canDonate ? `${finalAmount} € an ${selectedArtist.name} spenden` : 'Betrag wählen' }}
        </button>
      </div>
    </transition>

    <!-- Success modal -->
    <transition name="success-fade">
      <div class="success-overlay" v-if="showSuccess" @click="showSuccess = false">
        <div class="success-card" @click.stop>
          <span class="sc-icon">✓</span>
          <h2 class="sc-title">Danke!</h2>
          <p class="sc-text" v-if="mode === 'platform'">
            Du hast <strong>{{ lastDonation.amount }} €</strong> an NyuJam gespendet.
          </p>
          <p class="sc-text" v-else>
            Du hast <strong>{{ lastDonation.amount }} €</strong> an <strong>{{ lastDonation.artist }}</strong> gespendet.
          </p>
          <button class="sc-close" @click="showSuccess = false">Schließen</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import NavBar from '@/components/NavBar.vue'

const router = useRouter()

const mode          = ref('platform')
const selectedAmount = ref(null)
const customActive  = ref(false)
const customAmount  = ref('')
const message       = ref('')
const showSuccess   = ref(false)
const lastDonation  = ref({})

// Platform
const platformAmounts = [1, 3, 5, 10, 20]
const artistAmounts   = [1, 2, 5, 10, 25]

// Artist
const artistQuery   = ref('')
const artistFocused = ref(false)
const artistResults = ref([])
const selectedArtist = ref(null)

const mockArtists = [
  { id: 1, name: 'Bonobo',         genre: 'Electronic / Jazz',  icon: '🌿', color: '#32c8a0' },
  { id: 2, name: 'M83',            genre: 'Synthpop',           icon: '◈',  color: '#5b6aff' },
  { id: 3, name: 'Frank Ocean',    genre: 'R&B / Soul',         icon: '🌊', color: '#c864f0' },
  { id: 4, name: 'Petit Biscuit',  genre: 'Electronic',         icon: '☁️', color: '#ff8c55' },
  { id: 5, name: 'Daft Punk',      genre: 'House / Electronic', icon: '⚡', color: '#f0c832' },
  { id: 6, name: 'Jon Hopkins',    genre: 'Ambient / Techno',   icon: '◎',  color: '#ff5a32' },
  { id: 7, name: 'YOASOBI',        genre: 'J-Pop',              icon: '🌸', color: '#ff5a32' },
  { id: 8, name: 'Odesza',         genre: 'Electronic',         icon: '⊹',  color: '#5b6aff' },
]

function searchArtists() {
  const q = artistQuery.value.toLowerCase().trim()
  if (!q) { artistResults.value = []; return }
  artistResults.value = mockArtists.filter(a => a.name.toLowerCase().includes(q))
}

function pickArtist(a) {
  selectedArtist.value = a
  artistQuery.value    = a.name
  artistResults.value  = []
}

function selectAmount(a) {
  selectedAmount.value = a
  customActive.value   = false
  customAmount.value   = ''
}

const finalAmount = computed(() => {
  if (customActive.value) return Number(customAmount.value) || 0
  return selectedAmount.value ?? 0
})

const canDonate = computed(() => {
  if (finalAmount.value <= 0) return false
  if (mode.value === 'artist' && !selectedArtist.value) return false
  return true
})

function submitDonation() {
  if (!canDonate.value) return
  lastDonation.value = {
    amount: finalAmount.value,
    artist: selectedArtist.value?.name ?? 'NyuJam',
  }
  showSuccess.value = true
  resetForm()
}

function resetForm() {
  selectedAmount.value  = null
  customActive.value    = false
  customAmount.value    = ''
  message.value         = ''
  artistQuery.value     = ''
  artistResults.value   = []
  selectedArtist.value  = null
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.donation-page {
  min-height: 100vh; background: #0a0a0f; color: #f0ede6;
  font-family: 'DM Sans', sans-serif;
  display: flex; flex-direction: column; align-items: center;
  padding: 0 1.5rem 4rem; position: relative; overflow-x: hidden;
}
.bg-noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size: 180px; opacity: 0.6; }
.bg-glow { position: fixed; inset: 0; pointer-events: none; z-index: 0; background: radial-gradient(ellipse 60% 45% at 50% 20%, rgba(240,200,50,0.06) 0%, transparent 70%); }

/* Ad */
.ad-banner { position: relative; z-index: 1; width: 100%; max-width: 728px; min-height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 1px solid rgba(240,237,230,0.07); padding: 0.75rem 0; margin-bottom: 1rem; }
.ad-label { position: absolute; top: 4px; left: 0; font-size: 0.6rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.2); }
.ad-placeholder { width: 100%; max-width: 728px; height: 90px; background: rgba(240,237,230,0.03); border: 1px dashed rgba(240,237,230,0.1); border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,237,230,0.15); }

.back-btn { position: relative; z-index: 1; align-self: flex-start; background: none; border: none; cursor: pointer; color: rgba(240,237,230,0.35); font-family: 'DM Sans', sans-serif; font-size: 0.78rem; letter-spacing: 0.1em; padding: 0.4rem 0; margin-bottom: 1.5rem; transition: color 0.2s; }
.back-btn:hover { color: #ff5a32; }

/* Header */
.page-header { position: relative; z-index: 1; text-align: center; margin-bottom: 2rem; animation: fadeDown 0.5s ease both; }
.header-icon { font-size: 2rem; color: #f0c832; display: block; margin-bottom: 0.3rem; }
.page-title { font-family: 'Bebas Neue', cursive; font-size: 3rem; letter-spacing: 0.2em; color: #f0ede6; }
.page-sub { font-size: 0.72rem; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(240,237,230,0.25); margin-top: 0.35rem; }

/* Mode tabs */
.mode-tabs { position: relative; z-index: 1; display: flex; gap: 0.6rem; margin-bottom: 2rem; animation: fadeDown 0.5s 0.08s ease both; }
.mode-tab { display: flex; align-items: center; gap: 0.5rem; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 500; letter-spacing: 0.06em; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.1); color: rgba(240,237,230,0.4); border-radius: 3px; padding: 0.65rem 1.5rem; cursor: pointer; transition: all 0.2s; }
.mode-tab:hover { color: #f0ede6; border-color: rgba(240,237,230,0.2); }
.mode-tab.active { background: rgba(240,200,50,0.1); border-color: rgba(240,200,50,0.35); color: #f0c832; }
.mt-icon { font-size: 1rem; }

/* Panel */
.donation-panel { position: relative; z-index: 1; width: 100%; max-width: 460px; display: flex; flex-direction: column; gap: 1.1rem; }

.panel-intro { background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.07); border-radius: 6px; padding: 1.1rem 1.2rem; }
.pi-logo { font-family: 'Bebas Neue', cursive; font-size: 1.2rem; letter-spacing: 0.15em; color: #f0c832; margin-bottom: 0.5rem; }
.pi-text { font-size: 0.82rem; color: rgba(240,237,230,0.45); line-height: 1.65; }

/* Amount grid */
.amount-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.55rem; }
.amount-btn { font-family: 'Bebas Neue', cursive; font-size: 1.1rem; letter-spacing: 0.1em; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.1); color: rgba(240,237,230,0.5); border-radius: 3px; padding: 0.7rem; cursor: pointer; transition: all 0.2s; }
.amount-btn:hover { border-color: rgba(240,200,50,0.3); color: #f0ede6; background: rgba(240,200,50,0.06); }
.amount-btn.active { background: rgba(240,200,50,0.12); border-color: rgba(240,200,50,0.45); color: #f0c832; }
.amount-btn--custom { font-family: 'DM Sans', sans-serif; font-size: 0.78rem; letter-spacing: 0.06em; }

.custom-input { width: 100%; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,200,50,0.25); border-radius: 3px; padding: 0.75rem 1rem; font-family: 'DM Sans', sans-serif; font-size: 1rem; color: #f0ede6; outline: none; transition: border-color 0.2s; }
.custom-input:focus { border-color: rgba(240,200,50,0.5); }
.custom-input::placeholder { color: rgba(240,237,230,0.2); }

.message-input { width: 100%; background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.09); border-radius: 3px; padding: 0.75rem 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.82rem; color: #f0ede6; outline: none; resize: none; transition: border-color 0.2s; }
.message-input:focus { border-color: rgba(240,237,230,0.2); }
.message-input::placeholder { color: rgba(240,237,230,0.18); }

/* Donate button */
.donate-btn { display: flex; align-items: center; justify-content: center; gap: 0.6rem; font-family: 'Bebas Neue', cursive; font-size: 1.1rem; letter-spacing: 0.14em; background: #f0c832; color: #0a0a0f; border: none; border-radius: 3px; padding: 0.9rem 1.5rem; cursor: pointer; transition: transform 0.15s, box-shadow 0.2s, background 0.3s; box-shadow: 0 0 24px rgba(240,200,50,0.35); }
.donate-btn:hover:not(:disabled) { transform: scale(1.03); box-shadow: 0 0 36px rgba(240,200,50,0.5); }
.donate-btn:disabled { background: rgba(240,237,230,0.08); color: rgba(240,237,230,0.25); box-shadow: none; cursor: default; }
.donate-btn--platform { background: #f0c832; }
.db-icon { font-size: 1rem; }

/* Artist search */
.artist-search-wrap { display: flex; align-items: center; gap: 0.75rem; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.1); border-radius: 3px; padding: 0.75rem 1rem; transition: border-color 0.2s; }
.artist-search-wrap.focused { border-color: rgba(240,200,50,0.35); }
.as-icon { font-size: 1rem; color: #f0c832; opacity: 0.7; flex-shrink: 0; }
.artist-input { flex: 1; background: none; border: none; outline: none; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: #f0ede6; }
.artist-input::placeholder { color: rgba(240,237,230,0.22); }
.as-clear { background: none; border: none; color: rgba(240,237,230,0.3); cursor: pointer; font-size: 0.75rem; transition: color 0.2s; }
.as-clear:hover { color: #ff5a32; }

/* Artist results */
.artist-results { display: flex; flex-direction: column; gap: 0.4rem; }
.artist-result { display: flex; align-items: center; gap: 0.85rem; background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.07); border-radius: 3px; padding: 0.7rem 0.9rem; cursor: pointer; opacity: 0; transform: translateY(5px); animation: slideUp 0.3s ease forwards; animation-delay: calc(var(--i)*40ms); transition: background 0.15s, border-color 0.2s; }
.artist-result:hover { background: color-mix(in srgb, var(--color) 8%, transparent); border-color: color-mix(in srgb, var(--color) 30%, transparent); }
.ar-avatar { width: 40px; height: 40px; border-radius: 8px; border: 1px solid; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; }
.ar-info { flex: 1; display: flex; flex-direction: column; gap: 0.12rem; }
.ar-name { font-size: 0.9rem; font-weight: 500; color: #f0ede6; }
.ar-genre { font-size: 0.65rem; color: rgba(240,237,230,0.3); }
.ar-arrow { font-size: 0.8rem; color: rgba(240,237,230,0.2); }

/* Selected artist */
.selected-artist { display: flex; align-items: center; gap: 0.85rem; background: color-mix(in srgb, var(--color) 8%, transparent); border: 1px solid color-mix(in srgb, var(--color) 35%, transparent); border-radius: 6px; padding: 0.85rem 1rem; }
.sa-avatar { width: 46px; height: 46px; border-radius: 8px; border: 1px solid; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
.sa-info { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; }
.sa-name { font-family: 'Bebas Neue', cursive; font-size: 1.1rem; letter-spacing: 0.08em; color: #f0ede6; }
.sa-genre { font-size: 0.65rem; color: rgba(240,237,230,0.35); }
.sa-change { background: none; border: 1px solid rgba(240,237,230,0.15); border-radius: 3px; color: rgba(240,237,230,0.4); font-size: 0.7rem; padding: 0.25rem 0.6rem; cursor: pointer; transition: all 0.2s; white-space: nowrap; }
.sa-change:hover { color: #f0ede6; border-color: rgba(240,237,230,0.3); }

/* Success overlay */
.success-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
.success-card { background: #0e0e18; border: 1px solid rgba(240,200,50,0.25); border-radius: 10px; padding: 2.5rem 2rem; max-width: 340px; width: 100%; text-align: center; display: flex; flex-direction: column; gap: 0.85rem; align-items: center; animation: successPop 0.4s cubic-bezier(0.34,1.56,0.64,1) both; }
.sc-icon { width: 56px; height: 56px; border-radius: 50%; background: rgba(240,200,50,0.15); border: 1px solid rgba(240,200,50,0.35); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #f0c832; }
.sc-title { font-family: 'Bebas Neue', cursive; font-size: 2rem; letter-spacing: 0.15em; color: #f0ede6; }
.sc-text { font-size: 0.85rem; color: rgba(240,237,230,0.55); line-height: 1.6; }
.sc-text strong { color: #f0ede6; }
.sc-close { font-family: 'Bebas Neue', cursive; font-size: 0.95rem; letter-spacing: 0.12em; background: rgba(240,200,50,0.1); border: 1px solid rgba(240,200,50,0.3); color: #f0c832; border-radius: 3px; padding: 0.55rem 1.8rem; cursor: pointer; transition: background 0.2s; margin-top: 0.5rem; }
.sc-close:hover { background: rgba(240,200,50,0.2); }

/* Transitions */
.panel-enter-active, .panel-leave-active { transition: opacity 0.25s, transform 0.25s; }
.panel-enter-from { opacity: 0; transform: translateX(12px); }
.panel-leave-to   { opacity: 0; transform: translateX(-12px); }
.artist-pop-enter-active { transition: opacity 0.3s, transform 0.3s cubic-bezier(0.34,1.4,0.64,1); }
.artist-pop-enter-from { opacity: 0; transform: scale(0.95) translateY(6px); }
.success-fade-enter-active, .success-fade-leave-active { transition: opacity 0.25s; }
.success-fade-enter-from, .success-fade-leave-to { opacity: 0; }

@keyframes fadeDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
@keyframes successPop { from { opacity: 0; transform: scale(0.88); } to { opacity: 1; transform: scale(1); } }
</style>