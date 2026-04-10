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
import Donation from '@/views/Donation/Donation.vue'
import ArtistProfile from '@/views/Profiles/ArtistProfile.vue'
import Profile from '@/views/Profiles/Profile.vue'
import Upload from '@/views/Upload.vue'

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
    {
      path: '/donation',
      name: 'donation',
      component: Donation,
    },
    {
      path: '/artist/:name',
      name: 'artist-profile',
      component: ArtistProfile,
    },
    {
      path: '/profile',
      name: 'profile',
      component: Profile,
    },
    {
      path: '/upload',
      name: 'upload',
      component: Upload,
    },
    { path: '/verify-email',   component: () => import('@/views/VerifyEmail.vue') },
    { path: '/reset-password', component: () => import('@/views/ResetPassword.vue') },
    { path: '/about',          component: () => import('@/views/About.vue') },
    { path: '/comments', component: () => import('@/views/Comments.vue') },
  ]
})

export default router