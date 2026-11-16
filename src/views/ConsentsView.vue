<template>
  <div>
    <h1 class="text-h5 font-weight-bold mb-2">授权应用</h1>
    <p class="text-body-2 text-medium-emphasis mb-6">你账户可访问的应用及其授权状态</p>

    <v-card rounded="lg" border flat :loading="loading">
      <div v-if="!loading && !consents.length" class="text-center text-medium-emphasis py-12">
        <v-icon icon="mdi-apps" size="48" class="mb-2" />
        <div>暂无应用</div>
      </div>
      <v-list v-else lines="two">
        <template v-for="(c, i) in consents" :key="c.clientId">
          <v-list-item>
            <template #prepend>
              <v-avatar color="surface-variant" rounded="lg">
                <v-img v-if="c.clientIcon" :src="resolveAssetUrl(c.clientIcon)" />
                <v-icon v-else icon="mdi-application" />
              </v-avatar>
            </template>
            <v-list-item-title class="font-weight-medium">
              <span class="mr-2">{{ c.clientName || c.clientId }}</span>
              <v-chip :color="statusColor(c.status)" size="x-small" variant="tonal">
                {{ statusLabel(c.status) }}
              </v-chip>
            </v-list-item-title>
            <v-list-item-subtitle>
              <template v-if="c.status === 'granted'">
                <v-chip v-for="s in scopeList(c.scopes)" :key="s" size="x-small" class="mr-1 mt-1" variant="tonal">
                  {{ s }}
                </v-chip>
              </template>
              <template v-else>
                <span class="text-caption">{{ statusHint(c.status) }}</span>
              </template>
            </v-list-item-subtitle>
            <template #append>
              <v-btn v-if="c.status === 'granted'" variant="text" color="error" size="small" @click="revoke(c)">撤销</v-btn>
            </template>
          </v-list-item>
          <v-divider v-if="i < consents.length - 1" />
        </template>
      </v-list>
    </v-card>

    <ConfirmDialog ref="confirmRef" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { consentApi } from '@/api/modules/rbac'
import { useUiStore } from '@/stores/ui'
import { resolveAssetUrl } from '@/utils/url'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const ui = useUiStore()
const consents = ref([])
const loading = ref(false)
const confirmRef = ref(null)

function scopeList(scopes) {
  if (Array.isArray(scopes)) return scopes
  return String(scopes || '').split(/[\s,]+/).filter(Boolean)
}

function statusColor(status) {
  return status === 'granted' ? 'success' : status === 'expired' ? 'warning' : 'default'
}
function statusLabel(status) {
  return status === 'granted' ? '已授权' : status === 'expired' ? '已过期' : '未授权'
}
function statusHint(status) {
  return status === 'expired'
    ? '授权已过期，重新登录该应用时会再次确认'
    : '尚未授权，登录该应用时需确认授权'
}

async function load() {
  loading.value = true
  try {
    consents.value = (await consentApi.list()) || []
  } catch (e) {
    ui.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

async function revoke(c) {
  const ok = await confirmRef.value.open({
    title: '撤销授权',
    message: `确定要撤销「${c.clientName || c.clientId}」的访问权限吗？`,
    confirmText: '撤销',
    confirmColor: 'error',
  })
  if (!ok) return
  try {
    await consentApi.revoke(c.id)
    ui.success('已撤销授权')
    load()
  } catch (e) {
    ui.error(e?.message || '撤销失败')
  }
}

onMounted(load)
</script>
