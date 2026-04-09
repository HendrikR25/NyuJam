<template>
  <div class="verify-page">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>
    <div class="card">
      <div class="card-icon" :class="status">
        <span v-if="status === 'loading'"><span class="spinner"></span></span>
        <span v-else-if="status === 'success'">✓</span>
        <span v-else>✕</span>
      </div>
      <h1 class="card-title">
        {{ status === 'loading' ? 'Wird bestätigt...' : status === 'success' ? 'E-Mail bestätigt!' : 'Fehler' }}
      </h1>
      <p class="card-text">{{ message }}</p>
      <button class="card-btn" @click="router.push('/profile')" v-if="status !== 'loading'">
        {{ status === 'success' ? 'Jetzt anmelden →' : 'Zurück zum Profil →' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router  = useRouter()
const route   = useRoute()
const status  = ref('loading')
const message = ref('')
const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

onMounted(async () => {
  const token = route.query.token
  if (!token) { status.value = 'error'; message.value = 'Kein Token gefunden.'; return }
  try {
    const res  = await fetch(`${BASE_URL}/api/auth/verify-email?token=${token}`)
    const data = await res.json()
    if (res.ok) { status.value = 'success'; message.value = data.message }
    else        { status.value = 'error';   message.value = data.error }
  } catch {
    status.value = 'error'; message.value = 'Verbindungsfehler.'
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
.verify-page { min-height: 100vh; background: #0a0a0f; display: flex; align-items: center; justify-content: center; font-family: 'DM Sans', sans-serif; }
.bg-noise { position: fixed; inset: 0; pointer-events: none; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); opacity: 0.6; }
.bg-glow { position: fixed; inset: 0; pointer-events: none; background: radial-gradient(ellipse 60% 45% at 50% 30%, rgba(91,106,255,0.08) 0%, transparent 70%); }
.card { position: relative; z-index: 1; background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.08); border-radius: 12px; padding: 2.5rem 2rem; max-width: 380px; width: 90%; text-align: center; display: flex; flex-direction: column; gap: 0.85rem; align-items: center; }
.card-icon { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; }
.card-icon.loading { background: rgba(91,106,255,0.1); border: 1px solid rgba(91,106,255,0.3); }
.card-icon.success { background: rgba(50,200,160,0.1); border: 1px solid rgba(50,200,160,0.3); color: #32c8a0; }
.card-icon.error   { background: rgba(255,90,50,0.1);  border: 1px solid rgba(255,90,50,0.3);  color: #ff5a32; }
.card-title { font-family: 'Bebas Neue', cursive; font-size: 1.5rem; letter-spacing: 0.15em; color: #f0ede6; }
.card-text  { font-size: 0.85rem; color: rgba(240,237,230,0.5); line-height: 1.6; }
.card-btn   { background: #5b6aff; color: white; border: none; border-radius: 4px; padding: 0.7rem 1.8rem; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; cursor: pointer; margin-top: 0.5rem; }
.spinner { width: 24px; height: 24px; border: 3px solid rgba(91,106,255,0.3); border-top-color: #5b6aff; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>