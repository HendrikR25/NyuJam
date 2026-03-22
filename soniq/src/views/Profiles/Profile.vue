<template>
  <div class="profile-page">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>

    <!-- Ad Banner -->
    <div class="ad-banner">
      <span class="ad-label">Anzeige</span>
      <slot name="ad-top"><div class="ad-placeholder">Advertisement</div></slot>
    </div>

    <button class="back-btn" @click="router.push('/')">← Home</button>

    <!-- ── NOT LOGGED IN ── -->
    <template v-if="!auth.isLoggedIn">
      <div class="page-header">
        <h1 class="page-title">PROFIL</h1>
        <p class="page-sub">Melde dich an oder erstelle einen Account</p>
      </div>

      <!-- Mode toggle -->
      <div class="mode-tabs">
        <button class="mode-tab" :class="{ active: mode === 'login' }"    @click="mode = 'login';    clearForm()">Anmelden</button>
        <button class="mode-tab" :class="{ active: mode === 'register' }" @click="mode = 'register'; clearForm()">Registrieren</button>
      </div>

      <!-- Error -->
      <transition name="err-fade">
        <div class="form-error" v-if="auth.error">⚠ {{ auth.error }}</div>
      </transition>

      <!-- Login Form -->
      <transition name="form-swap" mode="out-in">
        <div class="auth-form" key="login" v-if="mode === 'login'">
          <div class="field">
            <label class="field-label">Benutzername oder E-Mail</label>
            <input v-model="identifier" class="field-input" type="text" placeholder="z.B. maxmuster" @keydown.enter="submitLogin" />
          </div>
          <div class="field">
            <label class="field-label">Passwort</label>
            <div class="password-wrap">
              <input v-model="password" class="field-input" :type="showPw ? 'text' : 'password'" placeholder="••••••••" @keydown.enter="submitLogin" />
              <button class="pw-toggle" @click="showPw = !showPw" type="button">{{ showPw ? '🙈' : '👁' }}</button>
            </div>
          </div>
          <button class="submit-btn" :class="{ loading: auth.loading }" @click="submitLogin" :disabled="auth.loading">
            {{ auth.loading ? 'Anmelden...' : 'Anmelden' }}
          </button>
        </div>

        <!-- Register Form -->
        <div class="auth-form" key="register" v-else>
          <div class="field">
            <label class="field-label">Benutzername</label>
            <input v-model="regUsername" class="field-input" type="text" placeholder="einzigartiger Name" @keydown.enter="submitRegister" />
            <span class="field-hint">Muss einmalig sein</span>
          </div>
          <div class="field">
            <label class="field-label">E-Mail</label>
            <input v-model="regEmail" class="field-input" type="email" placeholder="deine@email.de" @keydown.enter="submitRegister" />
          </div>
          <div class="field">
            <label class="field-label">Passwort</label>
            <div class="password-wrap">
              <input v-model="regPassword" class="field-input" :type="showPw ? 'text' : 'password'" placeholder="mindestens 6 Zeichen" @keydown.enter="submitRegister" />
              <button class="pw-toggle" @click="showPw = !showPw" type="button">{{ showPw ? '🙈' : '👁' }}</button>
            </div>
          </div>
          <button class="submit-btn" :class="{ loading: auth.loading }" @click="submitRegister" :disabled="auth.loading">
            {{ auth.loading ? 'Registrieren...' : 'Account erstellen' }}
          </button>
        </div>
      </transition>
    </template>

    <!-- ── LOGGED IN ── -->
    <template v-else>
      <div class="page-header">
        <h1 class="page-title">MEIN PROFIL</h1>
      </div>

      <!-- Avatar -->
      <div class="avatar-section">
        <div class="avatar-wrap" @click="triggerAvatarUpload">
          <img v-if="auth.user.avatar" :src="auth.user.avatar" class="avatar-img" />
          <div v-else class="avatar-placeholder">
            <span class="avatar-initials">{{ auth.user.username.slice(0,2).toUpperCase() }}</span>
          </div>
          <div class="avatar-overlay">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          </div>
        </div>
        <input ref="avatarInputRef" type="file" accept="image/*" class="hidden" @change="onAvatarChange" />
        <div class="avatar-info">
          <span class="profile-username">{{ auth.user.username }}</span>
          <span class="profile-email">{{ auth.user.email }}</span>
        </div>
      </div>

      <!-- Crop Modal -->
      <transition name="modal-fade">
        <div class="crop-overlay" v-if="cropSrc" @click.self="cancelCrop">
          <div class="crop-card">
            <h2 class="crop-title">Bildausschnitt wählen</h2>
            <p class="crop-hint">Ziehe den Ausschnitt, um ihn zu verschieben</p>

            <div class="crop-stage" ref="cropStageRef"
              @mousedown="startDrag" @touchstart.prevent="startDrag"
              @wheel.prevent="onWheel">
              <!-- Image -->
              <img
                ref="cropImgRef"
                :src="cropSrc"
                class="crop-img"
                :style="cropImgStyle"
                draggable="false"
              />
              <!-- Circle mask overlay -->
              <div class="crop-mask"></div>
              <!-- Circle outline -->
              <div class="crop-circle"></div>
            </div>

            <!-- Zoom slider -->
            <div class="crop-zoom-row">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input type="range" class="zoom-slider" v-model.number="cropZoom" :min="minZoom" max="4" step="0.01" />
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            </div>

            <div class="crop-actions">
              <button class="crop-cancel" @click="cancelCrop">Abbrechen</button>
              <button class="crop-confirm" @click="confirmCrop">Übernehmen</button>
            </div>
          </div>
        </div>
      </transition>

      <!-- Profile form -->
      <div class="profile-form">

        <!-- Bio -->
        <div class="field">
          <label class="field-label">Bio</label>
          <textarea
            v-model="editBio"
            class="field-textarea"
            placeholder="Erzähl etwas über dich..."
            rows="3"
            maxlength="200"
          ></textarea>
          <span class="field-hint">{{ editBio.length }}/200</span>
        </div>

        <!-- Public / Private -->
        <div class="field field--row">
          <div class="field-info">
            <label class="field-label">Profil</label>
            <span class="field-hint">{{ editPublic ? 'Öffentlich sichtbar' : 'Privat' }}</span>
          </div>
          <button class="toggle-switch" :class="{ on: editPublic }" @click="editPublic = !editPublic">
            <span class="toggle-knob"></span>
          </button>
        </div>

        <!-- Save -->
        <transition name="err-fade">
          <div class="form-success" v-if="saveSuccess">✓ Gespeichert</div>
        </transition>
        <transition name="err-fade">
          <div class="form-error" v-if="auth.error">⚠ {{ auth.error }}</div>
        </transition>

        <button class="submit-btn" :class="{ loading: auth.loading }" @click="saveProfile" :disabled="auth.loading">
          {{ auth.loading ? 'Speichern...' : 'Profil speichern' }}
        </button>
      </div>

      <!-- Logout -->
      <button class="logout-btn" @click="auth.logout()">Abmelden</button>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth   = useAuthStore()

