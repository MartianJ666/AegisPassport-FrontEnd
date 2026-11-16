<template>
  <AuthShell centered :content-width="440">
    <v-card class="auth-card register-card" elevation="8" width="440" max-width="92vw">
      <div class="text-center mb-6">
        <v-avatar color="primary" size="56" class="mb-3 auth-icon">
          <v-icon icon="mdi-account-plus-outline" size="30" color="white" />
        </v-avatar>
        <h1 class="text-h5 font-weight-bold">创建账户</h1>
        <p class="text-body-2 text-medium-emphasis mt-1">注册 AegisPassport 账户</p>
      </div>

      <v-form ref="formRef" @submit.prevent="onSubmit">
        <v-text-field
          v-model="form.username"
          label="用户名"
          prepend-inner-icon="mdi-account-outline"
          variant="outlined"
          :rules="usernameRules"
          autocomplete="username"
        />
        <v-text-field
          v-model="form.email"
          label="邮箱"
          prepend-inner-icon="mdi-email-outline"
          variant="outlined"
          :rules="emailRules"
          type="email"
          autocomplete="email"
        />
        <div class="verification-row">
          <v-text-field
            v-model="form.verificationCode"
            class="verification-input"
            label="验证码"
            prepend-inner-icon="mdi-shield-check-outline"
            variant="outlined"
            autocomplete="one-time-code"
            inputmode="numeric"
            maxlength="6"
            :rules="[(v) => /^[0-9]{6}$/.test(v) || '请输入 6 位验证码']"
          />
          <v-btn
            color="primary"
            variant="tonal"
            height="56"
            :disabled="cooldown > 0 || !isValidEmail"
            :loading="sending"
            @click="sendCode"
          >
            {{ cooldown > 0 ? `${cooldown}s` : '获取验证码' }}
          </v-btn>
        </div>
        <v-text-field
          v-model="form.password"
          label="密码"
          prepend-inner-icon="mdi-lock-outline"
          :type="showPwd ? 'text' : 'password'"
          :append-inner-icon="showPwd ? 'mdi-eye-off' : 'mdi-eye'"
          variant="outlined"
          :rules="passwordRules"
          autocomplete="new-password"
          @click:append-inner="showPwd = !showPwd"
        />

        <v-btn type="submit" color="primary" size="large" block :loading="loading" class="mt-2">
          注册
        </v-btn>
      </v-form>

      <div class="auth-card__footer">
        <span>已有账户？</span>
        <v-btn variant="text" color="primary" size="small" :to="{ name: 'login', query: continuation ? { redirect: continuation } : {} }">
          去登录
        </v-btn>
      </div>
    </v-card>
  </AuthShell>
</template>

<script setup>
import { computed, reactive, ref, onBeforeUnmount } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import { authApi } from '@/api/modules/account'
import { encryptPassword } from '@/api/crypto'
import AuthShell from '@/components/auth/AuthShell.vue'

const ui = useUiStore()
const router = useRouter(), route = useRoute()
import { safeRedirect } from '@/utils/url'
const continuation = computed(() => safeRedirect(route.query.redirect))
let cooldownTimer
onBeforeUnmount(() => clearInterval(cooldownTimer))

const form = reactive({ username: '', email: '', verificationCode: '', password: '' })
const showPwd = ref(false)
const loading = ref(false)
const sending = ref(false)
const cooldown = ref(0)
const formRef = ref(null)

const isValidEmail = computed(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
const usernameRules = [
  (v) => !!v || '请输入用户名',
  (v) => (v && v.length >= 3) || '用户名至少 3 个字符',
]
const emailRules = [(v) => isValidEmail.value || '请输入有效邮箱']
const passwordRules = [
  (v) => !!v || '请输入密码',
  (v) => (v && v.length >= 6) || '密码至少 6 个字符',
]

function startCooldown() {
  cooldown.value = 60
  clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1
    if (cooldown.value <= 0) clearInterval(cooldownTimer)
  }, 1000)
}

async function sendCode() {
  if (sending.value || cooldown.value > 0 || !isValidEmail.value) return
  sending.value = true
  try {
    await authApi.sendCode(form.email)
    ui.success('验证码已发送，请查收邮件')
    startCooldown()
  } catch (e) {
    ui.error(e?.message || '发送失败')
  } finally {
    sending.value = false
  }
}

async function onSubmit() {
  if (loading.value) return
  loading.value = true
  try {
    const { valid } = await formRef.value.validate()
    if (!valid) return
    const password = await encryptPassword(form.password)
    await authApi.register({ ...form, password })
    ui.success('注册成功，请登录')
    router.push({ name: 'login', query: continuation.value ? { redirect: continuation.value } : {} })
  } catch (e) {
    ui.error(e?.message || '注册失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.register-card {
  padding: 40px 32px;
}
.verification-row { display: flex; align-items: flex-start; gap: 12px; }
.verification-input { flex: 1; min-width: 0; }
.verification-row > .v-btn { flex: 0 0 auto; }
@media (max-width: 480px) { .register-card { padding: 30px 24px; } }
@media (max-width: 360px) { .register-card { padding: 24px 18px; } .verification-row { gap: 8px; } }
</style>
