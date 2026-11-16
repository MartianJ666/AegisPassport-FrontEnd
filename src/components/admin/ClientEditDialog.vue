<template>
  <v-dialog v-model="dialog" max-width="760" persistent scrollable>
    <v-card rounded="lg">
      <v-card-title class="text-subtitle-1 font-weight-bold pt-4">
        {{ editing ? '编辑应用' : '注册应用' }}
      </v-card-title>
      <v-divider />
      <v-card-text style="max-height: 68vh">
        <div class="d-flex align-center mb-4">
          <v-avatar size="64" color="surface-variant" rounded="lg" class="me-4">
            <v-img v-if="iconPreview" :src="iconPreview" />
            <v-icon v-else icon="mdi-application-outline" size="32" />
          </v-avatar>
          <v-file-input v-model="iconFile" label="应用图标" variant="outlined" density="compact"
            accept="image/*" prepend-icon="" prepend-inner-icon="mdi-image-outline" hide-details
            @update:model-value="onIcon" />
        </div>

        <v-row dense>
          <v-col cols="12" md="6">
            <v-text-field v-model="form.clientName" label="应用名称" variant="outlined"
              prepend-inner-icon="mdi-tag-outline" />
          </v-col>
          <v-col cols="12" md="6">
            <v-switch v-model="form.enabled" label="启用应用" color="primary" inset hide-details />
          </v-col>
        </v-row>
        <v-textarea v-model="form.clientDescription" label="应用描述" variant="outlined" rows="2"
          auto-grow prepend-inner-icon="mdi-text" class="mt-2" />

        <v-textarea v-model="form.redirectUris" label="回调地址 (每行一个)" variant="outlined" rows="2"
          auto-grow prepend-inner-icon="mdi-link-variant" class="mt-2"
          hint="OAuth2 authorization_code 回调 URI" persistent-hint />

        <v-row dense class="mt-2">
          <v-col cols="12" md="6">
            <v-combobox v-model="grantTypes" :items="grantOptions" label="授权类型" variant="outlined"
              multiple chips closable-chips prepend-inner-icon="mdi-key-chain" />
          </v-col>
          <v-col cols="12" md="6">
            <v-combobox v-model="scopes" :items="scopeOptions" label="授权范围 (scopes)" variant="outlined"
              multiple chips closable-chips prepend-inner-icon="mdi-format-list-checks" />
          </v-col>
        </v-row>

        <v-row dense>
          <v-col cols="12" md="4">
            <v-text-field v-model.number="form.accessTokenTtl" label="Access Token TTL (秒)" type="number"
              variant="outlined" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model.number="form.refreshTokenTtl" label="Refresh Token TTL (秒)" type="number"
              variant="outlined" />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model.number="form.authorizationCodeTtl" label="Code TTL (秒)" type="number"
              variant="outlined" />
          </v-col>
        </v-row>

        <div class="d-flex flex-wrap gap-4">
          <v-switch v-model="form.requirePkce" label="强制 PKCE" color="primary" inset hide-details />
          <v-switch v-model="form.requireConsent" label="需授权同意" color="primary" inset hide-details />
        </div>

        <v-expansion-panels variant="accordion" class="mt-4">
          <v-expansion-panel title="访问控制 (可选)">
            <v-expansion-panel-text>
              <v-select v-model="allowedRoles" :items="roleOptions" label="允许的角色（成员类别）" variant="outlined"
                multiple chips closable-chips class="mb-2" hint="留空表示不限角色；管理员直接放行优先于组织和角色门禁" persistent-hint />
              <v-divider class="my-4" />
              <div class="text-subtitle-2 mb-2">组织门禁</div>
              <v-switch v-model="form.organizationRestricted" label="仅允许指定组织" color="primary" inset hide-details />
              <v-alert v-if="form.organizationRestricted && !allowedOrganizations.length" type="warning" variant="tonal" class="my-3">尚未选择组织，除管理员直接放行外，该应用将拒绝所有组织和未分配组织的账户。</v-alert>
              <v-autocomplete v-if="form.organizationRestricted" v-model="allowedOrganizations" :items="organizations" item-title="name" item-value="id" label="允许的组织" variant="outlined" multiple chips closable-chips :loading="orgLoading" :disabled="orgLoading || !!orgError" no-data-text="请先在组织管理页新建组织" />
              <v-autocomplete v-model="deniedOrganizations" :items="organizations" item-title="name" item-value="id" label="禁止的组织" variant="outlined" multiple chips closable-chips :loading="orgLoading" :disabled="orgLoading || !!orgError" hint="禁止组织优先于允许组织；管理员直接放行可越过组织限制" persistent-hint />
              <v-alert v-if="orgError" type="error" variant="tonal" role="alert">{{ orgError }}<v-btn variant="text" @click="loadOrganizations">重新加载</v-btn></v-alert>
              <v-divider class="my-4" /><div class="text-subtitle-2 mb-2">个人门禁</div>
              <p class="text-body-2 text-medium-emphasis">请在用户管理 → 应用访问中设置管理员特批、有效期或个人禁止。</p>
            </v-expansion-panel-text>
          </v-expansion-panel>
        </v-expansion-panels>
      </v-card-text>
      <v-divider />
      <v-card-actions class="px-4 py-3">
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">取消</v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" :disabled="orgLoading || !!orgError" @click="save">保存</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, onUnmounted, reactive, ref } from 'vue'
import { clientApi } from '@/api/modules/rbac'
import { organizationApi } from '@/api/modules/organizations'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { resolveAssetUrl } from '@/utils/url'

const props = defineProps({ roles: { type: Array, default: () => [] } })
const emit = defineEmits(['saved'])

