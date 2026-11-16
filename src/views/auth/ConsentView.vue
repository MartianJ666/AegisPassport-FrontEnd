<template>
  <AuthShell centered :content-width="460">
    <v-card class="auth-card sso-card" elevation="8" width="460" max-width="92vw">
      <div v-if="status === 'loading'" class="state-card text-center"><v-progress-circular indeterminate color="primary" size="40" class="mb-3" /><p class="text-body-2 text-medium-emphasis mb-0">正在加载授权信息…</p></div>
      <div v-else-if="status === 'invalid' || status === 'denied'" class="state-card text-center"><v-avatar :color="status === 'denied' ? 'warning' : 'error'" size="56" class="mb-3"><v-icon icon="mdi-shield-alert-outline" size="30" color="white" /></v-avatar><h1 class="text-h5 font-weight-bold mb-2">{{ status === 'denied' ? '无权访问' : '授权请求已失效' }}</h1><p class="text-body-2 text-medium-emphasis mb-5">{{ status === 'denied' ? '当前账号没有使用此应用的权限，请联系管理员。' : '授权链接无效、已过期或已被使用，请重新发起。' }}</p><v-btn color="primary" block size="large" @click="goHome">返回 Pass</v-btn></div>
      <template v-else><div class="text-center mb-4"><v-avatar color="primary" size="56" class="mb-3"><v-icon icon="mdi-shield-check-outline" size="30" color="white" /></v-avatar><h1 class="text-h5 font-weight-bold">授权请求</h1><p class="text-body-2 text-medium-emphasis mt-1">应用 <strong class="app-name">{{ clientName }}</strong> 请求访问你的账户</p></div><v-sheet border rounded="lg" class="d-flex align-center pa-3 mb-4 account-bar" color="surface-variant"><v-avatar color="primary" size="40" class="mr-3"><v-icon icon="mdi-account-circle-outline" color="white" size="24" /></v-avatar><div class="flex-grow-1 mr-2" style="min-width:0"><div class="text-body-2 text-medium-emphasis">将以以下账号登录</div><div class="text-body-1 font-weight-bold text-truncate">{{ accountDisplay }}</div></div><v-btn variant="outlined" size="small" color="primary" prepend-icon="mdi-account-switch" :disabled="submitting" @click="switchAccount">切换账号</v-btn></v-sheet><v-list class="scope-list" lines="two" density="comfortable"><v-list-item v-for="item in scopeItems" :key="item.scope" :prepend-icon="item.icon" :title="item.title" :subtitle="item.subtitle"><template #append><v-checkbox-btn v-model="approved" :value="item.scope" :disabled="item.required || submitting" /></template></v-list-item></v-list><p class="text-caption text-medium-emphasis my-4">授权后，该应用将能够按上述范围访问你的信息。你可以随时在「授权应用」中撤销。</p><v-alert v-if="submissionError" type="error" variant="tonal" role="alert" class="my-4"><div>{{ submissionError }}</div><v-btn variant="text" class="mt-2" @click="restartLogin">重新发起登录</v-btn></v-alert><div v-else class="d-flex gap-2 consent-actions"><v-btn variant="outlined" block size="large" :disabled="submitting" @click="deny">拒绝</v-btn><v-btn color="primary" block size="large" :loading="submitting" @click="submit">允许</v-btn></div></template>
    </v-card>
  </AuthShell>
