<template>
  <div>
    <div class="d-flex align-center mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">API 密钥</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">管理系统内所有已签发的 API 访问凭证</p>
      </div>
      <v-spacer />
      <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="openCreate">签发密钥</v-btn>
    </div>

    <v-card rounded="lg" border flat>
      <v-alert v-if="loadError" type="error" variant="tonal" class="ma-3" role="alert">{{ loadError }}<v-btn variant="text" @click="load">重新加载</v-btn></v-alert>
      <v-data-table :headers="headers" :items="items" :loading="loading" density="comfortable"
        :search="search" no-data-text="暂无 API 密钥">
        <template #top>
          <div class="pa-3">
            <v-text-field v-model="search" placeholder="搜索名称 / 拥有者" variant="outlined" density="compact"
              prepend-inner-icon="mdi-magnify" hide-details clearable style="max-width: 320px" />
          </div>
        </template>
        <template #[`item.apiKey`]="{ item }">
          <code class="key-chip">{{ item.apiKey }}</code>
        </template>
        <template #[`item.ownerName`]="{ item }">
          <span>{{ item.ownerName || '—' }}</span>
        </template>
        <template #[`item.scopes`]="{ item }">
          <div class="d-flex flex-wrap gap-1">
            <v-chip v-for="s in splitScopes(item.scopes)" :key="s" size="x-small" variant="tonal">{{ s }}</v-chip>
            <span v-if="!item.scopes" class="text-caption text-medium-emphasis">全部</span>
          </div>
        </template>
        <template #[`item.enabled`]="{ item }">
          <v-chip size="small" variant="tonal" :color="item.adminDisabled ? 'error' : item.enabled ? 'success' : 'default'">
            {{ item.adminDisabled ? '管理员禁用' : item.enabled ? '启用' : '用户停用' }}
          </v-chip>
        </template>
        <template #[`item.expiresAt`]="{ item }">
          <span class="text-caption" :class="isExpired(item) ? 'text-error' : ''">
            {{ item.expiresAt ? fmtDateTime(item.expiresAt) : '永久' }}
          </span>
        </template>
        <template #[`item.lastUsedAt`]="{ item }">
          <span class="text-caption text-medium-emphasis">
            {{ item.lastUsedAt ? fmtDateTime(item.lastUsedAt) : '从未' }}
          </span>
        </template>
        <template #[`item.actions`]="{ item }">
          <v-btn :icon="item.adminDisabled ? 'mdi-play' : 'mdi-pause'" :aria-label="item.adminDisabled ? '解除管理员禁用' : '管理员禁用'" :title="item.adminDisabled ? '解除管理员禁用' : '管理员禁用'" :loading="toggling === item.id" :disabled="toggling !== null" size="small" variant="text"
            @click="toggle(item)" />
          <v-btn icon="mdi-delete-outline" size="small" variant="text" color="error" @click="remove(item)" />
        </template>
      </v-data-table>
    </v-card>

    <ConfirmDialog ref="confirmRef" />

    <!-- Create dialog -->
    <v-dialog v-model="createDialog" max-width="480" persistent>
      <v-card rounded="lg">
        <v-card-title class="text-subtitle-1 font-weight-bold pt-4">签发 API 密钥</v-card-title>
        <v-card-text>
          <v-form ref="createForm">
            <v-text-field v-model="draft.name" label="密钥名称" variant="outlined" density="comfortable"
              :rules="[(v) => !!v || '必填']" prepend-inner-icon="mdi-tag-outline" />
            <v-text-field v-model="draft.scopes" label="权限范围 (逗号分隔，留空为全部)" variant="outlined"
              density="comfortable" placeholder="read,write" />
            <v-text-field v-model="draft.expiresAt" label="过期时间 (可选)" type="datetime-local"
              variant="outlined" density="comfortable" hint="格式：yyyy/mm/dd HH:mm" persistent-hint />
          </v-form>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="createDialog = false">取消</v-btn>
          <v-btn color="primary" variant="flat" :loading="creating" @click="create">签发</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Secret reveal dialog (shown once) -->
    <v-dialog v-model="secretDialog" max-width="520" persistent>
      <v-card rounded="lg">
        <v-card-title class="text-subtitle-1 font-weight-bold pt-4 d-flex align-center">
          <v-icon icon="mdi-check-circle" color="success" class="me-2" />密钥已生成
        </v-card-title>
        <v-card-text>
          <v-alert type="warning" variant="tonal" density="compact" class="mb-4">
            密钥仅显示这一次，请立即复制并妥善保管。
          </v-alert>
          <div class="mb-3">
            <div class="text-caption text-medium-emphasis mb-1">API Key</div>
            <div class="secret-row">
              <code>{{ created.apiKey }}</code>
              <v-btn icon="mdi-content-copy" size="x-small" variant="text" @click="copy(created.apiKey)" />
            </div>
          </div>
          <div>
            <div class="text-caption text-medium-emphasis mb-1">API Secret</div>
            <div class="secret-row">
              <code>{{ created.apiSecret }}</code>
              <v-btn icon="mdi-content-copy" size="x-small" variant="text" @click="copy(created.apiSecret)" />
            </div>
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn color="primary" variant="flat" @click="secretDialog = false">我已保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { apiKeyApi } from '@/api/modules/admin'
import { useUiStore } from '@/stores/ui'
import { fmtDateTime } from '@/utils/format'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const ui = useUiStore()
const items = ref([])
const loading = ref(false)
const loadError = ref('')
const toggling = ref(null)
const search = ref('')
const createDialog = ref(false)
const secretDialog = ref(false)
const creating = ref(false)
const createForm = ref(null)
const confirmRef = ref(null)
const draft = reactive({ name: '', scopes: '', expiresAt: '' })
const created = reactive({ apiKey: '', apiSecret: '' })

