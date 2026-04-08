<template>
  <div class="upload-page">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>
    <button class="back-btn" @click="router.push('/')">← Home</button>

    <div class="page-header">
      <h1 class="page-title">HOCHLADEN</h1>
      <p class="page-sub">Song oder Album auf NyuJam veröffentlichen</p>
    </div>

    <!-- Not logged in -->
    <div class="not-logged-in" v-if="!auth.isLoggedIn">
      <span class="nil-icon">↑</span>
      <p class="nil-text">Du musst eingeloggt sein um Songs hochzuladen.</p>
      <button class="nil-btn" @click="router.push('/profile')">Zum Profil →</button>
    </div>

    <template v-else-if="!uploadDone">
      <!-- Mode Toggle -->
      <div class="mode-toggle">
        <button class="mode-btn" :class="{ active: mode === 'song' }" @click="mode = 'song'">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          Song
        </button>
        <button class="mode-btn" :class="{ active: mode === 'album' }" @click="mode = 'album'">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
          Album
        </button>
      </div>

      <!-- ── SONG UPLOAD ── -->
      <div class="upload-form" v-if="mode === 'song'">

        <!-- Cover (optional) -->
        <div class="cover-drop" :class="{ 'has-cover': coverPreview, dragging: draggingCover }" @click="coverInputRef?.click()" @dragover.prevent="draggingCover = true" @dragleave="draggingCover = false" @drop.prevent="onCoverDrop">
          <img v-if="coverPreview" :src="coverPreview" class="cover-preview" />
          <div v-else class="cover-placeholder">
            <span class="cp-icon">🖼</span>
            <span class="cp-label">Cover-Bild</span>
            <span class="cp-hint">Optional · JPG, PNG, WEBP</span>
          </div>
          <div class="cover-edit-overlay" v-if="coverPreview">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            Ändern
          </div>
          <input ref="coverInputRef" type="file" accept="image/*" class="hidden" @change="onCoverChange" />
        </div>

        <div class="field">
          <label class="field-label">Titel *</label>
          <input v-model="title" class="field-input" type="text" placeholder="Song-Titel..." maxlength="80" />
        </div>
        <div class="field">
          <label class="field-label">Künstler</label>
          <input v-model="artist" class="field-input" type="text" :placeholder="auth.user?.username ?? 'Künstlername...'" maxlength="80" />
        </div>
        <div class="field">
          <label class="field-label">Land *</label>
          <div class="select-wrap">
            <select v-model="selectedCountry" class="field-input field-select">
              <option value="">Land auswählen...</option>
              <optgroup v-for="group in countryGroups" :key="group.continent" :label="group.label">
                <option v-for="c in group.countries" :key="c.code" :value="c.code">{{ c.flag }} {{ c.name }}</option>
              </optgroup>
            </select>
          </div>
        </div>
        <div class="field">
          <label class="field-label">Stadt <span class="optional-tag">optional</span></label>
          <input v-model="city" class="field-input" type="text" placeholder="z.B. Berlin..." maxlength="60" />
        </div>
        <div class="field">
          <label class="field-label">Veröffentlichungsdatum <span class="optional-tag">optional</span></label>
          <input v-model="releasedAt" class="field-input" type="date" :max="today" />
          <span class="field-hint">Leer lassen für heutiges Datum</span>
        </div>

        <!-- MP3 -->
        <div class="mp3-drop" :class="{ 'has-file': mp3File, dragging: draggingMp3 }" @click="mp3InputRef?.click()" @dragover.prevent="draggingMp3 = true" @dragleave="draggingMp3 = false" @drop.prevent="onMp3Drop">
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

        <transition name="err-fade">
          <div class="form-error" v-if="errorMsg">⚠ {{ errorMsg }}</div>
        </transition>

        <button class="submit-btn" :class="{ ready: canUploadSong, loading: uploading }" :disabled="!canUploadSong || uploading" @click="submitSong">
          <span v-if="uploading"><span class="upload-spinner"></span>{{ uploadProgress < 100 ? `Hochladen... ${uploadProgress}%` : 'Verarbeite...' }}</span>
          <span v-else>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Song hochladen
          </span>
        </button>
      </div>

      <!-- ── ALBUM UPLOAD ── -->
      <div class="upload-form" v-else>

        <!-- Album Cover (optional) -->
        <div class="cover-drop" :class="{ 'has-cover': coverPreview, dragging: draggingCover }" @click="coverInputRef?.click()" @dragover.prevent="draggingCover = true" @dragleave="draggingCover = false" @drop.prevent="onCoverDrop">
          <img v-if="coverPreview" :src="coverPreview" class="cover-preview" />
          <div v-else class="cover-placeholder">
            <span class="cp-icon">▣</span>
            <span class="cp-label">Album Cover</span>
            <span class="cp-hint">Optional · Wird für alle Tracks verwendet</span>
          </div>
          <div class="cover-edit-overlay" v-if="coverPreview">Ändern</div>
          <input ref="coverInputRef" type="file" accept="image/*" class="hidden" @change="onCoverChange" />
        </div>

        <div class="field">
          <label class="field-label">Albumtitel *</label>
          <input v-model="albumTitle" class="field-input" type="text" placeholder="Albumname..." maxlength="80" />
        </div>
        <div class="field">
          <label class="field-label">Künstler</label>
          <input v-model="artist" class="field-input" type="text" :placeholder="auth.user?.username ?? 'Künstlername...'" maxlength="80" />
        </div>
        <div class="field">
          <label class="field-label">Land *</label>
          <div class="select-wrap">
            <select v-model="selectedCountry" class="field-input field-select">
              <option value="">Land auswählen...</option>
              <optgroup v-for="group in countryGroups" :key="group.continent" :label="group.label">
                <option v-for="c in group.countries" :key="c.code" :value="c.code">{{ c.flag }} {{ c.name }}</option>
              </optgroup>
            </select>
          </div>
        </div>
        <div class="field">
          <label class="field-label">Stadt <span class="optional-tag">optional</span></label>
          <input v-model="city" class="field-input" type="text" placeholder="z.B. Berlin..." maxlength="60" />
        </div>
        <div class="field">
          <label class="field-label">Veröffentlichungsdatum <span class="optional-tag">optional</span></label>
          <input v-model="releasedAt" class="field-input" type="date" :max="today" />
          <span class="field-hint">Leer lassen für heutiges Datum</span>
        </div>

        <!-- Tracks -->
        <div class="tracks-section">
          <div class="tracks-header">
            <span class="tracks-title">Tracks</span>
            <button class="add-track-btn" @click="addTrack">+ Track hinzufügen</button>
          </div>

          <div class="track-list">
            <div v-for="(track, idx) in tracks" :key="idx" class="track-item">
              <span class="track-nr">{{ idx + 1 }}</span>
              <div class="track-fields">
                <input v-model="track.title" class="field-input track-input" type="text" :placeholder="`Track ${idx + 1} Titel...`" maxlength="80" />
                <input v-model="track.artist" class="field-input track-input" type="text" :placeholder="artist || auth.user?.username || 'Künstler...'" maxlength="80" />
              </div>
              <div class="track-mp3" :class="{ 'has-file': track.file }" @click="triggerTrackFile(idx)">
                <input :ref="el => trackFileRefs[idx] = el" type="file" accept="audio/mpeg,.mp3" class="hidden" @change="e => onTrackFileChange(e, idx)" />
                <svg v-if="!track.file" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#32c8a0" stroke-width="2" stroke-linecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                <span class="track-mp3-label">{{ track.file ? track.file.name : 'MP3' }}</span>
              </div>
              <button class="track-remove" @click="removeTrack(idx)" v-if="tracks.length > 1">✕</button>
            </div>
          </div>
        </div>

        <transition name="err-fade">
          <div class="form-error" v-if="errorMsg">⚠ {{ errorMsg }}</div>
        </transition>

        <button class="submit-btn" :class="{ ready: canUploadAlbum, loading: uploading }" :disabled="!canUploadAlbum || uploading" @click="submitAlbum">
          <span v-if="uploading"><span class="upload-spinner"></span>{{ uploadProgress < 100 ? `Hochladen... ${uploadProgress}%` : 'Verarbeite...' }}</span>
          <span v-else>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            Album hochladen ({{ tracks.filter(t => t.file).length }} Tracks)
          </span>
        </button>
      </div>
    </template>

    <!-- Success -->
    <transition name="success-pop">
      <div class="upload-success" v-if="uploadDone">
        <div class="us-cover" v-if="uploadedItem?.coverUrl">
          <img :src="uploadedItem.coverUrl" class="us-cover-img" />
        </div>
        <div class="us-cover-placeholder" v-else>{{ mode === 'album' ? '▣' : '♩' }}</div>
        <div class="us-check">✓</div>
        <h2 class="us-title">Erfolgreich hochgeladen!</h2>
        <p class="us-name">{{ uploadedItem?.title }}</p>
        <p class="us-artist">{{ uploadedItem?.artist }}</p>
        <p class="us-meta" v-if="mode === 'album'">{{ uploadedItem?.tracks }} Tracks</p>
        <div class="us-actions">
          <button class="us-btn us-btn--play" @click="playUploaded" v-if="mode === 'song'">▶ Jetzt abspielen</button>
          <button class="us-btn us-btn--more" @click="resetForm">Weiteres hochladen</button>
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

