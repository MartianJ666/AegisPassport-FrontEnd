import { defineStore } from 'pinia'
import { errorMessage } from '@/utils/errors'

// Central UI state: global snackbar + theme toggle. Kept tiny on purpose so
// any component can trigger feedback without prop drilling.
export const useUiStore = defineStore('ui', {
  state: () => ({
    snackbar: { show: false, text: '', color: 'success', timeout: 3500 },
    theme: localStorage.getItem('theme') || 'light',
  }),
  actions: {
    notify(text, color = 'success') {
      this.snackbar = { show: true, text, color, timeout: 3500 }
    },
    success(text) { this.notify(text, 'success') },
    error(text) {
      if (!text?.notified) this.notify(errorMessage(text), 'error')
    },
    info(text) { this.notify(text, 'info') },
    warn(text) { this.notify(text, 'warning') },
    setTheme(theme) {
      this.theme = theme
      localStorage.setItem('theme', theme)
    },
    toggleTheme() {
      this.setTheme(this.theme === 'light' ? 'dark' : 'light')
    },
  },
})
