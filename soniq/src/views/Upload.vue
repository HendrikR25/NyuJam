<template>
  <div class="upload-page">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>

    <div class="ad-banner">
      <span class="ad-label">Anzeige</span>
      <slot name="ad-top"><div class="ad-placeholder">Advertisement</div></slot>
    </div>
    <button class="back-btn" @click="router.push('/')">← Home</button>

    <div class="page-header">
      <h1 class="page-title">SONG HOCHLADEN</h1>
      <p class="page-sub">MP3 · Cover · Titel</p>
    </div>

    <!-- Not logged in -->
    <div class="not-logged-in" v-if="!auth.isLoggedIn">
      <span class="nil-icon">↑</span>
      <p class="nil-text">Du musst eingeloggt sein um Songs hochzuladen.</p>
      <button class="nil-btn" @click="router.push('/profile')">Zum Profil →</button>
    </div>

    <!-- Upload form -->
    <div class="upload-form" v-else-if="!uploadDone">

      <!-- Cover drop zone -->
      <div
        class="cover-drop"
        :class="{ 'has-cover': coverPreview, dragging: draggingCover }"
        @click="coverInputRef?.click()"
        @dragover.prevent="draggingCover = true"
        @dragleave="draggingCover = false"
        @drop.prevent="onCoverDrop"
      >
        <img v-if="coverPreview" :src="coverPreview" class="cover-preview" />
        <div v-else class="cover-placeholder">
          <span class="cp-icon">🖼</span>
          <span class="cp-label">Cover-Bild</span>
          <span class="cp-hint">Klicken oder Drag & Drop<br>JPG, PNG, WEBP</span>
        </div>
        <div class="cover-edit-overlay" v-if="coverPreview">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
          Ändern
        </div>
        <input ref="coverInputRef" type="file" accept="image/*" class="hidden" @change="onCoverChange" />
      </div>

      <!-- Title field -->
      <div class="field">
        <label class="field-label">Titel *</label>
        <input v-model="title" class="field-input" type="text" placeholder="Song-Titel..." maxlength="80" />
      </div>

      <!-- Artist field -->
      <div class="field">
        <label class="field-label">Künstler</label>
        <input v-model="artist" class="field-input" type="text" :placeholder="auth.user?.username ?? 'Künstlername...'" maxlength="80" />
        <span class="field-hint">Leer lassen für deinen Benutzernamen</span>
      </div>

      <!-- MP3 drop zone -->
      <div
        class="mp3-drop"
        :class="{ 'has-file': mp3File, dragging: draggingMp3 }"
        @click="mp3InputRef?.click()"
        @dragover.prevent="draggingMp3 = true"
        @dragleave="draggingMp3 = false"
        @drop.prevent="onMp3Drop"
      >
        <input ref="mp3InputRef" type="file" accept="audio/mpeg,.mp3" class="hidden" @change="onMp3Change" />
        <div class="mp3-inner">
          <svg v-if="!mp3File" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#32c8a0" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          <div class="mp3-info">
            <span class="mp3-label" v-if="!mp3File">MP3-Datei auswählen</span>
            <span class="mp3-label mp3-label--set" v-else>{{ mp3File.name }}</span>
            <span class="mp3-hint" v-if="!mp3File">Klicken oder Drag & Drop · max. 50 MB</span>
            <span class="mp3-hint mp3-hint--size" v-else>{{ formatSize(mp3File.size) }}</span>
          </div>
          <button class="mp3-clear" v-if="mp3File" @click.stop="mp3File = null">✕</button>
        </div>
      </div>

      <!-- Error -->
      <transition name="err-fade">
        <div class="form-error" v-if="errorMsg">⚠ {{ errorMsg }}</div>
      </transition>

      <!-- Submit -->
      <button
        class="submit-btn"
        :class="{ ready: canUpload, loading: uploading }"
        :disabled="!canUpload || uploading"
        @click="submitUpload"
      >
        <span v-if="uploading">
          <span class="upload-spinner"></span>
          {{ uploadProgress < 100 ? `Hochladen... ${uploadProgress}%` : 'Verarbeite...' }}
        </span>
        <span v-else>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Song hochladen
        </span>
      </button>
    </div>

    <!-- Success -->
    <transition name="success-pop">
      <div class="upload-success" v-if="uploadDone">
        <div class="us-cover">
          <img :src="uploadedSong.coverUrl" class="us-cover-img" />
        </div>
        <div class="us-check">✓</div>
        <h2 class="us-title">Erfolgreich hochgeladen!</h2>
        <p class="us-name">{{ uploadedSong.title }}</p>
        <p class="us-artist">{{ uploadedSong.artist }}</p>
        <div class="us-actions">
          <button class="us-btn us-btn--play" @click="playUploaded">▶ Jetzt abspielen</button>
          <button class="us-btn us-btn--more" @click="resetForm">Weiteren hochladen</button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore }   from '@/stores/auth'