// ── Mode ───────────────────────────────────────────────
const mode = ref('song')

// ── Shared state ───────────────────────────────────────
const artist         = ref('')
const selectedCountry = ref('')
const city           = ref('')
const releasedAt     = ref('')
const coverFile      = ref(null)
const coverPreview   = ref(null)
const coverInputRef  = ref(null)
const draggingCover  = ref(false)
const errorMsg       = ref('')
const uploading      = ref(false)
const uploadProgress = ref(0)
const uploadDone     = ref(false)
const uploadedItem   = ref(null)
const today          = new Date().toISOString().split('T')[0]

// ── Song state ─────────────────────────────────────────
const title       = ref('')
const mp3File     = ref(null)
const mp3InputRef = ref(null)
const draggingMp3 = ref(false)

// ── Album state ────────────────────────────────────────
const albumTitle     = ref('')
const tracks         = ref([{ title: '', artist: '', file: null }])
const trackFileRefs  = ref([])

// ── Country data ───────────────────────────────────────
const continentLabels = { europe:'Europa', namerica:'Nordamerika', samerica:'Südamerika', asia:'Asien', africa:'Afrika', oceania:'Ozeanien' }
const countryGroups = [
  { continent:'europe',   label:'🌍 Europa', countries:[
    {code:'DE',name:'Deutschland',flag:'🇩🇪'},{code:'AT',name:'Österreich',flag:'🇦🇹'},
    {code:'CH',name:'Schweiz',flag:'🇨🇭'},{code:'FR',name:'Frankreich',flag:'🇫🇷'},
    {code:'GB',name:'Großbritannien',flag:'🇬🇧'},{code:'IT',name:'Italien',flag:'🇮🇹'},
    {code:'ES',name:'Spanien',flag:'🇪🇸'},{code:'NL',name:'Niederlande',flag:'🇳🇱'},
    {code:'BE',name:'Belgien',flag:'🇧🇪'},{code:'PL',name:'Polen',flag:'🇵🇱'},
    {code:'SE',name:'Schweden',flag:'🇸🇪'},{code:'NO',name:'Norwegen',flag:'🇳🇴'},
    {code:'DK',name:'Dänemark',flag:'🇩🇰'},{code:'FI',name:'Finnland',flag:'🇫🇮'},
    {code:'PT',name:'Portugal',flag:'🇵🇹'},{code:'GR',name:'Griechenland',flag:'🇬🇷'},
    {code:'RU',name:'Russland',flag:'🇷🇺'},{code:'UA',name:'Ukraine',flag:'🇺🇦'},{code:'TR',name:'Türkei',flag:'🇹🇷'},
  ]},
  { continent:'namerica', label:'🌎 Nordamerika', countries:[{code:'US',name:'USA',flag:'🇺🇸'},{code:'CA',name:'Kanada',flag:'🇨🇦'},{code:'MX',name:'Mexiko',flag:'🇲🇽'}]},
  { continent:'samerica', label:'🌎 Südamerika', countries:[{code:'BR',name:'Brasilien',flag:'🇧🇷'},{code:'AR',name:'Argentinien',flag:'🇦🇷'},{code:'CO',name:'Kolumbien',flag:'🇨🇴'},{code:'CL',name:'Chile',flag:'🇨🇱'}]},
  { continent:'asia',     label:'🌏 Asien', countries:[{code:'JP',name:'Japan',flag:'🇯🇵'},{code:'KR',name:'Südkorea',flag:'🇰🇷'},{code:'CN',name:'China',flag:'🇨🇳'},{code:'IN',name:'Indien',flag:'🇮🇳'},{code:'TH',name:'Thailand',flag:'🇹🇭'},{code:'ID',name:'Indonesien',flag:'🇮🇩'},{code:'SG',name:'Singapur',flag:'🇸🇬'},{code:'PH',name:'Philippinen',flag:'🇵🇭'}]},
  { continent:'africa',   label:'🌍 Afrika', countries:[{code:'NG',name:'Nigeria',flag:'🇳🇬'},{code:'ZA',name:'Südafrika',flag:'🇿🇦'},{code:'GH',name:'Ghana',flag:'🇬🇭'},{code:'KE',name:'Kenia',flag:'🇰🇪'},{code:'EG',name:'Ägypten',flag:'🇪🇬'}]},
  { continent:'oceania',  label:'🌏 Ozeanien', countries:[{code:'AU',name:'Australien',flag:'🇦🇺'},{code:'NZ',name:'Neuseeland',flag:'🇳🇿'}]},
]

