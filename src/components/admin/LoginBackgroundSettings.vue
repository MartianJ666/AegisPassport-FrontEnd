<template>
  <v-card rounded="lg" border flat>
    <v-card-text class="pa-6">
      <div class="d-flex align-center mb-1">
        <div>
          <div class="text-subtitle-1 font-weight-bold">{{ title }}</div>
          <div class="text-caption text-medium-emphasis">{{ description }}</div>
        </div>
        <v-spacer />
        <v-chip size="small" variant="tonal" color="primary">独立配置</v-chip>
      </div>

      <v-divider class="my-5" />
      <div class="text-subtitle-2 font-weight-bold mb-3">背景模式</div>
      <v-btn-toggle v-model="form.backgroundMode" color="primary" density="comfortable"
        mandatory divided class="mb-5">
        <v-btn value="color" prepend-icon="mdi-palette">纯色</v-btn>
        <v-btn value="single" prepend-icon="mdi-image">单图</v-btn>
        <v-btn value="carousel" prepend-icon="mdi-image-multiple">轮播</v-btn>
      </v-btn-toggle>

      <div v-if="form.backgroundMode === 'color'" class="mb-2">
        <div class="text-caption text-medium-emphasis mb-2">背景颜色</div>
        <v-color-picker v-model="form.backgroundColor" mode="hex" hide-inputs
          :modes="['hex']" width="100%" flat />
      </div>

      <template v-else>
        <div class="d-flex align-center mb-2">
          <span class="text-caption text-medium-emphasis">背景图片</span>
          <v-spacer />
          <v-btn size="small" variant="tonal" prepend-icon="mdi-upload" :loading="uploading"
            @click="pickFile">上传图片</v-btn>
          <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/gif,image/webp"
            hidden @change="onFile" />
        </div>
        <div v-if="!form.backgroundImages.length"
          class="empty-drop d-flex flex-column align-center justify-center">
          <v-icon icon="mdi-image-off-outline" size="40" color="disabled" />
          <span class="text-caption text-medium-emphasis mt-2">暂无背景图片</span>
        </div>
        <div v-else class="img-grid">
          <div v-for="(img, i) in form.backgroundImages" :key="img" class="img-cell">
            <v-img :src="resolveAssetUrl(img)" aspect-ratio="1.6" cover rounded="lg" />
            <v-btn icon="mdi-close" size="x-small" color="error" variant="flat"
              class="img-del" @click="removeImage(i)" />
          </div>
        </div>

        <div v-if="form.backgroundMode === 'carousel'" class="mt-4">
          <div class="text-caption text-medium-emphasis mb-1">
            轮播间隔：{{ form.backgroundInterval }} 秒
          </div>
          <v-slider v-model="form.backgroundInterval" :min="3" :max="60" :step="1"
            color="primary" thumb-label density="compact" hide-details />
        </div>
      </template>

      <v-divider class="my-4" />
      <div class="d-flex align-center">
        <span class="text-caption text-medium-emphasis">图片最多 12 张，单张不超过 10 MB</span>
        <v-spacer />
        <v-btn color="primary" variant="flat" :loading="saving" @click="save">保存设置</v-btn>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useUiStore } from '@/stores/ui'
import { resolveAssetUrl } from '@/utils/url'

const props = defineProps({
  title: { type: String, required: true },
  description: { type: String, required: true },
  loadConfig: { type: Function, required: true },
  uploadBackground: { type: Function, required: true },
  saveBackground: { type: Function, required: true },
})

const ui = useUiStore()
const fileInput = ref(null)
const saving = ref(false)
const uploading = ref(false)
const form = reactive({
  backgroundMode: 'color',
  backgroundColor: '#FDF8FF',
  backgroundImages: [],
  backgroundInterval: 8,
})

async function load() {
  try {
    const cfg = await props.loadConfig()
    form.backgroundMode = ['color', 'single', 'carousel'].includes(cfg?.backgroundMode)
      ? cfg.backgroundMode : 'color'
    form.backgroundColor = cfg?.backgroundColor || '#FDF8FF'
    form.backgroundImages = Array.isArray(cfg?.backgroundImages) ? cfg.backgroundImages : []
    form.backgroundInterval = Number.isInteger(cfg?.backgroundInterval) ? cfg.backgroundInterval : 8
  } catch (error) {
    ui.error(error?.message || '加载背景设置失败')
  }
}

function pickFile() {
  fileInput.value?.click()
}

async function onFile(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (form.backgroundImages.length >= 12) {
    ui.error('最多可配置 12 张背景图片')
    event.target.value = ''
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    ui.error('图片不能超过 10 MB')
    event.target.value = ''
    return
  }
  uploading.value = true
  try {
    const data = new FormData()
    data.append('file', file)
    const result = await props.uploadBackground(data)
    form.backgroundImages = result?.backgroundImages || [...form.backgroundImages, result?.url].filter(Boolean)
    ui.success('上传成功')
  } catch (error) {
    ui.error(error?.message || '上传失败')
  } finally {
    uploading.value = false
    event.target.value = ''
  }
}

function removeImage(index) {
  form.backgroundImages.splice(index, 1)
}

async function save() {
  saving.value = true
  try {
    await props.saveBackground({ ...form, backgroundImages: [...form.backgroundImages] })
    ui.success('设置已保存')
  } catch (error) {
    ui.error(error?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.empty-drop { height: 160px; border: 1px dashed rgba(var(--v-theme-on-surface), 0.2); border-radius: 12px; }
.img-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.img-cell { position: relative; }
.img-del { position: absolute; top: 6px; right: 6px; }
</style>
