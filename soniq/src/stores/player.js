import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const BASE_URL = 'http://192.168.178.58:3001'

export const usePlayerStore = defineStore('player', () => {

  // ── State ──────────────────────────────────────────────
  const songs       = ref([])
  const currentSong = ref(null)
  const isPlaying   = ref(false)
  const currentTime = ref(0)
  const duration    = ref(0)
  const isLoading   = ref(false)
  const error       = ref(null)
  const volume      = ref(1)
  const isLiked     = ref(false)
  const likedSongs  = ref([])   // reactive list from server
  const fromRoute   = ref('/')

  // ── Getters ────────────────────────────────────────────
  const progressPct  = computed(() => duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0)
  const currentIndex = computed(() => songs.value.findIndex(s => s.id === currentSong.value?.id))
  const hasNext      = computed(() => currentIndex.value < songs.value.length - 1)
  const hasPrev      = computed(() => currentIndex.value > 0)

  // ── Audio ──────────────────────────────────────────────
  let _audio = null

  function getAudio() {
    if (!_audio) {
      _audio = new Audio()
      _audio.volume = volume.value
      _audio.addEventListener('timeupdate',      () => { currentTime.value = _audio.currentTime })
      _audio.addEventListener('loadedmetadata',  () => { duration.value    = _audio.duration })
      _audio.addEventListener('canplay',         () => { isLoading.value   = false })
      _audio.addEventListener('ended',           () => { isPlaying.value   = false; next() })
      _audio.addEventListener('error',           () => { error.value = 'Wiedergabe fehlgeschlagen.'; isPlaying.value = false; isLoading.value = false })
    }
    return _audio
  }

  // ── Songs ──────────────────────────────────────────────
  async function loadSongs() {
    try {
      isLoading.value = true
      error.value     = null
      const res       = await fetch(`${BASE_URL}/api/songs`)
      if (!res.ok) throw new Error()
      songs.value = await res.json()
    } catch {
      error.value = 'Musik-Server nicht erreichbar. Läuft er auf Port 3001?'
    } finally {
      isLoading.value = false
    }
  }

  function play(song) {
    const audio       = getAudio()
    currentSong.value = song
    isPlaying.value   = false
    isLoading.value   = true
    error.value       = null
    currentTime.value = 0
    duration.value    = 0
    // sync liked state
    isLiked.value     = likedSongs.value.some(f => String(f.id) === String(song.id))
    audio.src         = song.url
    audio.load()

    const tryPlay = () => {
      audio.play()
        .then(() => { isPlaying.value = true; isLoading.value = false })
        .catch(e => {
          console.error('Playback error:', e, 'URL:', song.url)
          error.value     = 'Wiedergabe fehlgeschlagen. Prüfe die Serververbindung.'
          isPlaying.value = false
          isLoading.value = false
        })
    }
    audio.addEventListener('canplay', tryPlay, { once: true })
    // Fallback timeout
    setTimeout(() => { if (isLoading.value) { tryPlay(); } }, 3000)
  }

  function togglePlay() {
    const audio = getAudio()
    if (!currentSong.value) { if (songs.value.length) play(songs.value[0]); return }
    if (isPlaying.value) { audio.pause(); isPlaying.value = false }
    else                 { audio.play().then(() => { isPlaying.value = true }) }
  }

  function seek(time) {
    const audio = getAudio()
    audio.currentTime = time
    currentTime.value = time
  }

  function seekByPct(pct) { seek((pct / 100) * duration.value) }

  function next() { if (hasNext.value) play(songs.value[currentIndex.value + 1]) }

  function prev() {
    const audio = getAudio()
    if (audio.currentTime > 3) seek(0)
    else if (hasPrev.value) play(songs.value[currentIndex.value - 1])
  }

  function setVolume(v) { volume.value = v; if (_audio) _audio.volume = v }

  function formatTime(s) {
    if (!s || isNaN(s)) return '0:00'
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  // ── Favorites ──────────────────────────────────────────
  function authHeader() {
    const token = localStorage.getItem('nyujam_token') || ''
    return token ? { 'Authorization': `Bearer ${token}` } : {}
  }

  async function loadFavorites() {
    try {
      const res = await fetch(`${BASE_URL}/api/favorites`, { headers: authHeader() })
      if (!res.ok) return
      likedSongs.value = await res.json()
      if (currentSong.value) {
        isLiked.value = likedSongs.value.some(f => String(f.id) === String(currentSong.value.id))
      }
    } catch { /* server offline */ }
  }

  async function toggleLike() {
    if (!currentSong.value) return
    const song = currentSong.value

    if (isLiked.value) {
      try {
        await fetch(`${BASE_URL}/api/favorites/${song.id}`, {
          method: 'DELETE', headers: authHeader()
        })
      } catch { /* offline */ }
      const idx = likedSongs.value.findIndex(f => String(f.id) === String(song.id))
      if (idx !== -1) likedSongs.value.splice(idx, 1)
      isLiked.value = false
    } else {
      try {
        await fetch(`${BASE_URL}/api/favorites`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', ...authHeader() },
          body:    JSON.stringify({ id: String(song.id), name: song.name, artist: song.artist }),
        })
      } catch { /* offline */ }
      if (!likedSongs.value.some(f => String(f.id) === String(song.id))) {
        likedSongs.value.push({ id: String(song.id), name: song.name, artist: song.artist })
      }
      isLiked.value = true
    }
  }

  return {
    // state
    songs, currentSong, isPlaying, currentTime, duration,
    isLoading, error, volume, isLiked, likedSongs, fromRoute,
    // getters
    progressPct, currentIndex, hasNext, hasPrev,
    // actions
    loadSongs, loadFavorites, play, togglePlay,
    seek, seekByPct, next, prev, setVolume, toggleLike, formatTime,
  }
})