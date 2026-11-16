import { JSEncrypt } from 'jsencrypt'
import http from './http'

// Password transport encryption. The backend hands out a fresh RSA public key
// per startup; we fetch it lazily, cache it for the session, and RSA-PKCS1
// encrypt sensitive fields (passwords) before they leave the browser.
let cachedKey = null

async function publicKey() {
  const { publicKey } = await http.get('/rsa/public-key')
  // jsencrypt expects PEM; the backend returns raw base64 DER (X.509).
  cachedKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`
  return cachedKey
}

export async function encryptPassword(plain) {
  if (!plain) return plain
  const pem = await publicKey()
  const enc = new JSEncrypt()
  enc.setPublicKey(pem)
  const cipher = enc.encrypt(plain)
  // On failure jsencrypt returns false — fall back to plaintext, which the
  // backend also accepts (it treats undecryptable input as plaintext).
  if (!cipher) throw new Error('密码加密失败，请刷新页面后重试')
  return cipher
}


// Strict variant for administrative password reset: never send plaintext if
// browser-side RSA encryption fails.
export async function encryptPasswordStrict(plain) {
  if (!plain) throw new Error('密码不能为空')
  const pem = await publicKey()
  const enc = new JSEncrypt()
  enc.setPublicKey(pem)
  const cipher = enc.encrypt(plain)
  if (!cipher) throw new Error('密码加密失败，请刷新页面后重试')
  return cipher
}
