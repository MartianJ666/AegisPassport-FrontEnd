import http from '../http'

// RBAC: role + permission management, plus per-user direct grants (the
// improvement over the original's role-only model).
export const rbacApi = {
  listPermissions: () => http.get('/admin/permissions'),
  listRoles: () => http.get('/admin/roles'),
  getRoleUsers: (role) => http.get(`/admin/roles/${role}/users`),
  // Direct grants
  grantPermission: (userId, payload) => http.post(`/admin/users/${userId}/permissions`, payload),
  revokePermission: (userId, code) => http.delete(`/admin/users/${userId}/permissions/${code}`),
  getUserPermissions: (userId) => http.get(`/admin/users/${userId}/permissions`),
  // Direct grants with scope/expiry, distinct from the effective union above.
  getDirectGrants: (userId) => http.get(`/admin/users/${userId}/direct-permissions`),
}

export const clientApi = {
  appAccess: (userId) => http.get(`/admin/users/${userId}/app-access`),
  setAppAccess: (userId,clientId,params) => http.put(`/admin/users/${userId}/app-access/${clientId}`,null,{params}),
  groupChoices: () => http.get('/groups'),
  list: () => http.get('/clients'),
  create: (formData) => http.post('/clients', formData),
  update: (clientId, formData) => http.put(`/clients/${clientId}`, formData),
  remove: (clientId) => http.delete(`/clients/${clientId}`),
}

export const consentApi = {
  list: () => http.get('/user/consents'),
  save: (payload) => http.post('/user/consents/save', payload),
  revoke: (id) => http.delete(`/user/consents/${id}`),
  revokeByClient: (clientId) => http.delete(`/user/consents/client/${clientId}`),
}
