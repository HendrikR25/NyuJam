<template>
  <!-- Desktop sidebar -->
  <aside class="sidebar">
    <div class="sidebar-logo">NYJ</div>
    <button class="sidebar-icon sidebar-home" :class="{ active: route.path === '/' }" title="Home" @click="router.push('/')">
      <span class="si-icon">⌂</span>
    </button>

    <nav class="sidebar-nav">
      <button
        v-for="item in navItems"
        :key="item.id"
        class="sidebar-icon"
        :class="{ active: isActive(item.id) }"
        :title="item.label"
        @click="router.push('/' + item.id)"
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

  <!-- Mobile bottom bar -->
  <nav class="bottom-bar">
    <button
      v-for="item in bottomItems"
      :key="item.id"
      class="bb-tab"
      :class="{ active: isActive(item.id) }"
      @click="router.push(item.id === 'home' ? '/' : '/' + item.id)"
    >
      <span class="bb-icon">{{ item.icon }}</span>
      <span class="bb-label">{{ item.label }}</span>
    </button>
    <button class="bb-tab" :class="{ active: route.path === '/profile' }" @click="router.push('/profile')">
      <div class="bb-avatar" v-if="auth.user">
        <img v-if="auth.user.avatar" :src="auth.user.avatar" class="si-avatar-img" />
        <span v-else>{{ auth.user.username.slice(0,1).toUpperCase() }}</span>
      </div>
      <span v-else class="bb-icon">◎</span>
      <span class="bb-label">Profil</span>
    </button>
  </nav>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

const navItems = [
  { id: 'radio',        icon: '⌇', label: 'Radio' },
  { id: 'search',       icon: '⊹', label: 'Suche' },
  { id: 'playlists',    icon: '▤', label: 'Playlists' },
  { id: 'community',    icon: '◎', label: 'Freunde' },
  { id: 'chats',        icon: '⌲', label: 'Chats' },
  { id: 'donation',     icon: '€', label: 'Tip' },
  { id: 'upload',       icon: '↑', label: 'Upload' },
  { id: 'subscription', icon: '★', label: 'Abos' },
  { id: 'support',      icon: '⌘', label: 'Support' },
  { id: 'about',        icon: '◉', label: 'About' },
]

const bottomItems = [
  { id: 'home',      icon: '⌂', label: 'Home' },
  { id: 'radio',     icon: '⌇', label: 'Radio' },
  { id: 'search',    icon: '⊹', label: 'Suche' },
  { id: 'playlists', icon: '▤', label: 'Listen' },
  { id: 'community', icon: '◎', label: 'Social' },
]

function isActive(id) {
  if (id === 'home') return route.path === '/'
  return route.path.startsWith('/' + id)
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');

/* ── Desktop Sidebar ── */
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
  min-height: 100dvh;
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
.si-icon { line-height: 1; }

/* ── Mobile Bottom Bar ── */
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
  font-family: 'DM Sans', sans-serif;
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

@media (max-width: 600px) {
  .sidebar { display: none; }
  .bottom-bar { display: flex; }
}
</style>
