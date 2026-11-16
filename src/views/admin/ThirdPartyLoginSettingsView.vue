<template>
  <div>
    <div class="d-flex align-center justify-space-between mb-6"><h1 class="text-h5 font-weight-bold">第三方登录管理</h1><v-btn color="primary" :loading="saving" @click="save">保存配置</v-btn></div>
    <v-alert type="info" variant="tonal" class="mb-5">填写上游身份服务的公开 Issuer 和应用凭据。使用授权码与 PKCE S256；回调地址必须与下方显示的地址一致。密钥不会回显，留空表示保留已保存的值。</v-alert>
    <v-skeleton-loader v-if="loading" type="card" />
    <ProviderCard v-else title="OpenID Connect" icon="mdi-account-key-outline" color="primary" :model="form.oidc" :state="state.oidc" id-label="Client ID" secret-label="Client Secret" show-issuer @copy="copy">
      <template #details>范围为 <code>openid profile email</code>。上游服务需支持 OIDC discovery、授权码模式和 PKCE。</template>
    </ProviderCard>
  </div>
</template>
<script setup>
import { onMounted, reactive, ref } from 'vue'
import ProviderCard from '@/components/admin/ProviderCard.vue'
import { thirdPartyLoginApi } from '@/api/modules/admin'
import { useUiStore } from '@/stores/ui'
const ui = useUiStore(), loading = ref(true), saving = ref(false)
const form = reactive({ oidc: { enabled: false, clientId: '', clientSecret: '', issuer: '' } }), state = reactive({ oidc: {} })
function assign(value) { state.oidc = value || {}; Object.assign(form.oidc, { enabled: !!value?.enabled, clientId: value?.publicId || '', issuer: value?.issuer || '', clientSecret: '' }) }
onMounted(async () => { try { assign((await thirdPartyLoginApi.get()).oidc) } catch (e) { ui.error(e.message) } finally { loading.value = false } })
async function save() { if (saving.value) return; saving.value = true; try { assign((await thirdPartyLoginApi.save(form)).oidc); ui.success('配置已保存') } catch (e) { ui.error(e.message) } finally { saving.value = false } }
async function copy(value) { try { await navigator.clipboard.writeText(value); ui.success('回调地址已复制') } catch { ui.error('复制失败，请手动复制') } }
</script>
