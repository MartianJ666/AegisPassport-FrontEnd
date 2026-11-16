<template>
  <AuthShell centered :content-width="420">
    <v-card class="auth-card login-card" elevation="8" width="420" max-width="92vw">
      <div class="login-card__inner">
        <div class="text-center mb-6">
          <v-avatar color="primary" size="56" class="mb-3 auth-icon"><v-icon :icon="isTempMode ? 'mdi-account-switch' : 'mdi-shield-key'" size="30" color="white" /></v-avatar>
          <h1 class="text-h5 font-weight-bold">{{ isTempMode ? '应用账号切换' : '欢迎回来' }}</h1>
          <p class="text-body-2 text-medium-emphasis mt-1">{{ isTempMode ? '使用其他账号登录此应用，主账号保持不变' : '登录 AegisPassport 账户' }}</p>
        </div>
        <v-alert v-if="loginError" type="error" variant="tonal" class="mb-4" role="alert">{{ loginError }}</v-alert>
        <v-form ref="formRef" @submit.prevent="onSubmit">
          <v-text-field v-model="form.username" label="用户名或邮箱" prepend-inner-icon="mdi-account-outline" variant="outlined" :rules="[(v) => !!v || '请输入用户名']" autocomplete="username" />
          <v-text-field v-model="form.password" label="密码" prepend-inner-icon="mdi-lock-outline" :type="showPwd ? 'text' : 'password'" :append-inner-icon="showPwd ? 'mdi-eye-off' : 'mdi-eye'" variant="outlined" :rules="[(v) => !!v || '请输入密码']" autocomplete="current-password" @click:append-inner="showPwd = !showPwd" />
          <v-btn type="submit" color="primary" size="large" block :loading="loading" class="mt-2">登录</v-btn>
        </v-form>
        <div v-if="!isTempMode && providers.length" class="mt-6"><v-divider class="mb-4" /><div class="text-caption text-medium-emphasis text-center mb-3">快捷登录</div><div class="quick-login-actions d-flex justify-center ga-3"><v-btn v-for="provider in providers" :key="provider.key" variant="outlined" size="42" class="quick-login-icon" :title="provider.name" @click="startProvider(provider.key)"><v-icon :icon="providerIcon(provider.key)" /></v-btn></div></div>
        <div v-if="!isTempMode" class="auth-card__footer">
          <span>还没有账户？</span>
          <v-btn variant="text" color="primary" size="small" :to="{ name: 'register', query: safeRedirect(route.query.redirect) ? { redirect: safeRedirect(route.query.redirect) } : {} }">注册新账户</v-btn>
        </div>
      </div>
    </v-card>
  </AuthShell>
</template>
<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { externalIdentityApi } from '@/api/modules/admin'
import AuthShell from '@/components/auth/AuthShell.vue'
import { safeRedirect, authOrigin, isServerContinuation } from '@/utils/url'
import { errorMessage } from '@/utils/errors'
import { rememberExternalContinuation, externalContinuation } from '@/utils/loginContinuation'
const auth = useAuthStore(), ui = useUiStore(), route = useRoute(), router = useRouter()
const form = reactive({ username: '', password: '' }), showPwd = ref(false), loading = ref(false), formRef = ref(null), providers = ref([])
const loginError = ref('')
const isTempMode = computed(() => route.query.mode === 'temp')
const PROVIDER_ICONS = { oidc: 'mdi-passport' }
function providerIcon(key) { return PROVIDER_ICONS[key] || 'mdi-shield-key' }
function startProvider(provider) { rememberExternalContinuation(route.query.redirect); window.location.href = `/api/external-identities/${encodeURIComponent(provider)}/start` }
async function loadProviders() { try { providers.value = (await externalIdentityApi.providers())?.filter((p) => p.enabled) || [] } catch { providers.value = [] } }
async function onSubmit() { const { valid } = await formRef.value.validate(); if (!valid || loading.value) return; loginError.value = ''; loading.value = true; try { if (isTempMode.value) await handleTempLogin(); else await handleMainLogin() } catch (e) { loginError.value = errorMessage(e, '登录失败，请稍后重试') } finally { loading.value = false } }
async function handleMainLogin() { await auth.login(form); ui.success('登录成功'); const target = safeRedirect(route.query.redirect); externalContinuation(true); if (auth.needsSetup) { router.replace({name:'complete-external',query:target?{redirect:target}:{}}); return }; if (isServerContinuation(target)) window.location.assign(target); else router.replace(target || { name: 'home' }) }
async function handleTempLogin() { const clientId = String(route.query.clientId || ''); if (!clientId) { ui.error('缺少应用信息，请重新发起授权'); return }; const res = await auth.tempLogin({ clientId, ...form }); if (!res?.tempToken) { ui.error('切换账号失败，请重试'); return }; const q = new URLSearchParams({ token: String(route.query.token || ''), tempToken: res.tempToken }); window.location.href = `${authOrigin('sso')}/oauth2/account-confirm?${q}` }
onMounted(loadProviders)
</script>
<style scoped>.login-card{padding:40px 32px}.login-card__inner{max-width:340px;margin-inline:auto}.auth-icon{box-shadow:0 10px 26px rgba(var(--v-theme-primary),.28)}.quick-login-actions{flex-wrap:wrap}.quick-login-icon{flex:0 0 42px;border-radius:50%;transition:transform .2s ease,color .2s ease}.quick-login-icon:hover{transform:translateY(-2px);color:rgb(var(--v-theme-primary))}@media(max-width:480px){.login-card{padding:30px 24px}.login-card__inner{max-width:none}}
@media (max-width:360px){.login-card{padding:24px 18px}.login-card__inner :deep(.v-field){font-size:.94rem}}
@media (orientation:landscape) and (max-height:540px){.login-card{padding:22px 28px}.login-card__inner{max-width:420px}.login-card .mb-6{margin-bottom:14px!important}.login-card .mt-6{margin-top:14px!important}}
</style>
