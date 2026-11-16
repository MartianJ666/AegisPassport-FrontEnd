import { computed, onMounted, onUnmounted, ref } from 'vue'
import { systemConfigApi } from '@/api/modules/admin'
import { resolveAssetUrl } from '@/utils/url'

const FALLBACK_COLOR = '#FDF8FF'

export function useLoginBackground() {
  const mode = ref('color')
  const color = ref(FALLBACK_COLOR)
  const images = ref([])
  const currentIndex = ref(0)
  const ready = ref(false)
  let intervalSeconds = 8
  let carouselTimer = null
  let disposed = false
  const preloaders = new Set()

  const backgroundStyle = computed(() => {
    const image = images.value[currentIndex.value]
    if (mode.value !== 'color' && image) {
      return {
        backgroundColor: color.value,
        backgroundImage: `url("${image.replace(/"/g, '%22')}")`,
      }
    }
    return { backgroundColor: color.value }
  })

  function stopCarousel() {
    if (carouselTimer) window.clearInterval(carouselTimer)
    carouselTimer = null
  }

  function startCarousel() {
    stopCarousel()
    if (mode.value === 'carousel' && images.value.length > 1) {
      carouselTimer = window.setInterval(() => {
        currentIndex.value = (currentIndex.value + 1) % images.value.length
      }, intervalSeconds * 1000)
    }
  }

  function preload(url) {
    return new Promise((resolve) => {
      const loader = new Image()
      preloaders.add(loader)
      const finish = (valid) => {
        preloaders.delete(loader)
        loader.onload = null
        loader.onerror = null
        resolve(valid ? url : null)
      }
      loader.onload = () => finish(true)
      loader.onerror = () => finish(false)
      loader.src = url
    })
  }

  async function loadBackground() {
    try {
      const cfg = await systemConfigApi.loginConfig()
      if (disposed || !cfg) return
      const configuredMode = cfg.backgroundMode === 'single' ? 'image' : cfg.backgroundMode
      const requestedMode = ['color', 'image', 'carousel', 'random'].includes(configuredMode) ? configuredMode : 'color'
      color.value = cfg.backgroundColor || FALLBACK_COLOR
      intervalSeconds = Math.max(2, Number(cfg.backgroundInterval) || 8)
      const configured = Array.isArray(cfg.backgroundImages) ? [...cfg.backgroundImages] : []
      if (cfg.backgroundImage && !configured.length) configured.push(cfg.backgroundImage)
      const urls = [...new Set(configured.filter(Boolean).map(resolveAssetUrl))]
      const candidates = requestedMode === 'image' ? urls.slice(0, 1) : urls
      const loaded = (await Promise.all(candidates.map(preload))).filter(Boolean)
      if (disposed) return
      images.value = loaded
      currentIndex.value = requestedMode === 'random' && loaded.length ? Math.floor(Math.random() * loaded.length) : 0
      mode.value = requestedMode === 'color' || !loaded.length ? 'color' : requestedMode
      startCarousel()
    } catch {
      mode.value = 'color'
      images.value = []
    } finally {
      if (!disposed) ready.value = true
    }
  }

  function cleanup() {
    disposed = true
    stopCarousel()
    preloaders.forEach((loader) => {
      loader.onload = null
      loader.onerror = null
      loader.src = ''
    })
    preloaders.clear()
  }

  onMounted(loadBackground)
  onUnmounted(cleanup)

  return { backgroundStyle, backgroundReady: ready, reloadBackground: loadBackground }
}
