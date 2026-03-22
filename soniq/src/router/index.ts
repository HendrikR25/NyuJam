import { createRouter, createWebHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Search from '../views/Search.vue'
import Playlists from '../views/Playlist/Playlists.vue'
import Player from '../views/Player.vue'
import Radio from '@/views/Radio/Radio.vue'
import PlaylistDetail from '@/views/Playlist/PlaylistDetail.vue'
import Community from '@/views/Community/Community.vue'
import Friends from '@/views/Community/Friends.vue'
import Groups from '@/views/Community/Groups.vue'
import Chats from '@/views/Chats/Chats.vue'
import FriendsRadio from '@/views/Radio/FriendsRadio.vue'

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
    },
    {
      path: '/radio',
      name: 'radio',
      component: Radio,
    },
    {
      path: '/friends-radio',
      name: 'friends-radio',
      component: FriendsRadio,
    },
    {
      path: '/playlists/:id',
      component: PlaylistDetail,
    },
    {
      path: '/community',
      name: 'community',
      component: Community,
    },
    {
      path: '/friends',
      name: 'friends',
      component: Friends,
    },
    {
      path: '/groups',
      name: 'groups',
      component: Groups,
    },
    {
      path: '/chats',
      name: 'chats',
      component: Chats,
    },
  ],
})

export default router
