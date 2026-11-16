import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'
import { useAuthStore } from './stores/auth'
import PermissionGate from './components/PermissionGate.vue'
import './styles/global.css'

function notifyVuetifyOfAutofill(input) {
  if (!(input instanceof HTMLInputElement) || !input.closest('.v-field') || !input.matches(':-webkit-autofill')) return
  // This only notifies Vue/Vuetify that the browser filled the field. It does
  // not read, retain, log, or submit the field value.
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

document.addEventListener(
  'animationstart',
  (event) => {
    if (event.animationName === 'onAutoFillStart') notifyVuetifyOfAutofill(event.target)
  },
  true
)

// Some WebKit versions do not reliably emit animationstart for restored
// credentials. Run a short, bounded scan after focus/pageshow as compensation.
let autofillScanTimer = 0
function scanAutofillFields() {
  window.clearTimeout(autofillScanTimer)
  let attempts = 0
  const scan = () => {
    document.querySelectorAll('.v-field input:-webkit-autofill').forEach(notifyVuetifyOfAutofill)
    attempts += 1
    if (attempts < 4) autofillScanTimer = window.setTimeout(scan, 180)
  }
  scan()
}
window.addEventListener('pageshow', scanAutofillFields)
document.addEventListener('focusin', scanAutofillFields, true)

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(vuetify)

// Registered globally so any view can gate UI without importing it each time.
app.component('PermissionGate', PermissionGate)

// Restore session (loads token + fetches profile) before the first paint so
// route guards see an accurate auth state on hard refresh.
const auth = useAuthStore()
auth.bootstrap().finally(() => {
  app.mount('#app')
  scanAutofillFields()
})