// ── Auth forms ─────────────────────────────────────────
const mode       = ref('login')
const identifier = ref('')
const password   = ref('')
const regUsername = ref('')
const regEmail    = ref('')
const regPassword = ref('')
const showPw     = ref(false)

function clearForm() {
  auth.error = null
  identifier.value = ''; password.value = ''
  regUsername.value = ''; regEmail.value = ''; regPassword.value = ''
}

async function submitLogin() {
  if (!identifier.value.trim() || !password.value) return
  const ok = await auth.login({ identifier: identifier.value, password: password.value })
  if (ok) clearForm()
}

async function submitRegister() {
  if (!regUsername.value.trim() || !regEmail.value.trim() || !regPassword.value) return
  if (regPassword.value.length < 6) { auth.error = 'Passwort muss mindestens 6 Zeichen haben.'; return }
  const ok = await auth.register({ username: regUsername.value, email: regEmail.value, password: regPassword.value })
  if (ok) clearForm()
}

// ── Profile editing ────────────────────────────────────
const editBio     = ref(auth.user?.bio     ?? '')
const editPublic  = ref(auth.user?.isPublic ?? true)
const saveSuccess = ref(false)
const avatarInputRef = ref(null)

watch(() => auth.user, u => {
  if (u) { editBio.value = u.bio ?? ''; editPublic.value = u.isPublic ?? true }
})