const selectedContinent = computed(() => {
  if (!selectedCountry.value) return null
  return countryGroups.find(g => g.countries.some(c => c.code === selectedCountry.value))?.continent ?? null
})

const canUploadSong  = computed(() => title.value.trim() && mp3File.value && selectedCountry.value)
const canUploadAlbum = computed(() => albumTitle.value.trim() && selectedCountry.value && tracks.value.some(t => t.file && t.title.trim()))

// ── Cover ──────────────────────────────────────────────
function onCoverChange(e) { const f = e.target.files?.[0]; if (f) setCover(f) }
function onCoverDrop(e)   { draggingCover.value = false; const f = e.dataTransfer.files?.[0]; if (f && f.type.startsWith('image/')) setCover(f) }
function setCover(f) { coverFile.value = f; const r = new FileReader(); r.onload = ev => { coverPreview.value = ev.target.result }; r.readAsDataURL(f) }

// ── MP3 (song) ─────────────────────────────────────────
function onMp3Change(e) { const f = e.target.files?.[0]; if (f) mp3File.value = f }
function onMp3Drop(e)   { draggingMp3.value = false; const f = e.dataTransfer.files?.[0]; if (f && (f.type === 'audio/mpeg' || f.name.endsWith('.mp3'))) mp3File.value = f }

