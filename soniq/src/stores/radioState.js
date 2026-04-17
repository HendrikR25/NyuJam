import { reactive } from 'vue'

// Shared radio state — RadioView writes, PlayerView reads
export const radioState = reactive({
  audio:       null,   // the live Audio element
  song:        null,   // current song object
  isRadioMode: false,  // true when player was opened from radio
})