async function saveProfile() {
  const ok = await auth.updateProfile({ bio: editBio.value, isPublic: editPublic.value })
  if (ok) {
    saveSuccess.value = true
    setTimeout(() => { saveSuccess.value = false }, 2500)
  }
}

function triggerAvatarUpload() {
  if (avatarInputRef.value) avatarInputRef.value.value = ''
  avatarInputRef.value?.click()
}

// ── Crop ────────────────────────────────────────────────
const STAGE    = 260   // stage size px
const CIRCLE   = 200   // circle diameter px

const cropSrc      = ref(null)
const cropZoom     = ref(1)
const cropOffsetX  = ref(0)
const cropOffsetY  = ref(0)
const cropStageRef = ref(null)
const cropImgRef   = ref(null)

let natW = 0, natH = 0

const minZoom = computed(() => natW && natH ? Math.max(CIRCLE / natW, CIRCLE / natH) : 1)

const cropImgStyle = computed(() => {
  const scale = cropZoom.value
  return {
    transform: `translate(calc(-50% + ${cropOffsetX.value}px), calc(-50% + ${cropOffsetY.value}px)) scale(${scale})`,
    transformOrigin: 'center center',
  }
})

function onAvatarChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = (ev) => {
    const img = new Image()
    img.onload = () => {
      natW = img.naturalWidth
      natH = img.naturalHeight
      // Minimum zoom so the image fills the circle
      const minZoom = Math.max(CIRCLE / natW, CIRCLE / natH)
      cropZoom.value    = minZoom
      cropOffsetX.value = 0
      cropOffsetY.value = 0
      cropSrc.value     = ev.target.result
    }
    img.src = ev.target.result
  }
  reader.readAsDataURL(file)
}

// Drag
let dragging = false, dragStartX = 0, dragStartY = 0, dragOriginX = 0, dragOriginY = 0

function startDrag(e) {
  dragging    = true
  const pos   = e.touches ? e.touches[0] : e
  dragStartX  = pos.clientX
  dragStartY  = pos.clientY
  dragOriginX = cropOffsetX.value
  dragOriginY = cropOffsetY.value
  window.addEventListener('mousemove', onDrag)
  window.addEventListener('mouseup',   endDrag)
  window.addEventListener('touchmove', onDrag, { passive: false })
  window.addEventListener('touchend',  endDrag)
}
function onDrag(e) {
  if (!dragging) return
  e.preventDefault?.()
  const pos  = e.touches ? e.touches[0] : e
  cropOffsetX.value = dragOriginX + (pos.clientX - dragStartX)
  cropOffsetY.value = dragOriginY + (pos.clientY - dragStartY)
}
function endDrag() {
  dragging = false
  window.removeEventListener('mousemove', onDrag)
  window.removeEventListener('mouseup',   endDrag)
  window.removeEventListener('touchmove', onDrag)
  window.removeEventListener('touchend',  endDrag)
}

function onWheel(e) {
  cropZoom.value = Math.max(minZoom.value, Math.min(4, cropZoom.value - e.deltaY * 0.003))
}

function cancelCrop() {
  cropSrc.value = null
  if (avatarInputRef.value) avatarInputRef.value.value = ''
}

