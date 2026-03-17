import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Playlists from '../views/Playlists.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    },
    {
      path: '/playlists',
      name: 'playlists',
      component: Playlists,
    },
  ],
})

export default router
