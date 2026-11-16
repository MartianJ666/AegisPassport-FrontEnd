// Nav model for the dashboard drawer. Each item carries an optional
// `permission` (single code) or `permissionAny` (any of several codes) — items
// the user can't access are filtered out client-side (the server still enforces
// every endpoint).
export const navSections = [
  {
    title: '账户',
    items: [
      { title: '概览', icon: 'mdi-view-dashboard-outline', to: { name: 'home' } },
      { title: '个人资料', icon: 'mdi-account-circle-outline', to: { name: 'profile' } },
      { title: '安全设置', icon: 'mdi-shield-lock-outline', to: { name: 'security' } },
      { title: '授权应用', icon: 'mdi-apps', to: { name: 'my-consents' }, permission: 'consent:read' },
      { title: 'API 密钥', icon: 'mdi-key-variant', to: { name: 'api-keys' }, permission: 'apikey:read' },
    ],
  },
  {
    title: '管理',
    items: [
      { title: '用户管理', icon: 'mdi-account-group-outline', to: { name: 'admin-users' }, permission: 'user:read' },
      { title: '组织管理', icon: 'mdi-domain', to: { name: 'admin-organizations' }, permission: 'organization:read' },
      { title: '角色权限', icon: 'mdi-shield-account-outline', to: { name: 'admin-roles' }, permission: 'role:read' },
      { title: 'OAuth 应用', icon: 'mdi-application-cog-outline', to: { name: 'admin-clients' }, permission: 'client:read' },
      { title: '第三方登录管理', icon: 'mdi-account-key-outline', to: { name: 'admin-third-party-login' }, permission: 'system:config:edit' },
      { title: '公告管理', icon: 'mdi-bullhorn-outline', to: { name: 'admin-announcements' }, permission: 'announcement:write' },
      { title: '审计日志', icon: 'mdi-history', to: { name: 'admin-audit' }, permission: 'audit:read' },
      { title: 'API 密钥管理', icon: 'mdi-key-chain', to: { name: 'admin-api-keys' }, permission: 'apikey:admin' },
      { title: '邮件配置', icon: 'mdi-email-outline', to: { name: 'admin-email' }, permission: 'system:config:view' },
      { title: '系统设置', icon: 'mdi-cog-outline', to: { name: 'admin-settings' }, permission: 'system:config:view' },
    ],
  },
]