import { usePlayerStore } from '@/stores/player'

const router = useRouter()
const auth   = useAuthStore()
const player = usePlayerStore()

const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

// Form state
const title       = ref('')
const artist      = ref('')
const mp3File     = ref(null)
const coverFile   = ref(null)
const coverPreview = ref(null)
const mp3InputRef  = ref(null)
const coverInputRef = ref(null)
const draggingMp3   = ref(false)
const draggingCover = ref(false)
const errorMsg      = ref('')
const uploading     = ref(false)
const uploadProgress = ref(0)
const uploadDone    = ref(false)
const uploadedSong  = ref(null)

const canUpload = computed(() => title.value.trim() && mp3File.value && coverFile.value)

// ── Cover ──────────────────────────────────────────────
function onCoverChange(e) {
  const file = e.target.files?.[0]
  if (file) setCover(file)
}
function onCoverDrop(e) {
  draggingCover.value = false
  const file = e.dataTransfer.files?.[0]
  if (file && file.type.startsWith('image/')) setCover(file)
}
function setCover(file) {
  coverFile.value = file
  const reader = new FileReader()
  reader.onload = ev => { coverPreview.value = ev.target.result }
  reader.readAsDataURL(file)
}

// ── MP3 ────────────────────────────────────────────────
function onMp3Change(e) {
  const file = e.target.files?.[0]
  if (file) mp3File.value = file
}
function onMp3Drop(e) {
  draggingMp3.value = false
  const file = e.dataTransfer.files?.[0]
  if (file && (file.type === 'audio/mpeg' || file.name.endsWith('.mp3'))) mp3File.value = file
  else errorMsg.value = 'Nur MP3-Dateien erlaubt.'
}

// ── Upload ─────────────────────────────────────────────
async function submitUpload() {
  if (!canUpload.value) return
  errorMsg.value = ''
  uploading.value = true
  uploadProgress.value = 0

  try {
    const formData = new FormData()
    formData.append('mp3',    mp3File.value)
    formData.append('cover',  coverFile.value)
    formData.append('title',  title.value.trim())
    formData.append('artist', artist.value.trim() || auth.user?.username || '')

    // XHR for progress tracking
    const song = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${BASE_URL}/api/upload`)
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('nyujam_token') || ''}`)
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) uploadProgress.value = Math.round(e.loaded / e.total * 90)
      }
      xhr.onload = () => {
        uploadProgress.value = 100
        let data
        try {
          data = JSON.parse(xhr.responseText)
        } catch {
          reject(new Error(`Server-Fehler ${xhr.status}: ${xhr.responseText.slice(0, 200)}`))
          return
        }
        if (xhr.status === 201) resolve(data)
        else reject(new Error(data.error || `Fehler ${xhr.status}`))
      }
      xhr.onerror = () => reject(new Error('Netzwerkfehler'))
      xhr.send(formData)
    })

    uploadedSong.value = song
    uploadDone.value   = true
    // Reload songs in player
    await player.loadSongs()
  } catch (e) {
    errorMsg.value = e.message
  } finally {
    uploading.value = false
  }
}

function playUploaded() {
  const song = player.songs.find(s => s.name === uploadedSong.value.title)
  if (song) { player.play(song); router.push('/player') }
}

function resetForm() {
  title.value = ''; artist.value = ''; mp3File.value = null
  coverFile.value = null; coverPreview.value = null
  uploadDone.value = false; uploadedSong.value = null
  uploadProgress.value = 0
}