async function confirmCrop() {
  const img     = cropImgRef.value
  const stageEl = cropStageRef.value
  if (!img || !stageEl) return

  const SIZE = 300
  const canvas = document.createElement('canvas')
  canvas.width  = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')

  // Clip to circle
  ctx.beginPath()
  ctx.arc(SIZE / 2, SIZE / 2, SIZE / 2, 0, Math.PI * 2)
  ctx.clip()

  // The stage is STAGE×STAGE px in CSS. The image is rendered centered
  // with transform: translate(-50% + offsetX, -50% + offsetY) scale(zoom)
  // So the image center is at: (STAGE/2 + offsetX, STAGE/2 + offsetY)
  // The circle crop area center is: (STAGE/2, STAGE/2)
  // The circle radius in CSS px: CIRCLE/2

  const zoom    = cropZoom.value
  const ox      = cropOffsetX.value
  const oy      = cropOffsetY.value

  // How the natural image maps to CSS px at current zoom:
  // displayed image size = natW * zoom  (since stage = STAGE and we scale around center)
  // But the img element fills the stage with object-fit: none at natural size,
  // then scale(zoom) is applied. So displayed size = natW * zoom in CSS px.

  // The displayed image rect:
  // center of image = (STAGE/2 + ox, STAGE/2 + oy)
  // left edge = STAGE/2 + ox - natW*zoom/2
  // top  edge = STAGE/2 + oy - natH*zoom/2

  const dispImgLeft = STAGE / 2 + ox - (natW * zoom) / 2
  const dispImgTop  = STAGE / 2 + oy - (natH * zoom) / 2

  // Circle crop area in CSS px (centered in stage):
  const cropLeft = STAGE / 2 - CIRCLE / 2
  const cropTop  = STAGE / 2 - CIRCLE / 2
  const cropSize = CIRCLE

  // Source rectangle in natural image coords:
  const scaleNat = natW / (natW * zoom)   // = 1/zoom
  const sx = (cropLeft - dispImgLeft) * scaleNat
  const sy = (cropTop  - dispImgTop)  * scaleNat
  const sw = cropSize * scaleNat
  const sh = cropSize * scaleNat

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, SIZE, SIZE)

  const result = canvas.toDataURL('image/jpeg', 0.92)
  await auth.updateProfile({ avatar: result })
  cropSrc.value = null
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.profile-page {
  min-height: 100vh; background: #0a0a0f; color: #f0ede6;
  font-family: 'DM Sans', sans-serif;
  display: flex; flex-direction: column; align-items: center;
  padding: 0 1.5rem 4rem; position: relative; overflow-x: hidden;
}
.bg-noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size: 180px; opacity: 0.6; }
.bg-glow { position: fixed; inset: 0; pointer-events: none; z-index: 0; background: radial-gradient(ellipse 60% 45% at 50% 20%, rgba(91,106,255,0.06) 0%, transparent 70%); }

.ad-banner { position: relative; z-index: 1; width: 100%; max-width: 728px; min-height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 1px solid rgba(240,237,230,0.07); padding: 0.75rem 0; margin-bottom: 1rem; }
.ad-label { position: absolute; top: 4px; left: 0; font-size: 0.6rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.2); }
.ad-placeholder { width: 100%; max-width: 728px; height: 90px; background: rgba(240,237,230,0.03); border: 1px dashed rgba(240,237,230,0.1); border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,237,230,0.15); }

