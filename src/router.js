import { createRouter, createWebHistory } from 'vue-router';
import { getToken } from './api.js';
import LoginView from './views/LoginView.vue';
import LedgersView from './views/LedgersView.vue';
import LedgerDetailView from './views/LedgerDetailView.vue';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/ledgers' },
    { path: '/login', component: LoginView },
    { path: '/ledgers', component: LedgersView },
    { path: '/ledgers/:id', component: LedgerDetailView, props: true },
    { path: '/:pathMatch(.*)*', redirect: '/ledgers' },
  ],
});

router.beforeEach((to) => {
  if (to.path !== '/login' && !getToken()) return '/login';
  if (to.path === '/login' && getToken()) return '/ledgers';
});