</template>
<script setup>
import { authOrigin } from '@/utils/url'
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { useRoute } from 'vue-router'
import http from '@/api/http'
import AuthShell from '@/components/auth/AuthShell.vue'
const route = useRoute(), consentToken = computed(() => String(route.query.token || '')), status = ref('loading'), clientId = ref(''), clientName = ref('此应用'), state = ref(''), scopes = ref([]), authorizeUrl = ref(''), currentUser = ref(null), approved = ref([]), submitting = ref(false)
const submissionError = ref('')
let submissionTimer, submittedForm
const accountDisplay = computed(() => { const u = currentUser.value; return u ? (u.nickname && u.nickname !== u.username ? `${u.nickname}（${u.username}）` : u.username) : '' })
const meta = { groups: {title:'角色与成员类别',subtitle:'读取你被分配的角色，不包含组织成员权限',icon:'mdi-account-group-outline'}, organization:{title:'所属组织',subtitle:'读取组织标识与组织名称',icon:'mdi-domain'}, openid: { title:'身份标识',subtitle:'确认你的登录身份',icon:'mdi-identifier',required:true }, profile:{title:'基本资料',subtitle:'用户名、昵称、头像',icon:'mdi-account-outline'}, email:{title:'邮箱地址',subtitle:'读取你的邮箱',icon:'mdi-email-outline'} }
const scopeItems = computed(() => scopes.value.map(scope => ({ scope, ...(meta[scope] || { title:scope,subtitle:'访问该范围的数据',icon:'mdi-key-outline' }) })))
async function load() { if (route.query.denied === '1') { status.value='denied'; return }; if (!consentToken.value) { status.value='invalid'; return }; try { const info=await http.get('/consent/info',{params:{token:consentToken.value}}); clientId.value=info.clientId||'';clientName.value=info.clientName||'此应用'; state.value=info.state||''; scopes.value=Array.isArray(info.scope)?info.scope:[]; authorizeUrl.value=info.authorizeUrl||''; currentUser.value=info.currentUser||null; if(!clientId.value||!authorizeUrl.value||!currentUser.value) throw new Error('invalid'); approved.value=[...scopes.value]; status.value='ready' } catch { status.value='invalid' } }
async function switchAccount() {
  if (submitting.value) return
  try {
    const info = await http.get('/consent/info', { params: { token: consentToken.value } })
    if (!info.accountConfirmToken) { status.value = 'invalid'; return }
    window.location.href=`${authOrigin('pass')}/auth/login?mode=temp&clientId=${encodeURIComponent(clientId.value)}&token=${encodeURIComponent(info.accountConfirmToken)}`
  } catch { status.value = 'invalid' }
}
function clearSubmission() {
  clearTimeout(submissionTimer)
  submittedForm?.remove()
  submittedForm = null
}
function failSubmission(message) {
  if (!submitting.value) return
  clearSubmission()
  submitting.value = false
  submissionError.value = message
}
function onPolicyViolation(event) {
  if (event.effectiveDirective === 'form-action') {
    failSubmission('浏览器拦截了授权后的跳转，请重新发起登录。')
  }
}
function restartLogin() {
  goHome()
}
function submitForm() {
  if (submitting.value || submissionError.value || status.value !== 'ready') return
  submitting.value = true
  const form = document.createElement('form')
  submittedForm = form
  form.method = 'POST'
  form.action = authorizeUrl.value
  form.hidden = true
  for (const [name, value] of Object.entries({client_id:clientId.value, state:state.value, token:consentToken.value})) {
    const input = document.createElement('input')
    input.type = 'hidden'; input.name = name; input.value = value; form.appendChild(input)
  }
  for (const scope of approved.value) {
    const input = document.createElement('input')
    input.type = 'hidden'; input.name = 'scope'; input.value = scope; form.appendChild(input)
  }
  document.body.appendChild(form)
  submissionTimer = setTimeout(() => failSubmission('授权跳转超过 15 秒仍未完成，请重新发起登录，避免重复提交当前授权。'), 15000)
  try { HTMLFormElement.prototype.submit.call(form) }
  catch { failSubmission('授权请求未能提交，请重新发起登录。') }
}
function submit() { submitForm() }
function deny() { approved.value = []; submitForm() }
function goHome() { window.location.href = `${authOrigin('pass')}/auth/login` }
onMounted(() => { document.addEventListener('securitypolicyviolation', onPolicyViolation); load() })
onBeforeUnmount(() => { clearSubmission(); document.removeEventListener('securitypolicyviolation', onPolicyViolation) })
</script>
<style scoped>.app-name{overflow-wrap:anywhere}.sso-card{padding:40px 32px}.state-card{padding-block:24px}.scope-list{max-height:min(320px,35dvh);overflow-y:auto;border-radius:16px;background:rgba(var(--v-theme-surface),.42)}.account-bar{border-color:rgba(var(--v-theme-primary),.35)!important;background:rgba(var(--v-theme-surface-variant),.62)!important}.consent-actions .v-btn{flex:1 1 0;min-width:0}@media(max-width:760px),(max-height:760px){.sso-card{padding:30px 24px}.scope-list{max-height:none}}
@media(max-width:420px){.sso-card{padding:26px 18px}.account-bar{padding:10px!important}.account-bar .v-btn{padding-inline:10px;font-size:.78rem}.scope-list{margin-inline:-4px}}
@media (orientation:landscape) and (max-height:540px){.sso-card{padding:18px 26px}.sso-card .mb-4{margin-bottom:10px!important}.scope-list{max-height:150px}}
</style>
