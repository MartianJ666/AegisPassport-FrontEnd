<template>
  <div>
    <div class="d-flex align-center mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">API 密钥</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">用于调用公开验证接口的机器凭证</p>
      </div>
      <v-spacer />
      <v-btn color="primary" prepend-icon="mdi-plus" @click="openCreate">创建密钥</v-btn>
    </div>

    <v-card rounded="lg" border flat :loading="loading">
      <v-table>
        <thead>
          <tr>
            <th>名称</th>
            <th>API Key</th>
            <th class="d-none d-sm-table-cell">调用次数</th>
            <th class="d-none d-sm-table-cell">最近使用</th>
            <th>状态</th>
            <th class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="!loading && !keys.length">
            <td colspan="6" class="text-center text-medium-emphasis py-8">还没有创建任何密钥</td>
          </tr>
          <tr v-for="k in keys" :key="k.id">
            <td class="font-weight-medium">{{ k.name }}</td>
            <td class="api-key-cell"><code class="text-caption">{{ k.apiKey }}</code></td>
            <td class="d-none d-sm-table-cell">{{ k.useCount }}</td>
            <td class="d-none d-sm-table-cell text-caption">{{ k.lastUsedAt ? fmtDateTime(k.lastUsedAt) : '从未' }}</td>
            <td>
              <v-chip size="x-small" :color="statusColor(k)" variant="tonal">{{ statusText(k) }}</v-chip>
            </td>
            <td class="text-right">
              <v-btn
                :icon="k.enabled ? 'mdi-pause' : 'mdi-play'"
                size="small" variant="text"
                :disabled="k.adminDisabled"
                :title="k.enabled ? '禁用' : '启用'"
                @click="toggle(k)"
              />
              <v-btn icon="mdi-delete-outline" size="small" variant="text" color="error" @click="remove(k)" />
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <!-- Create dialog -->
    <v-dialog v-model="createDialog" max-width="480" persistent>
      <v-card rounded="lg">
        <v-card-title class="text-subtitle-1 font-weight-bold pt-4">创建 API 密钥</v-card-title>
        <v-divider />
        <v-card-text>
          <v-form ref="createFormRef">
            <v-text-field v-model="createForm.name" label="名称" variant="outlined"
              :rules="[(v) => !!v || '请输入名称']" prepend-inner-icon="mdi-tag-outline" />
            <v-text-field v-model="createForm.scopes" label="授权范围（可选，逗号分隔）" variant="outlined"
              prepend-inner-icon="mdi-key-chain" hint="例如 verify,profile" persistent-hint />
            <v-text-field v-model="createForm.expiresAt" label="过期时间（可选）" type="datetime-local"
              variant="outlined" prepend-inner-icon="mdi-calendar-clock" class="mt-3" hint="格式：yyyy/mm/dd HH:mm" persistent-hint />
          </v-form>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="createDialog = false">取消</v-btn>
          <v-btn color="primary" variant="flat" :loading="creating" @click="create">创建</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Secret reveal dialog (shown once) -->
    <v-dialog v-model="secretDialog" max-width="560" persistent>
      <v-card rounded="lg">
        <v-card-title class="text-subtitle-1 font-weight-bold pt-4 d-flex align-center">
          <v-icon icon="mdi-check-circle" color="success" class="me-2" />密钥已创建
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-alert type="warning" variant="tonal" density="compact" class="mb-4">
            密钥仅显示一次，请立即保存。关闭后将无法再次查看。
          </v-alert>
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis mb-1">API Key</div>
            <v-text-field :model-value="created.apiKey" readonly variant="outlined" density="compact" hide-details
              append-inner-icon="mdi-content-copy" @click:append-inner="copy(created.apiKey)" />
          </div>
          <div>
            <div class="text-caption text-medium-emphasis mb-1">API Secret</div>
            <v-text-field :model-value="created.apiSecret" readonly variant="outlined" density="compact" hide-details
              append-inner-icon="mdi-content-copy" @click:append-inner="copy(created.apiSecret)" />
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="secretDialog = false">我已保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmDialog ref="confirmRef" />
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { apiKeyApi } from '@/api/modules/admin'
import { useUiStore } from '@/stores/ui'
import { fmtDateTime } from '@/utils/format'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const ui = useUiStore()
const keys = ref([])
const loading = ref(false)
const createDialog = ref(false)
const secretDialog = ref(false)
const creating = ref(false)
const createForm = reactive({ name: '', scopes: '', expiresAt: '' })
const created = reactive({ apiKey: '', apiSecret: '' })
const createFormRef = ref(null)
const confirmRef = ref(null)

function statusColor(k) {
  if (k.adminDisabled) return 'error'
  return k.enabled ? 'success' : 'grey'
}
function statusText(k) {
  if (k.adminDisabled) return '管理员禁用'
  return k.enabled ? '启用' : '已禁用'
}

async function load() {
  loading.value = true
  try {
    keys.value = (await apiKeyApi.listMine()) || []
  } catch (e) {
    ui.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  createForm.name = ''
  createForm.scopes = ''
  createForm.expiresAt = ''
  createDialog.value = true
}

async function create() {
  const { valid } = await createFormRef.value.validate()
  if (!valid) return
  creating.value = true
  try {
    const payload = { name: createForm.name, scopes: createForm.scopes || null }
    if (createForm.expiresAt) payload.expiresAt = new Date(createForm.expiresAt).toISOString()
    const res = await apiKeyApi.create(payload)
    created.apiKey = res.apiKey
    created.apiSecret = res.apiSecret
    createDialog.value = false
    secretDialog.value = true
    load()
  } catch (e) {
    ui.error(e?.message || '创建失败')
  } finally {
    creating.value = false
  }
}

async function toggle(k) {
  try {
    await apiKeyApi.toggleMine(k.id)
    load()
  } catch (e) {
    ui.error(e?.message || '操作失败')
  }
}

async function remove(k) {
  const ok = await confirmRef.value.open({
    title: '删除密钥',
    message: `确定删除「${k.name}」吗？使用此密钥的应用将立即失效。`,
    confirmText: '删除',
    confirmColor: 'error',
  })
  if (!ok) return
  try {
    await apiKeyApi.deleteMine(k.id)
    ui.success('已删除')
    load()
  } catch (e) {
    ui.error(e?.message || '删除失败')
  }
}

async function copy(text) {
  try {
    await navigator.clipboard.writeText(text)
    ui.success('已复制到剪贴板')
  } catch {
    ui.error('复制失败')
  }
}

onMounted(load)
</script>

<style scoped>
.api-key-cell code {
  display: inline-block;
  max-width: 140px;
  word-break: break-all;
  white-space: normal;
}
</style>

