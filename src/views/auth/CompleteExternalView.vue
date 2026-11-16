<template>
  <div class="auth-wrap">
    <div class="auth-scrim" />
    <v-card class="auth-card" elevation="8" width="460" max-width="94vw">
      <div class="text-center mb-4">
        <v-avatar color="primary" size="56" class="mb-3">
          <v-icon :icon="mergeAvailable ? 'mdi-account-switch-outline' : 'mdi-account-check-outline'" size="30" color="white" />
        </v-avatar>
        <h1 class="text-h5 font-weight-bold">{{ mergeAvailable ? '合并到已有账号' : '完善账号信息' }}</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">
          {{ mergeAvailable
            ? '验证目标账号后，此第三方登录将绑定到该账号，并重设该账号密码'
            : '这是通过第三方登录创建的新账号，请设置用户名、邮箱和密码' }}
        </p>
      </div>

      <v-alert v-if="mergeAvailable" type="warning" variant="tonal" class="mb-4">
        邮箱 <strong>{{ form.email }}</strong> 已被账号使用。合并后此 上游身份 将绑定到该账号，以后用它登录会直接进入该账号。
      </v-alert>

      <v-form ref="formRef" @submit.prevent="mergeAvailable ? submitMerge() : onSubmit()">
        <template v-if="!mergeAvailable">
          <v-text-field
            v-model="form.username"
            label="用户名"
            variant="outlined"
            prepend-inner-icon="mdi-account-outline"
            :rules="usernameRules"
            autocomplete="username"
          />
          <v-text-field
            v-model="form.email"
            label="邮箱"
            type="email"
            variant="outlined"
            prepend-inner-icon="mdi-email-outline"
            :rules="emailRules"
            autocomplete="email"
          />
          <v-text-field
            v-model="form.password"
            label="设置密码"
            :type="showPwd ? 'text' : 'password'"
            variant="outlined"
            prepend-inner-icon="mdi-lock-outline"
            :append-inner-icon="showPwd ? 'mdi-eye-off' : 'mdi-eye'"
            :rules="[(v) => (v || '').length >= 6 || '密码至少 6 位']"
            autocomplete="new-password"
            @click:append-inner="showPwd = !showPwd"
          />
          <v-text-field
            v-model="form.confirm"
            label="确认密码"
            :type="showPwd ? 'text' : 'password'"
            variant="outlined"
            prepend-inner-icon="mdi-lock-outline"
            :rules="[(v) => v === form.password || '两次密码不一致']"
            autocomplete="new-password"
          />
          <v-btn type="submit" color="primary" size="large" block :loading="loading" class="mt-2">
            完成设置
          </v-btn>
        </template>

        <template v-else>
          <v-text-field
            v-model="mergeForm.username"
            label="目标账号用户名"
            variant="outlined"
            prepend-inner-icon="mdi-account-outline"
            autocomplete="username"
          />
          <v-text-field
            v-model="mergeForm.password"
            label="目标账号密码"
            type="password"
            variant="outlined"
            prepend-inner-icon="mdi-lock-outline"
            autocomplete="current-password"
          />
          <v-divider class="my-3" />
          <v-text-field
            v-model="mergeForm.newPassword"
            label="为该账号设置新密码"
            :type="showPwd ? 'text' : 'password'"
            variant="outlined"
            prepend-inner-icon="mdi-lock-reset"
            :append-inner-icon="showPwd ? 'mdi-eye-off' : 'mdi-eye'"
            :rules="[(v) => (v || '').length >= 6 || '新密码至少 6 位']"
            autocomplete="new-password"
            @click:append-inner="showPwd = !showPwd"
          />
          <v-text-field
            v-model="mergeForm.confirmNew"
            label="确认新密码"
            type="password"
            variant="outlined"
            prepend-inner-icon="mdi-lock-reset"
            :rules="[(v) => v === mergeForm.newPassword || '两次新密码不一致']"
            autocomplete="new-password"
          />
          <v-btn type="submit" color="warning" size="large" block :loading="loading" class="mt-2">
            合并并重设密码
          </v-btn>
          <v-btn variant="text" size="small" block class="mt-2" @click="cancelMerge">
            换个邮箱继续
          </v-btn>
        </template>
      </v-form>

      <p class="text-caption text-medium-emphasis text-center mt-4 mb-0">
        用户名用于登录；合并后可在「概览 → 第三方账号」中随时解绑。
      </p>
    </v-card>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { safeRedirect } from '@/utils/url'
