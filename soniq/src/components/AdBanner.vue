<template>
  <div class="ad-banner-wrap" v-if="false">
    <!-- AdSense disabled until approved -->
  </div>
</template>

<script setup>
import { onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const props = defineProps({
  adSlot:     { type: String,  required: true },
  slotHeight: { type: Number,  default: 90 },
})

const auth      = useAuthStore()
const adClient  = 'ca-pub-9850269345136321'
const adSlotDefault = '1918440727'

// Later: check if user has active subscription
const isSubscriber = computed(() => auth.user?.isSubscriber === true)

onMounted(() => {
  try {
    if (window.adsbygoogle) {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    }
  } catch (e) { /* AdSense not loaded yet */ }
})
</script>

<style scoped>
.ad-banner-wrap {
  position: relative;
  width: 100%;
  max-width: 728px;
  min-height: 90px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(240,237,230,0.07);
  padding: 0.75rem 0;
  margin-bottom: 1rem;
}
.ad-label {
  position: absolute;
  top: 4px;
  left: 0;
  font-size: 0.6rem;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: rgba(240,237,230,0.2);
  font-family: 'DM Sans', sans-serif;
}
.adsbygoogle {
  max-width: 728px;
}
</style>