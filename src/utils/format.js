// Shared formatting helpers. Kept dependency-free (no dayjs) to stay lean.

function pad(n) {
  return String(n).padStart(2, '0')
}

/** Format an ISO timestamp / epoch millis into `YYYY-MM-DD HH:mm`. */
export function fmtDateTime(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Format an ISO timestamp into `YYYY-MM-DD HH:mm:ss` (with seconds). */
export function fmtDateTimeSeconds(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

/** Format an ISO timestamp into `YYYY-MM-DD`. */
export function fmtDate(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Relative "x minutes ago" style label, falling back to absolute date. */
export function fmtRelative(value) {
  if (!value) return '-'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '-'
  const diff = Date.now() - d.getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} 小时前`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day} 天前`
  return fmtDate(value)
}

/** Truncate a string to `n` chars with an ellipsis. */
export function truncate(str, n = 40) {
  if (!str) return ''
  return str.length > n ? `${str.slice(0, n)}…` : str
}
