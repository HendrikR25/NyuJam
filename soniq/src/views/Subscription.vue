<template>
  <div class="sub-page">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>
    <AdBanner ad-slot="1918440727" />
    <NavBar back-to="/" />

    <div class="page-header">
      <h1 class="page-title">ABONNEMENTS</h1>
      <p class="page-sub">Unterstütze NyuJam und genieße mehr</p>
    </div>

    <!-- Current subscription -->
    <div class="current-sub" v-if="currentSub">
      <span class="cs-icon">★</span>
      <div class="cs-info">
        <span class="cs-plan">{{ currentSub.plan === 'basic' ? 'Basic' : 'Premium' }} aktiv</span>
        <span class="cs-since">seit {{ formatDate(currentSub.started_at) }}</span>
      </div>
      <button class="cs-cancel" @click="cancelSub" :disabled="cancelling">
        {{ cancelling ? 'Wird gekündigt...' : 'Kündigen' }}
      </button>
    </div>

    <!-- Plans -->
    <div class="plans">

      <!-- Basic -->
      <div class="plan-card" :class="{ active: currentSub?.plan === 'basic' }">
        <div class="plan-header">
          <span class="plan-icon">◈</span>
          <div>
            <h2 class="plan-name">Basic</h2>
            <span class="plan-price">3 € <span class="plan-period">/ Monat</span></span>
          </div>
          <span class="plan-badge" v-if="currentSub?.plan === 'basic'">Aktiv</span>
        </div>
        <ul class="plan-features">
          <li class="pf-item pf-item--yes">
            <span class="pf-icon">✓</span> Keine Werbebanner
          </li>
          <li class="pf-item pf-item--yes">
            <span class="pf-icon">✓</span> Alle Radio-Funktionen
          </li>
          <li class="pf-item pf-item--yes">
            <span class="pf-icon">✓</span> Unterstützt Künstler direkt
          </li>
          <li class="pf-item pf-item--no">
            <span class="pf-icon">—</span> Offline-Downloads
          </li>
        </ul>
        <button
          class="plan-btn"
          :class="{ active: currentSub?.plan === 'basic' }"
          :disabled="!!currentSub || subscribing === 'basic'"
          @click="subscribe('basic')"
        >
          <span v-if="subscribing === 'basic'"><span class="spinner"></span> Weiterleitung...</span>
          <span v-else-if="currentSub?.plan === 'basic'">Aktuelles Abo</span>
          <span v-else-if="currentSub">Bereits abonniert</span>
          <span v-else>Basic abonnieren</span>
        </button>
      </div>

      <!-- Premium -->
      <div class="plan-card plan-card--premium" :class="{ active: currentSub?.plan === 'premium' }">
        <div class="plan-badge-top">Bald verfügbar</div>
        <div class="plan-header">
          <span class="plan-icon">⚡</span>
          <div>
            <h2 class="plan-name">Premium</h2>
            <span class="plan-price">5,99 € <span class="plan-period">/ Monat</span></span>
          </div>
          <span class="plan-badge" v-if="currentSub?.plan === 'premium'">Aktiv</span>
        </div>
        <ul class="plan-features">
          <li class="pf-item pf-item--yes">
            <span class="pf-icon">✓</span> Keine Werbebanner
          </li>
          <li class="pf-item pf-item--yes">
            <span class="pf-icon">✓</span> Alle Radio-Funktionen
          </li>
          <li class="pf-item pf-item--yes">
            <span class="pf-icon">✓</span> Unterstützt Künstler direkt
          </li>
          <li class="pf-item pf-item--yes">
            <span class="pf-icon">✓</span> Offline-Downloads
          </li>
        </ul>
        <button class="plan-btn plan-btn--disabled" disabled>
          Demnächst verfügbar
        </button>
      </div>

    </div>

    <!-- Not logged in -->
    <div class="login-hint" v-if="!auth.isLoggedIn">
      <p>Du musst eingeloggt sein um ein Abo abzuschließen.</p>
      <button @click="router.push('/profile')">Anmelden →</button>
    </div>

    <div class="error-msg" v-if="errorMsg">⚠ {{ errorMsg }}</div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import NavBar   from '@/components/NavBar.vue'
import AdBanner from '@/components/AdBanner.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth   = useAuthStore()
const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

const currentSub  = ref(null)
const subscribing = ref(null)
const cancelling  = ref(false)
const errorMsg    = ref('')

function authHeader() {
  const t = localStorage.getItem('nyujam_token') || ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }
}

onMounted(async () => {
  if (!auth.isLoggedIn) return
  try {
    const res = await fetch(`${BASE_URL}/api/subscription`, { headers: authHeader() })
    currentSub.value = await res.json()
  } catch {}
})

