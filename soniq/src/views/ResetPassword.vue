<template>
  <div class="reset-page">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>
    <div class="card">
      <h1 class="card-title">◈ NYUJAM</h1>

      <!-- Success -->
      <div v-if="done" class="result-wrap">
        <div class="result-icon success">✓</div>
        <p class="result-text">Passwort erfolgreich geändert!</p>
        <button class="submit-btn" @click="router.push('/profile')">Jetzt anmelden →</button>
      </div>

      <!-- Form -->
      <template v-else>
        <p class="card-sub">Neues Passwort festlegen</p>
        <div class="field">
          <label class="field-label">Neues Passwort</label>
          <div class="pw-wrap">
            <input v-model="password" :type="showPw ? 'text' : 'password'" class="field-input" placeholder="Mindestens 6 Zeichen" @keydown.enter="submit" />
            <button class="pw-toggle" @click="showPw = !showPw" type="button">{{ showPw ? '🙈' : '👁' }}</button>
          </div>
        </div>
        <div class="field">
          <label class="field-label">Passwort bestätigen</label>
          <input v-model="confirm" type="password" class="field-input" placeholder="Wiederholen..." @keydown.enter="submit" />
        </div>
        <div class="form-error" v-if="error">⚠ {{ error }}</div>
        <button class="submit-btn" @click="submit" :disabled="loading">
          <span v-if="loading"><span class="spinner"></span> Wird gespeichert...</span>
          <span v-else>Passwort speichern</span>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router   = useRouter()
const route    = useRoute()
const password = ref('')
const confirm  = ref('')
const showPw   = ref(false)
const loading  = ref(false)
const error    = ref('')
const done     = ref(false)
const token    = route.query.token
const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

onMounted(() => {
  if (!token) { error.value = 'Ungültiger Link.'; }
})

async function submit() {
  error.value = ''
  if (!password.value || password.value.length < 6) { error.value = 'Mindestens 6 Zeichen.'; return }
  if (password.value !== confirm.value) { error.value = 'Passwörter stimmen nicht überein.'; return }
  loading.value = true
  try {
    const res  = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: password.value }),
    })
    const data = await res.json()
    if (res.ok) done.value = true
    else error.value = data.error
  } catch { error.value = 'Verbindungsfehler.' }
  finally { loading.value = false }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
.reset-page { min-height: 100vh; background: #0a0a0f; display: flex; align-items: center; justify-content: center; font-family: 'DM Sans', sans-serif; color: #f0ede6; }
.bg-noise { position: fixed; inset: 0; pointer-events: none; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); opacity: 0.6; }
.bg-glow { position: fixed; inset: 0; pointer-events: none; background: radial-gradient(ellipse 60% 45% at 50% 30%, rgba(240,200,50,0.06) 0%, transparent 70%); }
.card { position: relative; z-index: 1; background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.08); border-radius: 12px; padding: 2.5rem 2rem; max-width: 380px; width: 90%; display: flex; flex-direction: column; gap: 1rem; }
.card-title { font-family: 'Bebas Neue', cursive; font-size: 1.5rem; letter-spacing: 0.15em; color: #f0ede6; }
.card-sub { font-size: 0.82rem; color: rgba(240,237,230,0.4); }
.field { display: flex; flex-direction: column; gap: 0.4rem; }
.field-label { font-size: 0.68rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,237,230,0.35); }
.field-input { background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.1); border-radius: 3px; padding: 0.75rem 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.92rem; color: #f0ede6; outline: none; width: 100%; }
.field-input:focus { border-color: rgba(91,106,255,0.4); }
.field-input::placeholder { color: rgba(240,237,230,0.2); }
.pw-wrap { position: relative; }
.pw-wrap .field-input { padding-right: 3rem; }
.pw-toggle { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 1rem; }
.form-error { background: rgba(255,90,50,0.1); border: 1px solid rgba(255,90,50,0.3); border-radius: 3px; padding: 0.55rem 1rem; font-size: 0.78rem; color: #ff8060; }
.submit-btn { background: #5b6aff; color: white; border: none; border-radius: 3px; padding: 0.85rem; font-family: 'Bebas Neue', cursive; font-size: 1rem; letter-spacing: 0.12em; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
.submit-btn:disabled { opacity: 0.5; cursor: default; }
.result-wrap { display: flex; flex-direction: column; align-items: center; gap: 0.85rem; padding: 1rem 0; }
.result-icon { width: 56px; height: 56px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
.result-icon.success { background: rgba(50,200,160,0.1); border: 1px solid rgba(50,200,160,0.3); color: #32c8a0; }
.result-text { font-size: 0.88rem; color: rgba(240,237,230,0.6); }
.spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>