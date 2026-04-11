<template>
  <div class="song-menu-wrap" ref="wrapRef" @click.stop>
    <button class="song-menu-btn" @click.stop="toggle" :title="'Mehr Optionen'">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/>
      </svg>
    </button>

    <Teleport to="body">
      <transition name="menu-pop">
        <div class="song-menu" v-if="open" :style="menuStyle" @click.stop>

          <!-- Zu Lieblingssongs -->
          <button class="sm-item" @click="doFavorite">
            <svg width="14" height="14" viewBox="0 0 24 24" :fill="isFavorite ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
            <span>{{ isFavorite ? 'Aus Lieblingssongs' : 'Zu Lieblingssongs' }}</span>
          </button>

          <!-- Zu Playlist -->
          <button class="sm-item" @click="showPlSub = !showPlSub">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            <span>Zu Playlist</span>
            <span class="sm-arrow" :class="{ open: showPlSub }">›</span>
          </button>
          <transition name="sub-expand">
            <div class="sm-sub" v-if="showPlSub">
              <div class="sm-sub-empty" v-if="!playlists.length">Keine Playlists</div>
              <button v-for="pl in playlists" :key="pl.id" class="sm-sub-item" @click="doAddToPlaylist(pl)">
                <span class="sm-sub-icon" :style="{ background: pl.color + '33' }">{{ pl.icon }}</span>
                <span>{{ pl.name }}</span>
              </button>
              <div class="sm-sub-divider"></div>
              <button class="sm-sub-item sm-sub-item--new" @click="doCreatePlaylist">
                <span class="sm-sub-icon" style="background:rgba(91,106,255,0.2)">+</span>
                <span>Neue Playlist</span>
              </button>
            </div>
          </transition>

          <div class="sm-divider"></div>

          <!-- Zum Künstler -->
          <button class="sm-item" @click="doGoToArtist">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span>Zum Künstler</span>
          </button>

          <!-- Admin / Owner -->
          <template v-if="canManage">
            <div class="sm-divider"></div>
            <button class="sm-item" @click="doEdit">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              <span>Titel bearbeiten</span>
            </button>
            <button class="sm-item sm-item--danger" @click="doDelete">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
              <span>Song löschen</span>
            </button>
          </template>

        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore }      from '@/stores/auth'
import { usePlayerStore }    from '@/stores/player'
import { usePlaylistsStore } from '@/stores/playlists'

const props = defineProps({
  song: { type: Object, required: true },
})
const emit = defineEmits(['feedback', 'deleted', 'edit'])

const router   = useRouter()
const auth     = useAuthStore()
const player   = usePlayerStore()
const plStore  = usePlaylistsStore()

const open        = ref(false)
const showPlSub   = ref(false)
const showNewPl   = ref(false)
const newPlName   = ref('')
const wrapRef     = ref(null)
const menuStyle   = ref({})
const menuId      = Math.random().toString(36)

const playlists  = computed(() => plStore.playlists)
const isFavorite = computed(() => player.likedSongs.some(s => String(s.id) === String(props.song?.id)))
const canManage  = computed(() => {
  if (!auth.isLoggedIn || !props.song) return false
  if (!String(props.song.id).startsWith('u_')) return false
  return auth.user?.is_admin === true || auth.user?.username?.toLowerCase() === props.song.artist?.toLowerCase()
})

function toggle() {
  if (!open.value) {
    // Close all other menus
    window.dispatchEvent(new CustomEvent('nyujam-menu-open', { detail: menuId }))
    const btn = wrapRef.value?.querySelector('.song-menu-btn')
    if (btn) {
      const rect = btn.getBoundingClientRect()
      const menuHeight = 250
      const spaceBelow = window.innerHeight - rect.bottom
      const top = spaceBelow < menuHeight ? rect.top - menuHeight - 4 : rect.bottom + 4
      menuStyle.value = {
        top:  `${top}px`,
        left: `${rect.right - 200}px`,
      }
    }
  }
  open.value = !open.value
  if (!open.value) showPlSub.value = false
  if (open.value && !plStore.playlists.length) plStore.load()
}

function close() { open.value = false; showPlSub.value = false }

function onClickOutside(e) {
  if (wrapRef.value && wrapRef.value.contains(e.target)) return
  const menu = document.querySelector('.song-menu')
  if (menu && menu.contains(e.target)) return
  close()
}

function onOtherMenuOpen(e) {
  if (e.detail !== menuId) close()
}

onMounted(() => {
  document.addEventListener('click', onClickOutside)
  window.addEventListener('nyujam-menu-open', onOtherMenuOpen)
})
onUnmounted(() => {
  document.removeEventListener('click', onClickOutside)
  window.removeEventListener('nyujam-menu-open', onOtherMenuOpen)
})