function formatSize(bytes) {
  if (bytes > 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.upload-page {
  min-height: 100vh; background: #0a0a0f; color: #f0ede6;
  font-family: 'DM Sans', sans-serif;
  display: flex; flex-direction: column; align-items: center;
  padding: 0 1.5rem 4rem; position: relative; overflow-x: hidden;
}
.bg-noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size: 180px; opacity: 0.6; }
.bg-glow { position: fixed; inset: 0; pointer-events: none; z-index: 0; background: radial-gradient(ellipse 60% 45% at 50% 20%, rgba(91,106,255,0.07) 0%, transparent 70%); }

.ad-banner { position: relative; z-index: 1; width: 100%; max-width: 728px; min-height: 90px; display: flex; flex-direction: column; align-items: center; justify-content: center; border-bottom: 1px solid rgba(240,237,230,0.07); padding: 0.75rem 0; margin-bottom: 1rem; }
.ad-label { position: absolute; top: 4px; left: 0; font-size: 0.6rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.2); }
.ad-placeholder { width: 100%; max-width: 728px; height: 90px; background: rgba(240,237,230,0.03); border: 1px dashed rgba(240,237,230,0.1); border-radius: 2px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,237,230,0.15); }

.back-btn { position: relative; z-index: 1; align-self: flex-start; background: none; border: none; cursor: pointer; color: rgba(240,237,230,0.35); font-family: 'DM Sans', sans-serif; font-size: 0.78rem; letter-spacing: 0.1em; padding: 0.4rem 0; margin-bottom: 1.5rem; transition: color 0.2s; }
.back-btn:hover { color: #ff5a32; }

.page-header { position: relative; z-index: 1; text-align: center; margin-bottom: 2rem; animation: fadeDown 0.5s ease both; }
.page-title { font-family: 'Bebas Neue', cursive; font-size: 3rem; letter-spacing: 0.2em; color: #f0ede6; }
.page-sub { font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.25); margin-top: 0.35rem; }

/* Not logged in */
.not-logged-in { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem 1rem; text-align: center; }
.nil-icon { font-size: 3rem; opacity: 0.3; }
.nil-text { font-size: 0.88rem; color: rgba(240,237,230,0.4); max-width: 280px; line-height: 1.6; }
.nil-btn { background: rgba(91,106,255,0.15); border: 1px solid rgba(91,106,255,0.3); color: #5b6aff; border-radius: 3px; padding: 0.6rem 1.5rem; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; transition: all 0.2s; }

/* Upload form */
.upload-form { position: relative; z-index: 1; width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 1.1rem; animation: fadeDown 0.5s 0.05s ease both; }

/* Cover */
.cover-drop {
  width: 100%; aspect-ratio: 1; border-radius: 8px;
  border: 2px dashed rgba(240,237,230,0.15);
  cursor: pointer; position: relative; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
  background: rgba(240,237,230,0.02); transition: border-color 0.2s, background 0.2s;
}
.cover-drop:hover, .cover-drop.dragging { border-color: rgba(91,106,255,0.5); background: rgba(91,106,255,0.04); }
.cover-drop.has-cover { border-style: solid; border-color: rgba(240,237,230,0.12); }
.cover-placeholder { display: flex; flex-direction: column; align-items: center; gap: 0.5rem; color: rgba(240,237,230,0.3); }
.cp-icon { font-size: 2.5rem; }
.cp-label { font-family: 'Bebas Neue', cursive; font-size: 1.1rem; letter-spacing: 0.15em; }
.cp-hint { font-size: 0.65rem; text-align: center; line-height: 1.6; color: rgba(240,237,230,0.2); }
.cover-preview { width: 100%; height: 100%; object-fit: cover; }
.cover-edit-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.55); display: flex; align-items: center; justify-content: center; gap: 0.5rem; opacity: 0; transition: opacity 0.2s; font-size: 0.82rem; color: white; }
.cover-drop:hover .cover-edit-overlay { opacity: 1; }

/* Fields */
.field { display: flex; flex-direction: column; gap: 0.4rem; }
.field-label { font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,237,230,0.35); }
.field-hint { font-size: 0.62rem; color: rgba(240,237,230,0.2); }
.field-input { background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.1); border-radius: 3px; padding: 0.75rem 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.92rem; color: #f0ede6; outline: none; transition: border-color 0.2s; }
.field-input:focus { border-color: rgba(91,106,255,0.4); }
.field-input::placeholder { color: rgba(240,237,230,0.2); }

