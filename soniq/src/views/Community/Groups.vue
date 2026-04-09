<template>
  <div class="groups-page">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>
    <AdBanner ad-slot="1918440727" />
    <button class="back-btn" @click="router.push('/community')">← Community</button>

    <div class="page-header">
      <h1 class="page-title">GRUPPEN</h1>
      <p class="page-sub">{{ social.groups.length }} Gruppen</p>
    </div>

    <div class="not-logged-in" v-if="!auth.isLoggedIn">
      <p>Du musst eingeloggt sein.</p>
      <button class="login-btn" @click="router.push('/profile')">Zum Profil →</button>
    </div>

    <template v-else>
      <!-- Join / Create bar -->
      <div class="join-bar">
        <div class="join-input-wrap" :class="{ focused: joinFocused }">
          <span class="join-icon">⬡</span>
          <input v-model="joinQuery" class="join-input" type="text" placeholder="Gruppenname eingeben..."
            @focus="joinFocused = true" @blur="joinFocused = false" @keydown.enter="joinGroup" />
          <button class="join-btn" :class="{ ready: joinQuery.trim() }" @click="joinGroup">Beitreten</button>
        </div>
        <transition name="fb-fade">
          <div class="join-feedback" :class="fbType" v-if="feedback">{{ feedback }}</div>
        </transition>
      </div>

      <!-- Create group button -->
      <button class="create-group-btn" @click="showCreate = true">+ Neue Gruppe erstellen</button>

      <!-- My Groups -->
      <div class="section">
        <h2 class="section-title">Meine Gruppen</h2>
        <div class="groups-grid" v-if="social.groups.length">
          <div v-for="(g, idx) in social.groups" :key="g.id" class="group-card" :style="{ '--i': idx, '--color': g.color || '#32c8a0' }">
            <div class="gc-header">
              <div class="gc-icon" :style="{ background: (g.color||'#32c8a0') + '22', borderColor: (g.color||'#32c8a0') + '44' }">{{ g.icon || '⬡' }}</div>
            </div>
            <div class="gc-name">{{ g.name }}</div>
            <div class="gc-meta">{{ g.members }} Mitglieder</div>
            <button class="gc-leave" @click="leaveGroup(g.id)">Verlassen</button>
            <div class="gc-accent"></div>
          </div>
        </div>
        <div class="empty-state" v-else>
          <span class="empty-icon">⬡</span>
          <p class="empty-title">Noch keine Gruppen</p>
          <p class="empty-sub">Tritt einer Gruppe bei oder erstelle eine neue.</p>
        </div>
      </div>

      <!-- Create modal -->
      <transition name="modal-fade">
        <div class="modal-overlay" v-if="showCreate" @click.self="showCreate = false">
          <div class="modal-card">
            <h2 class="modal-title">Neue Gruppe</h2>
            <div class="icon-picker">
              <button v-for="ic in iconOptions" :key="ic" class="icon-opt" :class="{ active: newIcon === ic }" @click="newIcon = ic">{{ ic }}</button>
            </div>
            <div class="color-picker">
              <button v-for="col in colorOptions" :key="col" class="color-opt" :class="{ active: newColor === col }" :style="{ background: col }" @click="newColor = col"></button>
            </div>
            <input v-model="newName" class="modal-input" placeholder="Gruppenname..." @keydown.enter="createGroup" />
            <div class="modal-actions">
              <button class="modal-cancel" @click="showCreate = false">Abbrechen</button>
              <button class="modal-submit" :style="newName.trim() ? { background: newColor } : {}" :disabled="!newName.trim()" @click="createGroup">Erstellen</button>
            </div>
          </div>
        </div>
      </transition>
    </template>
  </div>
</template>

<script setup>
import AdBanner from '@/components/AdBanner.vue'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSocialStore } from '@/stores/social'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const social = useSocialStore()
const auth   = useAuthStore()

const joinQuery  = ref('')
const joinFocused = ref(false)
const feedback   = ref('')
const fbType     = ref('success')
let fbTimer = null

const showCreate = ref(false)
const newName    = ref('')
const newIcon    = ref('⬡')
const newColor   = ref('#32c8a0')
const iconOptions  = ['⬡','⚡','🌙','◎','⊹','◇','🌿','◈','♩','🎵']
const colorOptions = ['#32c8a0','#5b6aff','#ff5a32','#c864f0','#f0c832','#ff8c55']

onMounted(() => { if (auth.isLoggedIn) social.loadGroups() })