function doFavorite() {
  close()
  player.toggleLike(props.song)
  emit('feedback', isFavorite.value ? 'Entfernt' : '♥ Zu Lieblingssongs')
}

function doAddToPlaylist(pl) {
  close()
  plStore.addSong(pl.id, props.song)
    .then(() => emit('feedback', `✓ Zu „${pl.name}" hinzugefügt`))
    .catch(() => emit('feedback', 'Bereits in dieser Playlist'))
}

async function doCreatePlaylist() {
  const name = prompt('Name der neuen Playlist:')
  if (!name?.trim()) return
  close()
  try {
    const pl = await plStore.create({ name: name.trim() })
    if (pl) {
      await plStore.addSong(pl.id, props.song)
      emit('feedback', `✓ Playlist „${name.trim()}" erstellt`)
    }
  } catch { emit('feedback', '⚠ Fehler beim Erstellen') }
}

function doGoToArtist() {
  close()
  router.push(`/artist/${encodeURIComponent(props.song.artist)}`)
}

function doEdit() {
  close()
  emit('edit', props.song)
}

async function doDelete() {
  close()
  if (!confirm(`„${props.song.name}" wirklich löschen?`)) return
  try {
    await player.deleteSong(props.song.id)
    emit('deleted', props.song.id)
    emit('feedback', '✓ Song gelöscht')
  } catch (e) {
    emit('feedback', `⚠ ${e.message}`)
  }
}
</script>

<style scoped>
.song-menu-wrap { position: relative; flex-shrink: 0; }
.song-menu-btn {
  background: none; border: none; cursor: pointer;
  color: rgba(240,237,230,0.3); padding: 0.3rem;
  display: flex; align-items: center; justify-content: center;
  border-radius: 4px; transition: color 0.2s, background 0.2s;
}
.song-menu-btn:hover { color: #f0ede6; background: rgba(240,237,230,0.08); }
.menu-pop-enter-active, .menu-pop-leave-active { transition: opacity 0.15s, transform 0.15s; }
.menu-pop-enter-from, .menu-pop-leave-to { opacity: 0; transform: scale(0.95) translateY(-4px); }
</style>

<style>
/* Global — needed because menu is teleported to body */
.song-menu {
  position: fixed;
  background: #0e0e1a; border: 1px solid rgba(240,237,230,0.15);
  border-radius: 8px; padding: 0.35rem; min-width: 200px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.9); z-index: 9999;
  font-family: 'DM Sans', sans-serif;
}
.sm-item {
  width: 100%; display: flex; align-items: center; gap: 0.65rem;
  background: none; border: none; cursor: pointer;
  padding: 0.55rem 0.75rem; border-radius: 4px;
  color: rgba(240,237,230,0.55); font-family: 'DM Sans', sans-serif;
  font-size: 0.82rem; text-align: left; transition: background 0.15s, color 0.15s;
}
.sm-item:hover { background: rgba(240,237,230,0.06); color: #f0ede6; }
.sm-item--danger { color: rgba(255,90,50,0.6); }
.sm-item--danger:hover { background: rgba(255,90,50,0.08); color: #ff5a32; }
.sm-arrow { margin-left: auto; transition: transform 0.2s; font-size: 1rem; }
.sm-arrow.open { transform: rotate(90deg); }
.sm-divider { height: 1px; background: rgba(240,237,230,0.07); margin: 0.3rem 0; }
.sm-sub { padding: 0.2rem 0 0.2rem 0.5rem; }
.sm-sub-empty { font-size: 0.72rem; color: rgba(240,237,230,0.25); padding: 0.4rem 0.75rem; }
.sm-sub-item {
  width: 100%; display: flex; align-items: center; gap: 0.5rem;
  background: none; border: none; cursor: pointer;
  padding: 0.4rem 0.75rem; border-radius: 4px;
  color: rgba(240,237,230,0.5); font-family: 'DM Sans', sans-serif;
  font-size: 0.78rem; text-align: left; transition: background 0.15s;
}
.sm-sub-item:hover { background: rgba(240,237,230,0.06); color: #f0ede6; }
.sm-sub-icon { width: 20px; height: 20px; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; flex-shrink: 0; }
.sm-sub-divider { height: 1px; background: rgba(240,237,230,0.07); margin: 0.2rem 0; }
.sm-sub-item--new { color: rgba(91,106,255,0.8) !important; }
.sm-sub-item--new:hover { color: #5b6aff !important; background: rgba(91,106,255,0.08) !important; }
.sub-expand-enter-active, .sub-expand-leave-active { transition: opacity 0.2s, max-height 0.2s; max-height: 300px; overflow: hidden; }
.sub-expand-enter-from, .sub-expand-leave-to { opacity: 0; max-height: 0; }
</style>