import { externalContinuation } from '@/utils/loginContinuation'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { encryptPassword } from '@/api/crypto'
import { externalSetupApi } from '@/api/modules/admin'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const route = useRoute()
function finishSetup() {
  const target = safeRedirect(route.query.redirect) || externalContinuation(true) || '/home'
  externalContinuation(true)
  auth.setToken('')
  window.location.assign(target)
}

const formRef = ref(null)
const loading = ref(false)
const showPwd = ref(false)
const mergeAvailable = ref(false)
const form = reactive({ username: '', email: '', password: '', confirm: '' })
const mergeForm = reactive({ username: '', password: '', newPassword: '', confirmNew: '' })

const emailRules = [(v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || '') || '请输入有效邮箱']
const usernameRules = [
  (v) => !!v || '请输入用户名',
  (v) => (v || '').length >= 3 && (v || '').length <= 50 || '用户名需 3-50 个字符',
]

onMounted(() => {
  // Prefill the username with the third-party display name (e.g. QQ/微信 昵称).
  if (auth.user?.nickname && !form.username) {
    // Provider display names often contain spaces, which usernames cannot; strip them.
    form.username = auth.user.nickname.trim()
  }
  // Prefill the verified provider email when available (the provider may supply one).
  if (auth.user?.email && !form.email) {
    form.email = auth.user.email
  }
})

async function onSubmit() {
  const { valid } = await formRef.value.validate()
  if (!valid) {
    ui.error('请检查用户名、邮箱和密码输入')
    return
  }
  loading.value = true
  try {
    const passwordEncrypted = await encryptPassword(form.password)
    await externalSetupApi.setup({
      username: form.username.trim(),
      email: form.email,
      passwordEncrypted,
    })
    ui.success('账号设置完成')
    // The backend re-issued a fresh session (username changed); reload to use it.
    finishSetup()
  } catch (e) {
    if (e?.errorCode === 'EMAIL_TAKEN_MERGE_AVAILABLE' || e?.response?.data?.errorCode === 'EMAIL_TAKEN_MERGE_AVAILABLE') {
      mergeAvailable.value = true
    } else {
      ui.error(e?.message || '设置失败，请重试')
    }
  } finally {
    loading.value = false
  }
}

function cancelMerge() {
  mergeAvailable.value = false
}

async function submitMerge() {
  if (!mergeForm.username) { ui.error('请输入目标账号用户名'); return }
  if (!mergeForm.password) { ui.error('请输入目标账号密码'); return }
  if (!mergeForm.newPassword || mergeForm.newPassword.length < 6) { ui.error('新密码至少 6 位'); return }
  if (mergeForm.newPassword !== mergeForm.confirmNew) { ui.error('两次新密码不一致'); return }
  loading.value = true
  try {
    const passwordEncrypted = await encryptPassword(mergeForm.password)
    const newPasswordEncrypted = await encryptPassword(mergeForm.newPassword)
    const res = await externalSetupApi.merge({
      username: mergeForm.username,
      passwordEncrypted,
      newPasswordEncrypted,
    })
    ui.success(`已合并，当前登录账号：${res?.username || ''}`)
    // Session now belongs to the merged account; reload to re-read the new JWT cookie.
    finishSetup()
  } catch (e) {
    ui.error(e?.message || '合并失败，请检查目标账号的用户名和密码')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-wrap {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #2A7CB5, #174C70);
  position: relative;
  padding: 24px;
}
.auth-scrim { position: absolute; inset: 0; }
.auth-card { position: relative; padding: 40px 32px; border-radius: 20px !important; }
</style>
