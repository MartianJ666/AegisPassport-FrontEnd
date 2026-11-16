import http from '../http'

export const apiKeyApi = {
  create: (payload) => http.post('/api-keys', payload),
  listMine: () => http.get('/api-keys/my'),
  deleteMine: (id) => http.delete(`/api-keys/my/${id}`),
  toggleMine: (id) => http.patch(`/api-keys/my/${id}/toggle`),
  // Admin
  listAll: () => http.get('/admin/api-keys'),
  deleteById: (id) => http.delete(`/admin/api-keys/${id}`),
  toggleAdmin: (id) => http.patch(`/admin/api-keys/${id}/toggle`),
}

export const auditApi = {
  list: (params) => http.get('/admin/audit-logs', { params }),
  modules: () => http.get('/admin/audit-logs/modules'),
  actions: () => http.get('/admin/audit-logs/actions'),
  statistics: (params) => http.get('/admin/audit-logs/statistics', { params }),
  archive: (before) => http.post('/admin/audit-logs/archive', null, { params: { before } }),
  exportUrl: '/admin/audit-logs/export',
}

export const emailApi = {
  get: () => http.get('/admin/email-config'),
  save: (payload) => http.post('/admin/email-config', payload),
  test: (email) => http.post('/admin/email-config/test', null, { params: { email } }),
}

export const announcementApi = {
  active: () => http.get('/announcements/active'), list: () => http.get('/admin/announcements'),
  create: payload => http.post('/admin/announcements', payload), update: (id, payload) => http.put(`/admin/announcements/${id}`, payload),
  remove: id => http.delete(`/admin/announcements/${id}`), targetOptions: () => http.get('/admin/announcements/target-options'),
}
export const systemConfigApi = {
  loginConfig: () => http.get('/config/login', { silentError: true }),
  uploadBackground: body => http.post('/config/admin/login-background/upload', body),
  saveBackground: body => http.post('/config/admin/login-background', body),
  sessionPolicy: () => http.get('/config/admin/security/session-policy'),
  saveSessionPolicy: (payload) => http.put('/config/admin/security/session-policy', payload),
  globalLogout: (revokeOAuthSessions, passwordEncrypted) => http.post('/config/admin/security/global-logout', { revokeOAuthSessions, passwordEncrypted }),
}


export const thirdPartyLoginApi = {
  get: () => http.get('/admin/third-party-login'),
  save: (payload) => http.put('/admin/third-party-login', payload),
}


export const externalIdentityApi = {
  list: () => http.get('/external-identities'),
  providers: () => http.get('/external-identities/providers'),
  bind: (provider, payload) => http.post(`/external-identities/${provider}/bind`, payload),
  disconnect: (id) => http.post(`/external-identities/${id}/disconnect`),
}

export const externalSetupApi = {
  setup: (payload) => http.post('/external/setup', payload),
  merge: (payload) => http.post('/external/setup/merge', payload),
}

export const fileApi = {
  uploadAvatar: (formData) => http.post('/files/avatar', formData),
}
