<template>
  <div class="home">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>

    <!-- ── Desktop Sidebar ── -->
    <aside class="sidebar">
      <div class="sidebar-logo">NYJ</div>
      <button class="sidebar-icon sidebar-home" :class="{ active: activeId === 'home' }" title="Home" @click="activeId = 'home'">
        <span class="si-icon">⌂</span>
      </button>

      <nav class="sidebar-nav">
        <button
          v-for="item in navItems"
          :key="item.id"
          class="sidebar-icon"
          :class="{ active: activeId === item.id }"
          :title="item.label"
          @click="navigate(item)"
        >
          <span class="si-icon">{{ item.icon }}</span>
        </button>
      </nav>

      <button class="sidebar-icon sidebar-profile" :title="auth.user?.username || 'Profil'" @click="router.push('/profile')">
        <div class="si-avatar" v-if="auth.user">
          <img v-if="auth.user.avatar" :src="auth.user.avatar" class="si-avatar-img" />
          <span v-else>{{ auth.user.username.slice(0,2).toUpperCase() }}</span>
        </div>
        <span class="si-icon" v-else>◎</span>
      </button>
    </aside>

    <!-- ── Main Content ── -->
    <main class="main">
      <AdBanner ad-slot="1918440727" />

      <!-- Header (mobile only) -->
      <div class="mobile-header">
        <div class="mobile-logo">NYU<span>JAM</span></div>
        <button class="mobile-profile" @click="router.push('/profile')">
          <div class="si-avatar" v-if="auth.user">
            <img v-if="auth.user.avatar" :src="auth.user.avatar" class="si-avatar-img" />
            <span v-else>{{ auth.user.username.slice(0,2).toUpperCase() }}</span>
          </div>
          <span v-else class="si-icon">◎</span>
        </button>
      </div>

      <!-- ── Home View ── -->
      <div class="home-view" v-if="activeId === 'home'">

        <!-- Zufälliger Song -->
        <section class="home-section">
          <div class="section-label">Zufälliger Song</div>
          <div class="random-card" v-if="randomSong" @click="player.play(randomSong)">
            <div class="rc-cover" :style="randomSong.cover ? {} : { background: rcGradient }">
              <img v-if="randomSong.cover" :src="randomSong.cover" class="rc-cover-img" />
              <span v-else class="rc-cover-icon">{{ rcIcon }}</span>
            </div>
            <div class="rc-info">
              <div class="rc-title">{{ randomSong.name }}</div>
              <div class="rc-artist">{{ randomSong.artist }}</div>
            </div>
            <button class="rc-play" @click.stop="player.play(randomSong)">▶</button>
            <button class="rc-shuffle" @click.stop="pickRandom()" title="Anderen Song">↺</button>
          </div>
          <div class="random-card random-card--loading" v-else>
            <div class="rc-cover" style="background:rgba(255,90,50,0.06)"></div>
            <div class="rc-info">
              <div class="rc-title-skel"></div>
              <div class="rc-artist-skel"></div>
            </div>
          </div>
        </section>

        <!-- Top Songs diese Woche -->
        <section class="home-section">
          <div class="section-label">Top Songs diese Woche</div>
          <div class="top-list" v-if="topSongs.length">
            <div
              v-for="(song, i) in topSongs"
              :key="song.song_id"
              class="top-row"
              @click="playTopSong(song)"
            >
              <div class="top-rank">{{ i + 1 }}</div>
              <div class="top-cover">
                <img v-if="song.cover_url" :src="song.cover_url" class="top-cover-img" />
                <span v-else class="top-cover-icon">◈</span>
              </div>
              <div class="top-info">
                <div class="top-title">{{ song.song_name }}</div>
                <div class="top-artist">{{ song.artist }}</div>
              </div>
              <div class="top-pct">{{ song.like_pct?.toFixed(1) }}%</div>
            </div>
          </div>
          <div class="empty-hint" v-else-if="topLoaded">Noch keine Rankings diese Woche</div>
          <div class="top-list" v-else>
            <div class="top-row top-row--skel" v-for="i in 3" :key="i">
              <div class="top-rank">{{ i }}</div>
              <div class="top-cover top-cover--skel"></div>
              <div class="top-info">
                <div class="rc-title-skel"></div>
                <div class="rc-artist-skel" style="width:60%"></div>
              </div>
            </div>
          </div>
        </section>

        <!-- Fun Stats -->
        <section class="home-section">
          <div class="section-label">Deine Woche</div>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-val">{{ stats.minsWeek }}</div>
              <div class="stat-unit">min</div>
              <div class="stat-label">Musik gehört</div>
            </div>
            <div class="stat-card">
              <div class="stat-val">{{ stats.streaksWeek }}</div>
              <div class="stat-unit">Tage</div>
              <div class="stat-label">Streak 🔥</div>
            </div>
            <div class="stat-card">
              <div class="stat-val">{{ stats.songsWeek }}</div>
              <div class="stat-unit">Songs</div>
              <div class="stat-label">diese Woche</div>
            </div>
            <div class="stat-card stat-card--wide">
              <div class="stat-top-artist">
                <div class="sta-icon">◈</div>
                <div>
                  <div class="stat-val-sm">{{ stats.topArtist }}</div>
                  <div class="stat-label">Lieblingskünstler</div>
                </div>
              </div>
            </div>
            <div class="stat-card stat-card--fun">
              <div class="stat-val-sm" style="font-size:1rem;font-weight:700;color:#f0ede6;">{{ stats.topGenre }}</div>
              <div class="stat-label">Top Genre</div>
            </div>
            <div class="stat-card">
              <div class="stat-val">{{ stats.countriesHeard }}</div>
              <div class="stat-unit">Länder</div>
              <div class="stat-label">Radio gehört</div>
            </div>
          </div>
        </section>

      </div>

      <!-- ── Nav Grid (alle anderen Seiten via Sidebar navigiert) ── -->
      <div class="nav-grid" v-else>
        <button
          v-for="(item, i) in navItems"
          :key="item.id"
          class="nav-btn"
          :style="{ '--delay': `${i * 50}ms` }"
          @click="navigate(item)"
          @mousedown="item.id === 'playlists' && onBtnMousedown($event, item.id)"
          @mouseup="item.id === 'playlists' && onBtnMouseup($event, item.id)"
          @mouseleave="item.id === 'playlists' && onBtnMouseleave(item.id)"
          @touchstart.prevent="item.id === 'playlists' && onBtnMousedown($event, item.id)"
          @touchend="item.id === 'playlists' && onBtnMouseup($event, item.id)"
        >
          <span class="nb-icon">{{ item.icon }}</span>
          <span class="nb-label">{{ item.label }}</span>
          <span class="nb-arrow">→</span>
          <div v-if="item.id === 'playlists'" class="hold-bar" :style="{ transform: `scaleX(${holdProgress})` }"></div>
        </button>
      </div>
    </main>

    <!-- ── Mobile Bottom Bar ── -->
    <nav class="bottom-bar">
      <button
        v-for="item in bottomItems"
        :key="item.id"
        class="bb-tab"
        :class="{ active: activeId === item.id }"
        @click="navigate(item)"
      >
        <span class="bb-icon">{{ item.icon }}</span>
        <span class="bb-label">{{ item.label }}</span>
      </button>
      <button class="bb-tab" :class="{ active: activeId === 'profile' }" @click="router.push('/profile')">
        <div class="bb-avatar" v-if="auth.user">
          <img v-if="auth.user.avatar" :src="auth.user.avatar" class="si-avatar-img" />
          <span v-else>{{ auth.user.username.slice(0,1).toUpperCase() }}</span>
        </div>
        <span v-else class="bb-icon">◎</span>
        <span class="bb-label">Profil</span>
      </button>
    </nav>

    <PlaylistWheel
      :open="wheelOpen"
      :origin-x="wheelOriginX"
      :origin-y="wheelOriginY"
      :playlists="playlists"
      @select="onWheelSelect"
      @cancel="onWheelCancel"
    />
  </div>
