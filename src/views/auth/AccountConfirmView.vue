<template>
  <AuthShell centered :content-width="460">
    <v-card class="auth-card sso-card" elevation="8" width="460" max-width="92vw">
      <div v-if="status === 'loading'" class="state-card text-center"><v-progress-circular indeterminate color="primary" size="40" class="mb-3" /><p class="text-body-2 text-medium-emphasis mb-0">正在加载确认信息…</p></div>
      <div v-else-if="status === 'invalid'" class="state-card text-center"><v-avatar color="error" size="56" class="mb-3"><v-icon icon="mdi-shield-alert-outline" size="30" color="white" /></v-avatar><h1 class="text-h5 font-weight-bold mb-2">登录请求已失效</h1><p class="text-body-2 text-medium-emphasis mb-5">登录链接无效、已过期或已被使用，请返回应用后重试。</p><v-btn color="primary" block size="large" @click="goHome">返回 Pass</v-btn></div>
      <template v-else><div class="text-center mb-5"><v-avatar color="primary" size="56" class="mb-3"><v-icon icon="mdi-shield-account-outline" size="30" color="white" /></v-avatar><h1 class="text-h5 font-weight-bold">确认登录</h1><p class="text-body-2 text-medium-emphasis mt-1">应用 <strong class="app-name">{{ clientName }}</strong> 请求登录，确认使用以下账号</p></div><v-sheet border rounded="lg" class="d-flex align-center pa-3 mb-4 account-bar" color="surface-variant"><v-avatar color="primary" size="44" class="mr-3"><v-icon icon="mdi-account-circle-outline" color="white" size="26" /></v-avatar><div class="flex-grow-1 mr-2 account-copy"><div class="text-body-2 text-medium-emphasis">当前账号</div><div class="text-body-1 font-weight-bold">{{ accountDisplay }}</div></div></v-sheet><p class="text-caption text-medium-emphasis mb-4">确认后将以该账号登录此应用。如需使用其他账号，请先切换。</p><div class="d-flex gap-2 consent-actions"><v-btn variant="outlined" block size="large" :disabled="submitting" @click="switchAccount"><v-icon start icon="mdi-account-switch" />切换账号</v-btn><v-btn color="primary" block size="large" :loading="submitting" @click="confirm"><v-icon start icon="mdi-check" />确认登录</v-btn></div></template>
    </v-card>
  </AuthShell>
</template>
<script setup>
import { authOrigin } from '@/utils/url'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import http from '@/api/http'
import AuthShell from '@/components/auth/AuthShell.vue'
const route=useRoute(), token=computed(()=>String(route.query.token||'')), tempToken=computed(()=>String(route.query.tempToken||'')), status=ref('loading'), clientId=ref(''), clientName=ref('此应用'), authorizeUrl=ref(''), currentUser=ref(null), submitting=ref(false)
const accountDisplay=computed(()=>{const u=currentUser.value;return u?(u.nickname&&u.nickname!==u.username?`${u.nickname}（${u.username}）`:u.username):''})
async function load(){if(!token.value){status.value='invalid';return}try{const params={token:token.value};if(tempToken.value)params.tempToken=tempToken.value;const info=await http.get('/account-confirm/info',{params});clientId.value=info.clientId||'';clientName.value=info.clientName||'此应用';authorizeUrl.value=info.authorizeUrl||'';currentUser.value=info.currentUser||null;if(!clientId.value||!authorizeUrl.value||!currentUser.value)throw new Error('invalid');status.value='ready'}catch{status.value='invalid'}}
function confirm(){if(submitting.value||status.value!=='ready')return;submitting.value=true;const u=new URL(authorizeUrl.value,window.location.origin);u.searchParams.set('aegis_account_confirmed','1');u.searchParams.set('aegis_confirm_token',token.value);if(tempToken.value)u.searchParams.set('aegis_temp_token',tempToken.value);window.location.href=u.href}
function switchAccount(){if(!submitting.value&&status.value==='ready')window.location.href=`${authOrigin('pass')}/auth/login?mode=temp&clientId=${encodeURIComponent(clientId.value)}&token=${encodeURIComponent(token.value)}`}
function goHome(){window.location.href=`${authOrigin('pass')}/auth/login`} onMounted(load)
</script>
<style scoped>.app-name{overflow-wrap:anywhere}.sso-card{padding:40px 32px}.state-card{padding-block:24px}.account-bar{border-color:rgba(var(--v-theme-primary),.35)!important;background:rgba(var(--v-theme-surface-variant),.62)!important}.account-copy{min-width:0;overflow-wrap:anywhere}.consent-actions .v-btn{flex:1 1 0;min-width:0}@media(max-width:760px),(max-height:760px){.sso-card{padding:30px 24px}}
@media(max-width:420px){.sso-card{padding:26px 18px}.account-bar{padding:10px!important}}
@media (orientation:landscape) and (max-height:540px){.sso-card{padding:18px 26px}.sso-card .mb-5{margin-bottom:10px!important}}
</style>