/* MP3 */
.mp3-drop {
  border: 1px dashed rgba(240,237,230,0.15); border-radius: 6px;
  padding: 1rem 1.1rem; cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}
.mp3-drop:hover, .mp3-drop.dragging { border-color: rgba(91,106,255,0.4); background: rgba(91,106,255,0.03); }
.mp3-drop.has-file { border-color: rgba(50,200,160,0.4); background: rgba(50,200,160,0.03); border-style: solid; }
.mp3-inner { display: flex; align-items: center; gap: 0.9rem; }
.mp3-info { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
.mp3-label { font-size: 0.88rem; font-weight: 500; color: rgba(240,237,230,0.6); }
.mp3-label--set { color: #32c8a0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mp3-hint { font-size: 0.65rem; color: rgba(240,237,230,0.25); }
.mp3-hint--size { color: rgba(50,200,160,0.6); }
.mp3-clear { background: none; border: none; color: rgba(240,237,230,0.3); cursor: pointer; font-size: 0.75rem; flex-shrink: 0; padding: 0.2rem; transition: color 0.2s; }
.mp3-clear:hover { color: #ff5a32; }

/* Error */
.form-error { background: rgba(255,90,50,0.1); border: 1px solid rgba(255,90,50,0.3); border-radius: 3px; padding: 0.55rem 1rem; font-size: 0.78rem; color: #ff8060; }

/* Submit */
.submit-btn {
  font-family: 'Bebas Neue', cursive; font-size: 1.05rem; letter-spacing: 0.15em;
  background: rgba(240,237,230,0.07); border: 1px solid rgba(240,237,230,0.12);
  color: rgba(240,237,230,0.35); border-radius: 3px; padding: 0.9rem;
  cursor: default; transition: all 0.25s; display: flex; align-items: center; justify-content: center; gap: 0.5rem;
}
.submit-btn.ready { background: #5b6aff; border-color: #5b6aff; color: white; cursor: pointer; box-shadow: 0 0 24px rgba(91,106,255,0.4); }
.submit-btn.ready:hover { transform: scale(1.02); }
.submit-btn.loading { background: rgba(91,106,255,0.4); cursor: default; }
.upload-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }

/* Success */
.upload-success {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; align-items: center; gap: 1rem;
  padding: 2rem 1rem; text-align: center; animation: successPop 0.5s cubic-bezier(0.34,1.4,0.64,1) both;
}
.us-cover { width: 140px; height: 140px; border-radius: 10px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
.us-cover-img { width: 100%; height: 100%; object-fit: cover; }
.us-check { font-size: 2rem; color: #32c8a0; }
.us-title { font-family: 'Bebas Neue', cursive; font-size: 1.5rem; letter-spacing: 0.15em; color: #f0ede6; }
.us-name { font-size: 1rem; font-weight: 500; color: #f0ede6; }
.us-artist { font-size: 0.78rem; color: rgba(240,237,230,0.4); }
.us-actions { display: flex; gap: 0.75rem; margin-top: 0.5rem; }
.us-btn { font-family: 'DM Sans', sans-serif; font-size: 0.88rem; border-radius: 3px; padding: 0.65rem 1.3rem; cursor: pointer; transition: all 0.2s; border: 1px solid; }
.us-btn--play { background: #5b6aff; border-color: #5b6aff; color: white; box-shadow: 0 0 16px rgba(91,106,255,0.4); }
.us-btn--more { background: rgba(240,237,230,0.05); border-color: rgba(240,237,230,0.1); color: rgba(240,237,230,0.5); }
.us-btn--more:hover { color: #f0ede6; border-color: rgba(240,237,230,0.2); }

.hidden { display: none; }
.err-fade-enter-active, .err-fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.err-fade-enter-from, .err-fade-leave-to { opacity: 0; transform: translateY(-4px); }
.success-pop-enter-active { transition: opacity 0.4s, transform 0.4s; }
.success-pop-enter-from   { opacity: 0; transform: scale(0.9); }

@keyframes fadeDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes successPop { from { opacity: 0; transform: scale(0.88); } to { opacity: 1; transform: scale(1); } }
</style>