<template>
  <div class="friends-page">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>

    <!-- Ad Banner -->
    <div class="ad-banner">
      <span class="ad-label">Anzeige</span>
      <slot name="ad-top">
        <div class="ad-placeholder">Advertisement</div>
      </slot>
    </div>

    <button class="back-btn" @click="router.push('/')">← Zurück</button>

    <div class="page-header">
      <h1 class="page-title">FREUNDE</h1>
      <p class="page-sub">Musik gemeinsam erleben</p>
    </div>

    <!-- Main nav buttons -->
    <div class="nav-grid">
      <button
        v-for="(item, idx) in sections"
        :key="item.id"
        class="nav-btn"
        :style="{ '--delay': `${idx * 80}ms`, '--color': item.color }"
        @click="router.push(`/${item.id}`)"
      >
        <div class="btn-bg"></div>
        <div class="btn-inner">
          <div class="btn-icon-wrap" :style="{ background: item.color + '22', borderColor: item.color + '44' }">
            <span class="btn-icon">{{ item.icon }}</span>
          </div>
          <div class="btn-text">
            <span class="btn-label">{{ item.label }}</span>
            <span class="btn-sub">{{ item.sub }}</span>
          </div>
          <span class="btn-arrow">→</span>
        </div>
        <div class="btn-accent"></div>
      </button>
    </div>

  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const sections = [
  {
    id:    'friends',
    label: 'Freunde',
    sub:   'Sieh was deine Freunde gerade hören',
    icon:  '◎',
    color: '#5b6aff',
  },
  {
    id:    'groups',
    label: 'Gruppen',
    sub:   'Musik zusammen mit Gruppen teilen',
    icon:  '⬡',
    color: '#32c8a0',
  },
]
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.friends-page {
  min-height: 100vh;
  background: #0a0a0f; color: #f0ede6;
  font-family: 'DM Sans', sans-serif;
  display: flex; flex-direction: column; align-items: center;
  padding: 0 1.5rem 4rem;
  position: relative; overflow-x: hidden;
}

.bg-noise {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  background-size: 180px; opacity: 0.6;
}
.bg-glow {
  position: fixed; inset: 0; pointer-events: none; z-index: 0;
  background:
    radial-gradient(ellipse 55% 45% at 25% 30%, rgba(91,106,255,0.07) 0%, transparent 70%),
    radial-gradient(ellipse 50% 50% at 75% 70%, rgba(50,200,160,0.06) 0%, transparent 70%);
}

/* ── Ad Banner ── */
.ad-banner {
  position: relative; z-index: 1;
  width: 100%; max-width: 728px; min-height: 90px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  border-bottom: 1px solid rgba(240,237,230,0.07);
  padding: 0.75rem 0; margin-bottom: 1rem;
}
.ad-label {
  position: absolute; top: 4px; left: 0;
  font-size: 0.6rem; letter-spacing: 0.15em;
  text-transform: uppercase; color: rgba(240,237,230,0.2);
}
.ad-placeholder {
  width: 100%; max-width: 728px; height: 90px;
  background: rgba(240,237,230,0.03);
  border: 1px dashed rgba(240,237,230,0.1); border-radius: 2px;
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; letter-spacing: 0.12em;
  text-transform: uppercase; color: rgba(240,237,230,0.15);
}

.back-btn {
  position: relative; z-index: 1; align-self: flex-start;
  background: none; border: none; cursor: pointer;
  color: rgba(240,237,230,0.35); font-family: 'DM Sans', sans-serif;
  font-size: 0.78rem; letter-spacing: 0.1em;
  padding: 0.4rem 0; margin-bottom: 1.5rem; transition: color 0.2s;
}
.back-btn:hover { color: #ff5a32; }

.page-header {
  position: relative; z-index: 1;
  text-align: center; margin-bottom: 3rem;
  animation: fadeDown 0.5s ease both;
}
.page-title {
  font-family: 'Bebas Neue', cursive;
  font-size: 3rem; letter-spacing: 0.2em; color: #f0ede6;
}
.page-sub {
  font-size: 0.72rem; letter-spacing: 0.16em;
  text-transform: uppercase; color: rgba(240,237,230,0.22); margin-top: 0.35rem;
}

/* ── Nav Grid ── */
.nav-grid {
  position: relative; z-index: 1;
  width: 100%; max-width: 440px;
  display: flex; flex-direction: column; gap: 0.8rem;
}

.nav-btn {
  position: relative;
  background: none; border: none; cursor: pointer;
  padding: 0; border-radius: 3px; outline: none;
  opacity: 0; transform: translateY(10px);
  animation: slideUp 0.45s ease forwards;
  animation-delay: var(--delay);
}

.btn-bg {
  position: absolute; inset: 0;
  background: rgba(240,237,230,0.03);
  border: 1px solid rgba(240,237,230,0.08);
  border-radius: 3px;
  transition: background 0.25s, border-color 0.25s;
}
.nav-btn:hover .btn-bg {
  background: color-mix(in srgb, var(--color) 8%, transparent);
  border-color: color-mix(in srgb, var(--color) 35%, transparent);
}

.btn-inner {
  position: relative;
  display: flex; align-items: center; gap: 1rem;
  padding: 1.1rem 1.4rem;
}

.btn-icon-wrap {
  width: 46px; height: 46px; flex-shrink: 0;
  border-radius: 8px; border: 1px solid;
  display: flex; align-items: center; justify-content: center;
  transition: transform 0.2s;
}
.nav-btn:hover .btn-icon-wrap { transform: scale(1.08); }
.btn-icon { font-size: 1.3rem; }

.btn-text {
  flex: 1; display: flex; flex-direction: column;
  gap: 0.2rem; text-align: left;
}
.btn-label {
  font-family: 'Bebas Neue', cursive;
  font-size: 1.45rem; letter-spacing: 0.1em; color: #f0ede6; line-height: 1;
  transition: color 0.2s;
}
.nav-btn:hover .btn-label { color: #fff; }
.btn-sub {
  font-size: 0.7rem; color: rgba(240,237,230,0.3);
  letter-spacing: 0.03em; font-weight: 300;
}

.btn-arrow {
  font-size: 0.9rem; color: rgba(240,237,230,0.2);
  transition: color 0.2s, transform 0.25s;
}
.nav-btn:hover .btn-arrow {
  color: var(--color); transform: translateX(4px);
}

.btn-accent {
  position: absolute; left: 0; top: 50%;
  transform: translateY(-50%) scaleY(0);
  width: 2px; height: 55%;
  background: var(--color);
  border-radius: 0 1px 1px 0;
  transition: transform 0.2s ease;
}
.nav-btn:hover .btn-accent { transform: translateY(-50%) scaleY(1); }

/* ── Keyframes ── */
@keyframes fadeDown {
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes slideUp {
  to { opacity: 1; transform: translateY(0); }
}
</style>
