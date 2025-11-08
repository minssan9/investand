import { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { 
        path: '', 
        component: () => import('@/pages/IndexPage.vue'),
        meta: { title: 'investand' }
      },
      { 
        path: 'history', 
        component: () => import('@/pages/HistoryPage.vue'),
        meta: { title: 'Fear & Greed Index 히스토리' }
      },
      { 
        path: 'statistics', 
        component: () => import('@/pages/StatisticsPage.vue'),
        meta: { title: 'Fear & Greed Index 통계' }
      },
      { 
        path: 'about', 
        component: () => import('@/pages/AboutPage.vue'),
        meta: { title: 'About - Fear & Greed Index' }
      },
      { 
        path: 'dart-data', 
        component: () => import('@/pages/DartDataPage.vue'),
        meta: { title: 'DART 공시 데이터' }
      },
      { 
        path: 'dart-manage', 
        component: () => import('@/pages/DartManagePage.vue'),
        meta: { title: 'DART 주식 보유현황 관리' }
      }
    ],
  },

  // Admin Login
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('@/pages/admin/LoginPage.vue'),
    meta: { title: 'Admin Login', requiresGuest: true }
  },
  // Admin Routes
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'admin-dashboard',
        component: () => import('@/pages/admin/DashboardPage.vue'),
        meta: { title: 'Admin Dashboard' }
      },
      {
        path: 'dart',
        name: 'admin-dart',
        component: () => import('@/pages/admin/DartAdminPage.vue'),
        meta: { title: 'DART Data Management' }
      },
      {
        path: 'fear-greed',
        name: 'admin-fear-greed',
        component: () => import('@/pages/admin/FearGreedAdminPage.vue'),
        meta: { title: 'Fear & Greed Index Management' }
      }
    ]
  },

  // 항상 마지막에 위치
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
  },
]

export default routes 