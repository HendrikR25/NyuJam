import { reactive } from 'vue'

// Shared radio state — RadioView writes, PlayerView reads
// Must be reactive so computed properties in PlayerView update
export const radioState = reactive({
  audio: null,      // the live Audio element
  song:  null,      // current song object
})