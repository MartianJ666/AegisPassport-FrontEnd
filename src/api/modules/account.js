import http from '../http'

// Auth + account lifecycle. RSA-encrypted fields (password) are encrypted by
// the caller via the crypto helper before hitting these.
export const authApi = {
  login: (payload) => http.post('/auth/login', payload),
  logout: () => http.post('/auth/logout'),
  register: (payload) => http.post('/auth/register', payload),
  sendCode: (email) => http.post('/auth/send-verification-code', { email }),
}

export const userApi = {
  profile: () => http.get('/user/profile'),
  updateProfile: (payload) => http.put('/user/profile', payload),
  changePassword: (payload) => http.post('/user/change-password', payload),
  changeUsername: (payload) => http.put('/user/username', payload),
  // Admin
  list: (params) => http.get('/user/admin/users', { params }),
  search: (params) => http.get('/user/admin/users/search', { params }),
  update: (id, payload) => http.put(`/user/admin/users/${id}`, payload),
  resetPassword: (id, payload) => http.post(`/user/admin/users/${id}/reset-password`, payload),
  remove: (id) => http.delete(`/user/admin/users/${id}`),
  batchEnable: (userIds, enabled) => http.post('/user/admin/users/batch/enable', { userIds, enabled }),
  batchAssignRole: (userIds, roleCode) => http.post('/user/admin/users/batch/roles', { userIds, roleCode }),
  batchDelete: (userIds) => http.post('/user/admin/users/batch/delete', { userIds }),
  sessions: () => http.get('/user/sessions'),
  sessionCaptcha: () => http.post('/user/sessions/captcha'),
  sendSessionCode: (captchaId, captchaAnswer) => http.post('/user/sessions/verification-code', { captchaId, captchaAnswer }),
  revokeSessions: (sessionIds, passwordEncrypted) => http.post('/user/sessions/revoke', { sessionIds, passwordEncrypted }),
  deleteOfflineSessions: (sessionIds, passwordEncrypted) => http.post('/user/sessions/delete-offline', { sessionIds, passwordEncrypted }),
  revokeVerifiedSessions: (sessionIds, passwordEncrypted, code) => http.post('/user/sessions/revoke-verified', { sessionIds, passwordEncrypted, code }),
  assignRoles: (id, roleCodes) => http.post(`/user/admin/users/${id}/roles`, roleCodes),
  create: (payload) => http.post('/auth/register', payload),
}