// ── Tracks (album) ─────────────────────────────────────
function addTrack()         { tracks.value.push({ title: '', artist: '', file: null }) }
function removeTrack(idx)   { tracks.value.splice(idx, 1) }
function triggerTrackFile(idx) { trackFileRefs.value[idx]?.click() }
function onTrackFileChange(e, idx) { const f = e.target.files?.[0]; if (f) tracks.value[idx].file = f }

// ── Submit Song ────────────────────────────────────────
async function submitSong() {
  if (!canUploadSong.value) return
  errorMsg.value = ''; uploading.value = true; uploadProgress.value = 0
  try {
    const formData = new FormData()
    formData.append('mp3',       mp3File.value)
    if (coverFile.value) formData.append('cover', coverFile.value)
    formData.append('title',     title.value.trim())
    formData.append('artist',    artist.value.trim() || auth.user?.username || '')
    formData.append('country',   selectedCountry.value)
    formData.append('city',      city.value.trim())
    formData.append('continent', selectedContinent.value || '')
    if (releasedAt.value) formData.append('releasedAt', releasedAt.value)

    const song = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${BASE_URL}/api/upload`)
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('nyujam_token') || ''}`)
      xhr.upload.onprogress = e => { if (e.lengthComputable) uploadProgress.value = Math.round(e.loaded / e.total * 90) }
      xhr.onload = () => {
        uploadProgress.value = 100
        let data; try { data = JSON.parse(xhr.responseText) } catch { reject(new Error(`Server-Fehler ${xhr.status}`)); return }
        if (xhr.status === 201) resolve(data)
        else reject(new Error(data.error || `Fehler ${xhr.status}`))
      }
      xhr.onerror = () => reject(new Error('Netzwerkfehler'))
      xhr.send(formData)
    })

    uploadedItem.value = { ...song, title: song.title || title.value }
    uploadDone.value   = true
    await player.loadSongs()
  } catch (e) { errorMsg.value = e.message }
  finally { uploading.value = false }
}

