<template>
  <div class="comments-page">
    <div class="bg-noise"></div>

    <!-- Dismiss (same as player - arrow down) -->
    <button class="dismiss-btn" @click="router.replace('/player')" aria-label="Zurück zum Player">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>

    <!-- No song -->
    <div class="no-song" v-if="!player.currentSong">
      <span style="font-size:2rem;opacity:0.2">💬</span>
      <p>Kein Song ausgewählt</p>
      <button @click="router.replace('/')">← Home</button>
    </div>

    <template v-else>
      <!-- Song header -->
      <div class="song-header">
        <div class="sh-cover">
          <img v-if="player.currentSong.cover" :src="player.currentSong.cover" class="sh-cover-img" />
          <span v-else class="sh-cover-icon">♩</span>
        </div>
        <div class="sh-info">
          <span class="sh-title">{{ player.currentSong.name }}</span>
          <span class="sh-artist">{{ player.currentSong.artist }}</span>
        </div>
        <span class="sh-count">{{ comments.length }} Kommentare</span>
      </div>

      <!-- Write comment -->
      <div class="write-section" v-if="auth.isLoggedIn">
        <div class="write-avatar" :style="{ background: avatarColor(auth.user.username) }">
          <img v-if="auth.user.avatar" :src="auth.user.avatar" class="write-avatar-img" />
          <span v-else>{{ auth.user.username.slice(0,2).toUpperCase() }}</span>
        </div>
        <div class="write-body">
          <textarea
            v-model="newComment"
            class="write-input"
            placeholder="Kommentar schreiben... (Strg+Enter zum Senden)"
            rows="3"
            maxlength="300"
            @keydown.ctrl.enter="submitComment"
          ></textarea>
          <div class="write-footer">
            <div class="ts-wrap">
              <button class="ts-insert-btn" @click="insertCurrentTime" title="Aktuelle Wiedergabeposition einfügen">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                {{ player.formatTime(player.currentTime) }}
              </button>
              <div class="ts-input-wrap">
                <input
                  v-model="newTimestamp"
                  class="ts-input"
                  placeholder="z.B. 1:23"
                  maxlength="7"
                />
                <button class="ts-clear" v-if="newTimestamp" @click="newTimestamp = ''">✕</button>
              </div>
              <span class="ts-hint" v-if="newTimestamp">⏱ wird angehängt</span>
            </div>
            <div class="write-actions">
              <span class="char-count" :class="{ warn: newComment.length > 250 }">{{ newComment.length }}/300</span>
              <button class="submit-btn" :disabled="!newComment.trim() || submitting" @click="submitComment">
                <span v-if="submitting"><span class="spinner"></span></span>
                <span v-else>Senden ↑</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="login-hint" v-else>
        <button @click="router.push('/profile')">Anmelden um zu kommentieren →</button>
      </div>

      <!-- Sort -->
      <div class="sort-bar" v-if="comments.length">
        <button class="sort-btn" :class="{ active: sortBy === 'likes' }" @click="sortBy = 'likes'">♥ Beliebt</button>
        <button class="sort-btn" :class="{ active: sortBy === 'new' }"   @click="sortBy = 'new'">🕐 Neueste</button>
        <button class="sort-btn" :class="{ active: sortBy === 'ts' }"    @click="sortBy = 'ts'">⏱ Zeitstempel</button>
      </div>

      <!-- Comments list -->
      <div class="comments-list" v-if="!loading">
        <div v-if="!sortedComments.length" class="empty">
          <span>Noch keine Kommentare — sei der Erste! 🎵</span>
        </div>
        <div v-for="c in sortedComments" :key="c.id" class="comment">
          <div class="c-avatar" :style="{ background: avatarColor(c.username) }">
            <img v-if="c.avatar" :src="c.avatar" class="c-avatar-img" />
            <span v-else>{{ c.username.slice(0,2).toUpperCase() }}</span>
          </div>
          <div class="c-body">
            <div class="c-meta">
              <span class="c-username">{{ c.username }}</span>
              <button class="c-ts-badge" v-if="c.timestampSec !== null && c.timestampSec !== undefined" @click="seekAndBack(c.timestampSec)">
                ⏱ {{ formatTimestamp(c.timestampSec) }}
              </button>
              <span class="c-date">{{ formatDate(c.createdAt) }}</span>
            </div>
            <p class="c-text">{{ c.text }}</p>
            <div class="c-actions">
              <button class="c-like-btn" :class="{ liked: c.isLiked }" @click="toggleLike(c)">
                <svg width="13" height="13" viewBox="0 0 24 24" :fill="c.isLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                <span>{{ c.likes }}</span>
              </button>
              <button
                class="c-delete-btn"
                v-if="auth.user?.id === c.userId || auth.user?.is_admin"
                @click="deleteComment(c.id)"
                title="Kommentar löschen"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
      <div class="loading" v-else>
        <span class="spinner-lg"></span>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { useAuthStore }   from '@/stores/auth'

