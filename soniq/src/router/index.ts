import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Search from '../views/Search.vue'
import Playlists from '../views/Playlists.vue'
import Player from '../views/Player.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    },
    {
      path: '/search',
      name: 'search',
      component: Search,
    },
    {
      path: '/playlists',
      name: 'playlists',
      component: Playlists,
    },
    {
      path: '/player',
      name: 'player',
      component: Player,
    }
  ],
})

export default router
