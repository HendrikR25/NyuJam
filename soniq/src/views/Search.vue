<template>
  <div class="search-page">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>

    <!-- Werbebanner oben -->
    <AdBanner ad-slot="1918440727" />

    <!-- Zurück-Button -->
    <NavBar back-to="/" />

    <!-- Suchbereich -->
    <div class="search-container">
      <h1 class="search-title">SUCHE</h1>

      <div class="search-bar-wrap" :class="{ focused: inputFocused, active: query }">
        <span class="search-icon">⊹</span>
        <input
          ref="inputRef"
          v-model="query"
          class="search-input"
          type="text"
          placeholder="Künstler, Songs, Alben ..."
          @focus="inputFocused = true"
          @blur="inputFocused = false"
          @keydown.enter="doSearch"
        />
        <button v-if="query" class="clear-btn" @click="clearSearch">✕</button>
      </div>

      <button class="search-btn" :class="{ ready: query.trim().length > 0 }" @click="doSearch">
        Suchen
      </button>
    </div>

    <!-- Ergebnisbereich (erscheint nach Suche) -->
    <transition name="results-fade">
      <div class="results-area" v-if="searched">

        <!-- Kategorie-Tabs -->
        <div class="tabs">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="tab"
            :class="{ active: activeTab === tab.id }"
            @click="activeTab = tab.id"
          >
            <span class="tab-icon">{{ tab.icon }}</span>
            {{ tab.label }}
          </button>
        </div>

        <!-- Ergebnis-Info -->
        <div class="results-meta">
          {{ activeResults.length }} Ergebnisse für <em>„{{ lastQuery }}"</em> — {{ activeTabLabel }}
        </div>

        <!-- Real results (songs / artists) -->
        <div class="results-grid" v-if="activeResults.length">
          <div
            v-for="(item, i) in activeResults"
            :key="item.id"
            class="result-card clickable"
            :style="{ '--i': i }"
            @click="activeTab === 'songs' ? playSong(item) : goToArtist(item)"
          >
            <div class="card-thumb">
              <img v-if="activeTab === 'songs' && item.cover" :src="item.cover" class="card-thumb-img" />
              <span v-else class="card-thumb-icon">{{ activeTab === 'songs' ? '♩' : '◉' }}</span>
            </div>
            <div class="card-info">
              <div class="card-title-real">{{ item.name }}</div>
              <div class="card-sub-real" v-if="item.artist">{{ item.artist }}</div>
            </div>
            <SongMenu v-if="activeTab === 'songs'" :song="item" @feedback="searchFeedback = $event; clearFeedbackTimer()" @deleted="onSongDeleted" />
            <span v-else class="card-play">→</span>
          </div>
        </div>

        <!-- No results -->
        <div class="no-results" v-else-if="activeTab === 'songs' || activeTab === 'artists'">
          <span>Keine {{ activeTabLabel }} gefunden für „{{ lastQuery }}"</span>
        </div>

        <!-- Albums / Playlists: still prototype -->
        <div class="no-results" v-else>
          <span>{{ activeTabLabel }} — noch nicht verfügbar</span>
        </div>

      </div>
    </transition>

    <!-- Leerzustand vor Suche -->
    <div v-if="!searched">
      <!-- Suchverlauf -->
      <transition name="results-fade">
        <div class="history-area" v-if="searchHistory.length">
          <div class="history-header">
            <span class="history-title">Zuletzt gesucht</span>
            <button class="history-clear-all" @click="clearAllHistory">Alle löschen</button>
          </div>
          <div class="history-list">
            <div
              v-for="item in searchHistory"
              :key="item.id"
              class="history-item"
              @click="applyHistory(item.query)"
            >
              <span class="history-icon">↺</span>
              <span class="history-query">{{ item.query }}</span>
              <button class="history-delete" @click.stop="deleteHistory(item.id)">✕</button>
            </div>
          </div>
        </div>
      </transition>

      <div class="search-hint" v-if="!searchHistory.length">
        <span class="hint-icon">⌇</span>
        <span>Gib etwas ein und drücke <kbd>Enter</kbd></span>
      </div>
    </div>

    <!-- Feedback toast -->
    <transition name="toast-fade">
      <div class="search-toast" v-if="searchFeedback">{{ searchFeedback }}</div>
    </transition>

  </div>
