<template>
  <div class="nav-bar">
    <button class="nav-btn nav-btn--back" @click="onBack">
      ← {{ backLabel }}
    </button>
    <button class="nav-btn nav-btn--home" @click="router.push('/')" title="Home">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
      </svg>
      Home
    </button>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const props = defineProps({
  backLabel: { type: String, default: 'Zurück' },
  backTo:    { type: String, default: null },
})

const router = useRouter()

function onBack() {
  if (props.backTo) router.push(props.backTo)
  else              router.back()
}
</script>

<style scoped>
.nav-bar {
  position: relative; z-index: 1;
  align-self: flex-start;
  display: flex; align-items: center; gap: 0.5rem;
  margin-bottom: 1.5rem;
}
.nav-btn {
  display: flex; align-items: center; gap: 0.35rem;
  background: none; border: none; cursor: pointer;
  font-family: 'DM Sans', sans-serif;
  font-size: 0.78rem; letter-spacing: 0.1em;
  border-radius: 4px;
  transition: color 0.2s, background 0.2s;
}
.nav-btn--back {
  color: rgba(240,237,230,0.35);
  padding: 0.35rem 0.5rem 0.35rem 0;
}
.nav-btn--back:hover { color: #ff5a32; }
.nav-btn--home {
  color: rgba(240,237,230,0.25);
  background: rgba(240,237,230,0.04);
  border: 1px solid rgba(240,237,230,0.08);
  padding: 0.3rem 0.65rem;
}
.nav-btn--home:hover {
  color: #f0ede6;
  background: rgba(240,237,230,0.08);
  border-color: rgba(240,237,230,0.15);
}
</style>