</template>

<script setup>
import AdBanner from '@/components/AdBanner.vue'
import PlaylistWheel from '@/components/PlaylistWheel.vue'
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePlayerStore } from '@/stores/player'
import { usePlaylistsStore } from '@/stores/playlists'
import { useAuthStore } from '@/stores/auth'

const router  = useRouter()
const player  = usePlayerStore()
const plStore = usePlaylistsStore()
const auth    = useAuthStore()
const activeId = ref('home')

const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

// ── Random Song ──────────────────────────────────────
const randomSong = ref(null)
const rcGradients = ['#1a0a2e','#0a1a2e','#0a2e1a','#2e1a0a','#1a2e0a','#2e0a1a']
const rcIcons     = ['◈','⊹','◎','⌇','▤','◉']
const rcIdx       = ref(0)
const rcGradient  = computed(() => rcGradients[rcIdx.value % rcGradients.length])
const rcIcon      = computed(() => rcIcons[rcIdx.value % rcIcons.length])

async function pickRandom() {
  try {
    const res  = await fetch(`${BASE_URL}/api/songs/all`)
    const songs = await res.json()
    if (!songs.length) return
    const idx = Math.floor(Math.random() * songs.length)
    randomSong.value = songs[idx]
    rcIdx.value = idx
  } catch {}
}

