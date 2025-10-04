import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'TableList',
    component: () => import('@/views/TableList.vue')
  },
  {
    path: '/luzhu',
    name: 'LuZhuList',
    component: () => import('@/views/LuZhuList.vue')
  },
  {
    path: '/luzhu/edit',
    name: 'LuZhuEdit',
    component: () => import('@/views/LuZhuListEdit.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router