const hideOnMobile = 'd-none d-sm-table-cell'
const headers = [
  { title: '名称', key: 'name' },
  { title: 'API Key', key: 'apiKey' },
  { title: '拥有者', key: 'ownerName' },
  { title: '权限范围', key: 'scopes', sortable: false, class: hideOnMobile, cellClass: hideOnMobile },
  { title: '状态', key: 'enabled', width: 90 },
  { title: '过期', key: 'expiresAt', width: 160, class: hideOnMobile, cellClass: hideOnMobile },
  { title: '最近使用', key: 'lastUsedAt', width: 140, class: hideOnMobile, cellClass: hideOnMobile },
  { title: '操作', key: 'actions', sortable: false, width: 110, align: 'end' },
]

function splitScopes(s) { return s ? s.split(',').map((x) => x.trim()).filter(Boolean) : [] }
function isExpired(item) { return item.expiresAt && new Date(item.expiresAt) < new Date() }

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    items.value = (await apiKeyApi.listAll()) || []
  } catch (e) {
    loadError.value = e?.message || '密钥列表加载失败'
    ui.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  draft.name = ''
  draft.scopes = ''
  draft.expiresAt = ''
  createDialog.value = true
}

async function create() {
  const { valid } = await createForm.value.validate()
  if (!valid) return
  creating.value = true
  try {
    const payload = {
      name: draft.name,
      scopes: draft.scopes || null,
      expiresAt: draft.expiresAt ? new Date(draft.expiresAt).toISOString() : null,
    }
    const res = await apiKeyApi.create(payload)
    created.apiKey = res?.apiKey || ''
    created.apiSecret = res?.apiSecret || ''
    createDialog.value = false
    secretDialog.value = true
    load()
  } catch (e) {
    ui.error(e?.message || '签发失败')
  } finally {
    creating.value = false
  }
}

async function toggle(item) {
  if (toggling.value !== null) return
  toggling.value = item.id
  try {
    const updated = await apiKeyApi.toggleAdmin(item.id)
    Object.assign(item, updated)
  } catch (e) {
    ui.error(e?.message || '操作失败')
  } finally {
    toggling.value = null
  }
}

async function remove(item) {
  const ok = await confirmRef.value.open({
    title: '删除密钥',
    message: `确定删除「${item.name}」？此操作不可撤销，使用此密钥的应用将立即失效。`,
    confirmText: '删除',
    confirmColor: 'error',
  })
  if (!ok) return
  try {
    await apiKeyApi.deleteById(item.id)
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
.key-chip {
  font-size: 12px; background: rgba(var(--v-theme-on-surface), 0.06);
  padding: 2px 8px; border-radius: 6px;
  display: inline-block; max-width: 180px;
  word-break: break-all; white-space: normal;
}
.secret-row {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  background: rgba(var(--v-theme-on-surface), 0.05); padding: 8px 12px; border-radius: 8px;
}
.secret-row code { font-size: 13px; word-break: break-all; }
</style>