// ── Top Songs ────────────────────────────────────────
const topSongs = ref([])
const topLoaded = ref(false)

async function loadTopSongs() {
  try {
    // Try global rankings first, fall back to any available country
    const res  = await fetch(`${BASE_URL}/api/radio/global/rankings`)
    const data = await res.json()
    const weeks = Object.keys(data).sort((a, b) => b.localeCompare(a))
    if (weeks.length) {
      topSongs.value = data[weeks[0]].slice(0, 3)
    }
  } catch {}
  topLoaded.value = true
}

async function playTopSong(song) {
  try {
    const res   = await fetch(`${BASE_URL}/api/songs/all`)
    const songs = await res.json()
    const found = songs.find(s => s.id === `u_${song.song_id}`)
    if (found) player.play(found)
  } catch {}
}

const navItems = [
  { id: 'radio',        icon: '⌇',  label: 'Radio' },
  { id: 'search',       icon: '⊹',  label: 'Suche' },
  { id: 'playlists',    icon: '▤',  label: 'Playlists' },
  { id: 'community',    icon: '◎',  label: 'Freunde' },
  { id: 'chats',        icon: '⌲',  label: 'Chats' },
  { id: 'donation',     icon: '€',  label: 'Tip' },
  { id: 'upload',       icon: '↑',  label: 'Upload' },
  { id: 'subscription', icon: '★',  label: 'Abos' },
  { id: 'support',      icon: '⌘',  label: 'Support' },
  { id: 'about',        icon: '◉',  label: 'About' },
]

const bottomItems = [
  { id: 'home',      icon: '⌂', label: 'Home' },
  { id: 'radio',     icon: '⌇', label: 'Radio' },
  { id: 'search',    icon: '⊹', label: 'Suche' },
  { id: 'playlists', icon: '▤', label: 'Listen' },
  { id: 'community', icon: '◎', label: 'Social' },
]

const favPlaylist = { id: 'favorites', name: 'Lieblingssongs', icon: '♡', color: '#ff5a32' }
const playlists = computed(() => [favPlaylist, ...plStore.playlists])

onMounted(() => {
  if (!plStore.playlists.length) plStore.load()
  pickRandom()
  loadTopSongs()
  loadStats()
})

