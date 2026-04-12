<template>
  <div class="datenschutz-page">
    <div class="bg-noise"></div>
    <NavBar back-to="/about" />
    <div class="content" v-html="htmlContent"></div>
  </div>
</template>

<script setup>
import NavBar from '@/components/NavBar.vue'
import { ref, onMounted } from 'vue'

const htmlContent = ref('<p style="opacity:0.4;font-size:0.85rem;font-family:sans-serif">Lädt...</p>')

onMounted(async () => {
  try {
    const res = await fetch('/datenschutz-content.html')
    if (!res.ok) throw new Error()
    htmlContent.value = await res.text()
  } catch {
    htmlContent.value = '<p>Datenschutzerklärung konnte nicht geladen werden.</p>'
  }
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.datenschutz-page { min-height: 100vh; background: #0a0a0f; color: #f0ede6; font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; align-items: center; padding: 0 1.5rem 4rem; position: relative; }
.bg-noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size: 180px; opacity: 0.6; }
.content { position: relative; z-index: 1; width: 100%; max-width: 680px; }
</style>

<style>
.datenschutz-page .content h1 { font-family: 'Bebas Neue', cursive; font-size: 2.2rem; letter-spacing: 0.2em; margin-bottom: 1.5rem; color: #f0ede6; }
.datenschutz-page .content h2 { font-family: 'Bebas Neue', cursive; font-size: 1.05rem; letter-spacing: 0.15em; color: rgba(240,237,230,0.55); margin: 2rem 0 0.75rem; padding-top: 1rem; border-top: 1px solid rgba(240,237,230,0.07); }
.datenschutz-page .content h3 { font-size: 0.85rem; font-weight: 600; color: rgba(240,237,230,0.45); margin: 1rem 0 0.5rem; }
.datenschutz-page .content p { font-size: 0.82rem; color: rgba(240,237,230,0.6); line-height: 1.75; margin-bottom: 0.65rem; }
.datenschutz-page .content ul { padding-left: 1.5rem; margin-bottom: 0.75rem; }
.datenschutz-page .content ul.index { list-style: none; padding-left: 0; display: flex; flex-direction: column; gap: 0.25rem; background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.07); border-radius: 6px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; }
.datenschutz-page .content ul.glossary { list-style: none; padding-left: 0; display: flex; flex-direction: column; gap: 0.75rem; }
.datenschutz-page .content li { font-size: 0.82rem; color: rgba(240,237,230,0.55); line-height: 1.65; margin-bottom: 0.25rem; }
.datenschutz-page .content ul.index li, .datenschutz-page .content ul.glossary li { margin-bottom: 0; }
.datenschutz-page .content a { color: #5b6aff; text-decoration: none; }
.datenschutz-page .content a:hover { text-decoration: underline; }
.datenschutz-page .content strong { color: rgba(240,237,230,0.75); font-weight: 600; }
.datenschutz-page .content .m-elements { list-style: none; padding-left: 0; background: rgba(240,237,230,0.02); border: 1px solid rgba(240,237,230,0.06); border-radius: 4px; padding: 0.75rem 1rem; margin: 0.5rem 0 1rem; display: flex; flex-direction: column; gap: 0.4rem; }
.datenschutz-page .content .seal { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(240,237,230,0.07); font-size: 0.72rem; }
.datenschutz-page .content .seal a { color: rgba(240,237,230,0.25); font-size: 0.72rem; }
</style>