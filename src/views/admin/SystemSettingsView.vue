<template>
  <div>
    <div class="mb-6">
      <h1 class="text-h5 font-weight-bold">系统设置</h1>
      <p class="text-body-2 text-medium-emphasis mb-0">管理账户登录策略与会话安全</p>
    </div>

    <LoginBackgroundSettings class="mb-5" title="登录背景" description="设置 Passport 登录页面的颜色和背景图片" :load-config="systemConfigApi.loginConfig" :upload-background="systemConfigApi.uploadBackground" :save-background="systemConfigApi.saveBackground" />
    <v-card rounded="lg" border flat>
      <v-card-title class="text-subtitle-1 font-weight-bold">全局登录安全</v-card-title>
      <v-card-text>
        <v-switch v-model="allowMultipleDevices" color="primary" label="允许同一账户多设备同时登录" hint="关闭后，新设备登录会自动注销该账户的旧设备。" persistent-hint :loading="policyLoading" :disabled="policyLoading || !policyReady" @update:model-value="savePolicy" />
        <v-divider class="my-4" />
        <v-checkbox v-model="revokeOAuthSessions" label="同时注销授权应用的登录令牌" hide-details class="mb-3" />
        <v-alert type="warning" variant="tonal" class="mb-4">此操作会注销除当前管理员设备外的全平台 AegisPassport 登录状态。</v-alert>
        <v-btn color="error" variant="tonal" :loading="logoutLoading" @click="openGlobalLogout">注销全体用户登录</v-btn>
      </v-card-text>
    </v-card>
    <v-dialog v-model="logoutDialog" max-width="460" persistent>
      <v-card rounded="lg">
        <v-card-title>确认注销全体用户登录</v-card-title>
        <v-card-text>
          <p class="text-body-2 mb-4">请输入当前管理员账号的密码。当前设备会保留，其他设备将被注销。</p>
          <v-form @submit.prevent="globalLogout">
            <v-text-field v-model="logoutPassword" label="当前密码" type="password" autocomplete="current-password" autofocus :disabled="logoutLoading" />
            <v-card-actions class="px-0"><v-spacer /><v-btn :disabled="logoutLoading" @click="logoutDialog = false">取消</v-btn><v-btn type="submit" color="error" :loading="logoutLoading" :disabled="!logoutPassword">验证并注销</v-btn></v-card-actions>
          </v-form>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import LoginBackgroundSettings from '@/components/admin/LoginBackgroundSettings.vue'
import { systemConfigApi } from '@/api/modules/admin'
import { encryptPassword } from '@/api/crypto'
import { useUiStore } from '@/stores/ui'

const allowMultipleDevices = ref(true)
const policyLoading = ref(false)
const logoutLoading = ref(false)
const revokeOAuthSessions = ref(false)
const policyReady = ref(false), savedPolicy = ref(true)
const logoutDialog = ref(false), logoutPassword = ref(''), ui = useUiStore()
async function loadPolicy() { policyLoading.value = true; try { const data = await systemConfigApi.sessionPolicy(); savedPolicy.value = data.allowMultipleDevices !== false; allowMultipleDevices.value = savedPolicy.value; policyReady.value = true } catch {} finally { policyLoading.value = false } }
async function savePolicy(value) { policyLoading.value = true; try { await systemConfigApi.saveSessionPolicy({ allowMultipleDevices: value }); savedPolicy.value = value } catch { allowMultipleDevices.value = savedPolicy.value } finally { policyLoading.value = false } }
function openGlobalLogout() { logoutPassword.value = ''; logoutDialog.value = true }
async function globalLogout() {
  if (logoutLoading.value || !logoutPassword.value) return
  logoutLoading.value = true
  try {
    const passwordEncrypted = await encryptPassword(logoutPassword.value)
    const result = await systemConfigApi.globalLogout(revokeOAuthSessions.value, passwordEncrypted)
    logoutDialog.value = false; logoutPassword.value = ''
    ui.success(`已注销 ${result.revokedSessions} 个登录设备`)
  } finally { logoutLoading.value = false }
}
loadPolicy()
</script>
