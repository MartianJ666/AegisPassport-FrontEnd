import { isConsentOrigin } from '@/utils/url'
import { defineStore } from 'pinia'
import http from '@/api/http'
import { encryptPassword } from '@/api/crypto'

const TOKEN_KEY = 'passport_token'

function readTokenCookie() {
  const item = document.cookie.split('; ').find((entry) => entry.startsWith('token='))
  return item ? decodeURIComponent(item.slice('token='.length)) : ''
}

// Auth store: owns the JWT, the current user profile, and the derived
// permission set. Route guards and <permission> gates read from here.
export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem(TOKEN_KEY) || '',
    user: null,
    permissions: [],
    roles: [],
    loaded: false,
  }),
  getters: {
    // A server-verified profile may authenticate via the HttpOnly host cookie.
    isAuthenticated: (s) => !!s.user,
    isAdmin: (s) => s.roles.includes('admin') || s.permissions.includes('*'),
    needsSetup: (s) => !!s.user?.needsSetup,
    displayName: (s) => s.user?.nickname || s.user?.username || '',
  },
  actions: {
    setToken(token) {
      this.token = token
      if (token) localStorage.setItem(TOKEN_KEY, token)
      else localStorage.removeItem(TOKEN_KEY)
    },

    // Called once at app start. Loads the profile if a token is present.
    async bootstrap() {
      // External login has issued a new HttpOnly cookie. A cached bearer token
      // must not override that freshly authenticated account during bootstrap.
      if (new URLSearchParams(window.location.search).get('external') === 'complete') this.setToken('')
      // On the sso origin (account-confirm / consent pages) the passport JWT
      // cookie is not present and these pages authenticate via their opaque
      // tokens. Fetching the profile there would 401 and bounce the SPA to the
      // login page, aborting the OAuth flow.
      if (typeof window !== 'undefined' && isConsentOrigin()) {
        this.loaded = true
        return
      }
      try {
        await this.fetchProfile(true)
      } catch {
        this.clearSession()
      } finally {
        this.loaded = true
      }
    },

    async login({ username, password }) {
      const encrypted = await encryptPassword(password)
      const data = await http.post('/auth/login', { username, password: encrypted })
      this.setToken(data.token || readTokenCookie())
      await this.fetchProfile()
      return data
    },

    // Temporary account switch for an OAuth consent flow. Verifies the target
    // account WITHOUT replacing the main session/JWT. Returns { tempToken, username, hasConsent }.
    async tempLogin({ clientId, username, password }) {
      const encrypted = await encryptPassword(password)
      return http.post('/oauth/temp-login', { clientId, username, passwordEncrypted: encrypted })
    },

    async fetchProfile(silentAuthFailure = false) {
      const profile = await http.get('/user/profile', { silentAuthFailure })
      this.user = profile
      this.permissions = profile.permissions || []
      this.roles = profile.roles || []
      return profile
    },

    // No server-side refresh endpoint — token is a 7-day JWT. A 401 means the
    // token expired, so we reject and let the interceptor force a re-login.
    async refresh() {
      throw new Error('no-refresh')
    },

    async logout() {
      try {
        await http.post('/auth/logout')
      } catch {
        /* best-effort */
      }
      this.clearSession()
    },

    clearSession() {
      this.setToken('')
      this.user = null
      this.permissions = []
      this.roles = []
    },

    hasPermission(code) {
      if (!code) return true
      if (this.permissions.includes('*')) return true
      return this.permissions.includes(code)
    },

    hasAnyPermission(codes = []) {
      return codes.some((c) => this.hasPermission(c))
    },
  },
})
