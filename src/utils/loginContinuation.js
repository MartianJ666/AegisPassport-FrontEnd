import { safeRedirect } from './url'

const KEY = 'passport.external-continuation'
const TTL = 5 * 60 * 1000

// Per-tab storage: two applications starting login in different tabs must not
// overwrite each other's return URL. This is navigation state, never identity.
export function rememberExternalContinuation(value) {
  const target = safeRedirect(value)
  sessionStorage.removeItem(KEY)
  if (target) sessionStorage.setItem(KEY, JSON.stringify({ target, createdAt: Date.now() }))
}

export function externalContinuation(consume = false) {
  try {
    const entry = JSON.parse(sessionStorage.getItem(KEY) || 'null')
    if (!entry || !Number.isFinite(entry.createdAt) || Date.now() - entry.createdAt > TTL || entry.createdAt > Date.now()) {
      sessionStorage.removeItem(KEY)
      return null
    }
    const target = safeRedirect(entry.target)
    if (consume || !target) sessionStorage.removeItem(KEY)
    return target
  } catch {
    sessionStorage.removeItem(KEY)
    return null
  }
}