function showFb(msg, type = 'success') {
  feedback.value = msg; fbType.value = type
  clearTimeout(fbTimer)
  fbTimer = setTimeout(() => { feedback.value = '' }, 3000)
}

async function joinGroup() {
  const q = joinQuery.value.trim()
  if (!q) return
  try {
    await social.joinGroup(q)
    joinQuery.value = ''
    showFb(`✓ Gruppe „${q}" beigetreten`)
  } catch (e) { showFb(e.message, 'error') }
}

async function createGroup() {
  if (!newName.value.trim()) return
  try {
    await social.createGroup({ name: newName.value, icon: newIcon.value, color: newColor.value })
    showCreate.value = false
    newName.value = ''
    showFb('✓ Gruppe erstellt')
  } catch (e) { showFb(e.message, 'error') }
}

async function leaveGroup(id) {
  if (!confirm('Gruppe wirklich verlassen?')) return
  await social.leaveGroup(id)
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
.groups-page { min-height: 100vh; background: #0a0a0f; color: #f0ede6; font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; align-items: center; padding: 0 1.5rem 4rem; position: relative; overflow-x: hidden; }
.bg-noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size: 180px; opacity: 0.6; }
.bg-glow { position: fixed; inset: 0; pointer-events: none; z-index: 0; background: radial-gradient(ellipse 60% 45% at 70% 25%, rgba(50,200,160,0.06) 0%, transparent 70%); }
.ad-banner { position: relative; z-index: 1; width: 100%; max-width: 728px; min-height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 1px solid rgba(240,237,230,0.07); padding: 0.75rem 0; margin-bottom: 1rem; }
.ad-label { position: absolute; top: 4px; left: 0; font-size: 0.6rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.2); }
.ad-placeholder { width: 100%; max-width: 728px; height: 90px; background: rgba(240,237,230,0.03); border: 1px dashed rgba(240,237,230,0.1); border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,237,230,0.15); }
.back-btn { position: relative; z-index: 1; align-self: flex-start; background: none; border: none; cursor: pointer; color: rgba(240,237,230,0.35); font-family: 'DM Sans', sans-serif; font-size: 0.78rem; letter-spacing: 0.1em; padding: 0.4rem 0; margin-bottom: 1.5rem; transition: color 0.2s; }
.back-btn:hover { color: #ff5a32; }
.page-header { position: relative; z-index: 1; text-align: center; margin-bottom: 2rem; }
.page-title { font-family: 'Bebas Neue', cursive; font-size: 3rem; letter-spacing: 0.2em; color: #f0ede6; }
.page-sub { font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.25); margin-top: 0.3rem; }
.not-logged-in { position: relative; z-index: 1; text-align: center; color: rgba(240,237,230,0.4); display: flex; flex-direction: column; gap: 1rem; align-items: center; padding: 2rem; }
.login-btn { background: rgba(91,106,255,0.15); border: 1px solid rgba(91,106,255,0.3); color: #5b6aff; border-radius: 3px; padding: 0.6rem 1.5rem; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; transition: all 0.2s; }
.join-bar { position: relative; z-index: 1; width: 100%; max-width: 480px; margin-bottom: 1rem; display: flex; flex-direction: column; gap: 0.6rem; }
.join-input-wrap { display: flex; align-items: center; gap: 0.75rem; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.1); border-radius: 3px; padding: 0.75rem 1rem; transition: border-color 0.2s; }
.join-input-wrap.focused { border-color: rgba(50,200,160,0.4); }
.join-icon { font-size: 1rem; color: #32c8a0; opacity: 0.7; flex-shrink: 0; }
.join-input { flex: 1; background: none; border: none; outline: none; font-family: 'DM Sans', sans-serif; font-size: 0.9rem; color: #f0ede6; }
.join-input::placeholder { color: rgba(240,237,230,0.22); }
.join-btn { flex-shrink: 0; font-family: 'DM Sans', sans-serif; font-size: 0.75rem; background: rgba(240,237,230,0.06); border: 1px solid rgba(240,237,230,0.1); color: rgba(240,237,230,0.3); border-radius: 3px; padding: 0.35rem 0.8rem; cursor: pointer; transition: all 0.2s; }
.join-btn.ready { background: rgba(50,200,160,0.15); border-color: rgba(50,200,160,0.4); color: #f0ede6; }
.join-feedback { font-size: 0.75rem; padding-left: 0.25rem; }
.join-feedback.success { color: #32c8a0; }
.join-feedback.error   { color: #ff5a32; }
.create-group-btn { position: relative; z-index: 1; font-family: 'DM Sans', sans-serif; font-size: 0.82rem; letter-spacing: 0.06em; background: rgba(50,200,160,0.08); border: 1px solid rgba(50,200,160,0.25); color: #32c8a0; border-radius: 3px; padding: 0.55rem 1.2rem; cursor: pointer; transition: all 0.2s; margin-bottom: 2rem; }
.create-group-btn:hover { background: rgba(50,200,160,0.15); }
.section { position: relative; z-index: 1; width: 100%; max-width: 480px; margin-bottom: 2rem; }
.section-title { font-family: 'Bebas Neue', cursive; font-size: 1rem; letter-spacing: 0.18em; color: rgba(240,237,230,0.35); margin-bottom: 0.9rem; }
.groups-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.7rem; }
.group-card { position: relative; overflow: hidden; background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.08); border-radius: 6px; padding: 1rem; opacity: 0; transform: translateY(8px); animation: slideUp 0.38s ease forwards; animation-delay: calc(var(--i) * 55ms); }
.gc-header { margin-bottom: 0.7rem; }
.gc-icon { width: 40px; height: 40px; border-radius: 8px; border: 1px solid; display: flex; align-items: center; justify-content: center; font-size: 1.3rem; }
.gc-name { font-family: 'Bebas Neue', cursive; font-size: 1.05rem; letter-spacing: 0.08em; color: #f0ede6; margin-bottom: 0.2rem; }
.gc-meta { font-size: 0.65rem; color: rgba(240,237,230,0.3); margin-bottom: 0.6rem; }
.gc-leave { font-size: 0.65rem; background: rgba(255,90,50,0.08); border: 1px solid rgba(255,90,50,0.2); color: rgba(255,90,50,0.5); border-radius: 3px; padding: 0.22rem 0.6rem; cursor: pointer; transition: all 0.2s; width: 100%; }
.gc-leave:hover { background: rgba(255,90,50,0.15); color: #ff5a32; }
.gc-accent { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: var(--color); opacity: 0.4; }
.empty-state { display: flex; flex-direction: column; align-items: center; gap: 0.6rem; padding: 2.5rem 1rem; color: rgba(240,237,230,0.2); text-align: center; }
.empty-icon { font-size: 2.5rem; opacity: 0.3; }
.empty-title { font-family: 'Bebas Neue', cursive; font-size: 1.3rem; letter-spacing: 0.12em; }
.empty-sub { font-size: 0.75rem; max-width: 240px; line-height: 1.6; }
.modal-overlay { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
.modal-card { background: #0e0e1a; border: 1px solid rgba(240,237,230,0.1); border-radius: 10px; padding: 2rem 1.75rem; width: 100%; max-width: 340px; display: flex; flex-direction: column; gap: 1rem; }
.modal-title { font-family: 'Bebas Neue', cursive; font-size: 1.5rem; letter-spacing: 0.15em; color: #f0ede6; }
.icon-picker { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.icon-opt { width: 36px; height: 36px; border-radius: 6px; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.08); cursor: pointer; font-size: 1rem; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.icon-opt.active { background: rgba(50,200,160,0.15); border-color: rgba(50,200,160,0.5); }
.color-picker { display: flex; gap: 0.5rem; flex-wrap: wrap; }
.color-opt { width: 28px; height: 28px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: transform 0.15s; }
.color-opt.active { border-color: white; transform: scale(1.15); }
.modal-input { width: 100%; background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.12); border-radius: 3px; padding: 0.75rem 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.95rem; color: #f0ede6; outline: none; }
.modal-input::placeholder { color: rgba(240,237,230,0.22); }
.modal-actions { display: flex; gap: 0.75rem; }
.modal-cancel { flex: 1; background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.1); color: rgba(240,237,230,0.4); border-radius: 3px; padding: 0.7rem; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
.modal-submit { flex: 2; background: #32c8a0; border: none; color: #0a0a0f; border-radius: 3px; padding: 0.7rem; cursor: pointer; font-family: 'Bebas Neue', cursive; font-size: 1rem; letter-spacing: 0.1em; transition: transform 0.15s; }
.modal-submit:disabled { background: rgba(240,237,230,0.08); color: rgba(240,237,230,0.2); cursor: default; }
.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.25s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
.fb-fade-enter-active, .fb-fade-leave-active { transition: opacity 0.3s; }
.fb-fade-enter-from, .fb-fade-leave-to { opacity: 0; }
@keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
</style>