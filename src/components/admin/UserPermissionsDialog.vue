<template>
  <v-dialog v-model="dialog" max-width="640" persistent scrollable>
    <v-card rounded="lg">
      <v-card-title class="text-subtitle-1 font-weight-bold pt-4 d-flex align-center">
        <v-icon icon="mdi-shield-key-outline" class="me-2" />
        权限 · {{ user?.username }}
      </v-card-title>
      <v-divider />
      <v-card-text style="max-height: 60vh">
        <div class="text-caption text-medium-emphasis mb-2">
          有效权限（角色继承 + 直接授予的并集）
        </div>
        <v-chip-group column>
          <v-chip v-for="p in effective" :key="p" size="small" variant="tonal"
            :color="directCodes.has(p) ? 'primary' : undefined">
            {{ p }}
            <v-icon v-if="directCodes.has(p)" end icon="mdi-star" size="x-small" title="直接授予" />
          </v-chip>
          <span v-if="!effective.length" class="text-medium-emphasis text-body-2">无</span>
        </v-chip-group>
        <div class="text-caption text-medium-emphasis mt-2">
          <v-icon icon="mdi-star" size="x-small" color="primary" /> 标记的为直接授予（其余来自角色继承）
        </div>

        <v-divider class="my-4" />

        <div class="text-subtitle-2 font-weight-bold mb-2">授予直接权限</div>
        <v-row dense>
          <v-col cols="12" md="5">
            <v-autocomplete v-model="grantForm.permissionCode" :items="permItems" label="权限"
              variant="outlined" density="compact" hint="格式：yyyy/mm/dd HH:mm" persistent-hint hide-details />
          </v-col>
          <v-col cols="12" md="4">
            <v-text-field v-model="grantForm.scope" label="范围（可选）" variant="outlined"
              density="compact" hide-details />
          </v-col>
          <v-col cols="12" md="3">
            <v-text-field v-model="grantForm.expiresAt" label="过期" type="datetime-local"
              variant="outlined" density="compact" hide-details />
          </v-col>
        </v-row>
        <div class="d-flex justify-end mt-2">
          <v-btn size="small" color="primary" variant="flat" :loading="granting"
            :disabled="!grantForm.permissionCode" @click="grant">授予</v-btn>
        </div>

        <v-divider class="my-4" />

        <div class="text-subtitle-2 font-weight-bold mb-2">已直接授予</div>
        <v-list v-if="grants.length" density="compact" lines="two">
          <v-list-item v-for="g in grants" :key="g.code" :title="`${g.name} (${g.code})`">
            <template #subtitle>
              <span v-if="g.scope">范围：{{ g.scope }} · </span>
              <span v-if="g.expiresAt" :class="g.expired ? 'text-error' : ''">
                {{ g.expired ? '已过期' : '到期' }}：{{ formatDate(g.expiresAt) }}
              </span>
              <span v-else>永久</span>
            </template>
            <template #append>
              <v-btn icon="mdi-close" size="x-small" variant="text" color="error"
                @click="revoke(g.code)" />
            </template>
          </v-list-item>
        </v-list>
        <div v-else class="text-body-2 text-medium-emphasis">暂无直接授予的权限</div>
      </v-card-text>
      <v-divider />
      <v-card-actions class="px-4 py-3">
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">关闭</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { rbacApi } from '@/api/modules/rbac'
import { useUiStore } from '@/stores/ui'
import { fmtDateTime as formatDate } from '@/utils/format'

const props = defineProps({ permissions: { type: Array, default: () => [] } })
const emit = defineEmits(['changed'])

const ui = useUiStore()
const dialog = ref(false)
const user = ref(null)
const effective = ref([])
const grants = ref([])
const directCodes = computed(() => new Set(grants.value.map((g) => g.code)))
const granting = ref(false)
const grantForm = reactive({ permissionCode: '', scope: '', expiresAt: '' })

const permItems = computed(() =>
  props.permissions.map((p) => ({ title: `${p.name} (${p.code})`, value: p.code })))

async function open(u) {
  user.value = u
  grantForm.permissionCode = ''
  grantForm.scope = ''
  grantForm.expiresAt = ''
  await refresh()
  dialog.value = true
}

async function refresh() {
  try {
    // Effective union and the direct-only grants come from two endpoints; the
    // latter carries scope/expiry so the UI can truthfully mark direct grants.
    const [eff, direct] = await Promise.all([
      rbacApi.getUserPermissions(user.value.id),
      rbacApi.getDirectGrants(user.value.id),
    ])
    effective.value = Array.isArray(eff) ? eff : [...(eff || [])]
    grants.value = direct || []
  } catch (e) {
    ui.error(e?.message || '加载权限失败')
  }
}

async function grant() {
  granting.value = true
  try {
    const payload = { permissionCode: grantForm.permissionCode, scope: grantForm.scope || null }
    if (grantForm.expiresAt) payload.expiresAt = new Date(grantForm.expiresAt).toISOString()
    await rbacApi.grantPermission(user.value.id, payload)
    grantForm.permissionCode = ''
    grantForm.scope = ''
    grantForm.expiresAt = ''
    await refresh()
    ui.success('已授予')
    emit('changed')
  } catch (e) {
    ui.error(e?.message || '授予失败')
  } finally {
    granting.value = false
  }
}

async function revoke(code) {
  try {
    await rbacApi.revokePermission(user.value.id, code)
    await refresh()
    ui.success('已撤销')
    emit('changed')
  } catch (e) {
    ui.error(e?.message || '撤销失败')
  }
}

defineExpose({ open })
</script>
