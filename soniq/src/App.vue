<script setup lang="ts">
import { RouterView, useRouter } from 'vue-router'
import NowPlayingBar from '@/components/NowPlayingBar.vue'
import AppSidebar    from '@/components/AppSidebar.vue'
import { radioState } from '@/stores/radioState'

const router = useRouter()

// Stop radio audio whenever user navigates away from radio/player context
router.afterEach((to, from) => {
  const radioPages = ['/radio', '/player']
  const leavingRadioContext = radioPages.includes(from.path) && !radioPages.includes(to.path)
  if (leavingRadioContext && radioState.audio) {
    radioState.audio.pause()
    radioState.audio       = null
    radioState.song        = null
    radioState.isRadioMode = false
  }
})
</script>

<template>
  <div class="app-shell">
    <AppSidebar />
    <div class="page-wrap">
      <RouterView />
    </div>
  </div>
  <NowPlayingBar />
</template>

<style>
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.app-shell {
  display: flex;
  min-height: 100dvh;
  background: #0a0a0f;
}

.page-wrap {
  flex: 1;
  min-width: 0;
  overflow-x: hidden;
}

/* On mobile: leave room for the fixed bottom bar */
@media (max-width: 600px) {
  .page-wrap {
    padding-bottom: calc(60px + env(safe-area-inset-bottom));
  }
}
</style>