</template>

<script setup>
import AdBanner from '@/components/AdBanner.vue'
import SongMenu from '@/components/SongMenu.vue'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import { usePlayerStore } from '@/stores/player'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const player = usePlayerStore()
const auth   = useAuthStore()

const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

const inputRef      = ref(null)
const query         = ref('')
const searchFeedback = ref('')
let feedbackTimer = null
function clearFeedbackTimer() {
  clearTimeout(feedbackTimer)
  feedbackTimer = setTimeout(() => { searchFeedback.value = '' }, 2500)
}
function onSongDeleted(id) {
  player.songs = player.songs.filter(s => s.id !== id)
}
const lastQuery     = ref('')
const searched      = ref(false)
const inputFocused  = ref(false)
const activeTab     = ref('songs')
const searchHistory = ref([])

onMounted(async () => {
  if (!player.songs.length) player.loadSongs()
  await loadHistory()
})

async function loadHistory() {
  if (!auth.isLoggedIn) return
  try {
    const res = await fetch(`${BASE_URL}/api/search/history`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('nyujam_token') || ''}` }
    })
    searchHistory.value = await res.json()
  } catch {}
}

async function saveHistory(q) {
  if (!auth.isLoggedIn) return
  try {
    await fetch(`${BASE_URL}/api/search/history`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('nyujam_token') || ''}` },
      body: JSON.stringify({ query: q }),
    })
    await loadHistory()
  } catch {}
}

async function deleteHistory(id) {
  try {
    await fetch(`${BASE_URL}/api/search/history/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('nyujam_token') || ''}` }
    })
    searchHistory.value = searchHistory.value.filter(h => h.id !== id)
  } catch {}
}

