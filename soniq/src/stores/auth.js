import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

export const useAuthStore = defineStore('auth', () => {
  const user    = ref(JSON.parse(localStorage.getItem('nyujam_user') || 'null'))
  const loading = ref(false)
  const error   = ref(null)

  const isLoggedIn = computed(() => !!user.value)

  function persist() {
    localStorage.setItem('nyujam_user', JSON.stringify(user.value))
  }

  function clearSession() {
    user.value = null
    localStorage.removeItem('nyujam_user')
    localStorage.removeItem('nyujam_token') // clean up legacy key if present
  }

  // Validate session cookie on startup — auto-logout if cookie is gone/invalid
  if (user.value) {
    fetch(`${BASE_URL}/api/auth/me`, { credentials: 'include' })
      .then(res => { if (!res.ok) clearSession() })
      .catch(() => {})
  }

  async function register({ username, email, password }) {
    loading.value = true; error.value = null
    try {
      const res  = await fetch(`${BASE_URL}/api/auth/register`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ username, email, password }),
      })
      const data = await res.json()
      if (!res.ok) { error.value = data.error; return false }
      if (data.needsVerification) return 'verify'
      user.value = data.user
      persist()
      return true
    } catch { error.value = 'Server nicht erreichbar'; return false }
    finally   { loading.value = false }
  }

  async function login({ identifier, password }) {
    loading.value = true; error.value = null
    try {
      const res  = await fetch(`${BASE_URL}/api/auth/login`, {
        method:      'POST',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ identifier, password }),
      })
      const data = await res.json()
      if (!res.ok) { error.value = data.error; return false }
      user.value = data.user
      persist()
      return true
    } catch { error.value = 'Server nicht erreichbar'; return false }
    finally   { loading.value = false }
  }

  async function updateProfile({ bio, isPublic, avatar }) {
    loading.value = true; error.value = null
    try {
      const res  = await fetch(`${BASE_URL}/api/auth/profile`, {
        method:      'PATCH',
        credentials: 'include',
        headers:     { 'Content-Type': 'application/json' },
        body:        JSON.stringify({ bio, isPublic, avatar }),
      })
      const data = await res.json()
      if (!res.ok) { error.value = data.error; return false }
      user.value = data.user
      persist()
      return true
    } catch { error.value = 'Server nicht erreichbar'; return false }
    finally   { loading.value = false }
  }

  async function logout() {
    await fetch(`${BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {})
    clearSession()
    import('@/stores/playlists').then(m => m.usePlaylistsStore().clear())
  }

  return { user, loading, error, isLoggedIn, register, login, updateProfile, logout }
})