function navigate(item) {
  if (item.id === 'playlists' && didOpenWheel) return
  if (item.id === 'home') { activeId.value = 'home'; return }
  activeId.value = item.id
  router.push(`/${item.id}`)
}

// ── Gimmick Stats ────────────────────────────────────
// ── Stats ─────────────────────────────────────────────
const genres  = ['Electronic', 'Hip-Hop', 'Indie', 'Pop', 'R&B', 'Jazz', 'Rock', 'Ambient', 'Folk', 'Classical', 'Reggae', 'Metal']
const artists = ['Meridon', 'The Midnight', 'Bicep', 'Caribou', 'Four Tet', 'Bonobo', 'Tycho', 'Nils Frahm']
const rand    = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const stats = ref({
  minsWeek:      rand(42, 340),
  streaksWeek:   rand(1, 7),
  songsWeek:     rand(8, 120),
  topArtist:     artists[rand(0, artists.length - 1)],
  countriesHeard:rand(2, 18),
  topGenre:      genres[rand(0, genres.length - 1)],
})

async function loadStats() {
  if (!auth.isLoggedIn) return
  try {
    const res  = await fetch(`${BASE_URL}/api/stats/me`, { headers: { Authorization: `Bearer ${localStorage.getItem('nyujam_token') || ''}` } })
    if (!res.ok) return
    const data = await res.json()
    stats.value = {
      minsWeek:      data.minsWeek      || stats.value.minsWeek,
      streaksWeek:   stats.value.streaksWeek, // no real streak yet — keep gimmick
      songsWeek:     data.streamsWeek   || stats.value.songsWeek,
      topArtist:     stats.value.topArtist,   // no top artist endpoint yet
      countriesHeard:stats.value.countriesHeard,
      topGenre:      data.topGenre      || stats.value.topGenre,
    }
  } catch {}
}
const wheelOpen    = ref(false)
const wheelOriginX = ref(0)
const wheelOriginY = ref(0)
const holdProgress = ref(0)
const HOLD_MS      = 500
let progressRAF    = null
let holdStart      = 0
let didOpenWheel   = false

function onBtnMousedown(e, id) {
  if (id !== 'playlists') return
  didOpenWheel = false
  holdProgress.value = 0
  holdStart = performance.now()
  const pos = e.touches ? e.touches[0] : e
  wheelOriginX.value = pos.clientX
  wheelOriginY.value = pos.clientY
  function tick() {
    const elapsed = performance.now() - holdStart
    holdProgress.value = Math.min(elapsed / HOLD_MS, 1)
    if (holdProgress.value < 1) {
      progressRAF = requestAnimationFrame(tick)
    } else {
      didOpenWheel = true
      wheelOpen.value = true
      holdProgress.value = 0
    }
  }
  progressRAF = requestAnimationFrame(tick)
}
function onBtnMouseup(e, id) {
  cancelAnimationFrame(progressRAF)
  holdProgress.value = 0
  if (!didOpenWheel) navigate({ id })
}
function onBtnMouseleave(id) {
  if (wheelOpen.value) return
  cancelAnimationFrame(progressRAF)
  holdProgress.value = 0
}
function onWheelSelect(id) {
  wheelOpen.value = false
  router.push(`/playlists/${id}`)
}
function onWheelCancel() { wheelOpen.value = false }
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.home {
  height: 100dvh;
  background: #0a0a0f;
  color: #f0ede6;
  font-family: 'DM Sans', sans-serif;
  display: flex;
  overflow: hidden;
  position: relative;
}

.bg-noise {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  background-size: 180px; opacity: 0.6;
}
.bg-glow {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background:
    radial-gradient(ellipse 60% 50% at 15% 40%, rgba(255,90,50,0.07) 0%, transparent 70%),
    radial-gradient(ellipse 50% 60% at 85% 70%, rgba(80,60,255,0.06) 0%, transparent 70%);
}

