// Resolves server-relative asset paths (avatars and client icons served
// under /uploads/**) into browser-loadable URLs.
//
// In dev the Vite proxy forwards /uploads to the backend, so a leading-slash
// path works as-is. Absolute http(s) URLs and data: URIs pass through.

export function resolveAssetUrl(path) {
  if (!path) return ''
  if (/^(https?:)?\/\//i.test(path) || path.startsWith('data:')) return path
  return path.startsWith('/') ? path : `/${path}`
}

/**
 * Returns a value that is safe to navigate to after login, or null.
 *
 * Absolute http(s) URLs are allowed ONLY when they share the current origin
 * or use the sibling sso authorization endpoint (normalized to pass), or point
 * at a localhost dev host. Other cross-origin / protocol-relative / javascript: URLs are
 * rejected — otherwise a crafted `?redirect=` on the login page becomes an open
 * redirect that dumps an already-authenticated user onto an attacker's site.
 * Relative paths (single leading slash) pass through unchanged.
 */
export function safeRedirect(value) {
  if (!value) return null
  const s = String(value)
  if (/[\\\x00-\x20]/.test(s)) return null
  if (s.startsWith('/') && !s.startsWith('//')) return s
  try {
    const u = new URL(s, window.location.origin)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null
    if (u.origin === window.location.origin) return s
    // Login runs on pass.*, while OAuth can have started on its sso sibling.
    // Only the authorization endpoint may cross this boundary; preserve its
    // complete query and resume on pass so its host-only login cookie is sent.
    if (u.protocol === 'https:' && u.origin === authOrigin('sso') && u.pathname === '/oauth2/authorize' && !u.username && !u.password) {
      return authOrigin('pass') + u.pathname + u.search
    }
    // Dev convenience: the Vite proxy serves the API from localhost origins.
    if (['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) && ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)) return s
  } catch {
    /* not a parseable URL */
  }
  return null
}

export function isServerContinuation(target) {
  return !!target && (/^https?:\/\//i.test(target) || /^\/oauth2\/(authorize|consent-redirect)(?:[?#]|$)/.test(target))
}

// The default is one origin. Separate consent hosting is opt-in.
export function authOrigin(kind) {
  const configured = kind === 'sso' ? import.meta.env?.VITE_CONSENT_ORIGIN : import.meta.env?.VITE_AUTH_ORIGIN
  return configured ? new URL(configured).origin : window.location.origin
}

export function isConsentOrigin() {
  return authOrigin('sso') !== authOrigin('pass') && window.location.origin === authOrigin('sso')
}