async function clearAllHistory() {
  try {
    await fetch(`${BASE_URL}/api/search/history`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('nyujam_token') || ''}` }
    })
    searchHistory.value = []
  } catch {}
}

function applyHistory(q) {
  query.value = q
  doSearch()
}

const tabs = [
  { id: 'songs',     label: 'Songs',     icon: '♩' },
  { id: 'artists',   label: 'Künstler',  icon: '◉' },
  { id: 'albums',    label: 'Alben',     icon: '▣' },
  { id: 'playlists', label: 'Playlists', icon: '▤' },
]

const currentTab     = computed(() => tabs.find(t => t.id === activeTab.value))
const activeTabLabel = computed(() => currentTab.value?.label)

// Real song results filtered from store
const songResults = computed(() => {
  if (!lastQuery.value) return []
  const q = lastQuery.value.toLowerCase()
  return player.songs.filter(s =>
    s.name.toLowerCase().includes(q) || s.artist.toLowerCase().includes(q)
  )
})

// Artist results derived from songs
const artistResults = computed(() => {
  if (!lastQuery.value) return []
  const q = lastQuery.value.toLowerCase()
  const seen = new Set()
  return player.songs
    .filter(s => s.artist.toLowerCase().includes(q))
    .filter(s => { if (seen.has(s.artist)) return false; seen.add(s.artist); return true })
    .map(s => ({ id: s.id, name: s.artist }))
})

const activeResults = computed(() => {
  if (activeTab.value === 'songs')   return songResults.value
  if (activeTab.value === 'artists') return artistResults.value
  return [] // albums & playlists: no real data yet
})

const placeholderCount = computed(() => {
  if (activeTab.value === 'songs')   return songResults.value.length || 0
  if (activeTab.value === 'artists') return artistResults.value.length || 0
  return 0
})

function doSearch() {
  if (!query.value.trim()) return
  lastQuery.value = query.value.trim()
  searched.value  = false
  setTimeout(() => { searched.value = true }, 50)
  activeTab.value = 'songs'
  saveHistory(lastQuery.value)
}

function clearSearch() {
  query.value    = ''
  searched.value = false
  lastQuery.value = ''
  inputRef.value?.focus()
}

function playSong(song) {
  player.fromRoute = '/search'
  player.play(song)
  router.push('/player?from=search')
}

function goToArtist(item) {
  router.push(`/artist/${encodeURIComponent(item.name)}`)
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.search-page {
  min-height: 100vh;
  background: #0a0a0f;
  color: #f0ede6;
  font-family: 'DM Sans', sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 1.5rem 4rem;
  position: relative;
  overflow-x: hidden;
}

/* ── Background ── */
.bg-noise {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  background-size: 180px; opacity: 0.6;
}
.bg-glow {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background:
    radial-gradient(ellipse 55% 40% at 70% 20%, rgba(255,90,50,0.07) 0%, transparent 70%),
    radial-gradient(ellipse 50% 55% at 20% 80%, rgba(80,60,255,0.06) 0%, transparent 70%);
}

/* ── Ad Banner ── */
.ad-banner {
  position: relative; z-index: 1;
  width: 100%; max-width: 728px;
  min-height: 90px;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  border-bottom: 1px solid rgba(240,237,230,0.07);
  padding: 0.75rem 0;
  margin-bottom: 1rem;
}
.ad-label {
  position: absolute; top: 4px; left: 0;
  font-size: 0.6rem; letter-spacing: 0.15em;
  text-transform: uppercase; color: rgba(240,237,230,0.2);
}
.ad-placeholder {
  width: 100%; max-width: 728px; height: 90px;
  background: rgba(240,237,230,0.03);
  border: 1px dashed rgba(240,237,230,0.1);
  border-radius: 2px;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; letter-spacing: 0.12em;
  text-transform: uppercase; color: rgba(240,237,230,0.15);
}

/* ── Back ── */
.back-btn {
  position: relative; z-index: 1;
  align-self: flex-start;
  background: none; border: none; cursor: pointer;
  color: rgba(240,237,230,0.35);
  font-family: 'DM Sans', sans-serif;
  font-size: 0.8rem; letter-spacing: 0.1em;
  padding: 0.4rem 0;
  margin-bottom: 2rem;
  transition: color 0.2s;
}
.back-btn:hover { color: #ff5a32; }

/* ── Search Container ── */
.search-container {
  position: relative; z-index: 1;
  width: 100%; max-width: 560px;
  display: flex; flex-direction: column;
  align-items: center; gap: 1.25rem;
  margin-bottom: 2.5rem;
}

.search-title {
  font-family: 'Bebas Neue', cursive;
  font-size: 3rem; letter-spacing: 0.2em;
  color: #f0ede6;
  animation: fadeDown 0.5s ease both;
}

.search-bar-wrap {
  width: 100%;
  display: flex; align-items: center; gap: 0.75rem;
  background: rgba(240,237,230,0.04);
  border: 1px solid rgba(240,237,230,0.1);
  border-radius: 2px;
  padding: 0.9rem 1.2rem;
  transition: border-color 0.25s, background 0.25s;
  animation: fadeDown 0.5s 0.08s ease both;
}
.search-bar-wrap.focused {
  border-color: rgba(255,90,50,0.4);
  background: rgba(255,90,50,0.04);
}
.search-bar-wrap.active {
  border-color: rgba(255,90,50,0.25);
}

.search-icon {
  font-size: 1.1rem; color: #ff5a32; opacity: 0.7; flex-shrink: 0;
}
.search-input {
  flex: 1; background: none; border: none; outline: none;
  font-family: 'DM Sans', sans-serif;
  font-size: 1rem; font-weight: 400;
  color: #f0ede6; letter-spacing: 0.02em;
}
.search-input::placeholder { color: rgba(240,237,230,0.25); }

.clear-btn {
  background: none; border: none; cursor: pointer;
  color: rgba(240,237,230,0.3); font-size: 0.75rem;
  padding: 0; transition: color 0.2s;
}
.clear-btn:hover { color: #ff5a32; }

.search-btn {
  font-family: 'Bebas Neue', cursive;
  font-size: 1.1rem; letter-spacing: 0.18em;
  background: rgba(240,237,230,0.06);
  border: 1px solid rgba(240,237,230,0.1);
  color: rgba(240,237,230,0.4);
  padding: 0.7rem 2.5rem;
  border-radius: 2px; cursor: pointer;
  transition: all 0.25s;
  animation: fadeDown 0.5s 0.16s ease both;
}
.search-btn.ready {
  color: #f0ede6;
  border-color: rgba(255,90,50,0.4);
  background: rgba(255,90,50,0.1);
}
.search-btn.ready:hover {
  background: rgba(255,90,50,0.2);
  border-color: rgba(255,90,50,0.7);
}

/* ── Hint ── */
.history-area { width: 100%; max-width: 540px; margin: 1.5rem auto 0; animation: fadeUp 0.3s ease both; }
.history-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; padding: 0 0.2rem; }
.history-title { font-size: 0.65rem; letter-spacing: 0.15em; text-transform: uppercase; color: rgba(240,237,230,0.3); }
.history-clear-all { background: none; border: none; cursor: pointer; font-size: 0.65rem; letter-spacing: 0.1em; text-transform: uppercase; color: rgba(240,237,230,0.2); font-family: 'DM Sans', sans-serif; transition: color 0.2s; }
.history-clear-all:hover { color: #ff5a32; }
.history-list { display: flex; flex-direction: column; gap: 0.3rem; }
.history-item { display: flex; align-items: center; gap: 0.75rem; padding: 0.65rem 0.9rem; border-radius: 4px; background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.07); cursor: pointer; transition: background 0.15s, border-color 0.15s; }
.history-item:hover { background: rgba(240,237,230,0.06); border-color: rgba(240,237,230,0.12); }
.history-icon { font-size: 0.75rem; color: rgba(240,237,230,0.25); flex-shrink: 0; }
.history-query { flex: 1; font-size: 0.88rem; color: rgba(240,237,230,0.6); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.history-delete { background: none; border: none; cursor: pointer; font-size: 0.65rem; color: rgba(240,237,230,0.2); padding: 0.2rem; transition: color 0.2s; flex-shrink: 0; }
.history-delete:hover { color: #ff5a32; }

.search-hint {
  position: relative; z-index: 1;
  display: flex; align-items: center; gap: 0.6rem;
  color: rgba(240,237,230,0.2);
  font-size: 0.8rem; letter-spacing: 0.08em;
  margin-top: 1rem;
}
.hint-icon { color: #ff5a32; opacity: 0.5; font-size: 1.1rem; }
kbd {
  background: rgba(240,237,230,0.08);
  border: 1px solid rgba(240,237,230,0.15);
  border-radius: 3px;
  padding: 0.1rem 0.4rem;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.75rem;
}

/* ── Results ── */
.results-area {
  position: relative; z-index: 1;
  width: 100%; max-width: 560px;
  display: flex; flex-direction: column; gap: 1.5rem;
}

/* Tabs */
.tabs {
  display: flex; gap: 0.4rem; flex-wrap: wrap;
}
.tab {
  display: flex; align-items: center; gap: 0.4rem;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.82rem; letter-spacing: 0.06em;
  background: rgba(240,237,230,0.04);
  border: 1px solid rgba(240,237,230,0.09);
  color: rgba(240,237,230,0.45);
  padding: 0.45rem 1rem;
  border-radius: 999px; cursor: pointer;
  transition: all 0.2s;
}
.tab:hover { color: #f0ede6; border-color: rgba(240,237,230,0.2); }
.tab.active {
  background: rgba(255,90,50,0.12);
  border-color: rgba(255,90,50,0.45);
  color: #ff5a32;
}
.tab-icon { font-size: 0.9rem; }

/* Meta */
.results-meta {
  font-size: 0.75rem; letter-spacing: 0.06em;
  color: rgba(240,237,230,0.25);
}
.results-meta em { color: rgba(240,237,230,0.5); font-style: normal; }

/* Grid */
.results-grid {
  display: flex; flex-direction: column; gap: 0.6rem;
}

/* Card */
.result-card {
  display: flex; align-items: center; gap: 1rem;
  background: rgba(240,237,230,0.03);
  border: 1px solid rgba(240,237,230,0.07);
  border-radius: 2px;
  padding: 0.85rem 1rem;
  opacity: 0;
  transform: translateY(6px);
  animation: slideUp 0.35s ease forwards;
  animation-delay: calc(var(--i) * 45ms);
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}
.result-card:hover {
  background: rgba(255,90,50,0.06);
  border-color: rgba(255,90,50,0.2);
}

.card-thumb {
  width: 44px; height: 44px; flex-shrink: 0;
  background: rgba(240,237,230,0.06);
  border-radius: 2px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem;
  overflow: hidden;
}
.card-thumb-img { width: 100%; height: 100%; object-fit: cover; }

.card-info { flex: 1; display: flex; flex-direction: column; gap: 0.4rem; }

.skeleton {
  height: 10px; border-radius: 2px;
  background: linear-gradient(
    90deg,
    rgba(240,237,230,0.07) 25%,
    rgba(240,237,230,0.13) 50%,
    rgba(240,237,230,0.07) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.6s infinite;
}
.card-title.skeleton { width: 55%; }
.card-sub.skeleton.short { width: 30%; }

.card-title-real { font-size: 0.88rem; font-weight: 500; color: #f0ede6; }
.card-sub-real   { font-size: 0.7rem; color: rgba(240,237,230,0.35); margin-top: 0.15rem; }
.result-card.clickable { cursor: pointer; }
.result-card.clickable:hover { background: rgba(255,90,50,0.07); border-color: rgba(255,90,50,0.25); }
.card-play { font-size: 0.7rem; color: rgba(240,237,230,0.25); flex-shrink: 0; transition: color 0.2s; }
.result-card:hover .card-play { color: #ff5a32; }

.no-results { font-size: 0.78rem; color: rgba(240,237,230,0.25); text-align: center; padding: 1.5rem 0; letter-spacing: 0.04em; }

/* ── Transitions ── */
.results-fade-enter-active { transition: opacity 0.3s ease, transform 0.3s ease; }
.results-fade-enter-from   { opacity: 0; transform: translateY(8px); }
.hint-fade-enter-active, .hint-fade-leave-active { transition: opacity 0.25s; }
.hint-fade-enter-from, .hint-fade-leave-to { opacity: 0; }

/* ── Keyframes ── */
@keyframes fadeDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideUp {
  to { opacity: 1; transform: translateY(0); }
}
@keyframes shimmer {
  0%   { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

/* ── Mobile ── */
@media (max-width: 480px) {
  .search-title { font-size: 2.4rem; }
  .tab { font-size: 0.76rem; padding: 0.4rem 0.8rem; }
}
.search-toast { position: fixed; bottom: 5rem; left: 50%; transform: translateX(-50%); background: rgba(14,14,24,0.95); border: 1px solid rgba(240,237,230,0.15); border-radius: 6px; padding: 0.6rem 1.2rem; font-size: 0.82rem; color: #f0ede6; z-index: 200; white-space: nowrap; }
.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity 0.3s, transform 0.3s; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }
</style>