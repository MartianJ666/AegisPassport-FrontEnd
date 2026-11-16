const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')

test('development and production proxies retain OAuth pages and the continuation script', async () => {
  const previous = process.env.VITE_API_TARGET
  process.env.VITE_API_TARGET = 'http://127.0.0.1:18421'
  try {
    const { default: configure } = await import('../vite.config.js')
    const config = configure({ mode: 'test' })
    const proxy = config.server.proxy
    assert.equal(proxy['/api'].target, 'http://127.0.0.1:18421')
    assert.equal(proxy['/oauth-continue.js'].target, proxy['/api'].target)
    for (const url of ['/oauth2/consent?token=opaque', '/oauth2/account-confirm?token=opaque']) {
      assert.equal(proxy['/oauth2'].bypass({ method: 'GET', url }), '/index.html')
    }
    assert.equal(proxy['/oauth2'].bypass({ method: 'POST', url: '/oauth2/authorize' }), undefined)
    const nginx = fs.readFileSync('nginx/default.conf', 'utf8')
    assert.match(nginx, /location = \/oauth-continue\.js\s*\{[^}]*proxy_pass http:\/\/aegis_backend/)
  } finally {
    if (previous === undefined) delete process.env.VITE_API_TARGET
    else process.env.VITE_API_TARGET = previous
  }
})