.back-btn { position: relative; z-index: 1; align-self: flex-start; background: none; border: none; cursor: pointer; color: rgba(240,237,230,0.35); font-family: 'DM Sans', sans-serif; font-size: 0.78rem; letter-spacing: 0.1em; padding: 0.4rem 0; margin-bottom: 1.5rem; transition: color 0.2s; }
.back-btn:hover { color: #ff5a32; }

.page-header { position: relative; z-index: 1; text-align: center; margin-bottom: 2rem; animation: fadeDown 0.5s ease both; }
.page-title { font-family: 'Bebas Neue', cursive; font-size: 3rem; letter-spacing: 0.2em; color: #f0ede6; }
.page-sub { font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.25); margin-top: 0.35rem; }

/* Mode tabs */
.mode-tabs { position: relative; z-index: 1; display: flex; gap: 0.5rem; margin-bottom: 1.75rem; }
.mode-tab { font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 500; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.1); color: rgba(240,237,230,0.4); border-radius: 3px; padding: 0.6rem 1.5rem; cursor: pointer; transition: all 0.2s; }
.mode-tab:hover { color: #f0ede6; border-color: rgba(240,237,230,0.2); }
.mode-tab.active { background: rgba(91,106,255,0.12); border-color: rgba(91,106,255,0.4); color: #5b6aff; }

/* Form */
.auth-form, .profile-form { position: relative; z-index: 1; width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 1.1rem; }
.field { display: flex; flex-direction: column; gap: 0.4rem; }
.field--row { flex-direction: row; align-items: center; justify-content: space-between; background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.08); border-radius: 4px; padding: 0.85rem 1rem; }
.field-info { display: flex; flex-direction: column; gap: 0.15rem; }
.field-label { font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,237,230,0.35); }
.field-hint { font-size: 0.65rem; color: rgba(240,237,230,0.22); }
.field-input { background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.1); border-radius: 3px; padding: 0.75rem 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.92rem; color: #f0ede6; outline: none; transition: border-color 0.2s; }
.field-input:focus { border-color: rgba(91,106,255,0.4); }
.field-input::placeholder { color: rgba(240,237,230,0.2); }
.field-textarea { background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.1); border-radius: 3px; padding: 0.75rem 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; color: #f0ede6; outline: none; resize: none; transition: border-color 0.2s; }
.field-textarea:focus { border-color: rgba(91,106,255,0.4); }
.field-textarea::placeholder { color: rgba(240,237,230,0.2); }

.password-wrap { position: relative; }
.password-wrap .field-input { width: 100%; padding-right: 2.5rem; }
.pw-toggle { position: absolute; right: 0.75rem; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; font-size: 0.9rem; opacity: 0.5; }
.pw-toggle:hover { opacity: 1; }

