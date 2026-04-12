<template>
  <div class="impressum-page">
    <div class="bg-noise"></div>
    <NavBar back-to="/" />

    <div class="content">
      <h1 class="page-title">IMPRESSUM</h1>

      <section class="section">
        <h2 class="section-title">Angaben gemäß § 5 TMG</h2>
        <p>[Hendrik Rennau]</p>
        <p>[Schulenburgstraße 22]</p>
        <p>[18069] Rostock]</p>
        <p>[Deutschland]</p>
      </section>

      <section class="section">
        <h2 class="section-title">Kontakt</h2>
        <p>E-Mail: <a href="mailto:hendrik@nyujam.com">hendrik@nyujam.com</a></p>
      </section>

      <section class="section">
        <h2 class="section-title">Streitschlichtung</h2>
        <p>Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: <a href="https://ec.europa.eu/consumers/odr/" target="_blank" rel="noopener">https://ec.europa.eu/consumers/odr/</a></p>
        <p>Unsere E-Mail-Adresse finden Sie oben im Impressum.</p>
        <p style="margin-top:0.75rem">Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.</p>
      </section>

      <section class="section">
        <h2 class="section-title">Haftung für Inhalte</h2>
        <p>Als Diensteanbieter sind wir gemäß § 7 Abs.1 TMG für eigene Inhalte auf diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10 TMG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen, die auf eine rechtswidrige Tätigkeit hinweisen.</p>
        <p>Verpflichtungen zur Entfernung oder Sperrung der Nutzung von Informationen nach den allgemeinen Gesetzen bleiben hiervon unberührt. Eine diesbezügliche Haftung ist jedoch erst ab dem Zeitpunkt der Kenntnis einer konkreten Rechtsverletzung möglich. Bei Bekanntwerden von entsprechenden Rechtsverletzungen werden wir diese Inhalte umgehend entfernen.</p>
      </section>

      <section class="section">
        <h2 class="section-title">Haftung für Links</h2>
        <p>Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter oder Betreiber der Seiten verantwortlich.</p>
      </section>

      <section class="section">
        <h2 class="section-title">Urheberrecht</h2>
        <p>Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechtes bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.</p>
        <p>Soweit die Inhalte auf dieser Seite nicht vom Betreiber erstellt wurden, werden die Urheberrechte Dritter beachtet. Insbesondere werden Inhalte Dritter als solche gekennzeichnet. Sollten Sie trotzdem auf eine Urheberrechtsverletzung aufmerksam werden, bitten wir um einen entsprechenden Hinweis. Bei Bekanntwerden von Rechtsverletzungen werden wir derartige Inhalte umgehend entfernen.</p>
      </section>
    </div>
  </div>
</template>

<script setup>
import NavBar from '@/components/NavBar.vue'
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.impressum-page { min-height: 100vh; background: #0a0a0f; color: #f0ede6; font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; align-items: center; padding: 0 1.5rem 4rem; position: relative; }
.bg-noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size: 180px; opacity: 0.6; }

.content { position: relative; z-index: 1; width: 100%; max-width: 620px; display: flex; flex-direction: column; gap: 2rem; }
.page-title { font-family: 'Bebas Neue', cursive; font-size: 2.5rem; letter-spacing: 0.2em; margin-bottom: 0.5rem; }

.section { display: flex; flex-direction: column; gap: 0.5rem; }
.section-title { font-family: 'Bebas Neue', cursive; font-size: 1rem; letter-spacing: 0.15em; color: rgba(240,237,230,0.5); margin-bottom: 0.25rem; }
.section p { font-size: 0.85rem; color: rgba(240,237,230,0.65); line-height: 1.7; }
.section a { color: #5b6aff; text-decoration: none; }
.section a:hover { text-decoration: underline; }
</style>