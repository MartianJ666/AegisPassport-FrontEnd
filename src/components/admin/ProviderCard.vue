<template>
  <v-card rounded="lg" border flat class="fill-height">
    <v-card-item>
      <template #prepend><v-avatar :color="color"><v-icon :icon="icon" color="white" /></v-avatar></template>
      <v-card-title>{{ title }}</v-card-title>
      <v-card-subtitle>{{ subtitle }}</v-card-subtitle>
      <template #append><v-switch v-model="enabledModel" color="primary" hide-details label="启用" /></template>
    </v-card-item>
    <v-card-text>
      <v-text-field v-if="showIssuer" v-model="issuerValue" label="Issuer" variant="outlined" density="comfortable" placeholder="https://..." autocomplete="off" />
      <v-text-field v-model="idValue" :label="idLabel" variant="outlined" density="comfortable" autocomplete="off" />
      <v-text-field v-model="secretValue" :label="secretLabel" type="password" variant="outlined" density="comfortable" :placeholder="state?.secretConfigured ? '已保存；留空则不修改' : '请输入密钥'" autocomplete="new-password" />
      <div class="d-flex align-center text-body-2 mt-2">
        <v-icon icon="mdi-link-variant" size="18" class="me-2" />
        <span class="text-medium-emphasis text-truncate">{{ state?.callbackUrl }}</span>
        <v-btn size="x-small" variant="text" icon="mdi-content-copy" @click="$emit('copy', state?.callbackUrl)" />
      </div>
      <div class="text-caption text-medium-emphasis mt-2">{{ state?.secretConfigured ? '密钥状态：已保存（不会回显）' : '密钥状态：未保存' }}</div>
      <div v-if="$slots.details" class="text-caption text-medium-emphasis mt-2"><slot name="details" /></div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  title: String,
  icon: String,
  color: String,
  model: Object,
  state: Object,
  idLabel: String,
  secretLabel: String,
  showIssuer: Boolean,
})
defineEmits(['copy'])

const usesClientCredentials = computed(() => props.idLabel === 'Client ID')

const idValue = computed({
  get: () => (usesClientCredentials.value ? props.model?.clientId : props.model?.appId) || '',
  set: (value) => { if (props.model) { if (usesClientCredentials.value) props.model.clientId = value; else props.model.appId = value } },
})
const secretValue = computed({
  get: () => (usesClientCredentials.value ? props.model?.clientSecret : props.model?.appKey) || '',
  set: (value) => { if (props.model) { if (usesClientCredentials.value) props.model.clientSecret = value; else props.model.appKey = value } },
})
const issuerValue = computed({
  get: () => props.model?.issuer || '',
  set: (value) => { if (props.model) props.model.issuer = value },
})
const enabledModel = computed({
  get: () => !!props.model?.enabled,
  set: (value) => { if (props.model) props.model.enabled = value },
})
const subtitle = computed(() =>
  props.state?.ready
    ? (props.model?.enabled ? '已启用' : '配置完成，尚未启用')
    : (props.state?.disabledReason || '尚未配置'))
</script>
