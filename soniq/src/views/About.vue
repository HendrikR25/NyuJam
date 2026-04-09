<template>
  <div class="about-page">
    <div class="bg-noise"></div>
    <div class="bg-glow"></div>

    <AdBanner ad-slot="1918440727" />
    <NavBar back-to="/" />

    <!-- Hero -->
    <div class="hero">
      <span class="hero-icon">◈</span>
      <h1 class="hero-title">NYUJAM</h1>
      <p class="hero-sub">your universe of sound</p>
      <p class="hero-tagline">Eine Musikplattform, die Künstler wirklich unterstützt.</p>
    </div>

    <!-- Feature Cards -->
    <div class="features">

      <div class="feature-card feature-card--gold" style="--i:0">
        <div class="fc-icon">💰</div>
        <div class="fc-body">
          <h2 class="fc-title">100% der Werbeeinnahmen an Künstler</h2>
          <p class="fc-text">Alle Einnahmen aus Werbeanzeigen auf NyuJam gehen direkt und vollständig an die Künstler — nicht an eine Plattform, nicht an Zwischenhändler. Dein Hören macht einen echten Unterschied.</p>
        </div>
      </div>

      <div class="feature-card" style="--i:1">
        <div class="fc-icon">🎧</div>
        <div class="fc-body">
          <h2 class="fc-title">Kein Unterbrechen des Hörerlebnisses</h2>
          <p class="fc-text">Werbung erscheint nur als stiller Banner — niemals als Audio-Unterbrechung. Du hörst deine Musik durch, ohne Pause, ohne Jingle, ohne Ablenkung. Musik so, wie sie sein soll.</p>
        </div>
      </div>

      <div class="feature-card" style="--i:2">
        <div class="fc-icon">📻</div>
        <div class="fc-body">
          <h2 class="fc-title">Länder-Radio & Freunde-Radio</h2>
          <p class="fc-text">Entdecke Musik aus aller Welt im Länder-Radio — synchronisiert für alle Hörer des gleichen Landes. Oder erstelle mit Freunden eine gemeinsame Radio-Session und hört zusammen, egal wo ihr seid.</p>
          <div class="fc-tags">
            <span class="fc-tag">🌍 Live & synchron</span>
            <span class="fc-tag">👥 Freunde einladen</span>
            <span class="fc-tag">⏭ Vote-Skip</span>
          </div>
        </div>
      </div>

      <div class="feature-card" style="--i:3">
        <div class="fc-icon">💬</div>
        <div class="fc-body">
          <h2 class="fc-title">Chats & Gruppen</h2>
          <p class="fc-text">Verbinde dich mit anderen Musikfans. Schreibe direkte Nachrichten, erstelle Gruppen rund um Genres oder Künstler und tausche dich über die Musik aus, die euch bewegt.</p>
          <div class="fc-tags">
            <span class="fc-tag">💬 Direktnachrichten</span>
            <span class="fc-tag">👥 Gruppen</span>
            <span class="fc-tag">🔴 Live im Radio-Chat</span>
          </div>
        </div>
      </div>

      <div class="feature-card" style="--i:4">
        <div class="fc-icon">🎤</div>
        <div class="fc-body">
          <h2 class="fc-title">Für Künstler gemacht</h2>
          <p class="fc-text">Upload deiner Songs und Alben in Minuten. Deine Musik erscheint automatisch im Radio deines Landes und wird weltweit entdeckt. Direkte Spenden von Fans — ohne Abzüge.</p>
          <div class="fc-tags">
            <span class="fc-tag">↑ Einfacher Upload</span>
            <span class="fc-tag">📊 Stream-Statistiken</span>
            <span class="fc-tag">€ Direktspenden</span>
          </div>
        </div>
      </div>

    </div>

    <!-- CTA -->
    <div class="cta-section">
      <p class="cta-text">Bereit, Musik anders zu erleben?</p>
      <div class="cta-btns">
        <button class="cta-btn cta-btn--primary" @click="router.push('/search')">Musik entdecken →</button>
        <button class="cta-btn cta-btn--secondary" @click="router.push('/upload')">Song hochladen ↑</button>
      </div>
    </div>

  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import NavBar from '@/components/NavBar.vue'
