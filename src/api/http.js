import { isConsentOrigin } from '@/utils/url'
import axios from 'axios'
import router from '@/router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { normalizeApiError } from '@/utils/errors'

// Single axios instance. Base is '/api' — Vite proxies it in dev and nginx
// proxies it in the container build.
const http = axios.create({
  baseURL: '/api',
  timeout: 20000,
  withCredentials: true,
})

http.interceptors.request.use((config) => {
  const auth = useAuthStore()
  const deviceKey = 'aegis_device_id'
  let deviceId = localStorage.getItem(deviceKey)
  if (!deviceId && window.crypto?.getRandomValues) { const bytes = new Uint8Array(16); window.crypto.getRandomValues(bytes); deviceId = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join(''); localStorage.setItem(deviceKey, deviceId) }
  config.headers['X-Device-ID'] = deviceId || 'browser-unknown-device'
  if (auth.token) {
    config.headers.Authorization = `Bearer ${auth.token}`
  }
  return config
})

http.interceptors.response.use(
  (resp) => {
    // Backend envelope: { code, message, data }. Unwrap to data on success.
    const body = resp.data
    if (body && typeof body === 'object' && 'code' in body) {
      if (body.code === 0 || (body.code >= 200 && body.code < 300)) {
        return body.data
      }
      // Business error surfaced with a non-zero code.
      if (!isLoginRequest(resp.config) && !resp.config.silentError) useUiStore().error(body.message || '请求失败')
      return Promise.reject(new ApiError(body.code, body.message, body.data, body.errorCode))
    }
    return body
  },
  async (error) => {
    if (axios.isCancel(error)) return Promise.reject(error)
    const ui = useUiStore()
    const auth = useAuthStore()
    const status = error.response?.status
    const original = error.config || {}
    const loginRequest = isLoginRequest(original)
    const failure = normalizeApiError(error)

    const incorrectConfirmation = failure.errorCode === 'INVALID_CREDENTIALS' && isCredentialConfirmation(original)
    if (status === 401 && !loginRequest && !incorrectConfirmation) {
      // This server has no refresh endpoint. Preserve the real 401 response
      // instead of replacing it with the refresh stub's "no-refresh" error.
      auth.clearSession()
      const onSso = typeof window !== 'undefined' && isConsentOrigin()
      if (!original.silentAuthFailure && !onSso && router.currentRoute.value.name !== 'login') {
        router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
      }
    }
    if (!loginRequest && !original.silentError && !(status === 401 && original.silentAuthFailure)) { ui.error(failure.message); failure.notified = true }
    return Promise.reject(failure)
  },
)

function isLoginRequest(config) {
  return ['/auth/login', '/oauth/temp-login'].includes(config?.url)
}

function isCredentialConfirmation(config) {
  const path = config?.url || ''
  return ['/user/change-password', '/user/sessions/revoke', '/user/sessions/delete-offline', '/user/sessions/revoke-verified', '/config/admin/security/global-logout', '/external/setup/merge'].includes(path)
    || /^\/external-identities\/[^/]+\/bind$/.test(path)
}

export class ApiError extends Error {
  constructor(code, message, data, errorCode) {
    super(message)
    this.code = code
    this.data = data
    this.errorCode = errorCode
  }
}

export default http