// ── Submit Album ───────────────────────────────────────
async function submitAlbum() {
  if (!canUploadAlbum.value) return
  errorMsg.value = ''; uploading.value = true; uploadProgress.value = 0
  try {
    const formData = new FormData()
    if (coverFile.value) formData.append('cover', coverFile.value)
    formData.append('title',      albumTitle.value.trim())
    formData.append('artist',     artist.value.trim() || auth.user?.username || '')
    formData.append('country',    selectedCountry.value)
    formData.append('city',       city.value.trim())
    formData.append('continent',  selectedContinent.value || '')
    formData.append('releasedAt', releasedAt.value || today)

    const trackMeta = tracks.value
      .filter(t => t.file && t.title.trim())
      .map(t => ({ title: t.title.trim(), artist: t.artist.trim() || artist.value.trim() || auth.user?.username || '' }))
    formData.append('tracks', JSON.stringify(trackMeta))

    tracks.value.filter(t => t.file && t.title.trim()).forEach((t, i) => {
      formData.append(`mp3_${i}`, t.file)
    })

    const res  = await fetch(`${BASE_URL}/api/albums`, { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('nyujam_token') || ''}` }, body: formData })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)

    uploadedItem.value = { ...data, title: data.title || albumTitle.value }
    uploadDone.value   = true
    await player.loadSongs()
  } catch (e) { errorMsg.value = e.message }
  finally { uploading.value = false }
}

function playUploaded() {
  const song = player.songs.find(s => s.name === uploadedItem.value?.title || s.name === title.value)
  if (song) { player.play(song); router.push('/player') }
}

function resetForm() {
  title.value = ''; albumTitle.value = ''; artist.value = ''
  mp3File.value = null; coverFile.value = null; coverPreview.value = null
  selectedCountry.value = ''; city.value = ''; releasedAt.value = ''
  tracks.value = [{ title: '', artist: '', file: null }]
  uploadDone.value = false; uploadedItem.value = null; uploadProgress.value = 0; errorMsg.value = ''
}

function formatSize(bytes) {
  if (bytes > 1024*1024) return `${(bytes/1024/1024).toFixed(1)} MB`
  return `${(bytes/1024).toFixed(0)} KB`
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.upload-page { min-height: 100vh; background: #0a0a0f; color: #f0ede6; font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; align-items: center; padding: 0 1.5rem 4rem; position: relative; overflow-x: hidden; }
.bg-noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size: 180px; opacity: 0.6; }
.bg-glow { position: fixed; inset: 0; pointer-events: none; z-index: 0; background: radial-gradient(ellipse 60% 45% at 50% 20%, rgba(91,106,255,0.07) 0%, transparent 70%); }

.back-btn { position: relative; z-index: 1; align-self: flex-start; background: none; border: none; cursor: pointer; color: rgba(240,237,230,0.35); font-family: 'DM Sans', sans-serif; font-size: 0.78rem; letter-spacing: 0.1em; padding: 0.4rem 0; margin-bottom: 1.5rem; margin-top: 1rem; transition: color 0.2s; }
.back-btn:hover { color: #ff5a32; }

.page-header { position: relative; z-index: 1; text-align: center; margin-bottom: 1.5rem; }
.page-title { font-family: 'Bebas Neue', cursive; font-size: 3rem; letter-spacing: 0.2em; }
.page-sub { font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.25); margin-top: 0.35rem; }

.not-logged-in { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 1rem; padding: 3rem 1rem; text-align: center; }
.nil-icon { font-size: 3rem; opacity: 0.3; }
.nil-text { font-size: 0.88rem; color: rgba(240,237,230,0.4); max-width: 280px; line-height: 1.6; }
.nil-btn { background: rgba(91,106,255,0.15); border: 1px solid rgba(91,106,255,0.3); color: #5b6aff; border-radius: 3px; padding: 0.6rem 1.5rem; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; }

/* Mode toggle */
.mode-toggle { position: relative; z-index: 1; display: flex; gap: 0.5rem; margin-bottom: 1.5rem; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.08); border-radius: 6px; padding: 0.3rem; }
.mode-btn { display: flex; align-items: center; gap: 0.5rem; font-family: 'DM Sans', sans-serif; font-size: 0.88rem; font-weight: 500; background: none; border: none; color: rgba(240,237,230,0.35); border-radius: 4px; padding: 0.55rem 1.2rem; cursor: pointer; transition: all 0.2s; }
.mode-btn.active { background: rgba(91,106,255,0.15); color: #5b6aff; }
.mode-btn:hover:not(.active) { color: rgba(240,237,230,0.6); }

.upload-form { position: relative; z-index: 1; width: 100%; max-width: 420px; display: flex; flex-direction: column; gap: 1.1rem; }

/* Cover */
.cover-drop { width: 100%; aspect-ratio: 1; border-radius: 8px; border: 2px dashed rgba(240,237,230,0.15); cursor: pointer; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; background: rgba(240,237,230,0.02); transition: border-color 0.2s; }
.cover-drop:hover, .cover-drop.dragging { border-color: rgba(91,106,255,0.5); }
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
.field-label { font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,237,230,0.35); display: flex; align-items: center; gap: 0.4rem; }
.field-hint { font-size: 0.62rem; color: rgba(240,237,230,0.2); }
.field-input { background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.1); border-radius: 3px; padding: 0.75rem 1rem; font-family: 'DM Sans', sans-serif; font-size: 0.92rem; color: #f0ede6; outline: none; transition: border-color 0.2s; width: 100%; }
.field-input:focus { border-color: rgba(91,106,255,0.4); }
.field-input::placeholder { color: rgba(240,237,230,0.2); }
.field-input[type="date"] { color-scheme: dark; }
.field-select { appearance: none; cursor: pointer; }
.field-select option, .field-select optgroup { background: #0e0e1a; color: #f0ede6; }
.select-wrap { position: relative; }
.select-wrap::after { content: '▾'; position: absolute; right: 1rem; top: 50%; transform: translateY(-50%); pointer-events: none; color: rgba(240,237,230,0.4); }
.optional-tag { font-size: 0.58rem; letter-spacing: 0.08em; color: rgba(240,237,230,0.25); background: rgba(240,237,230,0.06); border-radius: 3px; padding: 0.1rem 0.35rem; text-transform: uppercase; font-weight: 400; }

/* MP3 */
.mp3-drop { border: 1px dashed rgba(240,237,230,0.15); border-radius: 6px; padding: 1rem 1.1rem; cursor: pointer; transition: border-color 0.2s, background 0.2s; }
.mp3-drop:hover, .mp3-drop.dragging { border-color: rgba(91,106,255,0.4); background: rgba(91,106,255,0.03); }
.mp3-drop.has-file { border-color: rgba(50,200,160,0.4); background: rgba(50,200,160,0.03); border-style: solid; }
.mp3-inner { display: flex; align-items: center; gap: 0.9rem; }
.mp3-info { flex: 1; display: flex; flex-direction: column; gap: 0.2rem; min-width: 0; }
.mp3-label { font-size: 0.88rem; font-weight: 500; color: rgba(240,237,230,0.6); }
.mp3-label--set { color: #32c8a0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mp3-hint { font-size: 0.65rem; color: rgba(240,237,230,0.25); }
.mp3-hint--size { color: rgba(50,200,160,0.6); }
.mp3-clear { background: none; border: none; color: rgba(240,237,230,0.3); cursor: pointer; font-size: 0.75rem; padding: 0.2rem; transition: color 0.2s; }
.mp3-clear:hover { color: #ff5a32; }

/* Tracks */
.tracks-section { display: flex; flex-direction: column; gap: 0.6rem; }
.tracks-header { display: flex; justify-content: space-between; align-items: center; }
.tracks-title { font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; color: rgba(240,237,230,0.35); }
.add-track-btn { background: none; border: 1px solid rgba(91,106,255,0.3); color: #5b6aff; border-radius: 3px; padding: 0.3rem 0.75rem; font-size: 0.75rem; cursor: pointer; font-family: 'DM Sans', sans-serif; transition: all 0.2s; }
.add-track-btn:hover { background: rgba(91,106,255,0.1); }
.track-list { display: flex; flex-direction: column; gap: 0.5rem; }
.track-item { display: flex; align-items: center; gap: 0.6rem; }
.track-nr { font-family: 'Bebas Neue', cursive; font-size: 0.9rem; color: rgba(240,237,230,0.2); width: 1.2rem; text-align: center; flex-shrink: 0; }
.track-fields { flex: 1; display: flex; flex-direction: column; gap: 0.3rem; min-width: 0; }
.track-input { padding: 0.5rem 0.75rem; font-size: 0.82rem; }
.track-mp3 { display: flex; align-items: center; gap: 0.4rem; background: rgba(240,237,230,0.04); border: 1px dashed rgba(240,237,230,0.12); border-radius: 3px; padding: 0.4rem 0.6rem; cursor: pointer; flex-shrink: 0; width: 80px; transition: border-color 0.2s; overflow: hidden; }
.track-mp3.has-file { border-color: rgba(50,200,160,0.35); border-style: solid; }
.track-mp3-label { font-size: 0.6rem; color: rgba(240,237,230,0.3); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.track-remove { background: none; border: none; color: rgba(240,237,230,0.2); cursor: pointer; font-size: 0.7rem; flex-shrink: 0; transition: color 0.2s; }
.track-remove:hover { color: #ff5a32; }

/* Error */
.form-error { background: rgba(255,90,50,0.1); border: 1px solid rgba(255,90,50,0.3); border-radius: 3px; padding: 0.55rem 1rem; font-size: 0.78rem; color: #ff8060; }

/* Submit */
.submit-btn { font-family: 'Bebas Neue', cursive; font-size: 1.05rem; letter-spacing: 0.15em; background: rgba(240,237,230,0.07); border: 1px solid rgba(240,237,230,0.12); color: rgba(240,237,230,0.35); border-radius: 3px; padding: 0.9rem; cursor: default; transition: all 0.25s; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
.submit-btn.ready { background: #5b6aff; border-color: #5b6aff; color: white; cursor: pointer; box-shadow: 0 0 24px rgba(91,106,255,0.4); }
.submit-btn.ready:hover { transform: scale(1.02); }
.submit-btn.loading { background: rgba(91,106,255,0.4); cursor: default; }
.upload-spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }

/* Success */
.upload-success { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 0.85rem; padding: 2rem 1rem; text-align: center; animation: successPop 0.5s cubic-bezier(0.34,1.4,0.64,1) both; }
.us-cover { width: 140px; height: 140px; border-radius: 10px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.5); }
.us-cover-img { width: 100%; height: 100%; object-fit: cover; }
.us-cover-placeholder { width: 140px; height: 140px; border-radius: 10px; background: rgba(240,237,230,0.06); display: flex; align-items: center; justify-content: center; font-size: 3.5rem; color: rgba(240,237,230,0.2); }
.us-check { font-size: 2rem; color: #32c8a0; }
.us-title { font-family: 'Bebas Neue', cursive; font-size: 1.5rem; letter-spacing: 0.15em; }
.us-name { font-size: 1rem; font-weight: 500; }
.us-artist { font-size: 0.78rem; color: rgba(240,237,230,0.4); }
.us-meta { font-size: 0.68rem; color: rgba(240,237,230,0.25); }
.us-actions { display: flex; gap: 0.75rem; margin-top: 0.5rem; }
.us-btn { font-family: 'DM Sans', sans-serif; font-size: 0.88rem; border-radius: 3px; padding: 0.65rem 1.3rem; cursor: pointer; transition: all 0.2s; border: 1px solid; }
.us-btn--play { background: #5b6aff; border-color: #5b6aff; color: white; box-shadow: 0 0 16px rgba(91,106,255,0.4); }
.us-btn--more { background: rgba(240,237,230,0.05); border-color: rgba(240,237,230,0.1); color: rgba(240,237,230,0.5); }
.us-btn--more:hover { color: #f0ede6; border-color: rgba(240,237,230,0.2); }

.hidden { display: none; }
.err-fade-enter-active, .err-fade-leave-active { transition: opacity 0.25s, transform 0.25s; }
.err-fade-enter-from, .err-fade-leave-to { opacity: 0; transform: translateY(-4px); }
.success-pop-enter-active { transition: opacity 0.4s, transform 0.4s; }
.success-pop-enter-from { opacity: 0; transform: scale(0.9); }
@keyframes fadeDown { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes successPop { from { opacity: 0; transform: scale(0.88); } to { opacity: 1; transform: scale(1); } }
</style>