const router = useRouter()
const player = usePlayerStore()
const auth   = useAuthStore()

const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

function authHeader() {
  const t = localStorage.getItem('nyujam_token') || ''
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` }
}

// ── State ──────────────────────────────────────────────
const comments     = ref([])
const loading      = ref(true)
const newComment   = ref('')
const newTimestamp = ref('')
const submitting   = ref(false)
const sortBy       = ref('likes')

const sortedComments = computed(() => {
  const list = [...comments.value]
  if (sortBy.value === 'likes') return list.sort((a, b) => b.likes - a.likes)
  if (sortBy.value === 'new')   return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  if (sortBy.value === 'ts')    return list.filter(c => c.timestampSec != null).sort((a, b) => a.timestampSec - b.timestampSec)
  return list
})

onMounted(async () => {
  if (!player.currentSong) return
  await loadComments()
})

async function loadComments() {
  loading.value = true
  try {
    const res  = await fetch(`${BASE_URL}/api/comments/${player.currentSong.id}`, { headers: authHeader() })
    comments.value = await res.json()
  } catch {} finally { loading.value = false }
}

async function submitComment() {
  if (!newComment.value.trim() || submitting.value) return
  submitting.value = true
  try {
    const tsRaw = newTimestamp.value.trim()
    const tsSec = tsRaw ? parseTimestamp(tsRaw) : null
    const res   = await fetch(`${BASE_URL}/api/comments/${player.currentSong.id}`, {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({ text: newComment.value.trim(), timestampSec: tsSec }),
    })
    const data = await res.json()
    if (res.ok) {
      comments.value = [data, ...comments.value]
      newComment.value   = ''
      newTimestamp.value = ''
    }
  } catch {} finally { submitting.value = false }
}

async function toggleLike(c) {
  if (!auth.isLoggedIn) return
  const wasLiked = c.isLiked
  c.isLiked = !wasLiked
  c.likes   = wasLiked ? c.likes - 1 : c.likes + 1
  await fetch(`${BASE_URL}/api/comments/${c.id}/like`, {
    method: wasLiked ? 'DELETE' : 'POST', headers: authHeader(),
  }).catch(() => { c.isLiked = wasLiked; c.likes = wasLiked ? c.likes + 1 : c.likes - 1 })
}

async function deleteComment(id) {
  if (!confirm('Kommentar löschen?')) return
  const res = await fetch(`${BASE_URL}/api/comments/${id}`, { method: 'DELETE', headers: authHeader() })
  if (res.ok) comments.value = comments.value.filter(c => c.id !== id)
}

function insertCurrentTime() {
  newTimestamp.value = formatTimestamp(Math.floor(player.currentTime))
}

function seekAndBack(sec) {
  if (player.audioEl) player.audioEl.currentTime = sec
  router.replace('/player')
}

function parseTimestamp(str) {
  const parts = str.split(':').map(Number)
  if (parts.length === 2) return parts[0] * 60 + parts[1]
  return parts[0] || 0
}

function formatTimestamp(sec) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function avatarColor(name) {
  const colors = ['#5b6aff','#32c8a0','#ff5a32','#c864f0','#f0c832']
  return colors[(name?.charCodeAt(0) || 0) % colors.length]
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.comments-page { min-height: 100vh; background: #0a0a0f; color: #f0ede6; font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; align-items: center; padding: 0 1.25rem 4rem; position: relative; overflow-x: hidden; }
.bg-noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size: 180px; opacity: 0.6; }

/* Dismiss — same style as player */
.dismiss-btn { position: relative; z-index: 1; background: none; border: none; cursor: pointer; color: rgba(240,237,230,0.25); padding: 0.5rem; margin-bottom: 0.5rem; margin-top: 0.75rem; transition: color 0.2s, transform 0.2s; display: flex; align-items: center; justify-content: center; align-self: flex-start; }
.dismiss-btn:hover { color: rgba(240,237,230,0.6); transform: translateY(-2px); }

/* No song */
.no-song { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 0.85rem; padding: 3rem 1rem; color: rgba(240,237,230,0.3); font-size: 0.85rem; }
.no-song button { background: none; border: 1px solid rgba(240,237,230,0.15); color: rgba(240,237,230,0.4); border-radius: 3px; padding: 0.4rem 1rem; cursor: pointer; font-family: 'DM Sans', sans-serif; }

/* Song header */
.song-header { position: relative; z-index: 1; width: 100%; max-width: 520px; display: flex; align-items: center; gap: 0.85rem; background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.07); border-radius: 8px; padding: 0.85rem 1rem; margin-bottom: 1.25rem; }
.sh-cover { width: 44px; height: 44px; border-radius: 6px; background: rgba(240,237,230,0.08); display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
.sh-cover-img { width: 100%; height: 100%; object-fit: cover; }
.sh-cover-icon { font-size: 1.4rem; opacity: 0.4; }
.sh-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.15rem; }
.sh-title { font-size: 0.9rem; font-weight: 600; color: #f0ede6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.sh-artist { font-size: 0.7rem; color: rgba(240,237,230,0.4); }
.sh-count { font-size: 0.65rem; color: rgba(240,237,230,0.25); flex-shrink: 0; }

/* Write */
.write-section { position: relative; z-index: 1; width: 100%; max-width: 520px; display: flex; gap: 0.75rem; margin-bottom: 1rem; }
.write-avatar { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.68rem; font-weight: 600; color: white; flex-shrink: 0; overflow: hidden; margin-top: 0.1rem; }
.write-avatar-img { width: 100%; height: 100%; object-fit: cover; }
.write-body { flex: 1; display: flex; flex-direction: column; gap: 0.5rem; }
.write-input { width: 100%; background: rgba(240,237,230,0.05); border: 1px solid rgba(240,237,230,0.1); border-radius: 6px; padding: 0.7rem 0.85rem; color: #f0ede6; font-family: 'DM Sans', sans-serif; font-size: 0.85rem; resize: none; outline: none; }
.write-input:focus { border-color: rgba(91,106,255,0.4); }
.write-input::placeholder { color: rgba(240,237,230,0.2); }
.write-footer { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.ts-wrap { display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap; }
.ts-insert-btn { display: flex; align-items: center; gap: 0.3rem; background: rgba(240,200,50,0.08); border: 1px solid rgba(240,200,50,0.2); border-radius: 3px; padding: 0.3rem 0.6rem; font-size: 0.68rem; color: #f0c832; cursor: pointer; transition: background 0.2s; white-space: nowrap; font-family: 'DM Sans', sans-serif; }
.ts-insert-btn:hover { background: rgba(240,200,50,0.15); }
.ts-input-wrap { display: flex; align-items: center; gap: 0.2rem; }
.ts-input { background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.1); border-radius: 3px; padding: 0.28rem 0.5rem; font-size: 0.72rem; color: #f0ede6; font-family: 'DM Sans', sans-serif; outline: none; width: 58px; }
.ts-input:focus { border-color: rgba(240,200,50,0.35); }
.ts-clear { background: none; border: none; color: rgba(240,237,230,0.3); cursor: pointer; font-size: 0.65rem; }
.ts-hint { font-size: 0.62rem; color: #f0c832; opacity: 0.7; }
.write-actions { display: flex; align-items: center; gap: 0.6rem; }
.char-count { font-size: 0.65rem; color: rgba(240,237,230,0.2); }
.char-count.warn { color: #ff5a32; }
.submit-btn { font-family: 'Bebas Neue', cursive; font-size: 0.88rem; letter-spacing: 0.12em; background: #5b6aff; color: white; border: none; border-radius: 3px; padding: 0.4rem 1.1rem; cursor: pointer; display: flex; align-items: center; gap: 0.4rem; transition: opacity 0.2s; }
.submit-btn:disabled { opacity: 0.4; cursor: default; }

.login-hint { position: relative; z-index: 1; width: 100%; max-width: 520px; padding: 0.75rem 0; margin-bottom: 0.75rem; }
.login-hint button { background: none; border: none; color: rgba(91,106,255,0.7); font-size: 0.82rem; cursor: pointer; font-family: 'DM Sans', sans-serif; }

/* Sort */
.sort-bar { position: relative; z-index: 1; width: 100%; max-width: 520px; display: flex; gap: 0.5rem; margin-bottom: 0.85rem; }
.sort-btn { background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.08); border-radius: 20px; padding: 0.3rem 0.85rem; font-size: 0.72rem; color: rgba(240,237,230,0.35); cursor: pointer; transition: all 0.2s; font-family: 'DM Sans', sans-serif; }
.sort-btn.active { background: rgba(91,106,255,0.12); border-color: rgba(91,106,255,0.3); color: #5b6aff; }
.sort-btn:hover:not(.active) { color: rgba(240,237,230,0.6); }

/* Comments */
.comments-list { position: relative; z-index: 1; width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: 0; }
.empty { padding: 2rem; text-align: center; font-size: 0.78rem; color: rgba(240,237,230,0.2); }
.comment { display: flex; gap: 0.75rem; padding: 0.9rem 0; border-bottom: 1px solid rgba(240,237,230,0.05); }
.comment:last-child { border-bottom: none; }
.c-avatar { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.7rem; font-weight: 600; color: white; flex-shrink: 0; overflow: hidden; margin-top: 0.1rem; }
.c-avatar-img { width: 100%; height: 100%; object-fit: cover; }
.c-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.c-meta { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.c-username { font-size: 0.8rem; font-weight: 600; color: #f0ede6; }
.c-ts-badge { background: rgba(240,200,50,0.1); border: 1px solid rgba(240,200,50,0.25); border-radius: 3px; padding: 0.1rem 0.45rem; font-size: 0.65rem; color: #f0c832; cursor: pointer; transition: background 0.2s; font-family: 'DM Sans', sans-serif; }
.c-ts-badge:hover { background: rgba(240,200,50,0.2); }
.c-date { font-size: 0.62rem; color: rgba(240,237,230,0.2); margin-left: auto; }
.c-text { font-size: 0.83rem; color: rgba(240,237,230,0.7); line-height: 1.6; word-break: break-word; }
.c-actions { display: flex; align-items: center; gap: 0.75rem; }
.c-like-btn { display: flex; align-items: center; gap: 0.3rem; background: none; border: none; color: rgba(240,237,230,0.3); font-size: 0.72rem; cursor: pointer; transition: color 0.2s; padding: 0; font-family: 'DM Sans', sans-serif; }
.c-like-btn:hover { color: #ff5a32; }
.c-like-btn.liked { color: #ff5a32; }
.c-delete-btn { background: none; border: none; color: rgba(240,237,230,0.15); cursor: pointer; transition: color 0.2s; display: flex; align-items: center; padding: 0; }
.c-delete-btn:hover { color: #ff5a32; }

.loading { position: relative; z-index: 1; padding: 3rem; display: flex; justify-content: center; }
.spinner { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,0.3); border-top-color: white; border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
.spinner-lg { width: 24px; height: 24px; border: 2px solid rgba(240,237,230,0.1); border-top-color: rgba(240,237,230,0.4); border-radius: 50%; animation: spin 0.7s linear infinite; display: inline-block; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>