.submit-btn { font-family: 'Bebas Neue', cursive; font-size: 1rem; letter-spacing: 0.15em; background: #5b6aff; color: white; border: none; border-radius: 3px; padding: 0.85rem; cursor: pointer; transition: transform 0.15s, box-shadow 0.2s; box-shadow: 0 0 20px rgba(91,106,255,0.35); }
.submit-btn:hover:not(:disabled) { transform: scale(1.02); box-shadow: 0 0 30px rgba(91,106,255,0.5); }
.submit-btn:disabled, .submit-btn.loading { opacity: 0.6; cursor: default; }

.form-error { position: relative; z-index: 1; width: 100%; max-width: 400px; background: rgba(255,90,50,0.1); border: 1px solid rgba(255,90,50,0.3); border-radius: 3px; padding: 0.55rem 1rem; font-size: 0.78rem; color: #ff8060; }
.form-success { background: rgba(50,200,160,0.1); border: 1px solid rgba(50,200,160,0.3); border-radius: 3px; padding: 0.55rem 1rem; font-size: 0.78rem; color: #32c8a0; }

/* Avatar */
.avatar-section { position: relative; z-index: 1; display: flex; align-items: center; gap: 1.25rem; margin-bottom: 2rem; width: 100%; max-width: 400px; animation: fadeDown 0.5s 0.08s ease both; }
.avatar-wrap { width: 72px; height: 72px; border-radius: 50%; overflow: hidden; position: relative; cursor: pointer; flex-shrink: 0; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-placeholder { width: 100%; height: 100%; background: rgba(91,106,255,0.2); border: 2px solid rgba(91,106,255,0.4); border-radius: 50%; display: flex; align-items: center; justify-content: center; }
.avatar-initials { font-size: 1.4rem; font-weight: 700; color: #5b6aff; }
.avatar-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s; color: white; border-radius: 50%; }
.avatar-wrap:hover .avatar-overlay { opacity: 1; }
.profile-username { font-family: 'Bebas Neue', cursive; font-size: 1.4rem; letter-spacing: 0.1em; color: #f0ede6; }
.profile-email { font-size: 0.72rem; color: rgba(240,237,230,0.3); margin-top: 0.1rem; display: block; }
.hidden { display: none; }

/* Toggle switch */
.toggle-switch { width: 44px; height: 24px; border-radius: 99px; background: rgba(240,237,230,0.1); border: none; cursor: pointer; position: relative; transition: background 0.25s; flex-shrink: 0; }
.toggle-switch.on { background: #5b6aff; }
.toggle-knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: white; transition: transform 0.25s; }
.toggle-switch.on .toggle-knob { transform: translateX(20px); }

/* Logout */
.logout-btn { position: relative; z-index: 1; margin-top: 1rem; background: none; border: 1px solid rgba(255,90,50,0.2); border-radius: 3px; color: rgba(255,90,50,0.5); font-family: 'DM Sans', sans-serif; font-size: 0.78rem; letter-spacing: 0.08em; padding: 0.5rem 1.5rem; cursor: pointer; transition: all 0.2s; }
.logout-btn:hover { color: #ff5a32; border-color: rgba(255,90,50,0.4); background: rgba(255,90,50,0.06); }

/* Crop Modal */
.crop-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.82); backdrop-filter: blur(10px);
  display: flex; align-items: center; justify-content: center; padding: 1.5rem;
}
.crop-card {
  background: #0e0e1a; border: 1px solid rgba(240,237,230,0.12);
  border-radius: 12px; padding: 1.75rem 1.5rem;
  display: flex; flex-direction: column; align-items: center; gap: 1rem;
  width: 100%; max-width: 320px;
  animation: modalPop 0.35s cubic-bezier(0.34,1.4,0.64,1) both;
}
.crop-title { font-family: 'Bebas Neue', cursive; font-size: 1.3rem; letter-spacing: 0.15em; color: #f0ede6; }
.crop-hint  { font-size: 0.68rem; color: rgba(240,237,230,0.3); letter-spacing: 0.06em; }

.crop-stage {
  width: 260px; height: 260px;
  border-radius: 8px; overflow: hidden;
  position: relative; cursor: grab; user-select: none;
  background: #060610;
}
.crop-stage:active { cursor: grabbing; }

.crop-img {
  position: absolute; top: 50%; left: 50%;
  max-width: none;
  pointer-events: none;
}

/* Dark mask outside circle */
.crop-mask {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(
    circle 100px at 50% 50%,
    transparent 100px,
    rgba(6,6,16,0.82) 101px
  );
}
/* Circle outline */
.crop-circle {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 200px; height: 200px;
  border-radius: 50%;
  border: 2px solid rgba(91,106,255,0.7);
  pointer-events: none;
  box-shadow: 0 0 0 1px rgba(91,106,255,0.2);
}

.crop-zoom-row {
  display: flex; align-items: center; gap: 0.6rem; width: 100%;
  color: rgba(240,237,230,0.3);
}
.zoom-slider {
  flex: 1; height: 3px; accent-color: #5b6aff; cursor: pointer;
}

.crop-actions { display: flex; gap: 0.75rem; width: 100%; }
.crop-cancel {
  flex: 1; background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.1);
  color: rgba(240,237,230,0.4); border-radius: 3px; padding: 0.65rem;
  cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; transition: all 0.2s;
}
.crop-cancel:hover { color: #f0ede6; border-color: rgba(240,237,230,0.2); }
.crop-confirm {
  flex: 2; background: #5b6aff; border: none; color: white;
  border-radius: 3px; padding: 0.65rem;
  cursor: pointer; font-family: 'Bebas Neue', cursive; font-size: 1rem; letter-spacing: 0.12em;
  transition: transform 0.15s, box-shadow 0.2s;
  box-shadow: 0 0 16px rgba(91,106,255,0.4);
}
.crop-confirm:hover { transform: scale(1.03); }

.modal-fade-enter-active, .modal-fade-leave-active { transition: opacity 0.25s; }
.modal-fade-enter-from, .modal-fade-leave-to { opacity: 0; }
@keyframes modalPop { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
.form-swap-enter-from { opacity: 0; transform: translateX(10px); }
.form-swap-leave-to   { opacity: 0; transform: translateX(-10px); }
.err-fade-enter-active, .err-fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.err-fade-enter-from, .err-fade-leave-to { opacity: 0; transform: translateY(-4px); }

@keyframes fadeDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
</style>