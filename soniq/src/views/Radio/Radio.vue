<template>
  <div class="radio-page">
    <div class="bg-noise"></div>
    <div class="bg-glow" :style="glowStyle"></div>

    <AdBanner ad-slot="1918440727" />

    <!-- Breadcrumb -->
    <div class="breadcrumb">
      <button class="bc-btn" @click="goBack">← Zurück</button>
      <button class="bc-home" @click="router.push('/')" title="Home">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>
        Home
      </button>
      <transition name="bc-fade">
        <span class="bc-trail" v-if="activeContinent || activeCountry">
          <span class="bc-sep">/</span>
          <button class="bc-crumb" @click="drillToContinent" v-if="activeContinent">{{ activeContinent.name }}</button>
          <template v-if="activeCountry">
            <span class="bc-sep">/</span>
            <span class="bc-crumb bc-crumb--active">{{ activeCountry.name }}</span>
          </template>
        </span>
      </transition>
      <button class="friends-radio-btn" @click="router.push('/friends-radio')">
        <span class="fr-icon">◎</span> Freunde Radio
      </button>
    </div>

    <!-- Title -->
    <div class="page-header">
      <transition name="title-swap" mode="out-in">
        <div class="header-inner" :key="titleKey">
          <h1 class="page-title">{{ currentTitle }}</h1>
          <span class="live-badge"><span class="live-dot"></span>LIVE</span>
        </div>
      </transition>
    </div>

    <!-- Map — always visible, drives all navigation -->
    <div class="map-wrap">
      <div v-if="loading" class="map-loading">
        <span class="loading-dot"></span><span class="loading-dot"></span><span class="loading-dot"></span>
      </div>
      <div v-else-if="error" class="map-error">{{ error }}</div>
      <svg v-else ref="svgRef" class="world-svg" :viewBox="`0 0 ${W} ${H}`" xmlns="http://www.w3.org/2000/svg">
        <rect :width="W" :height="H" fill="#070e19"/>
        <g class="zoom-group" :class="{ 'zoom-group--animating': zoomTransition }" :transform="zoomTransform">
          <g stroke="rgba(100,180,255,0.04)" stroke-width="0.5" fill="none">
            <line v-for="x in gridX" :key="'gx'+x" :x1="x" y1="0" :x2="x" :y2="H"/>
            <line v-for="y in gridY" :key="'gy'+y" x1="0" :y1="y" :x2="W" :y2="y"/>
          </g>
          <g class="countries-layer">
            <path
              v-for="feature in geoFeatures" :key="feature.id"
              :d="feature.pathD"
              :fill="countryFill(feature)" :stroke="countryStroke(feature)"
              stroke-width="0.4" stroke-linejoin="round" class="country-path"
              :class="{
                'country-path--active':    activeCountry?.iso === feature.iso,
                'country-path--continent': activeContinent && getContinentId(feature.continent) === activeContinent.id,
                'country-path--dimmed':    activeContinent && getContinentId(feature.continent) !== activeContinent.id
              }"
              @click="onFeatureClick(feature)"
            />
          </g>
          <g v-if="!activeContinent" pointer-events="none">
            <text v-for="cont in continentMeta" :key="cont.id"
              :x="cont.labelPos.x" :y="cont.labelPos.y"
              text-anchor="middle" dominant-baseline="middle"
              font-size="9" font-family="'Bebas Neue', cursive"
              :fill="cont.color + 'cc'" letter-spacing="1.5"
            >{{ cont.name }}</text>
          </g>
          <g v-if="activeCountry" pointer-events="none">
            <text :x="activeCountry.centroid[0]" :y="activeCountry.centroid[1] - 10"
              text-anchor="middle" font-size="8" font-family="'DM Sans', sans-serif"
              fill="white" opacity="0.9">{{ activeCountry.name }}</text>
          </g>
        </g>
      </svg>
      <p class="map-hint">
        <span v-if="!activeContinent">Kontinent wählen · Klicke auf die Karte</span>
        <span v-else-if="!activeCountry">Land wählen ·
          <button class="hint-back" @click="drillToWorld">← Weltkarte</button>
        </span>
        <span v-else>
          <button class="hint-back" @click="drillToContinent">← {{ activeContinent?.name }}</button>
        </span>
      </p>
    </div>

    <!-- Player — adapts to current level -->
    <transition name="np-swap" mode="out-in">

      <!-- GLOBAL RADIO (no continent selected) -->
      <div class="now-playing-card" key="global" v-if="!activeContinent" :style="{ '--accent': '#f0c832' }">
        <div class="npc-cover npc-cover--clickable" :style="{ background: 'rgba(240,200,50,0.08)', borderColor: 'rgba(240,200,50,0.2)' }" @click="globalRadio.current && playCurrentSong(globalRadio.current)">
          <img v-if="globalRadio.current?.cover" :src="globalRadio.current.cover" class="npc-cover-img" />
          <span v-else class="npc-icon">✦</span>
          <span class="npc-wave" v-if="radioAudio && globalRadio.current"><span></span><span></span><span></span><span></span></span>
          <span class="npc-play-hint" v-if="globalRadio.current">▶</span>
        </div>
        <div class="npc-info" :class="{ 'npc-info--clickable': globalRadio.current }" @click="globalRadio.current && playCurrentSong(globalRadio.current)">
          <span class="npc-station">NyuJam Global Radio</span>
          <span class="npc-song">{{ globalRadio.current?.name || (globalRadio.loading ? 'Lädt...' : 'Klicke auf einen Kontinent') }}</span>
          <span class="npc-artist">{{ globalRadio.current?.artist || 'für das Kontinent-Radio' }}</span>
        </div>
        <div class="npc-controls" v-if="globalRadio.current">
          <button class="npc-mute" @click="toggleMute" :title="isMuted ? 'Ton an' : 'Stumm'">
            <svg v-if="!isMuted" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
          </button>
          <button class="npc-like" :class="{ liked: globalRadio.isLiked }" @click="toggleGlobalLike" :disabled="!auth.isLoggedIn">
            <svg width="16" height="16" viewBox="0 0 24 24" :fill="globalRadio.isLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
        <!-- Rankings toggle -->
        <div class="card-rankings-wrap">
          <button class="rankings-toggle-btn" @click="showRankings.global = !showRankings.global">
            🏆 Top Songs nach Woche <span class="toggle-arrow">{{ showRankings.global ? '▲' : '▼' }}</span>
          </button>
          <div v-if="showRankings.global" class="hist-wrap">
            <div v-if="!Object.keys(globalRadio.history || {}).length" class="rank-empty">Noch keine Daten — kommt nach der ersten vollen Woche.</div>
            <div v-for="(songs, week) in globalRadio.history" :key="week" class="hist-week">
              <button class="hist-week-btn" @click="toggleHistWeek('global', week)">
                KW {{ weekLabel(week) }} — Top {{ Math.min(songs.length, 50) }}
                <span>{{ histOpen.global === week ? '▲' : '▼' }}</span>
              </button>
              <div class="rankings-list" v-if="histOpen.global === week">
                <div v-for="(r, i) in songs.slice(0,50)" :key="r.song_id" class="rank-item" @click="playRankSong(r)">
                  <span class="rank-nr">{{ i + 1 }}</span>
                  <div class="rank-cover"><img v-if="r.cover_url" :src="r.cover_url" class="rank-cover-img" /><span v-else>♩</span></div>
                  <div class="rank-info"><span class="rank-name">{{ r.song_name }}</span><span class="rank-artist">{{ r.artist }}</span></div>
                  <span class="rank-pct">{{ r.like_pct }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- CONTINENT RADIO (continent selected, no country) -->
      <div class="now-playing-card" key="continent" v-else-if="activeContinent && !activeCountry" :style="{ '--accent': '#32c8a0' }">
        <div class="npc-cover npc-cover--clickable" :style="{ background: 'rgba(50,200,160,0.1)', borderColor: 'rgba(50,200,160,0.3)' }" @click="continentRadio.current && playCurrentSong(continentRadio.current)">
          <img v-if="continentRadio.current?.cover" :src="continentRadio.current.cover" class="npc-cover-img" />
          <span v-else class="npc-icon">📻</span>
          <span class="npc-wave" v-if="radioAudio && continentRadio.current"><span></span><span></span><span></span><span></span></span>
          <span class="npc-play-hint" v-if="continentRadio.current">▶</span>
        </div>
        <div class="npc-info" :class="{ 'npc-info--clickable': continentRadio.current }" @click="continentRadio.current && playCurrentSong(continentRadio.current)">
          <span class="npc-station">{{ activeContinent.name }} Radio</span>
          <span class="npc-song">{{ continentRadio.current?.name || (continentRadio.loading ? 'Lädt...' : 'Klicke auf ein Land') }}</span>
          <span class="npc-artist">{{ continentRadio.current?.artist || 'für das Länder-Radio' }}</span>
        </div>
        <div class="npc-controls" v-if="continentRadio.current">
          <button class="npc-mute" @click="toggleMute">
            <svg v-if="!isMuted" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
          </button>
          <button class="npc-like" :class="{ liked: continentRadio.isLiked }" @click="toggleContinentLike" :disabled="!auth.isLoggedIn">
            <svg width="16" height="16" viewBox="0 0 24 24" :fill="continentRadio.isLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
        <div class="card-rankings-wrap">
          <button class="rankings-toggle-btn" @click="showRankings.continent = !showRankings.continent">
            🏆 Top Songs nach Woche <span class="toggle-arrow">{{ showRankings.continent ? '▲' : '▼' }}</span>
          </button>
          <div v-if="showRankings.continent" class="hist-wrap">
            <div v-if="!Object.keys(continentRadio.history || {}).length" class="rank-empty">Noch keine Daten — kommt nach der ersten vollen Woche.</div>
            <div v-for="(songs, week) in continentRadio.history" :key="week" class="hist-week">
              <button class="hist-week-btn" @click="toggleHistWeek('cont', week)">
                KW {{ weekLabel(week) }} — Top {{ Math.min(songs.length, 50) }}
                <span>{{ histOpen.cont === week ? '▲' : '▼' }}</span>
              </button>
              <div class="rankings-list" v-if="histOpen.cont === week">
                <div v-for="(r, i) in songs.slice(0,50)" :key="r.song_id" class="rank-item" @click="playRankSong(r)">
                  <span class="rank-nr">{{ i + 1 }}</span>
                  <div class="rank-cover"><img v-if="r.cover_url" :src="r.cover_url" class="rank-cover-img" /><span v-else>♩</span></div>
                  <div class="rank-info"><span class="rank-name">{{ r.song_name }}</span><span class="rank-artist">{{ r.artist }}</span></div>
                  <span class="rank-pct">{{ r.like_pct }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- COUNTRY OFF-AIR -->
      <div class="now-playing-card" key="offair" v-else-if="!countryRadio.onAir" :style="{ '--accent': '#ff5a32' }">
        <div class="npc-cover" style="background:rgba(255,90,50,0.08);border-color:rgba(255,90,50,0.2)">
          <span class="npc-icon">🌙</span>
        </div>
        <div class="npc-info">
          <span class="npc-station">{{ activeCountry.name }} Radio</span>
          <span class="npc-song">Sendeende · 22:00 – 08:00</span>
          <span class="npc-artist">Radio startet wieder um 08:00 Uhr</span>
        </div>
        <div class="card-rankings-wrap">
          <button class="rankings-toggle-btn" @click="showRankings.country = !showRankings.country">
            🏆 Top Songs nach Woche <span class="toggle-arrow">{{ showRankings.country ? '▲' : '▼' }}</span>
          </button>
          <div v-if="showRankings.country" class="hist-wrap">
            <div v-if="!countryRadio.weeklyHistory?.length" class="rank-empty">Noch keine Daten verfügbar.</div>
            <div v-for="week in (countryRadio.weeklyHistory || [])" :key="week.week_start" class="hist-week">
              <button class="hist-week-btn" @click="toggleHistWeek('country', week.week_start)">
                KW {{ weekLabel(week.week_start) }} — Top {{ Math.min(week.songs.length, 50) }}
                <span>{{ histOpen.country === week.week_start ? '▲' : '▼' }}</span>
              </button>
              <div class="rankings-list" v-if="histOpen.country === week.week_start">
                <div v-for="(r, i) in week.songs.slice(0,50)" :key="r.song_id" class="rank-item" @click="playRankSong(r)">
                  <span class="rank-nr">{{ i + 1 }}</span>
                  <div class="rank-cover"><img v-if="r.cover_url" :src="r.cover_url" class="rank-cover-img" /><span v-else>♩</span></div>
                  <div class="rank-info"><span class="rank-name">{{ r.song_name }}</span><span class="rank-artist">{{ r.artist }}</span></div>
                  <span class="rank-pct">{{ r.like_pct }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- COUNTRY ON-AIR -->
      <div class="now-playing-card" key="onair" v-else :style="{ '--accent': '#5b6aff' }">
        <div class="npc-cover npc-cover--clickable" :style="{ background: 'rgba(91,106,255,0.1)', borderColor: 'rgba(91,106,255,0.3)' }" @click="countryRadio.currentSong && playCurrentSong(countryRadio.currentSong)">
          <img v-if="countryRadio.currentSong?.cover" :src="countryRadio.currentSong.cover" class="npc-cover-img" />
          <span v-else class="npc-icon">📻</span>
          <span class="npc-wave" v-if="radioAudio"><span></span><span></span><span></span><span></span></span>
          <span class="npc-play-hint" v-if="countryRadio.currentSong">▶</span>
        </div>
        <div class="npc-info" :class="{ 'npc-info--clickable': countryRadio.currentSong }" @click="countryRadio.currentSong && playCurrentSong(countryRadio.currentSong)">
          <span class="npc-station">{{ activeCountry.name }} Radio</span>
          <span class="npc-song">{{ countryRadio.currentSong?.name || 'Lädt...' }}</span>
          <span class="npc-artist">{{ countryRadio.currentSong?.artist || '—' }}</span>
        </div>
        <div class="npc-controls">
          <button class="npc-mute" @click="toggleMute" :title="isMuted ? 'Ton an' : 'Stummschalten'">
            <svg v-if="!isMuted" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>
          </button>
          <button class="npc-like" :class="{ liked: countryRadio.isLiked }" @click="toggleLike" :disabled="!countryRadio.currentSong">
            <svg width="16" height="16" viewBox="0 0 24 24" :fill="countryRadio.isLiked ? 'currentColor' : 'none'" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
          </button>
        </div>
        <div class="card-rankings-wrap">
          <button class="rankings-toggle-btn" @click="showRankings.country = !showRankings.country">
            🏆 Top Songs nach Woche <span class="toggle-arrow">{{ showRankings.country ? '▲' : '▼' }}</span>
          </button>
          <div v-if="showRankings.country" class="hist-wrap">
            <div v-if="!countryRadio.weeklyHistory?.length" class="rank-empty">Noch keine Daten verfügbar.</div>
            <div v-for="week in (countryRadio.weeklyHistory || [])" :key="week.week_start" class="hist-week">
              <button class="hist-week-btn" @click="toggleHistWeek('country', week.week_start)">
                KW {{ weekLabel(week.week_start) }} — Top {{ Math.min(week.songs.length, 50) }}
                <span>{{ histOpen.country === week.week_start ? '▲' : '▼' }}</span>
              </button>
              <div class="rankings-list" v-if="histOpen.country === week.week_start">
                <div v-for="(r, i) in week.songs.slice(0,50)" :key="r.song_id" class="rank-item" @click="playRankSong(r)">
                  <span class="rank-nr">{{ i + 1 }}</span>
                  <div class="rank-cover"><img v-if="r.cover_url" :src="r.cover_url" class="rank-cover-img" /><span v-else>♩</span></div>
                  <div class="rank-info"><span class="rank-name">{{ r.song_name }}</span><span class="rank-artist">{{ r.artist }}</span></div>
                  <span class="rank-pct">{{ r.like_pct }}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="npc-empty" v-if="!countryRadio.currentSong">
          <span>Keine Songs in der Warteschlange</span>
        </div>
      </div>

    </transition>
  </div>
</template>

<script setup>
import AdBanner from '@/components/AdBanner.vue'
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as d3 from 'd3'
import * as topojson from 'topojson-client'
import { usePlayerStore } from '@/stores/player'
import { useAuthStore } from '@/stores/auth'
import { radioState } from '@/stores/radioState'

const router = useRouter()
const player = usePlayerStore()
const auth   = useAuthStore()
const BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

// ── Map state ──────────────────────────────────────────
const W = 960, H = 500
const loading      = ref(true)
const error        = ref(null)
const geoFeatures  = ref([])
const rawFeatures  = ref([])
const svgRef       = ref(null)
const zoomTransform  = ref('matrix(1,0,0,1,0,0)')
const zoomTransition = ref(false)
let pathFn = null

const gridX = Array.from({ length: 13 }, (_, i) => (i * W) / 12)
const gridY = Array.from({ length: 7  }, (_, i) => (i * H) / 6)

const activeContinent = ref(null)
const activeCountry   = ref(null)

// ── Radio state ────────────────────────────────────────
let radioAudio = null
let radioTimer = null
const isMuted = ref(false)

const countryRadio = ref({ onAir: false, currentSong: null, songStartedAt: null, weekend: false, isLiked: false, weeklyHistory: [] })
const continentRadio = ref({ current: null, loading: false, history: {}, isLiked: false })
const globalRadio    = ref({ current: null, loading: false, history: {}, isLiked: false })

const showRankings = ref({ global: false, continent: false, country: false })
const histOpen     = ref({ global: null, cont: null, country: null })

// ── Continent meta ─────────────────────────────────────
const continentMeta = [
  { id: 'europe',   name: 'Europe',        color: '#5b9fff', labelPos: { x: 500, y: 165 } },
  { id: 'namerica', name: 'N. America',    color: '#ff7c5c', labelPos: { x: 180, y: 185 } },
  { id: 'samerica', name: 'S. America',    color: '#f0c832', labelPos: { x: 250, y: 330 } },
  { id: 'asia',     name: 'Asia',          color: '#c87aff', labelPos: { x: 680, y: 185 } },
  { id: 'africa',   name: 'Africa',        color: '#32c8a0', labelPos: { x: 500, y: 300 } },
  { id: 'oceania',  name: 'Oceania',       color: '#ff5a32', labelPos: { x: 780, y: 350 } },
]

function getContinentId(name) {
  const map = {
    'Europe': 'europe',
    'North America': 'namerica',
    'South America': 'samerica',
    'Asia': 'asia',
    'Africa': 'africa',
    'Oceania': 'oceania',
    'Antarctica': 'oceania',
  }
  return map[name] ?? 'oceania'
}

// ── Zoom helpers ───────────────────────────────────────
function zoomToBounds(bounds, padding = 32) {
  const [[x0, y0], [x1, y1]] = bounds
  const bw = x1 - x0, bh = y1 - y0
  if (!isFinite(bw) || !isFinite(bh) || bw === 0 || bh === 0) return
  const scaleX = (W - padding * 2) / bw
  const scaleY = (H - padding * 2) / bh
  const s  = Math.min(scaleX, scaleY, 8)
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
  const tx = W / 2 - s * cx, ty = H / 2 - s * cy
  zoomTransition.value = true
  zoomTransform.value  = `matrix(${s},0,0,${s},${tx},${ty})`
  setTimeout(() => { zoomTransition.value = false }, 700)
}

function zoomToWorld() {
  zoomTransition.value = true
  zoomTransform.value  = 'matrix(1,0,0,1,0,0)'
  setTimeout(() => { zoomTransition.value = false }, 700)
}

function zoomToContinent(cid) {
  const features = rawFeatures.value.filter(f => getContinentId(f.continent) === cid)
  if (!features.length) return
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const f of features) {
    if (!f.rawBounds) continue
    const [[x0,y0],[x1,y1]] = f.rawBounds
    if (isFinite(x0)) { minX=Math.min(minX,x0); minY=Math.min(minY,y0); maxX=Math.max(maxX,x1); maxY=Math.max(maxY,y1) }
  }
  if (!isFinite(minX)) return
  zoomToBounds([[minX,minY],[maxX,maxY]], 40)
}

function zoomToCountry(iso) {
  const f = rawFeatures.value.find(f => f.iso === iso)
  if (!f?.rawBounds || !isFinite(f.rawBounds[0][0])) return
  zoomToBounds(f.rawBounds, 60)
}

// ── Map click ──────────────────────────────────────────
async function onFeatureClick(f) {
  const cid  = getContinentId(f.continent)
  const cont = continentMeta.find(c => c.id === cid)
  if (!cont) return

  if (!activeContinent.value) {
    // World → Continent: start continent radio
    activeContinent.value = cont
    activeCountry.value   = null
    zoomToContinent(cid)
    stopRadioAudio()
    showRankings.value.continent = false
    await loadContinentRadio(cid)
  } else if (activeContinent.value.id === cid) {
    // Continent → Country: start country radio
    const iso = f.alpha2 || f.iso
    activeCountry.value = { iso, alpha2: f.alpha2, name: f.name, centroid: f.centroid, id: f.iso }
    zoomToCountry(f.iso)
    stopRadioAudio() // stop continent audio immediately
    clearInterval(radioTimer)
    showRankings.value.country = false
    await loadCountryRadio(iso)
    radioTimer = setInterval(() => loadCountryRadio(iso), 5000)
  }
}

function drillToWorld() {
  activeContinent.value = null
  activeCountry.value   = null
  zoomToWorld()
  stopRadioAudio()
  clearInterval(radioTimer)
  countryRadio.value   = { onAir: false, currentSong: null, songStartedAt: null, weekend: false, isLiked: false, weeklyHistory: [] }
  continentRadio.value = { current: null, loading: false, history: {} }
  showRankings.value   = { global: false, continent: false, country: false }
  // Reload global radio
  loadGlobalRadio()
}

function drillToContinent() {
  if (!activeContinent.value) return
  activeCountry.value = null
  zoomToContinent(activeContinent.value.id)
  stopRadioAudio()
  clearInterval(radioTimer)
  countryRadio.value = { onAir: false, currentSong: null, songStartedAt: null, weekend: false, isLiked: false, weeklyHistory: [] }
  showRankings.value.country = false
  // Reload continent radio
  loadContinentRadio(activeContinent.value.id)
}

function goBack() {
  if (activeCountry.value)   { drillToContinent(); return }
  if (activeContinent.value) { drillToWorld();     return }
  router.push('/')
}

// ── Country radio ──────────────────────────────────────
function authHeader() {
  const token = auth.token || localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

async function loadCountryRadio(code) {
  try {
    const [stateRes, histRes] = await Promise.all([
      fetch(`${BASE_URL}/api/radio/country/${code}`),
      fetch(`${BASE_URL}/api/radio/country/${code}/rankings/weekly`),
    ])
    const data    = await stateRes.json()
    const histRaw = await histRes.json()

    // Group weekly history by week_start
    const byWeek = {}
    for (const r of histRaw || []) {
      if (!byWeek[r.week_start]) byWeek[r.week_start] = []
      byWeek[r.week_start].push(r)
    }
    const weeklyHistory = Object.entries(byWeek)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([week_start, songs]) => ({ week_start, songs: songs.sort((a,b) => b.like_pct - a.like_pct) }))

    const songChanged = data.currentSong?.id !== countryRadio.value.currentSong?.id
    countryRadio.value = { ...countryRadio.value, ...data, weeklyHistory }

    if (data.onAir && data.currentSong && songChanged) {
      startSyncedPlay(data)
      countryRadio.value.isLiked = false
      if (auth.isLoggedIn) {
        fetch(`${BASE_URL}/api/radio/country/${code}/listen`, {
          method: 'POST', headers: authHeader(),
          body: JSON.stringify({ songId: data.currentSong.id }),
        }).catch(() => {})
      }
    }
    // Stop any continent/global audio if country has no song or is off air
    if (!data.onAir || !data.currentSong) stopRadioAudio()
  } catch {}
}

function startSyncedPlay(data) {
  stopRadioAudio()
  if (!data.currentSong?.url) return
  const elapsed = data.songStartedAt ? (Date.now() - new Date(data.songStartedAt).getTime()) / 1000 : 0
  radioAudio = new Audio(data.currentSong.url)
  radioAudio.volume = isMuted.value ? 0 : 1
  radioAudio.currentTime = Math.max(0, elapsed)
  radioAudio.play().catch(() => {})
  radioState.audio = radioAudio
  radioState.song  = data.currentSong
  radioAudio.onended = () => {
    if (!activeCountry.value) return
    fetch(`${BASE_URL}/api/radio/country/${activeCountry.value.iso}/next`, {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({ songId: data.currentSong.id }),
    }).then(() => loadCountryRadio(activeCountry.value.iso)).catch(() => {})
  }
}

// ── Continent radio ────────────────────────────────────
async function loadContinentRadio(id) {
  continentRadio.value.loading = true
  try {
    const [stateRes, histRes] = await Promise.all([
      fetch(`${BASE_URL}/api/radio/continent/${id}`),
      fetch(`${BASE_URL}/api/radio/continent/${id}/rankings`),
    ])
    const state = await stateRes.json()
    const hist  = await histRes.json()
    const songChanged = state.current?.id !== continentRadio.value.current?.id
    continentRadio.value = { ...state, history: hist, loading: false, isLiked: songChanged ? false : continentRadio.value.isLiked }
    if (state.current?.url) {
      // Play if song changed OR no audio is currently running
      if (songChanged || !radioAudio) {
        playStreamSong(state.current, state.startedAt, 'continent', id)
      }
    }
  } catch { continentRadio.value.loading = false }
}

// ── Global radio ───────────────────────────────────────
async function loadGlobalRadio() {
  globalRadio.value.loading = true
  try {
    const [stateRes, histRes] = await Promise.all([
      fetch(`${BASE_URL}/api/radio/global`),
      fetch(`${BASE_URL}/api/radio/global/rankings`),
    ])
    const state = await stateRes.json()
    const hist  = await histRes.json()
    const songChangedG = state.current?.id !== globalRadio.value.current?.id
    globalRadio.value = { ...state, history: hist, loading: false, isLiked: songChangedG ? false : globalRadio.value.isLiked }
    if (state.current?.url) {
      if (songChangedG || !radioAudio) {
        playStreamSong(state.current, state.startedAt, 'global', null)
      }
    }
  } catch { globalRadio.value.loading = false }
}

// Load global radio state for UI only — don't touch audio (used when returning from player)
async function loadGlobalRadioSilent() {
  try {
    const [stateRes, histRes] = await Promise.all([
      fetch(`${BASE_URL}/api/radio/global`),
      fetch(`${BASE_URL}/api/radio/global/rankings`),
    ])
    const state = await stateRes.json()
    const hist  = await histRes.json()
    globalRadio.value = { ...state, history: hist, loading: false, isLiked: globalRadio.value.isLiked }
    // Don't call playStreamSong — audio is already running
  } catch {}
}

// ── Audio helpers ──────────────────────────────────────
function stopRadioAudio() {
  if (radioAudio) { radioAudio.pause(); radioAudio.src = ''; radioAudio = null }
  radioState.audio = null
  radioState.song  = null
}

function playStreamSong(song, startedAt, level, id) {
  stopRadioAudio()
  if (!song?.url) return
  const elapsed = startedAt ? (Date.now() - new Date(startedAt).getTime()) / 1000 : 0
  radioAudio = new Audio(song.url)
  radioAudio.volume = isMuted.value ? 0 : 1
  radioAudio.currentTime = Math.max(0, elapsed)
  radioAudio.play().catch(() => {})
  radioState.audio = radioAudio
  radioState.song  = song
  radioAudio.onended = async () => {
    if (level === 'continent' && id) {
      const res = await fetch(`${BASE_URL}/api/radio/continent/${id}/next`, { method: 'POST' }).catch(() => null)
      if (res?.ok) { const d = await res.json(); if (d.song?.url) { continentRadio.value.current = d.song; playStreamSong(d.song, null, 'continent', id) } }
    } else if (level === 'global') {
      const res = await fetch(`${BASE_URL}/api/radio/global/next`, { method: 'POST' }).catch(() => null)
      if (res?.ok) { const d = await res.json(); if (d.song?.url) { globalRadio.value.current = d.song; playStreamSong(d.song, null, 'global', null) } }
    }
  }
}

function toggleMute() {
  isMuted.value = !isMuted.value
  if (radioAudio) radioAudio.volume = isMuted.value ? 0 : 1
}

async function toggleLike() {
  if (!auth.isLoggedIn || !countryRadio.value.currentSong || !activeCountry.value) return
  const code  = activeCountry.value.iso
  const songId = countryRadio.value.currentSong.id
  const wasLiked = countryRadio.value.isLiked
  countryRadio.value.isLiked = !wasLiked
  await fetch(`${BASE_URL}/api/radio/country/${code}/${wasLiked ? 'unlike' : 'like'}`, {
    method: 'POST', headers: authHeader(), body: JSON.stringify({ songId }),
  }).catch(() => { countryRadio.value.isLiked = wasLiked })
}

async function toggleContinentLike() {
  if (!auth.isLoggedIn || !continentRadio.value.current || !activeContinent.value) return
  const songId   = continentRadio.value.current.id
  const wasLiked = continentRadio.value.isLiked
  continentRadio.value.isLiked = !wasLiked
  await fetch(`${BASE_URL}/api/radio/continent/${activeContinent.value.id}/${wasLiked ? 'unlike' : 'like'}`, {
    method: 'POST', headers: authHeader(), body: JSON.stringify({ songId }),
  }).catch(() => { continentRadio.value.isLiked = wasLiked })
}

async function toggleGlobalLike() {
  if (!auth.isLoggedIn || !globalRadio.value.current) return
  const songId   = globalRadio.value.current.id
  const wasLiked = globalRadio.value.isLiked
  globalRadio.value.isLiked = !wasLiked
  await fetch(`${BASE_URL}/api/radio/global/${wasLiked ? 'unlike' : 'like'}`, {
    method: 'POST', headers: authHeader(), body: JSON.stringify({ songId }),
  }).catch(() => { globalRadio.value.isLiked = wasLiked })
}

function playRankSong(r) {
  fetch(`${BASE_URL}/api/songs/all`).then(res => res.json()).then(songs => {
    const s = songs.find(s => s.id === `u_${r.song_id}`)
    if (s) player.play(s)
    else player.play({ id: `u_${r.song_id}`, name: r.song_name, artist: r.artist, cover: r.cover_url, url: null })
  }).catch(() => {})
}

// Open radio song in player — adopt the already-playing audio, no restart
function playCurrentSong(song) {
  if (!radioAudio) return
  radioState.audio       = radioAudio
  radioState.song        = { id: song.id, name: song.name, artist: song.artist, cover: song.cover, url: song.url }
  radioState.isRadioMode = true
  player.fromRoute       = '/radio'
  router.push('/player')
}

// Track whether player is following radio
const radioFollowing = ref(false)

// When radio advances, if player is following → update mirror
watch(() => globalRadio.value.current?.id, (newId) => {
  if (radioFollowing.value && newId && !activeContinent.value && radioAudio) {
    player.adoptRadioAudio(radioAudio, { id: globalRadio.value.current.id, name: globalRadio.value.current.name, artist: globalRadio.value.current.artist, cover: globalRadio.value.current.cover, url: globalRadio.value.current.url })
  }
})
watch(() => continentRadio.value.current?.id, (newId) => {
  if (radioFollowing.value && newId && activeContinent.value && !activeCountry.value && radioAudio) {
    player.adoptRadioAudio(radioAudio, { id: continentRadio.value.current.id, name: continentRadio.value.current.name, artist: continentRadio.value.current.artist, cover: continentRadio.value.current.cover, url: continentRadio.value.current.url })
  }
})
watch(() => countryRadio.value.currentSong?.id, (newId) => {
  if (radioFollowing.value && newId && activeCountry.value && radioAudio) {
    player.adoptRadioAudio(radioAudio, { id: countryRadio.value.currentSong.id, name: countryRadio.value.currentSong.name, artist: countryRadio.value.currentSong.artist, cover: countryRadio.value.currentSong.cover, url: countryRadio.value.currentSong.url })
  }
})
// Stop mirror when user navigates away from radio or plays something else
watch(() => player.currentSong?.id, (newId) => {
  if (radioFollowing.value) {
    const radioId = activeCountry.value ? countryRadio.value.currentSong?.id
      : activeContinent.value ? continentRadio.value.current?.id
      : globalRadio.value.current?.id
    if (newId !== radioId) {
      radioFollowing.value = false
      player.stopRadioMirror()
    }
  }
})

// ── Rankings helpers ───────────────────────────────────
function toggleHistWeek(type, week) {
  histOpen.value[type] = histOpen.value[type] === week ? null : week
}

function weekLabel(isoDate) {
  const d = new Date(isoDate)
  const jan4 = new Date(d.getFullYear(), 0, 4)
  const weekNum = Math.ceil(((d - jan4) / 86400000 + jan4.getDay() + 1) / 7)
  return `${weekNum} / ${d.getFullYear()}`
}

// ── Computed ───────────────────────────────────────────
const currentTitle = computed(() => {
  if (activeCountry.value)   return activeCountry.value.name
  if (activeContinent.value) return activeContinent.value.name + ' Radio'
  return 'Global Radio'
})
const titleKey  = computed(() => activeCountry.value?.iso ?? activeContinent.value?.id ?? 'global')
const glowStyle = computed(() => ({
  background: `radial-gradient(ellipse 80% 60% at 50% 40%, rgba(91,106,255,0.08) 0%, transparent 70%)`,
  transition: 'background 0.8s ease',
}))

// ── Styling ────────────────────────────────────────────
function contColor(cid) { return continentMeta.find(c => c.id === cid)?.color ?? '#334' }
function countryFill(f) {
  const cid = getContinentId(f.continent)
  const col = contColor(cid)
  if (activeCountry.value?.iso === f.iso) return col
  if (activeContinent.value) {
    if (activeContinent.value.id === cid) return col + 'bb'
    return 'rgba(240,237,230,0.05)'
  }
  return col + '99'
}
function countryStroke(f) {
  const cid = getContinentId(f.continent)
  const col = contColor(cid)
  if (activeCountry.value?.iso === f.iso) return col
  if (activeContinent.value?.id === cid)  return col + '66'
  if (activeContinent.value)               return 'rgba(240,237,230,0.04)'
  return col + '44'
}

// ── Load world data ────────────────────────────────────
onMounted(async () => {
  // Returning from radio-mode player — audio is still running, don't restart
  if (radioState.isRadioMode) {
    radioState.isRadioMode = false
    loadGlobalRadioSilent()  // restore UI state without touching audio
  } else {
    loadGlobalRadio()
  }

  try {
    const res  = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
    const world = await res.json()
    const nameRes  = await fetch('https://raw.githubusercontent.com/lukes/ISO-3166-Countries-with-Regional-Codes/master/all/all.json')
    const nameData = await nameRes.json()
    const nameById = {}
    nameData.forEach(c => { nameById[c['country-code']] = { name: c.name, region: c.region, subregion: c['sub-region'], alpha2: c['alpha-2'] } })

    const projection = d3.geoNaturalEarth1().scale(153).translate([W / 2, H / 2])
    const path = d3.geoPath().projection(projection)
    pathFn = path

    const countries = topojson.feature(world, world.objects.countries)
    const mapped = countries.features.map(f => {
      const id   = String(f.id).padStart(3, '0')
      const info = nameById[id] ?? {}
      const contRaw = info.region ?? 'Unknown'
      const subRaw  = info.subregion ?? ''
      const nameRaw = info.name ?? ''
      let continent = contRaw
      if (contRaw === 'Americas') {
        if (nameRaw === 'Mexico') continent = 'North America'
        else continent = ['Caribbean','South America'].some(s => subRaw.includes(s)) ? 'South America' : 'North America'
      }
      return {
        id: f.id, iso: id, alpha2: info.alpha2 || null,
        name: nameRaw || `Country ${id}`, continent,
        pathD: path(f) ?? '', centroid: path.centroid(f), rawBounds: path.bounds(f),
      }
    }).filter(f => f.pathD)

    rawFeatures.value = mapped
    geoFeatures.value = mapped
    loading.value = false
  } catch (e) {
    error.value = 'Karte konnte nicht geladen werden.'
    loading.value = false
  }
})

onUnmounted(() => {
  if (!radioState.isRadioMode) {
    stopRadioAudio()
  }
  clearInterval(radioTimer)
  player.stopRadioMirror()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600&display=swap');
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.radio-page { min-height: 100vh; background: #060c12; color: #f0ede6; font-family: 'DM Sans', sans-serif; display: flex; flex-direction: column; align-items: center; padding: 0 1rem 3rem; position: relative; overflow-x: hidden; }
.bg-noise { position: fixed; inset: 0; pointer-events: none; z-index: 0; background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E"); background-size: 180px; opacity: 0.7; }
.bg-glow { position: fixed; inset: 0; pointer-events: none; z-index: 0; }

/* Breadcrumb */
.breadcrumb { position: relative; z-index: 1; align-self: flex-start; display: flex; align-items: center; gap: 0.4rem; margin-bottom: 0.75rem; }
.bc-btn { background: none; border: none; cursor: pointer; color: rgba(240,237,230,0.35); font-family: 'DM Sans', sans-serif; font-size: 0.78rem; letter-spacing: 0.1em; padding: 0; transition: color 0.2s; }
.bc-btn:hover { color: #ff5a32; }
.bc-home { display: flex; align-items: center; gap: 0.3rem; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.08); border-radius: 4px; padding: 0.28rem 0.6rem; color: rgba(240,237,230,0.25); font-family: 'DM Sans', sans-serif; font-size: 0.78rem; cursor: pointer; transition: all 0.2s; }
.bc-home:hover { color: #f0ede6; background: rgba(240,237,230,0.08); }
.bc-trail { display: flex; align-items: center; gap: 0.4rem; }
.bc-sep { color: rgba(240,237,230,0.2); font-size: 0.75rem; }
.bc-crumb { background: none; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 0.78rem; color: rgba(240,237,230,0.45); padding: 0; transition: color 0.2s; }
.bc-crumb:hover { color: #f0ede6; }
.bc-crumb--active { color: #f0ede6; cursor: default; }
.friends-radio-btn { margin-left: auto; display: flex; align-items: center; gap: 0.4rem; background: rgba(91,106,255,0.1); border: 1px solid rgba(91,106,255,0.3); border-radius: 99px; padding: 0.32rem 0.85rem; color: #5b6aff; font-family: 'DM Sans', sans-serif; font-size: 0.72rem; cursor: pointer; transition: all 0.2s; }
.friends-radio-btn:hover { background: rgba(91,106,255,0.2); }
.fr-icon { font-size: 0.8rem; }

/* Header */
.page-header { position: relative; z-index: 1; margin-bottom: 1rem; }
.header-inner { display: flex; align-items: center; gap: 0.8rem; }
.page-title { font-family: 'Bebas Neue', cursive; font-size: 2.2rem; letter-spacing: 0.18em; color: #f0ede6; }
.live-badge { display: flex; align-items: center; gap: 0.35rem; background: rgba(255,50,50,0.15); border: 1px solid rgba(255,50,50,0.3); border-radius: 4px; padding: 0.2rem 0.5rem; font-size: 0.6rem; letter-spacing: 0.18em; color: #ff5050; font-weight: 600; }
.live-dot { width: 5px; height: 5px; border-radius: 50%; background: #ff5050; animation: pulse 1.2s ease infinite; }

/* Map */
.map-wrap { position: relative; z-index: 1; width: 100%; max-width: 780px; margin-bottom: 1.5rem; }
.map-loading { height: 380px; display: flex; align-items: center; justify-content: center; gap: 0.5rem; background: rgba(240,237,230,0.02); border-radius: 8px; border: 1px solid rgba(240,237,230,0.06); }
.loading-dot { width: 8px; height: 8px; border-radius: 50%; background: #5b9fff; animation: loadBounce 0.8s ease-in-out infinite; }
.loading-dot:nth-child(2) { animation-delay: 0.15s; }
.loading-dot:nth-child(3) { animation-delay: 0.3s; }
.map-error { height: 200px; display: flex; align-items: center; justify-content: center; color: rgba(240,237,230,0.4); font-size: 0.85rem; border: 1px dashed rgba(240,237,230,0.1); border-radius: 8px; }
.world-svg { width: 100%; display: block; aspect-ratio: 960/500; border-radius: 8px; overflow: hidden; border: 1px solid rgba(100,180,255,0.07); box-shadow: 0 0 40px rgba(0,0,0,0.5); }
.country-path { cursor: pointer; transition: fill 0.35s ease, stroke 0.35s ease, filter 0.2s; }
.zoom-group { will-change: transform; }
.zoom-group--animating { transition: transform 0.68s cubic-bezier(0.25,0.46,0.45,0.94); }
.country-path--dimmed { pointer-events: none; }
.country-path--continent:hover, .country-path--active { filter: brightness(1.4); }
.country-path--active { filter: brightness(1.6) drop-shadow(0 0 4px currentColor); }
.map-hint { margin-top: 0.6rem; text-align: center; font-size: 0.63rem; letter-spacing: 0.14em; text-transform: uppercase; color: rgba(240,237,230,0.2); }
.hint-back { background: none; border: none; cursor: pointer; color: rgba(240,237,230,0.4); font-family: 'DM Sans', sans-serif; font-size: 0.63rem; letter-spacing: 0.12em; text-transform: uppercase; padding: 0; transition: color 0.2s; }
.hint-back:hover { color: #ff5a32; }

/* Now Playing Card */
.now-playing-card { position: relative; z-index: 1; width: 100%; max-width: 480px; display: flex; flex-direction: column; gap: 0; background: rgba(240,237,230,0.04); border: 1px solid rgba(240,237,230,0.1); border-left: 3px solid var(--accent); border-radius: 6px; padding: 1rem 1.1rem; }
.npc-top { display: flex; align-items: center; gap: 1rem; }
.npc-cover { width: 46px; height: 46px; flex-shrink: 0; border-radius: 6px; border: 1px solid; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; }
.npc-cover--clickable { cursor: pointer; }
.npc-cover--clickable:hover .npc-play-hint { opacity: 1; }
.npc-play-hint { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); color: #fff; font-size: 1rem; opacity: 0; transition: opacity 0.2s; border-radius: inherit; }
.npc-info--clickable { cursor: pointer; }
.npc-info--clickable:hover .npc-song { text-decoration: underline; opacity: 0.85; }
.npc-cover-img { width: 100%; height: 100%; object-fit: cover; }
.npc-icon { font-size: 1.4rem; }
.npc-wave { position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%); display: flex; align-items: flex-end; gap: 2px; }
.npc-wave span { display: block; width: 2.5px; border-radius: 2px; background: rgba(240,237,230,0.6); animation: waveBar 0.8s ease-in-out infinite; }
.npc-wave span:nth-child(1) { height: 5px; animation-delay: 0s; }
.npc-wave span:nth-child(2) { height: 9px; animation-delay: 0.15s; }
.npc-wave span:nth-child(3) { height: 6px; animation-delay: 0.3s; }
.npc-wave span:nth-child(4) { height: 3px; animation-delay: 0.45s; }
.npc-info { flex: 1; display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
.npc-station { font-size: 0.58rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent); }
.npc-song { font-family: 'Bebas Neue', cursive; font-size: 1.05rem; letter-spacing: 0.08em; color: #f0ede6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.npc-artist { font-size: 0.7rem; color: rgba(240,237,230,0.4); }
.npc-controls { display: flex; gap: 0.35rem; flex-shrink: 0; }
.npc-mute, .npc-like { width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(240,237,230,0.15); background: rgba(240,237,230,0.05); color: rgba(240,237,230,0.5); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
.npc-mute:hover { color: #f0ede6; border-color: rgba(240,237,230,0.3); }
.npc-like:hover { color: #ff5a32; border-color: rgba(255,90,50,0.3); }
.npc-like.liked { color: #ff5a32; border-color: rgba(255,90,50,0.4); background: rgba(255,90,50,0.1); }
.npc-like:disabled { opacity: 0.3; cursor: default; }
.npc-empty { margin-top: 0.75rem; text-align: center; font-size: 0.7rem; color: rgba(240,237,230,0.3); }

/* Top row inside card */
.now-playing-card > .npc-cover,
.now-playing-card > .npc-info,
.now-playing-card > .npc-controls {
  /* these are direct children — lay them out in a row */
}
.now-playing-card { flex-direction: row; flex-wrap: wrap; align-items: center; }
.npc-info { flex: 1; }
.card-rankings-wrap { width: 100%; margin-top: 0.85rem; border-top: 1px solid rgba(240,237,230,0.06); padding-top: 0.75rem; }

/* Rankings toggle button */
.rankings-toggle-btn { width: 100%; background: rgba(240,237,230,0.03); border: 1px solid rgba(240,237,230,0.08); border-radius: 4px; padding: 0.55rem 0.85rem; color: rgba(240,237,230,0.5); font-family: 'DM Sans', sans-serif; font-size: 0.78rem; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s; }
.rankings-toggle-btn:hover { background: rgba(240,237,230,0.06); color: #f0ede6; }
.toggle-arrow { font-size: 0.65rem; opacity: 0.6; }

/* Historical weeks */
.hist-wrap { margin-top: 0.6rem; display: flex; flex-direction: column; gap: 0.4rem; }
.hist-week { }
.hist-week-btn { width: 100%; background: rgba(240,237,230,0.02); border: 1px solid rgba(240,237,230,0.06); border-radius: 3px; padding: 0.45rem 0.75rem; color: rgba(240,237,230,0.4); font-family: 'DM Sans', sans-serif; font-size: 0.75rem; cursor: pointer; display: flex; justify-content: space-between; transition: all 0.15s; }
.hist-week-btn:hover { background: rgba(240,237,230,0.05); color: #f0ede6; }
.rank-empty { font-size: 0.75rem; color: rgba(240,237,230,0.25); text-align: center; padding: 0.75rem 0; }

/* Rankings list */
.rankings-list { display: flex; flex-direction: column; gap: 0.25rem; max-height: 380px; overflow-y: auto; margin-top: 0.3rem; }
.rank-item { display: flex; align-items: center; gap: 0.65rem; padding: 0.45rem 0.5rem; border-radius: 3px; cursor: pointer; transition: background 0.15s; }
.rank-item:hover { background: rgba(240,237,230,0.05); }
.rank-nr { font-size: 0.7rem; color: rgba(240,237,230,0.25); width: 1.2rem; text-align: center; flex-shrink: 0; font-family: 'Bebas Neue', cursive; }
.rank-cover { width: 30px; height: 30px; border-radius: 3px; background: rgba(240,237,230,0.06); display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 0.8rem; overflow: hidden; }
.rank-cover-img { width: 100%; height: 100%; object-fit: cover; }
.rank-info { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.rank-name { font-size: 0.8rem; font-weight: 500; color: #f0ede6; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rank-artist { font-size: 0.63rem; color: rgba(240,237,230,0.35); }
.rank-pct { font-size: 0.7rem; color: #f0c832; flex-shrink: 0; font-family: 'Bebas Neue', cursive; }

/* Transitions */
.bc-fade-enter-active, .bc-fade-leave-active { transition: opacity 0.2s, transform 0.2s; }
.bc-fade-enter-from, .bc-fade-leave-to { opacity: 0; transform: translateX(-6px); }
.title-swap-enter-active, .title-swap-leave-active { transition: opacity 0.25s, transform 0.25s; }
.title-swap-enter-from { opacity: 0; transform: translateY(6px); }
.title-swap-leave-to   { opacity: 0; transform: translateY(-6px); }
.np-swap-enter-active, .np-swap-leave-active { transition: opacity 0.3s, transform 0.3s; }
.np-swap-enter-from { opacity: 0; transform: translateY(8px); }
.np-swap-leave-to   { opacity: 0; transform: translateY(-8px); }

@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.4; transform: scale(0.7); } }
@keyframes waveBar { 0%, 100% { transform: scaleY(0.5); } 50% { transform: scaleY(1.2); } }
@keyframes loadBounce { 0%, 100% { transform: translateY(0); opacity: 0.4; } 50% { transform: translateY(-8px); opacity: 1; } }

@media (max-width: 480px) { .page-title { font-size: 1.8rem; } }
</style>