const fs = require('node:fs')
const vm = require('node:vm')
const assert = require('node:assert/strict')
const test = require('node:test')

test('registration preserves OAuth continuation and blocks concurrent submissions', async () => {
  let finishValidation, submitted = 0, destination, cleanup, cleared = false
  const context = vm.createContext({
    ref: value => ({ value }), reactive: value => value,
    computed: fn => ({ get value() { return fn() } }),
    useRoute: () => ({ query: { redirect: '/oauth2/authorize?state=original' } }),
    useRouter: () => ({ push(value) { destination = value } }),
    safeRedirect: value => value, useUiStore: () => ({ success() {}, error() {} }),
    encryptPassword: async value => 'encrypted:' + value,
    authApi: { async register() { submitted++ } },
    onBeforeUnmount(fn) { cleanup = fn }, clearInterval() { cleared = true }, setInterval() { return 1 },
  })
  const source = fs.readFileSync('src/views/auth/RegisterView.vue', 'utf8').split('<script setup>')[1].split('</script>')[0].replace(/^import .*$/gm, '')
  vm.runInContext(source, context)
  context.validate = () => new Promise(resolve => { finishValidation = resolve })
  vm.runInContext('formRef.value={validate};form.password="fixture-password"', context)
  const pending = context.onSubmit()
  await context.onSubmit()
  assert.equal(submitted, 0)
  finishValidation({ valid: true })
  await pending
  assert.equal(submitted, 1)
  assert.equal(destination.name, 'login')
  assert.equal(destination.query.redirect, '/oauth2/authorize?state=original')
  cleanup()
  assert.equal(cleared, true)
})
