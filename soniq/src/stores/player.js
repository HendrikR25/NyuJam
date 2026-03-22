import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const BASE_URL = 'http://localhost:3001'

export const usePlayerStore = defineStore('player', () => {
  // ── State ──────────────────────────────────────────
  const songs        = ref([])
  const currentSong  = ref(null)
  const isPlaying    = ref(false)
  const currentTime  = ref(0)
  const duration     = ref(0)
  const isLoading    = ref(false)
  const error        = ref(null)
  const volume       = ref(1)
  const isLiked      = ref(false)
  const likedSongs   = ref([])   // full list from server
  const fromRoute    = ref('/')

  async function loadFavorites() {
    try {
      const res = await fetch(`${BASE_URL}/api/favorites`)
      likedSongs.value = await res.json()
    } catch { /* server offline */ }
  }

  function isSongLiked(song) {
    return likedSongs.value.some(f => String(f.id) === String(song?.id))
  }

  async function toggleLike() {
    if (!currentSong.value) return
    const song = currentSong.value
    const liked = isSongLiked(song)
    if (liked) {
      await fetch(`${BASE_URL}/api/favorites/${song.id}`, { method: 'DELETE' })
      likedSongs.value = likedSongs.value.filter(f => String(f.id) !== String(song.id))
      isLiked.value = false
    } else {
      await fetch(`${BASE_URL}/api/favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: String(song.id), name: song.name, artist: song.artist }),
      })
      likedSongs.value.push({ id: String(song.id), name: song.name, artist: song.artist })
      isLiked.value = true
    }
  }

  // internal Audio instance — one global instance
  let _audio = null

  function getAudio() {
    if (!_audio) {
      _audio = new Audio()
      _audio.volume = volume.value

      _audio.addEventListener('timeupdate', () => {
        currentTime.value = _audio.currentTime
      })
      _audio.addEventListener('loadedmetadata', () => {
        duration.value = _audio.duration
      })
      _audio.addEventListener('ended', () => {
        isPlaying.value = false
        next()
      })
      _audio.addEventListener('error', () => {
        error.value   = 'Fehler beim Laden des Songs.'
        isPlaying.value = false
        isLoading.value = false
      })
      _audio.addEventListener('canplay', () => {
        isLoading.value = false
      })
    }
    return _audio
  }

  // ── Getters ────────────────────────────────────────
  const progressPct = computed(() =>
    duration.value > 0 ? (currentTime.value / duration.value) * 100 : 0
  )
  const currentIndex = computed(() =>
    songs.value.findIndex(s => s.id === currentSong.value?.id)
  )
  const hasNext = computed(() => currentIndex.value < songs.value.length - 1)
  const hasPrev = computed(() => currentIndex.value > 0)

  // ── Actions ────────────────────────────────────────
  async function loadSongs() {
    try {
      isLoading.value = true
      error.value     = null
      const res       = await fetch(`${BASE_URL}/api/songs`)
      if (!res.ok) throw new Error('Server nicht erreichbar')
      songs.value     = await res.json()
    } catch (e) {
      error.value = 'Musik-Server nicht erreichbar. Läuft er auf Port 3001?'
    } finally {
      isLoading.value = false
    }
  }

  function play(song) {
    const audio      = getAudio()
    currentSong.value = song
    isPlaying.value  = false
    isLoading.value  = true
    isLiked.value    = isSongLiked(song)
    error.value      = null
    currentTime.value = 0
    duration.value   = 0
    audio.src        = song.url
    audio.load()
    audio.play().then(() => {
      isPlaying.value = true
    }).catch(e => {
      error.value     = 'Wiedergabe fehlgeschlagen.'
      isPlaying.value = false
      isLoading.value = false
    })
  }

  function togglePlay() {
    const audio = getAudio()
    if (!currentSong.value) {
      if (songs.value.length) play(songs.value[0])
      return
    }
    if (isPlaying.value) {
      audio.pause()
      isPlaying.value = false
    } else {
      audio.play().then(() => { isPlaying.value = true })
    }
  }

  function seek(time) {
    const audio       = getAudio()
    audio.currentTime = time
    currentTime.value = time
  }

  function seekByPct(pct) {
    seek((pct / 100) * duration.value)
  }

  function next() {
    if (hasNext.value) play(songs.value[currentIndex.value + 1])
  }

  function prev() {
    const audio = getAudio()
    // if more than 3s in: restart; else go to prev
    if (audio.currentTime > 3) {
      seek(0)
    } else if (hasPrev.value) {
      play(songs.value[currentIndex.value - 1])
    }
  }

  function setVolume(v) {
    volume.value        = v
    if (_audio) _audio.volume = v
  }

  function toggleLike() {
    isLiked.value = !isLiked.value
  }

  function formatTime(s) {
    if (!s || isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    const sec = String(Math.floor(s % 60)).padStart(2, '0')
    return `${m}:${sec}`
  }

  return {
    // state
    songs, currentSong, isPlaying, currentTime, duration,
    isLoading, error, volume, isLiked, likedSongs, fromRoute,
    // getters
    progressPct, currentIndex, hasNext, hasPrev,
    // actions
    loadSongs, loadFavorites, play, togglePlay, seek, seekByPct,
    next, prev, setVolume, toggleLike, isSongLiked, formatTime,
  }
})