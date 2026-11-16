const STATUS_MESSAGES = {
  400: '提交的信息有误，请检查后重试',
  401: '登录会话已失效，请重新登录',
  403: '没有权限执行此操作，请联系管理员核实权限',
  404: '请求的资源不存在，请刷新页面后重试',
  409: '提交的信息与现有记录冲突，请检查后重试',
  413: '文件超过大小限制，请压缩后重新上传',
  415: '不支持此文件或请求格式，请检查后重试',
  422: '提交的信息未通过校验，请检查后重试',
  429: '请求过于频繁，请稍后再试',
  502: '网站暂时无法连接后端服务，请稍后重试',
  503: '服务暂时不可用，请稍后重试',
  504: '服务器处理超时，请稍后重试',
}
const LOGIN_SERVICE_MESSAGES = {
  LOGIN_SERVICE_UNAVAILABLE: '登录验证服务暂时不可用，请稍后重试',
  LOGIN_SESSION_UNAVAILABLE: '账号验证已通过，但无法建立登录会话，请稍后重试',
}

export function errorMessage(error, fallback = '操作失败，请稍后重试') {
  const body = error?.response?.data
  const payload = body && typeof body === 'object' ? body : {}
  const status = Number(error?.response?.status || error?.status || 0)
  const errorCode = payload.errorCode || error?.errorCode
  const trace = payload.traceId || error?.traceId || error?.response?.headers?.['x-trace-id']
  const traceId = typeof trace === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(trace) ? trace : ''
  if (status >= 500) {
    const message = LOGIN_SERVICE_MESSAGES[errorCode] || STATUS_MESSAGES[status] || '服务器暂时无法处理请求，请稍后重试'
    return `${message}${traceId ? `（错误编号：${traceId}）` : ''}`
  }
  if (status === 429) {
    if (payload.message) return payload.message
    const seconds = Number(error?.response?.headers?.['retry-after'])
    return seconds > 0 && Number.isFinite(seconds) ? `请求过于频繁，请 ${Math.ceil(seconds)} 秒后重试` : STATUS_MESSAGES[429]
  }
  if (payload.message) return payload.message
  if (STATUS_MESSAGES[status]) return STATUS_MESSAGES[status]
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') return '请求超时，请检查网络后重试'
  if (error?.code === 'ERR_NETWORK') return '无法连接服务器，请检查网络或稍后重试'
  const raw = typeof error === 'string' ? error : error?.message
  const match = raw?.match(/Request failed with status code\s+(\d{3})/i)
  if (match) return STATUS_MESSAGES[Number(match[1])] || '请求失败，请稍后重试'
  return raw || fallback
}

export function normalizeApiError(error) {
  const normalized = new Error(errorMessage(error))
  normalized.name = 'ApiError'
  normalized.response = error.response
  normalized.config = error.config
  normalized.code = error.code
  normalized.status = error.response?.status
  normalized.errorCode = error.response?.data?.errorCode
  normalized.data = error.response?.data?.data
  normalized.traceId = error.response?.data?.traceId || error.response?.headers?.['x-trace-id']
  return normalized
}
