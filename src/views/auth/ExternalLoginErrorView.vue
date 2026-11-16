<template>
  <main class="external-error pa-4 pa-sm-8">
    <v-card class="external-error__card pa-6 pa-sm-8" border flat>
      <p class="text-body-2 text-medium-emphasis mb-3">{{ providerName }} · 登录未完成</p>
      <h1 class="text-h5 font-weight-bold mb-4">{{ message.title }}</h1>
      <p class="text-body-1 mb-5">{{ message.detail }}</p>
      <ol v-if="needsBinding" class="external-error__steps text-body-1 mb-6">
        <li>使用管理员下发的团队账号和密码登录通行证。</li>
        <li>进入“概览”，在“第三方账号”区域点击“绑定 {{ providerName }}”，验证团队账号密码并完成授权。</li>
        <li>绑定成功后，即可使用该第三方账号快速登录。</li>
      </ol>
      <p v-if="needsBinding" class="text-body-2 text-medium-emphasis mb-6">还没有团队账号？请联系管理员开通。无需在这里重新注册。</p>
      <div class="d-flex flex-wrap ga-3">
        <v-btn color="primary" variant="flat" :to="loginTarget">{{ needsBinding ? '使用团队账号登录并绑定' : '返回登录' }}</v-btn>
        <v-btn v-if="needsBinding" variant="text" :to="{ name: 'home' }">已登录，前往绑定</v-btn>
      </div>
      <p v-if="traceId" class="text-caption text-medium-emphasis mt-6 mb-0">问题编号：{{ traceId }}。如需协助，请把此编号提供给管理员。</p>
    </v-card>
  </main>
</template>
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { externalContinuation } from '@/utils/loginContinuation'
const route = useRoute()
const messages = {
  account_not_linked: { title: '请先绑定团队账号', detail: '这个第三方账号尚未绑定团队通行证账号。团队已关闭自助注册，请先使用管理员下发的账号登录，再进行绑定。' },
  cancelled: { title: '你已取消第三方授权', detail: '本次登录未完成。返回登录页后，可以重新选择登录方式。' },
  verification_failed: { title: '第三方授权未完成', detail: '授权信息无效、缺失或会话已过期。请返回登录页重新发起授权，避免刷新或重复使用旧回调链接。' },
  account_disabled: { title: '团队账号已被停用', detail: '请联系团队管理员核实账号状态，恢复后再登录。' },
  account_locked: { title: '团队账号暂时无法登录', detail: '账号可能已锁定或处于封禁期。请稍后重试，或联系管理员核实状态。' },
  account_conflict: { title: '第三方账号绑定发生冲突', detail: '请登录原先绑定的团队账号检查绑定关系；如需调整，请联系管理员处理。' },
  service_error: { title: '第三方登录暂时不可用', detail: '请稍后重新发起授权，也可以先使用管理员下发的团队账号和密码登录。' },
}
const reason = computed(() => Object.hasOwn(messages, String(route.query.reason)) ? String(route.query.reason) : 'service_error')
const message = computed(() => messages[reason.value])
const needsBinding = computed(() => reason.value === 'account_not_linked')
const providerNames = { oidc: 'OpenID Connect' }
const providerName = computed(() => Object.hasOwn(providerNames, String(route.query.provider)) ? providerNames[String(route.query.provider)] : '第三方账号')
const traceId = computed(() => /^[a-f\d]{16,32}$/i.test(String(route.query.traceId || '')) ? String(route.query.traceId) : '')
const loginTarget = computed(() => ({ name: 'login', query: { redirect: externalContinuation() || '/home' } }))
</script>
<style scoped>
.external-error { min-height: 100vh; min-height: 100dvh; display: grid; align-items: center; justify-items: center; }
.external-error__card { width: 100%; max-width: 620px; }
.external-error__steps { padding-inline-start: 1.5rem; line-height: 1.8; }
.external-error__steps li + li { margin-top: 8px; }
</style>
