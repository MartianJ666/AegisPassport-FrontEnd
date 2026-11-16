<template>
  <div>
    <div class="d-flex align-center mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">OAuth 应用</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">管理接入的 OAuth2 / OIDC 客户端</p>
      </div>
      <v-spacer />
      <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="openCreate">注册应用</v-btn>
    </div>

    <v-alert v-if="groupError" type="error" variant="tonal" class="mb-4">{{ groupError }}<v-btn variant="text" @click="loadGroups">重新加载角色选项</v-btn></v-alert>
    <v-row>
      <v-col v-for="c in clients" :key="c.clientId" cols="12" md="6" lg="4">
        <v-card rounded="lg" border flat class="h-100">
          <v-card-item>
            <template #prepend>
              <v-avatar color="surface-variant" rounded="lg">
                <v-img v-if="c.clientIcon" :src="resolveUrl(c.clientIcon)" />
                <v-icon v-else icon="mdi-application-outline" />
              </v-avatar>
            </template>
            <v-card-title class="text-subtitle-1 font-weight-bold">{{ c.clientName }}</v-card-title>
            <v-card-subtitle class="text-truncate">{{ c.clientId }}</v-card-subtitle>
          </v-card-item>
          <v-card-text>
            <p v-if="c.clientDescription" class="text-body-2 text-medium-emphasis mb-2">
              {{ c.clientDescription }}
            </p>
            <div class="d-flex flex-wrap gap-1">
              <v-chip size="x-small" variant="tonal" :color="c.enabled ? 'success' : 'grey'">
                {{ c.enabled ? '启用' : '禁用' }}
              </v-chip>
              <v-chip size="x-small" variant="tonal" v-if="c.requirePkce">PKCE</v-chip>
              <v-chip size="x-small" variant="tonal" v-if="c.requireConsent">需授权同意</v-chip>
            </div>
          </v-card-text>
          <v-card-actions>
            <v-btn size="small" variant="text" prepend-icon="mdi-content-copy" @click="copyId(c)">复制 ID</v-btn>
            <v-spacer />
            <v-btn size="small" variant="text" prepend-icon="mdi-pencil-outline" @click="openEdit(c)">编辑</v-btn>
            <v-btn size="small" variant="text" color="error" prepend-icon="mdi-delete-outline"
              @click="remove(c)">删除</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
      <v-col v-if="!loading && !clients.length" cols="12">
        <v-empty-state icon="mdi-application-outline" title="暂无应用" text="点击「注册应用」创建第一个 OAuth 客户端" />
      </v-col>
    </v-row>

    <ClientEditDialog ref="editRef" :roles="roles" @saved="load" />
    <v-dialog v-model="secretDialog" max-width="520">
      <v-card rounded="lg">
        <v-card-title class="text-subtitle-1 font-weight-bold pt-4">应用凭据</v-card-title>
        <v-divider />
        <v-card-text>
          <v-alert type="warning" variant="tonal" density="compact" class="mb-3">
            请立即保存 Client Secret，它只显示这一次。
          </v-alert>
          <v-text-field :model-value="newClient.clientId" label="Client ID" readonly variant="outlined"
            append-inner-icon="mdi-content-copy" @click:append-inner="copyText(newClient.clientId)" />
          <v-text-field :model-value="newClient.clientSecret" label="Client Secret" readonly variant="outlined"
            append-inner-icon="mdi-content-copy" @click:append-inner="copyText(newClient.clientSecret)" />
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
import { onMounted, ref } from 'vue'
import { clientApi } from '@/api/modules/rbac'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { resolveAssetUrl as resolveUrl } from '@/utils/url'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import ClientEditDialog from '@/components/admin/ClientEditDialog.vue'

const auth = useAuthStore()
const ui = useUiStore()
const clients = ref([])
const roles = ref([])
const groupError = ref('')
const loading = ref(false)
const editRef = ref(null)
const confirmRef = ref(null)
const secretDialog = ref(false)
const newClient = ref({ clientId: '', clientSecret: '' })

async function load() {
  loading.value = true
  try {
    clients.value = (await clientApi.list()) || []
  } catch (e) {
    ui.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editRef.value.open(null, (created) => {
    if (created?.clientSecret) {
      newClient.value = created
      secretDialog.value = true
    }
  })
}
function openEdit(c) { editRef.value.open(c) }

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text)
    ui.success('已复制')
  } catch { ui.error('复制失败') }
}
function copyId(c) { copyText(c.clientId) }

async function remove(c) {
  const ok = await confirmRef.value.open({
    title: '删除应用', message: `确定删除应用「${c.clientName}」吗？接入方将立即失效。`,
    confirmText: '删除', confirmColor: 'error',
  })
  if (!ok) return
  try {
    await clientApi.remove(c.clientId)
    ui.success('已删除')
    load()
  } catch (e) { ui.error(e?.message || '删除失败') }
}

async function loadGroups() {
  groupError.value = ''
  try { roles.value = (await clientApi.groupChoices()) || [] }
  catch (e) { groupError.value = e.message || '角色选项加载失败' }
}
onMounted(async () => {
  await loadGroups()
  load()
})
</script>
