// Shared radio state — RadioView writes, PlayerView reads
export const radioState = {
  audio: null,      // the live Audio element
  song:  null,      // current song object
}