const ui = useUiStore()
const auth = useAuthStore()
const dialog = ref(false)
const editing = ref(false)
const saving = ref(false)
const editId = ref(null)
const iconFile = ref(null)
const iconPreview = ref('')
const onCreatedCb = ref(null)

const grantOptions = ['authorization_code', 'refresh_token', 'client_credentials']
const scopeOptions = ['openid', 'profile', 'email', 'groups', 'organization', 'phone', 'offline_access']
const roleOptions = computed(() => props.roles.map((r) => ({title: `${r.name} (${r.code})`, value: r.code})))
const organizations=ref([]),orgLoading=ref(false),orgError=ref(''),allowedOrganizations=ref([]),deniedOrganizations=ref([])
async function loadOrganizations(){orgLoading.value=true;orgError.value='';try{organizations.value=await organizationApi.list()}catch(e){orgError.value=e.message||'组织列表加载失败'}finally{orgLoading.value=false}}

const grantTypes = ref([])
const scopes = ref([])
const allowedRoles = ref([])

const form = reactive({
  clientName: '', clientDescription: '', redirectUris: '',
  accessTokenTtl: 900, refreshTokenTtl: 604800, authorizationCodeTtl: 300,
  requirePkce: true, requireConsent: true, enabled: true,
  allowedUsers: '', deniedUsers: '', organizationRestricted: false,
})

function open(client, onCreated) {
  onCreatedCb.value = onCreated || null
  releaseIconPreview()
  iconFile.value = null
  allowedOrganizations.value=(client?.allowedOrganizations||'').split(',').filter(Boolean).map(Number)
  deniedOrganizations.value=(client?.deniedOrganizations||'').split(',').filter(Boolean).map(Number)
  loadOrganizations()
  if (client) {
    editing.value = true
    editId.value = client.clientId
    Object.assign(form, {
      clientName: client.clientName, clientDescription: client.clientDescription || '',
      redirectUris: (client.redirectUris || '').split(',').filter(Boolean).join('\n'),
      accessTokenTtl: client.accessTokenTtl, refreshTokenTtl: client.refreshTokenTtl,
      authorizationCodeTtl: client.authorizationCodeTtl,
      requirePkce: client.requirePkce, requireConsent: client.requireConsent,
      organizationRestricted: !!client.organizationRestricted, enabled: client.enabled, allowedUsers: client.allowedUsers || '',
      deniedUsers: client.deniedUsers || '',
    })
    grantTypes.value = (client.grantTypes || '').split(',').filter(Boolean)
    scopes.value = (client.scopes || '').split(',').filter(Boolean)
    allowedRoles.value = (client.allowedRoles || '').split(',').filter(Boolean)
    iconPreview.value = client.clientIcon ? resolveAssetUrl(client.clientIcon) : ''
  } else {
    editing.value = false
    editId.value = null
    Object.assign(form, {
      clientName: '', clientDescription: '', redirectUris: '',
      accessTokenTtl: 900, refreshTokenTtl: 604800, authorizationCodeTtl: 300,
      requirePkce: true, requireConsent: true, enabled: true,
      allowedUsers: '', deniedUsers: '', organizationRestricted: false,
    })
    grantTypes.value = ['authorization_code', 'refresh_token']
    scopes.value = ['openid', 'profile', 'email']
    allowedRoles.value = []
    iconPreview.value = ''
  }
  dialog.value = true
}

let iconObjectUrl = ''
function releaseIconPreview() {
  if (iconObjectUrl) URL.revokeObjectURL(iconObjectUrl)
  iconObjectUrl = ''
}
function onIcon(file) {
  releaseIconPreview()
  const f = Array.isArray(file) ? file[0] : file
  if (f) iconPreview.value = iconObjectUrl = URL.createObjectURL(f)
  else iconPreview.value = ''
}
onUnmounted(releaseIconPreview)

async function save() {
  if(saving.value || orgLoading.value || orgError.value)return
  if (!form.clientName?.trim()) { ui.error('请填写应用名称'); return }
  if ([form.accessTokenTtl, form.refreshTokenTtl, form.authorizationCodeTtl].some(v => !Number.isInteger(v) || v <= 0)) { ui.error('有效期必须为正整数秒'); return }
  saving.value = true
  try {
    // Backend expects a multipart request: a JSON "data" part matching
    // ClientRequest plus an optional "icon" file part.
    const data = {
      clientName: form.clientName,
      clientDescription: form.clientDescription,
      redirectUris: form.redirectUris.split(/[\n,]/).map((s) => s.trim()).filter(Boolean).join(','),
      grantTypes: grantTypes.value.join(','),
      scopes: scopes.value.join(','),
      accessTokenTtl: form.accessTokenTtl,
      refreshTokenTtl: form.refreshTokenTtl,
      authorizationCodeTtl: form.authorizationCodeTtl,
      requirePkce: form.requirePkce,
      requireConsent: form.requireConsent,
      enabled: form.enabled,
      allowedRoles: allowedRoles.value.join(','),
      organizationRestricted: form.organizationRestricted,
      allowedOrganizations: allowedOrganizations.value.join(','), deniedOrganizations: deniedOrganizations.value.join(','),
    }
    const fd = new FormData()
    fd.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }))
    const iconF = Array.isArray(iconFile.value) ? iconFile.value[0] : iconFile.value
    if (iconF) fd.append('icon', iconF)

    let result
    if (editing.value) {
      result = await clientApi.update(editId.value, fd)
    } else {
      result = await clientApi.create(fd)
    }
    ui.success('已保存')
    dialog.value = false
    if (!editing.value && onCreatedCb.value) onCreatedCb.value(result)
    emit('saved')
  } catch (e) {
    ui.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

defineExpose({ open })
</script>
