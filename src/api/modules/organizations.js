import http from '../http'
export const organizationApi = {
  list: () => http.get('/organizations'),
  create: (data) => http.post('/organizations', data),
  update: (id, data) => http.put(`/organizations/${id}`, data),
  remove: (id) => http.delete(`/organizations/${id}`),
  members: (id) => http.get(`/organizations/${id}/members`),
  setMember: (id, userId, member) => http.put(`/organizations/${id}/members/${userId}`, { member }),
  apps: (id) => http.get(`/organizations/${id}/apps`),
  setApps: (id, changes) => http.put(`/organizations/${id}/apps`, changes),
}
