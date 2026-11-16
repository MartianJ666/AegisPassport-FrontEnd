// 审计日志展示辅助：操作码/模块码 → 中文名，User-Agent → 机型。
//
// 后端只存英文动作码（如 USER_VIEW、LOGIN）和原始 User-Agent 串，这里负责在
// 界面上翻译成可读的中文与机型。未收录的码原样展示（很多动作本身已存中文）。
import { navSections } from '../layouts/navigation.js'

const PAGE_LABELS = Object.fromEntries(navSections.flatMap(section =>
  section.items.map(item => [item.to.name, item.title])))
Object.assign(PAGE_LABELS, {
  login: '登录', register: '注册', 'complete-external': '账号设置',
  consent: '应用授权', 'account-confirm': '登录账号确认',
  forbidden: '访问受限提示', 'not-found': '页面不存在提示',
})

/** 新访问使用中文入库，历史页面标识在展示时兼容转换。 */
export function pageDescription(page) {
  const value = String(page || '').trim()
  if (PAGE_LABELS[value]) return `访问${PAGE_LABELS[value]}`
  if (/[\u4e00-\u9fff]/.test(value)) return value.startsWith('访问') ? value : `访问${value}`
  return '访问其他页面'
}

export function descriptionLabel(event) {
  if (event?.module === 'page' && event?.action === 'VIEW') return pageDescription(event.description)
  return event?.description?.trim() || EMPTY_DESCRIPTIONS[`${event?.module}/${event?.action}`] || '—'
}

const EMPTY_DESCRIPTIONS = {
  '公告/创建': '创建公告', '公告/更新': '更新公告', '公告/删除': '删除公告',
  'API密钥/创建': '创建 API 密钥', 'API密钥/删除': '删除 API 密钥',
  '应用管理/创建应用': '创建 OAuth 应用', '应用管理/更新应用': '更新 OAuth 应用', '应用管理/删除应用': '删除 OAuth 应用',
  '授权管理/保存授权': '保存应用授权', '授权管理/撤销授权': '撤销单条应用授权', '授权管理/撤销客户端授权': '撤销客户端的全部授权',
}

const ACTION_LABELS = {
  // user 模块
  VIEW_PROFILE: '查看资料',
  UPDATE_PROFILE: '修改资料',
  CHANGE_PASSWORD: '修改密码',
  CHANGE_USERNAME: '修改用户名',
  RESET_PASSWORD: '重置用户密码',
  VIEW_USERS: '查看用户',
  UPDATE_USER: '编辑用户',
  DELETE_USER: '删除用户',
  BATCH_ENABLE: '批量启停用户',
  BATCH_ASSIGN_ROLE: '批量分配角色',
  BATCH_DELETE: '批量删除用户',
  ASSIGN_ROLE: '分配角色',
  BAN_USER: '封禁/解封用户',
  // system 模块
  BACKGROUND_UPLOAD: '上传背景图',
  BACKGROUND_SAVE: '保存背景设置',
  THIRD_PARTY_LOGIN_CONFIG_SAVE: '保存第三方登录配置',
  // auth 模块
  REGISTER: '注册账户',
  LOGIN: '登录',
  LOGIN_FAILED: '登录失败',
  LOGOUT: '退出登录',
  SESSION_LIST: '查看登录设备',
  SESSION_REVOKE: '注销登录设备',
  SESSION_DELETE_OFFLINE: '删除离线设备记录',
  DEVICE_POLICY_CHANGED: '修改多设备登录策略',
  ADMIN_GLOBAL_LOGOUT: '注销全平台登录状态',
  CREATE_ORGANIZATION: '新建组织',
  UPDATE_ORGANIZATION: '编辑组织',
  DELETE_ORGANIZATION: '删除空组织',
  ASSIGN_ORGANIZATION: '调整组织成员',
  ORGANIZATION_APP_ACCESS: '调整组织应用权限',
  ADMIN_APP_ACCESS: '调整个人应用权限',
  LINK: '绑定第三方账号',
  DISCONNECT: '解绑第三方账号',
  SETUP_COMPLETE: '完成第三方账号设置',
  SETUP_MERGE: '合并第三方账号',
  // oauth 模块
  TEMP_LOGIN: '应用账号切换',
  TEMP_LOGIN_FAILED: '应用账号切换失败',
  AUTHORIZE: '授权登录应用',
  // page 模块
  VIEW: '访问页面',
}

const MODULE_LABELS = {
  user: '用户管理',
  system: '系统配置',
  auth: '认证',
  oauth: 'OAuth 登录',
  page: '页面访问',
  organization: '组织管理',
  client: '个人应用权限',
  security: '登录安全策略',
  'external-auth': '第三方账号',
}

/** 模块码 → 中文名（未收录时原样返回）。 */
export function moduleLabel(module) {
  if (!module) return '—'
  return MODULE_LABELS[module] || module
}

/** 操作码 → 中文名（未收录时原样返回）。 */
export function actionLabel(action) {
  if (!action) return '—'
  return ACTION_LABELS[action] || action
}

/** 事件 ID 短显（前 8 位 + …），悬停可看完整值。 */
export function shortEventId(eventId) {
  if (!eventId) return '—'
  return eventId.length > 12 ? `${eventId.slice(0, 12)}…` : eventId
}

/**
 * 从 User-Agent 解析出一个可读的“机型”。纯字符串启发式，不引入解析库；
 * Android 设备取 UA 中 `; <model> Build/` 的机型码（如 2210132C）。
 */
export function parseDevice(userAgent) {
  if (!userAgent) return '—'
  const ua = String(userAgent)

  if (ua.includes('iPhone')) return 'iPhone'
  if (ua.includes('iPad')) return 'iPad'
  if (ua.includes('iPod')) return 'iPod'

  if (ua.includes('Windows')) {
    if (ua.includes('Windows NT 10.0')) return 'Windows 10/11'
    if (ua.includes('Windows NT 6.3')) return 'Windows 8.1'
    if (ua.includes('Windows NT 6.1')) return 'Windows 7'
    return 'Windows PC'
  }
  if (ua.includes('Macintosh') || ua.includes('Mac OS X')) return 'Mac'
  if (ua.includes('CrOS')) return 'Chromebook'

  if (ua.includes('Android')) {
    const m = ua.match(/;\s*([^;(]+?)\s*Build\//)
    if (m && m[1].trim()) return m[1].trim()
    return 'Android'
  }
  if (ua.includes('Linux')) return 'Linux'

  return '其他设备'
}