/* ── Sidebar ── */
.sidebar {
  position: relative; z-index: 10;
  width: 56px;
  background: rgba(240,237,230,0.02);
  border-right: 1px solid rgba(240,237,230,0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px 0;
  flex-shrink: 0;
  gap: 2px;
}
.sidebar-logo {
  font-family: 'Bebas Neue', cursive;
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  color: #ff5a32;
  writing-mode: vertical-rl;
  margin-bottom: 4px;
  user-select: none;
}
.sidebar-home { margin-bottom: 6px; font-size: 1.1rem !important; }
.sidebar-nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  flex: 1;
}
.sidebar-icon {
  width: 38px; height: 38px;
  border-radius: 8px;
  border: none;
  background: none;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: rgba(240,237,230,0.3);
  font-size: 1rem;
  transition: all 0.15s;
  position: relative;
}
.sidebar-icon:hover { background: rgba(255,90,50,0.08); color: rgba(240,237,230,0.7); }
.sidebar-icon.active { background: rgba(255,90,50,0.12); color: #ff5a32; }
.sidebar-icon.active::before {
  content: '';
  position: absolute;
  left: 0; top: 50%;
  transform: translateY(-50%);
  width: 2px; height: 60%;
  background: #ff5a32;
  border-radius: 0 1px 1px 0;
}
.sidebar-profile { margin-top: auto; }
.si-avatar {
  width: 28px; height: 28px; border-radius: 50%;
  background: rgba(255,90,50,0.15);
  border: 1px solid rgba(255,90,50,0.3);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.6rem; font-weight: 700; color: #ff5a32;
  overflow: hidden;
}
.si-avatar-img { width: 100%; height: 100%; object-fit: cover; }

/* ── Main ── */
.main {
  position: relative; z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.25rem 1.25rem 1rem;
  overflow-y: auto;
  gap: 0.75rem;
  padding-bottom: 0;
}

/* Mobile header (hidden on desktop) */
.mobile-header {
  display: none;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}
.mobile-logo {
  font-family: 'Bebas Neue', cursive;
  font-size: 1.8rem;
  letter-spacing: 0.18em;
  color: #f0ede6;
  line-height: 1;
}
.mobile-logo span { color: #ff5a32; }
.mobile-profile {
  width: 34px; height: 34px; border-radius: 50%;
  background: rgba(240,237,230,0.06);
  border: 1px solid rgba(240,237,230,0.12);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  color: rgba(240,237,230,0.4);
  font-size: 1rem;
}

/* ── Hero Radio Card ── */
.hero-card {
  position: relative;
  background: rgba(255,90,50,0.07);
  border: 1px solid rgba(255,90,50,0.2);
  border-radius: 10px;
  padding: 1rem 1.25rem;
  cursor: pointer;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 3px;
  transition: background 0.2s, border-color 0.2s;
  flex-shrink: 0;
}
.hero-card:hover { background: rgba(255,90,50,0.11); border-color: rgba(255,90,50,0.35); }
.hero-live {
  display: flex; align-items: center; gap: 5px;
  font-size: 0.65rem; letter-spacing: 0.15em; text-transform: uppercase;
  color: rgba(255,90,50,0.7);
}
.live-dot {
  width: 6px; height: 6px; border-radius: 50%; background: #ff5a32;
  animation: pulse 1.4s ease infinite;
}
.hero-title {
  font-family: 'Bebas Neue', cursive;
  font-size: 1.5rem; letter-spacing: 0.12em; color: #f0ede6;
}
.hero-sub { font-size: 0.75rem; color: rgba(240,237,230,0.4); }
.hero-arrow {
  position: absolute; right: 1.25rem; top: 50%; transform: translateY(-50%);
  color: rgba(255,90,50,0.5); font-size: 1rem;
  transition: transform 0.2s, color 0.2s;
}
.hero-card:hover .hero-arrow { transform: translateY(-50%) translateX(4px); color: #ff5a32; }

/* ── Nav Grid ── */
.nav-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  flex: 1;
  align-content: start;
  padding-bottom: 1rem;
}
.nav-btn {
  position: relative;
  background: rgba(240,237,230,0.04);
  border: 1px solid rgba(240,237,230,0.07);
  border-radius: 8px;
  padding: 0.7rem 0.9rem;
  cursor: pointer;
  display: flex; align-items: center; gap: 0.6rem;
  transition: background 0.15s, border-color 0.15s;
  opacity: 0; transform: translateY(8px);
  animation: slideUp 0.4s ease forwards;
  animation-delay: var(--delay);
  overflow: hidden;
}
.nav-btn:hover { background: rgba(255,90,50,0.07); border-color: rgba(255,90,50,0.25); }
.nb-icon { font-size: 1rem; color: #ff5a32; opacity: 0.75; flex-shrink: 0; transition: opacity 0.15s; }
.nav-btn:hover .nb-icon { opacity: 1; }
.nb-label {
  font-family: 'Bebas Neue', cursive;
  font-size: 1.05rem; letter-spacing: 0.1em;
  color: rgba(240,237,230,0.8); flex: 1; text-align: left;
}
.nb-arrow { font-size: 0.7rem; color: rgba(240,237,230,0.15); transition: color 0.15s, transform 0.2s; }
.nav-btn:hover .nb-arrow { color: #ff5a32; transform: translateX(3px); }
/* ── Home View ── */
.home-view { display: flex; flex-direction: column; gap: 1.5rem; padding-bottom: 1.5rem; }
.section-label { font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase; color: rgba(240,237,230,0.25); margin-bottom: 0.6rem; font-weight: 500; }
.random-card { display: flex; align-items: center; gap: 0.85rem; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.08); border-radius: 10px; padding: 0.85rem; cursor: pointer; transition: background 0.15s, border-color 0.15s; position: relative; }
.random-card:hover { background: rgba(255,90,50,0.07); border-color: rgba(255,90,50,0.2); }
.rc-cover { width: 52px; height: 52px; border-radius: 7px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.rc-cover-img { width: 100%; height: 100%; object-fit: cover; }
.rc-cover-icon { font-size: 1.3rem; color: rgba(240,237,230,0.3); }
.rc-info { flex: 1; min-width: 0; }
.rc-title { font-size: 0.9rem; font-weight: 500; color: #f0ede6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rc-artist { font-size: 0.75rem; color: rgba(240,237,230,0.4); margin-top: 2px; }
.rc-play { width: 34px; height: 34px; border-radius: 50%; flex-shrink: 0; background: #ff5a32; border: none; color: #fff; font-size: 0.75rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.15s; }
.rc-play:hover { transform: scale(1.08); }
.rc-shuffle { width: 30px; height: 30px; border-radius: 50%; flex-shrink: 0; background: none; border: 1px solid rgba(240,237,230,0.1); color: rgba(240,237,230,0.4); font-size: 1rem; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.15s; }
.rc-shuffle:hover { border-color: rgba(240,237,230,0.3); color: #f0ede6; }
.rc-title-skel { height: 13px; background: rgba(240,237,230,0.07); border-radius: 4px; width: 70%; margin-bottom: 6px; animation: shimmer 1.4s infinite; }
.rc-artist-skel { height: 10px; background: rgba(240,237,230,0.05); border-radius: 4px; width: 45%; animation: shimmer 1.4s infinite 0.2s; }
.top-list { display: flex; flex-direction: column; gap: 4px; }
.top-row { display: flex; align-items: center; gap: 0.75rem; padding: 0.55rem 0.75rem; border-radius: 8px; background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.06); cursor: pointer; transition: background 0.15s; }
.top-row:hover { background: rgba(255,90,50,0.06); border-color: rgba(255,90,50,0.18); }
.top-rank { font-size: 0.7rem; color: rgba(240,237,230,0.2); width: 14px; text-align: right; flex-shrink: 0; }
.top-cover { width: 36px; height: 36px; border-radius: 5px; flex-shrink: 0; background: rgba(240,237,230,0.06); display: flex; align-items: center; justify-content: center; overflow: hidden; }
.top-cover-img { width: 100%; height: 100%; object-fit: cover; }
.top-cover-icon { font-size: 0.9rem; color: rgba(240,237,230,0.25); }
.top-info { flex: 1; min-width: 0; }
.top-title { font-size: 0.82rem; color: #f0ede6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.top-artist { font-size: 0.7rem; color: rgba(240,237,230,0.35); }
.top-pct { font-size: 0.7rem; color: rgba(255,90,50,0.5); flex-shrink: 0; }
.top-row--skel { cursor: default; }
.top-cover--skel { animation: shimmer 1.4s infinite; }
.empty-hint { font-size: 0.78rem; color: rgba(240,237,230,0.2); padding: 0.5rem 0; }
.stats-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; }
.stat-card { background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.07); border-radius: 8px; padding: 0.7rem 0.75rem; display: flex; flex-direction: column; gap: 1px; }
.stat-card--wide { grid-column: span 2; }
.stat-card--fun { align-items: center; justify-content: center; text-align: center; gap: 4px; }
.stat-val { font-family: 'Bebas Neue', cursive; font-size: 1.6rem; color: #f0ede6; line-height: 1; letter-spacing: 0.05em; }
.stat-val-sm { font-size: 0.85rem; font-weight: 500; color: #f0ede6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.stat-unit { font-size: 0.62rem; letter-spacing: 0.1em; text-transform: uppercase; color: #ff5a32; margin-top: -2px; }
.stat-label { font-size: 0.65rem; color: rgba(240,237,230,0.3); margin-top: 2px; }
.stat-emoji { font-size: 1.4rem; line-height: 1; }
.stat-top-artist { display: flex; align-items: center; gap: 0.6rem; }
.sta-icon { font-size: 1.2rem; color: rgba(255,90,50,0.5); flex-shrink: 0; }
@keyframes shimmer { 0%,100%{opacity:1}50%{opacity:0.4} }

.hold-bar {
  position: absolute; bottom: 0; left: 0;
  width: 100%; height: 2px;
  background: linear-gradient(90deg, #ff5a32, #ff8c55);
  transform-origin: left; transform: scaleX(0);
  pointer-events: none;
}

/* ── Bottom Bar ── */
.bottom-bar {
  display: none;
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
  background: rgba(10,10,15,0.97);
  border-top: 1px solid rgba(240,237,230,0.07);
  padding: 8px 0 max(10px, env(safe-area-inset-bottom));
  justify-content: space-around;
  align-items: center;
}
.bb-tab {
  display: flex; flex-direction: column; align-items: center; gap: 3px;
  background: none; border: none; cursor: pointer;
  color: rgba(240,237,230,0.3); font-size: 0.6rem;
  letter-spacing: 0.05em; min-width: 48px;
  transition: color 0.15s;
}
.bb-tab.active { color: #ff5a32; }
.bb-icon { font-size: 1.2rem; line-height: 1; }
.bb-label { font-size: 0.6rem; }
.bb-avatar {
  width: 22px; height: 22px; border-radius: 50%;
  background: rgba(255,90,50,0.15);
  border: 1px solid rgba(255,90,50,0.3);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.55rem; font-weight: 700; color: #ff5a32;
  overflow: hidden;
}

/* ── Keyframes ── */
@keyframes slideUp { to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }

/* ── Mobile ── */
@media (max-width: 600px) {
  .sidebar { display: none; }
  .mobile-header { display: flex; }
  .bottom-bar { display: flex; }
  .main { padding-bottom: calc(60px + env(safe-area-inset-bottom)); }
  .nav-grid { grid-template-columns: 1fr 1fr; }
}
</style>