<template>
  <div class="search-page">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>

    <!-- Werbebanner oben -->
    <div class="ad-banner">
      <span class="ad-label">Anzeige</span>
      <slot name="ad-top">
        <div class="ad-placeholder">Advertisement</div>
      </slot>
    </div>

    <!-- Zurück-Button -->
    <button class="back-btn" @click="router.push('/')">← Zurück</button>

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
          Ergebnisse für <em>„{{ lastQuery }}"</em> — {{ activeTabLabel }}
        </div>

        <!-- Platzhalter-Karten -->
        <div class="results-grid" :class="`grid--${activeTab}`">
          <div
            v-for="i in placeholderCount"
            :key="i"
            class="result-card"
            :style="{ '--i': i }"
          >
            <div class="card-thumb">
              <span class="card-thumb-icon">{{ currentTab.icon }}</span>
            </div>
            <div class="card-info">
              <div class="card-title skeleton"></div>
              <div class="card-sub skeleton short"></div>
            </div>
          </div>
        </div>

      </div>
    </transition>

    <!-- Leerzustand vor Suche -->
    <transition name="hint-fade">
      <div class="search-hint" v-if="!searched">
        <span class="hint-icon">⌇</span>
        <span>Gib etwas ein und drücke <kbd>Enter</kbd></span>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const inputRef = ref(null)
const query = ref('')
const lastQuery = ref('')
const searched = ref(false)
const inputFocused = ref(false)
const activeTab = ref('songs')

const tabs = [
  { id: 'artists',   label: 'Künstler',  icon: '◉', count: 6 },
  { id: 'songs',     label: 'Songs',     icon: '♩', count: 8 },
  { id: 'albums',    label: 'Alben',     icon: '▣', count: 4 },
  { id: 'playlists', label: 'Playlists', icon: '▤', count: 5 },
]

const currentTab = computed(() => tabs.find(t => t.id === activeTab.value))
const activeTabLabel = computed(() => currentTab.value?.label)
const placeholderCount = computed(() => currentTab.value?.count ?? 6)

function doSearch() {
  if (!query.value.trim()) return
  lastQuery.value = query.value.trim()
  searched.value = false
  // kurzes Reset für Re-Animation
  setTimeout(() => { searched.value = true }, 50)
  activeTab.value = 'songs'
}

function clearSearch() {
  query.value = ''
  searched.value = false
  lastQuery.value = ''
  inputRef.value?.focus()
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
}

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
</style>
