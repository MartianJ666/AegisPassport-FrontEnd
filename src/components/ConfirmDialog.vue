<template>
  <v-dialog v-model="visible" max-width="440" persistent>
    <v-card rounded="lg">
      <v-card-title class="d-flex align-center text-subtitle-1 font-weight-bold pt-4">
        <v-icon :icon="icon" :color="opts.confirmColor" class="me-2" />
        {{ opts.title }}
      </v-card-title>
      <v-card-text class="text-body-2">{{ opts.message }}</v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="resolve(false)">{{ opts.cancelText }}</v-btn>
        <v-btn :color="opts.confirmColor" variant="flat" @click="resolve(true)">
          {{ opts.confirmText }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'

const DEFAULTS = {
  title: '请确认',
  message: '',
  confirmText: '确定',
  cancelText: '取消',
  confirmColor: 'primary',
}

const visible = ref(false)
const opts = reactive({ ...DEFAULTS })
let resolver = null

const icon = computed(() =>
  opts.confirmColor === 'error' ? 'mdi-alert-circle-outline' : 'mdi-help-circle-outline',
)

// Imperative API: `const ok = await confirmRef.value.open({ ... })`
function open(options = {}) {
  Object.assign(opts, DEFAULTS, options)
  visible.value = true
  return new Promise((res) => {
    resolver = res
  })
}

function resolve(value) {
  visible.value = false
  if (resolver) resolver(value)
  resolver = null
}

defineExpose({ open })
</script>
