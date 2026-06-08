import { defineStore } from 'pinia'
import { ref } from 'vue'

const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

export const usePlaylistsStore = defineStore('playlists', () => {
  const playlists = ref([])
  const loading   = ref(false)
  const error     = ref(null)

  function jsonHeaders() {
    return { 'Content-Type': 'application/json' }
  }

  async function load() {
    try {
      loading.value = true
      const res = await fetch(`${BASE_URL}/api/playlists`, { credentials: 'include' })
      playlists.value = await res.json()
    } catch {
      error.value = 'Server nicht erreichbar'
    } finally {
      loading.value = false
    }
  }

  async function create({ name, icon, color }) {
    const res = await fetch(`${BASE_URL}/api/playlists`, {
      method:      'POST',
      credentials: 'include',
      headers:     jsonHeaders(),
      body:        JSON.stringify({ name, icon, color }),
    })
    if (!res.ok) throw new Error('Erstellen fehlgeschlagen')
    const newPl = await res.json()
    playlists.value.push(newPl)
    return newPl
  }

  async function remove(id) {
    await fetch(`${BASE_URL}/api/playlists/${id}`, {
      method:      'DELETE',
      credentials: 'include',
    })
    playlists.value = playlists.value.filter(p => p.id !== id)
  }

  async function addSong(playlistId, song) {
    const res = await fetch(`${BASE_URL}/api/playlists/${playlistId}/songs`, {
      method:      'POST',
      credentials: 'include',
      headers:     jsonHeaders(),
      body:        JSON.stringify({ songId: String(song.id), name: song.name, artist: song.artist }),
    })
    if (!res.ok) throw new Error('Song bereits vorhanden')
    const updated = await res.json()
    const idx = playlists.value.findIndex(p => p.id === playlistId)
    if (idx !== -1) playlists.value[idx] = updated
    return updated
  }

  async function removeSong(playlistId, songId) {
    await fetch(`${BASE_URL}/api/playlists/${playlistId}/songs/${songId}`, {
      method:      'DELETE',
      credentials: 'include',
    })
    const pl = playlists.value.find(p => p.id === playlistId)
    if (pl) pl.songs = pl.songs.filter(s => s.id !== songId)
  }

  function clear() { playlists.value = [] }

  return { playlists, loading, error, load, create, remove, addSong, removeSong, clear }
})