import AdBanner from '@/components/AdBanner.vue'

const router = useRouter()
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.about-page { min-height: 100vh; background: #0a0a0f; color: #f0ede6; font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; align-items: center; padding: 0 1.5rem 5rem; position: relative; overflow-x: hidden; }
.bg-noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size: 180px; opacity: 0.6; }
.bg-glow { position: fixed; inset: 0; pointer-events: none; z-index: 0; background: radial-gradient(ellipse 70% 50% at 50% 10%, rgba(240,200,50,0.06) 0%, transparent 70%); }

/* Hero */
.hero { position: relative; z-index: 1; text-align: center; padding: 2rem 0 2.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; animation: fadeDown 0.6s ease both; }
.hero-icon { font-size: 2.5rem; color: #f0c832; line-height: 1; }
.hero-title { font-family: 'Bebas Neue', cursive; font-size: 4rem; letter-spacing: 0.25em; line-height: 1; }
.hero-sub { font-size: 0.7rem; letter-spacing: 0.25em; text-transform: uppercase; color: rgba(240,237,230,0.25); }
.hero-tagline { font-size: 0.95rem; color: rgba(240,237,230,0.5); max-width: 320px; line-height: 1.6; margin-top: 0.75rem; }

/* Features */
.features { position: relative; z-index: 1; width: 100%; max-width: 520px; display: flex; flex-direction: column; gap: 1rem; }

.feature-card { display: flex; gap: 1.1rem; align-items: flex-start; background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.07); border-radius: 10px; padding: 1.3rem 1.2rem; opacity: 0; transform: translateY(12px); animation: fadeUp 0.5s ease forwards; animation-delay: calc(var(--i) * 100ms); transition: border-color 0.2s; }
.feature-card:hover { border-color: rgba(240,237,230,0.12); }
.feature-card--gold { border-color: rgba(240,200,50,0.2); background: rgba(240,200,50,0.04); }
.feature-card--gold:hover { border-color: rgba(240,200,50,0.35); }

.fc-icon { font-size: 1.8rem; flex-shrink: 0; margin-top: 0.1rem; }
.fc-body { display: flex; flex-direction: column; gap: 0.5rem; }
.fc-title { font-family: 'Bebas Neue', cursive; font-size: 1.05rem; letter-spacing: 0.1em; color: #f0ede6; line-height: 1.2; }
.feature-card--gold .fc-title { color: #f0c832; }
.fc-text { font-size: 0.8rem; color: rgba(240,237,230,0.45); line-height: 1.7; }
.fc-tags { display: flex; flex-wrap: wrap; gap: 0.4rem; margin-top: 0.25rem; }
.fc-tag { font-size: 0.65rem; background: rgba(240,237,230,0.06); border: 1px solid rgba(240,237,230,0.1); border-radius: 20px; padding: 0.2rem 0.6rem; color: rgba(240,237,230,0.4); letter-spacing: 0.04em; }

/* CTA */
.cta-section { position: relative; z-index: 1; text-align: center; margin-top: 2.5rem; display: flex; flex-direction: column; align-items: center; gap: 1.2rem; animation: fadeUp 0.5s 0.6s ease both; opacity: 0; }
.cta-text { font-size: 0.88rem; color: rgba(240,237,230,0.4); letter-spacing: 0.05em; }
.cta-btns { display: flex; gap: 0.75rem; flex-wrap: wrap; justify-content: center; }
.cta-btn { font-family: 'Bebas Neue', cursive; font-size: 0.95rem; letter-spacing: 0.12em; border-radius: 4px; padding: 0.7rem 1.8rem; cursor: pointer; transition: all 0.2s; border: 1px solid; }
.cta-btn--primary { background: #f0c832; color: #0a0a0f; border-color: #f0c832; box-shadow: 0 0 20px rgba(240,200,50,0.3); }
.cta-btn--primary:hover { box-shadow: 0 0 32px rgba(240,200,50,0.5); transform: scale(1.03); }
.cta-btn--secondary { background: transparent; color: rgba(240,237,230,0.5); border-color: rgba(240,237,230,0.15); }
.cta-btn--secondary:hover { color: #f0ede6; border-color: rgba(240,237,230,0.3); }

@keyframes fadeDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
</style>