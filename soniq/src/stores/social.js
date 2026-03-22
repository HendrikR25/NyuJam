import { defineStore } from 'pinia'
import { ref } from 'vue'

const BASE_URL = 'http://192.168.178.58:3001'

export const useSocialStore = defineStore('social', () => {
  const friends     = ref([])
  const pending     = ref([])
  const groups      = ref([])
  const convos      = ref({ dms: [], groups: [] })
  const messages    = ref([])   // current open conversation
  const activeChatId = ref(null)
  const loading     = ref(false)
  const error       = ref(null)

  function authHeader(extra = {}) {
    const token = localStorage.getItem('nyujam_token') || ''
    return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra }
  }

  // ── Friends ──────────────────────────────────────────
  async function loadFriends() {
    try {
      const res = await fetch(`${BASE_URL}/api/friends`, { headers: authHeader() })
      const data = await res.json()
      friends.value = data.friends ?? []
      pending.value = data.pending ?? []
    } catch { error.value = 'Server nicht erreichbar' }
  }

  async function sendFriendRequest(username) {
    const res = await fetch(`${BASE_URL}/api/friends/request`, {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({ username }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return true
  }

  async function respondToRequest(friendshipId, action) {
    await fetch(`${BASE_URL}/api/friends/${friendshipId}/respond`, {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({ action }),
    })
    await loadFriends()
  }

  async function removeFriend(userId) {
    await fetch(`${BASE_URL}/api/friends/${userId}`, { method: 'DELETE', headers: authHeader() })
    friends.value = friends.value.filter(f => f.id !== userId)
  }

  // ── Groups ───────────────────────────────────────────
  async function loadGroups() {
    try {
      const res = await fetch(`${BASE_URL}/api/groups`, { headers: authHeader() })
      groups.value = await res.json()
    } catch { error.value = 'Server nicht erreichbar' }
  }

  async function createGroup({ name, icon, color }) {
    const res = await fetch(`${BASE_URL}/api/groups`, {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({ name, icon, color }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    groups.value.push(data)
    return data
  }

  async function joinGroup(name) {
    const res = await fetch(`${BASE_URL}/api/groups/join`, {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({ name }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    groups.value.push(data)
    return data
  }

  async function leaveGroup(id) {
    await fetch(`${BASE_URL}/api/groups/${id}/leave`, { method: 'DELETE', headers: authHeader() })
    groups.value = groups.value.filter(g => g.id !== id)
  }

  // ── Messages ─────────────────────────────────────────
  async function loadConversations() {
    try {
      const res = await fetch(`${BASE_URL}/api/conversations`, { headers: authHeader() })
      convos.value = await res.json()
    } catch { error.value = 'Server nicht erreichbar' }
  }

  async function loadMessages(targetId) {
    activeChatId.value = targetId
    try {
      const res = await fetch(`${BASE_URL}/api/messages/${targetId}`, { headers: authHeader() })
      messages.value = await res.json()
    } catch { messages.value = [] }
  }

  async function sendMessage({ toId, groupId, text, songId, songName, songArtist }) {
    const res = await fetch(`${BASE_URL}/api/messages`, {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({ toId, groupId, text, songId, songName, songArtist }),
    })
    const msg = await res.json()
    if (res.ok) {
      messages.value.push(msg)
      await loadConversations()
    }
    return msg
  }

  async function pollMessages() {
    if (!activeChatId.value) return
    await loadMessages(activeChatId.value)
  }

  function clear() {
    friends.value = []; pending.value = []; groups.value = []
    convos.value = { dms: [], groups: [] }; messages.value = []
  }

  return {
    friends, pending, groups, convos, messages, activeChatId, loading, error,
    loadFriends, sendFriendRequest, respondToRequest, removeFriend,
    loadGroups, createGroup, joinGroup, leaveGroup,
    loadConversations, loadMessages, sendMessage, pollMessages, clear,
  }
})