async function subscribe(plan) {
  if (!auth.isLoggedIn) { router.push('/profile'); return }
  subscribing.value = plan
  errorMsg.value = ''
  try {
    const res  = await fetch(`${BASE_URL}/api/subscription/create`, {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({ plan }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else errorMsg.value = data.error || 'Fehler beim Erstellen'
  } catch { errorMsg.value = 'Verbindungsfehler' }
  finally { subscribing.value = null }
}

async function cancelSub() {
  if (!confirm('Abo wirklich kündigen?')) return
  cancelling.value = true
  try {
    await fetch(`${BASE_URL}/api/subscription/cancel`, { method: 'POST', headers: authHeader() })
    currentSub.value = null
  } catch { errorMsg.value = 'Kündigung fehlgeschlagen' }
  finally { cancelling.value = false }
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.sub-page { min-height: 100vh; background: #0a0a0f; color: #f0ede6; font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; align-items: center; padding: 0 1.5rem 4rem; position: relative; overflow-x: hidden; }
.bg-noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size: 180px; opacity: 0.6; }
.bg-glow { position: fixed; inset: 0; pointer-events: none; z-index: 0; background: radial-gradient(ellipse 60% 45% at 50% 20%, rgba(240,200,50,0.07) 0%, transparent 70%); }

.page-header { position: relative; z-index: 1; text-align: center; margin-bottom: 2rem; }
.page-title { font-family: 'Bebas Neue', cursive; font-size: 2.8rem; letter-spacing: 0.2em; }
.page-sub { font-size: 0.72rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.25); margin-top: 0.3rem; }

.current-sub { position: relative; z-index: 1; width: 100%; max-width: 480px; background: rgba(240,200,50,0.08); border: 1px solid rgba(240,200,50,0.25); border-radius: 8px; padding: 1rem 1.2rem; display: flex; align-items: center; gap: 0.85rem; margin-bottom: 1.5rem; }
.cs-icon { font-size: 1.3rem; color: #f0c832; }
.cs-info { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; }
.cs-plan { font-size: 0.88rem; font-weight: 600; color: #f0ede6; }
.cs-since { font-size: 0.68rem; color: rgba(240,237,230,0.4); }
.cs-cancel { background: none; border: 1px solid rgba(255,90,50,0.3); color: rgba(255,90,50,0.6); border-radius: 3px; padding: 0.3rem 0.75rem; font-size: 0.75rem; cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
.cs-cancel:hover { color: #ff5a32; border-color: rgba(255,90,50,0.5); }

.plans { position: relative; z-index: 1; width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: 1rem; }

.plan-card { background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.08); border-radius: 10px; padding: 1.5rem; position: relative; transition: border-color 0.2s; }
.plan-card.active { border-color: rgba(240,200,50,0.35); background: rgba(240,200,50,0.04); }
.plan-card--premium { opacity: 0.6; }
.plan-badge-top { position: absolute; top: -1px; right: 1rem; background: rgba(91,106,255,0.15); border: 1px solid rgba(91,106,255,0.3); border-top: none; border-radius: 0 0 4px 4px; padding: 0.15rem 0.6rem; font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: #5b6aff; }
.plan-header { display: flex; align-items: center; gap: 0.85rem; margin-bottom: 1.2rem; }
.plan-icon { font-size: 1.5rem; color: #f0c832; flex-shrink: 0; }
.plan-name { font-family: 'Bebas Neue', cursive; font-size: 1.3rem; letter-spacing: 0.1em; }
.plan-price { font-size: 1.1rem; font-weight: 600; color: #f0ede6; }
.plan-period { font-size: 0.72rem; color: rgba(240,237,230,0.4); font-weight: 400; }
.plan-badge { margin-left: auto; background: rgba(240,200,50,0.15); border: 1px solid rgba(240,200,50,0.3); color: #f0c832; border-radius: 3px; padding: 0.15rem 0.5rem; font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; }

.plan-features { list-style: none; display: flex; flex-direction: column; gap: 0.55rem; margin-bottom: 1.3rem; }
.pf-item { display: flex; align-items: center; gap: 0.6rem; font-size: 0.83rem; color: rgba(240,237,230,0.6); }
.pf-item--yes { color: rgba(240,237,230,0.8); }
.pf-item--no  { color: rgba(240,237,230,0.3); }
.pf-icon { width: 16px; text-align: center; flex-shrink: 0; }
.pf-item--yes .pf-icon { color: #32c8a0; }

.plan-btn { width: 100%; font-family: 'Bebas Neue', cursive; font-size: 1rem; letter-spacing: 0.14em; background: #f0c832; color: #0a0a0f; border: none; border-radius: 4px; padding: 0.8rem; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; box-shadow: 0 0 20px rgba(240,200,50,0.3); }
.plan-btn:hover:not(:disabled) { box-shadow: 0 0 32px rgba(240,200,50,0.5); transform: scale(1.02); }
.plan-btn:disabled { opacity: 0.5; cursor: default; box-shadow: none; transform: none; }
.plan-btn.active { background: rgba(240,200,50,0.15); color: #f0c832; box-shadow: none; }
.plan-btn--disabled { background: rgba(240,237,230,0.06); color: rgba(240,237,230,0.3); box-shadow: none; }

.login-hint { position: relative; z-index: 1; text-align: center; margin-top: 1.5rem; display: flex; flex-direction: column; gap: 0.75rem; }
.login-hint p { font-size: 0.82rem; color: rgba(240,237,230,0.4); }
.login-hint button { background: none; border: 1px solid rgba(91,106,255,0.3); color: #5b6aff; border-radius: 3px; padding: 0.5rem 1.5rem; cursor: pointer; font-family: 'DM Sans', sans-serif; }
.error-msg { position: relative; z-index: 1; background: rgba(255,90,50,0.1); border: 1px solid rgba(255,90,50,0.3); border-radius: 3px; padding: 0.55rem 1rem; font-size: 0.78rem; color: #ff8060; margin-top: 1rem; max-width: 480px; width: 100%; }
.spinner { width: 14px; height: 14px; border: 2px solid rgba(0,0,0,0.3); border-top-color: #0a0a0f; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>