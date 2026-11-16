<template>
  <v-snackbar
    v-model="ui.snackbar.show"
    :color="ui.snackbar.color"
    :timeout="ui.snackbar.timeout"
    :location="snackLocation"
    rounded="lg"
  >
    <div class="d-flex align-center">
      <v-icon :icon="icon" class="me-2" />
      <span>{{ ui.snackbar.text }}</span>
    </div>
    <template #actions>
      <v-btn icon="mdi-close" size="small" variant="text" @click="ui.snackbar.show = false" />
    </template>
  </v-snackbar>
</template>

<script setup>
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'
import { useDisplay } from 'vuetify'

const ui = useUiStore()
const { mobile } = useDisplay()
const snackLocation = computed(() => (mobile.value ? 'bottom' : 'top right'))

const icon = computed(() => {
  switch (ui.snackbar.color) {
    case 'error': return 'mdi-alert-circle'
    case 'warning': return 'mdi-alert'
    case 'info': return 'mdi-information'
    default: return 'mdi-check-circle'
  }
})
</script>
