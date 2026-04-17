<script setup lang="ts">
import { watch } from 'vue'
import { RouterView, useRouter } from 'vue-router'
import NowPlayingBar from '@/components/NowPlayingBar.vue'
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
  <RouterView />
  <NowPlayingBar />
</template>