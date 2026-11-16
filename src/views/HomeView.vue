<template>
  <div>
    <div class="d-flex align-center mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">欢迎回来，{{ displayName }}</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">这是你的账户概览</p>
      </div>
    </div>

    <v-row>
      <v-col v-for="stat in stats" :key="stat.label" cols="12" sm="6" md="3">
        <v-card class="pa-4" rounded="lg" border flat>
          <div class="d-flex align-center">
            <v-avatar :color="stat.color" size="44" class="mr-3">
              <v-icon :icon="stat.icon" color="white" />
            </v-avatar>
            <div>
              <div class="text-h6 font-weight-bold">{{ stat.value }}</div>
              <div class="text-caption text-medium-emphasis">{{ stat.label }}</div>
            </div>
          </div>
        </v-card>
      </v-col>
    </v-row>

    <v-row class="mt-2">
      <v-col cols="12" md="7">
        <v-card rounded="lg" border flat>
          <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center">
            <v-icon icon="mdi-bullhorn-outline" class="mr-2" size="20" />
            系统公告
          </v-card-title>
          <v-divider />
          <v-card-text>
            <div v-if="!announcements.length" class="text-center text-medium-emphasis py-8">
              暂无公告
            </div>
            <v-list v-else lines="two">
              <v-list-item
                v-for="a in announcements"
                :key="a.id"
                :title="a.title"
                :subtitle="a.content"
              >
                <template #prepend>
                  <v-icon :icon="levelIcon(a.level)" :color="levelColor(a.level)" />
                </template>
                <template #append>
                  <span class="text-caption text-medium-emphasis">{{ fmtDate(a.publishedAt || a.createdAt) }}</span>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="5">
        <v-card rounded="lg" border flat>
          <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center">
            <v-icon icon="mdi-account-circle-outline" class="mr-2" size="20" />
            账户信息
          </v-card-title>
          <v-divider />
          <v-list>
            <v-list-item title="用户名" :subtitle="user?.username || '-'" prepend-icon="mdi-account-outline" />
            <v-list-item title="邮箱" :subtitle="user?.email || '未绑定'" prepend-icon="mdi-email-outline" />
            <v-list-item title="所属组织" :subtitle="user?.orgName || '未分配组织'" prepend-icon="mdi-domain" />
            <v-list-item title="角色" prepend-icon="mdi-shield-account-outline">
              <template #subtitle>
                <v-chip v-for="r in user?.roles || []" :key="r" size="x-small" class="mr-1" color="primary" variant="tonal">
                  {{ r }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
          <v-card-actions>
            <v-btn variant="text" color="primary" :to="{ name: 'profile' }">编辑资料</v-btn>
            <v-btn variant="text" color="primary" :to="{ name: 'security' }">安全设置</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>



    <v-row class="mt-2">
      <v-col cols="12">
        <v-card rounded="lg" border flat>
          <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center flex-wrap gap-2">
            <v-icon icon="mdi-account-key-outline" class="mr-2" size="20" />
            第三方账号
            <v-spacer />
            <v-skeleton-loader v-if="identitiesLoading" v-for="n in 4" :key="`provider-skeleton-${n}`" type="button" width="92" class="mr-1" />
            <v-btn v-else v-for="p in bindProviders" :key="p.key" size="small" variant="tonal" color="primary" class="mr-1" @click="openBind(p.key)">
              绑定 {{ providerNames[p.key] || p.key }}
            </v-btn>
          </v-card-title>
          <v-divider />
          <v-card-text>
            <div v-if="identitiesLoading" class="py-4"><v-skeleton-loader type="list-item-avatar-two-line" :loading="true" /></div>
            <div v-else-if="!identities.length" class="text-center text-medium-emphasis py-6">尚未绑定第三方账号</div>
            <v-list v-else>
              <v-list-item v-for="id in identities" :key="id.id">
                <template #prepend>
                  <v-avatar :color="id.avatar || providerIcon(id.provider) ? undefined : 'primary'" size="36" class="identity-avatar">
                    <v-img v-if="providerIcon(id.provider)" :src="providerIcon(id.provider)" contain />
                    <v-img v-else-if="id.avatar" :src="id.avatar" cover />
                    <v-icon v-else icon="mdi-account-key-outline" color="white" />
                  </v-avatar>
                </template>
                <v-list-item-title>{{ providerNames[id.provider] || id.provider }}{{ id.displayName ? ' · ' + id.displayName : '' }}</v-list-item-title>
                <v-list-item-subtitle>{{ fmtDate(id.linkedAt) }} 绑定</v-list-item-subtitle>
                <template #append>
                  <v-btn size="small" variant="text" color="error" :loading="unbindingId === id.id" @click="unbind(id.id, providerNames[id.provider] || id.provider)">解绑</v-btn>
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>


    <v-dialog v-model="bindDialog" max-width="420">
      <v-card rounded="lg">
        <v-card-title class="text-subtitle-1 font-weight-bold pt-4">绑定 {{ providerNames[bindProvider] || bindProvider }}</v-card-title>
        <v-divider />
        <v-card-text>
          <p class="text-body-2">为确认是账号本人操作，请输入当前账号密码。</p>
          <v-text-field v-model="bindPassword" label="当前账号密码" type="password" variant="outlined" autocomplete="current-password" @keyup.enter="submitBind" />
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="bindDialog = false">取消</v-btn>
          <v-btn color="primary" :loading="bindLoading" @click="submitBind">确认并跳转</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <ConfirmDialog ref="confirmRef" />
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { announcementApi, apiKeyApi, externalIdentityApi } from '@/api/modules/admin'
import { consentApi } from '@/api/modules/rbac'
import { fmtDate } from '@/utils/format'
import { encryptPassword } from '@/api/crypto'
import { useUiStore } from '@/stores/ui'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const auth = useAuthStore()
const { user } = storeToRefs(auth)

const announcements = ref([])
function levelIcon(level) {
  return { info: 'mdi-information', success: 'mdi-check-circle', warning: 'mdi-alert', error: 'mdi-alert-octagon' }[String(level).toLowerCase()] || 'mdi-information'
}
function levelColor(level) {
  return { info: 'info', success: 'success', warning: 'warning', error: 'error' }[String(level).toLowerCase()] || 'info'
}
const consentCount = ref(0)
const apiKeyCount = ref(0)

const displayName = computed(() => user.value?.nickname || user.value?.username || '')

const stats = computed(() => [
  { label: '账户角色', value: (user.value?.roles || []).length, icon: 'mdi-shield-account', color: 'primary' },
  { label: '授权应用', value: consentCount.value, icon: 'mdi-apps', color: 'success' },
  { label: 'API 密钥', value: apiKeyCount.value, icon: 'mdi-key-variant', color: 'warning' },
  { label: '权限项', value: (user.value?.permissions || []).length, icon: 'mdi-lock-check', color: 'info' },
])

const ui = useUiStore()
const identities = ref([])
const identitiesLoading = ref(true)
const bindProviders = ref([])
const bindDialog = ref(false)
const bindProvider = ref('')
const bindPassword = ref('')
const bindLoading = ref(false)
const unbindingId = ref(null)
const confirmRef = ref(null)

const providerNames = { oidc: 'OpenID Connect' }

const providerIcon = (provider) => ({
})[String(provider || '').toLowerCase()] || ''

async function loadIdentities() {
  identitiesLoading.value = true
  try {
    const [identityResult, providerResult] = await Promise.allSettled([
      externalIdentityApi.list(),
      externalIdentityApi.providers(),
    ])
    identities.value = identityResult.status === 'fulfilled' ? (identityResult.value || []) : []
    const providers = providerResult.status === 'fulfilled' ? (providerResult.value || []) : []
    bindProviders.value = providers.filter((p) => p.enabled && !identities.value.some((i) => i.provider === p.key))
  } finally {
    identitiesLoading.value = false
  }
}

function openBind(provider) {
  bindProvider.value = provider
  bindPassword.value = ''
  bindDialog.value = true
}

async function submitBind() {
  if (!bindPassword.value) { ui.error('请输入当前账号密码'); return }
  bindLoading.value = true
  try {
    const passwordEncrypted = await encryptPassword(bindPassword.value)
    const res = await externalIdentityApi.bind(bindProvider.value, { passwordEncrypted })
    window.location.href = res.url
  } catch (e) {
    ui.error(e?.message || '绑定失败')
  } finally {
    bindLoading.value = false
  }
}

async function unbind(id, name) {
  const ok = await confirmRef.value.open({
    title: '解绑第三方账号',
    message: `确定解绑「${name}」吗？之后该方式将无法再登录此账号。`,
    confirmText: '解绑',
    confirmColor: 'error',
  })
  if (!ok) return
  unbindingId.value = id
  try {
    await externalIdentityApi.disconnect(id)
    ui.success('已解绑')
    loadIdentities()
  } catch (e) {
    ui.error(e?.message || '解绑失败')
  } finally {
    unbindingId.value = null
  }
}

onMounted(async () => {
  loadIdentities()
  announcementApi.active().then(list => { announcements.value = list || [] }).catch(() => {})
  const maybeConsents = auth.hasPermission('consent:read')
    ? consentApi.list().catch(() => null)
    : Promise.resolve(null)
  const maybeKeys = auth.hasPermission('apikey:read')
    ? apiKeyApi.listMine().catch(() => null)
    : Promise.resolve(null)
  const [consents, keys] = await Promise.allSettled([
    maybeConsents,
    maybeKeys,
  ])
  // "授权应用" counts only applications the user has actually granted, not every
  // enabled client (the list also contains not-yet-granted / expired entries).
  if (consents.status === 'fulfilled' && consents.value) {
    consentCount.value = (consents.value || []).filter((c) => (c?.status || '') === 'granted').length
  }
  if (keys.status === 'fulfilled' && keys.value) apiKeyCount.value = (keys.value || []).length
})
</script>
