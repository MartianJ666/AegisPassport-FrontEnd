import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { safeRedirect, authOrigin, isServerContinuation, isConsentOrigin } from '@/utils/url'
import { externalContinuation } from '@/utils/loginContinuation'
import { pageDescription } from '@/utils/audit'

// Route meta:
//   requiresAuth  — must be logged in
//   permission    — single permission code required to view
//   permissionAny — any of the listed permission codes may view
//   layout        — 'dashboard' (default) uses the app shell; 'blank' is standalone
const routes = [
  {
    path: '/auth/external-error',
    name: 'external-error',
    component: () => import('@/views/auth/ExternalLoginErrorView.vue'),
    meta: { layout: 'blank', public: true },
  },
  {
    path: '/auth/login',
    name: 'login',
    component: () => import('@/views/auth/LoginView.vue'),
    meta: { layout: 'blank', public: true },
  },
  {
    path: '/auth/register',
    name: 'register',
    component: () => import('@/views/auth/RegisterView.vue'),
    meta: { layout: 'blank', public: true },
  },
  {
    path: '/auth/complete-external',
    name: 'complete-external',
    component: () => import('@/views/auth/CompleteExternalView.vue'),
    meta: { layout: 'blank', requiresAuth: true },
  },
  {
    // Consent page is served on sso.* where there is no SPA auth state; access is
    // gated server-side at /oauth2/consent-redirect (opaque token / denied flag).
    path: '/oauth2/consent',
    name: 'consent',
    component: () => import('@/views/auth/ConsentView.vue'),
    meta: { layout: 'blank', public: true },
  },
  {
    // Account-confirmation gate shown on sso.* before every OAuth authorize. It is
    // separate from the consent page: it confirms WHICH account will log in, while
    // the consent page approves the scopes/permissions.
    path: '/oauth2/account-confirm',
    name: 'account-confirm',
    component: () => import('@/views/auth/AccountConfirmView.vue'),
    meta: { layout: 'blank', public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/DashboardLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: 'home' } },
      { path: 'home', name: 'home', component: () => import('@/views/HomeView.vue') },
      { path: 'profile', name: 'profile', component: () => import('@/views/ProfileView.vue') },
      { path: 'security', name: 'security', component: () => import('@/views/SecurityView.vue') },
      { path: 'consents', name: 'my-consents', component: () => import('@/views/ConsentsView.vue'), meta: { permission: 'consent:read' } },
      { path: 'api-keys', name: 'api-keys', component: () => import('@/views/ApiKeysView.vue'), meta: { permission: 'apikey:read' } },
      { path: 'admin/announcements', name: 'admin-announcements', component: () => import('@/views/admin/AnnouncementsView.vue'), meta: { permission: 'announcement:write' } },
      // ── Admin area ──────────────────────────────────────────────────────
      {
        path: 'admin/users', name: 'admin-users',
        component: () => import('@/views/admin/UsersView.vue'),
        meta: { permission: 'user:read' },
      },
      {
        path: 'admin/organizations', name: 'admin-organizations',
        component: () => import('@/views/admin/OrganizationsView.vue'),
        meta: { permission: 'organization:read' },
      },
      {
        path: 'admin/roles', name: 'admin-roles',
        component: () => import('@/views/admin/RolesView.vue'),
        meta: { permission: 'role:read' },
      },
      {
        path: 'admin/clients', name: 'admin-clients',
        component: () => import('@/views/admin/ClientsView.vue'),
        meta: { permission: 'client:read' },
      },
      {
        path: 'admin/audit-logs', name: 'admin-audit',
        component: () => import('@/views/admin/AuditLogsView.vue'),
        meta: { permission: 'audit:read' },
      },
      {
        path: 'admin/api-keys', name: 'admin-api-keys',
        component: () => import('@/views/admin/AdminApiKeysView.vue'),
        meta: { permission: 'apikey:admin' },
      },
      {
        path: 'admin/email', name: 'admin-email',
        component: () => import('@/views/admin/EmailConfigView.vue'),
        meta: { permission: 'system:config:view' },
      },
      {
        path: 'admin/third-party-login', name: 'admin-third-party-login',
        component: () => import('@/views/admin/ThirdPartyLoginSettingsView.vue'),
        meta: { permission: 'system:config:edit' },
      },
      {
        path: 'admin/settings', name: 'admin-settings',
        component: () => import('@/views/admin/SystemSettingsView.vue'),
        meta: { permission: 'system:config:view' },
      },
    ],
  },
  {
    path: '/403',
    name: 'forbidden',
    component: () => import('@/views/error/ForbiddenView.vue'),
    meta: { layout: 'blank', public: true },
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/error/NotFoundView.vue'),
    meta: { layout: 'blank', public: true },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

// Lightweight authenticated page-view audit beacon. Best-effort: failures are
// swallowed and never block navigation. Uses fetch (not the axios instance) to
// avoid an import cycle with http.js.
router.afterEach((to) => {
  if (to.meta.public || !to.name) return
  const auth = useAuthStore()
  if (!auth.isAuthenticated) return
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 2000)
  fetch('/api/audit/page-view', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth.token ? { Authorization: `Bearer ${auth.token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ page: pageDescription(to.name), path: to.fullPath }),
    signal: controller.signal,
  })
    .catch(() => {})
    .finally(() => clearTimeout(timer))
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  // ── Host-based guard: keep pass (management) and sso (consent/confirm) separate ──
  const host = window.location.hostname
  const isSso = isConsentOrigin()
  const ssoOnlyRoutes = ['consent', 'account-confirm']
  if (isSso && !ssoOnlyRoutes.includes(to.name) && to.name !== "login") {
    // sso only serves the OAuth consent/confirm pages — everything else is pass.
    window.location.href = authOrigin('pass') + to.fullPath
    return false
  }
  if (authOrigin('pass') !== authOrigin('sso') && window.location.origin === authOrigin('pass') && ssoOnlyRoutes.includes(to.name)) {
    // pass is not a consent origin; redirect that view to sso.
    window.location.href = authOrigin('sso') + to.fullPath
    return false
  }

  // The auth store bootstraps before the app is mounted, but waiting here as
  // well makes navigation safe if a browser restores a route before that
  // promise has settled (for example after a hard refresh).
  if (!auth.loaded) await auth.bootstrap()
  const continuation = safeRedirect(to.query.redirect) || (to.query.external === 'complete' ? externalContinuation() : null)

  // Third-party temporary accounts must finish email/password setup first.
  if (auth.needsSetup) {
    if (to.name === 'complete-external') return true
    return { name: 'complete-external', query: continuation ? { redirect: continuation } : {} }
  }
  if (to.name === 'complete-external') {
    if (isServerContinuation(continuation)) { window.location.assign(continuation); return false }
    return continuation || { name: 'home' }
  }

  if (to.meta.public) {
    if (to.name === 'login' && auth.isAuthenticated) {
      // Temp account-switch mode must show the login form even when the main
      // account is authenticated — the user is logging in a DIFFERENT account.
      if (to.query.mode === 'temp') return true
      const target = continuation
      if (to.query.external === 'complete') externalContinuation(true)
      if (isServerContinuation(target)) {
        // OAuth flow: SAS session expired but JWT still valid. Re-visit the
        // authorize URL (same-origin only) — the backend will either grant
        // (session alive) or re-prompt login (session truly gone). Cross-origin
        // / non-http(s) redirects are rejected to prevent open redirects.
        window.location.href = target
        return false
      }
      return target || { name: 'home' }
    }
    return true
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.permission && !auth.hasPermission(to.meta.permission)) {
    return { name: 'forbidden' }
  }
  if (to.meta.permissionAny && !auth.hasAnyPermission(to.meta.permissionAny)) {
    return { name: 'forbidden' }
  }

  return true
})

export default router
