import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Login',
    component: () => import('@/views/Login.vue')
  },
  {
    path: '/home',
    name: 'Home',
    component: () => import('@/views/Home.vue')
  },
  {
    path: '/record_list',
    name: 'RecordList',
    component: () => import('@/views/RecordList.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router