<template>
  <div>
    <h1 class="text-h5 font-weight-bold mb-6">安全设置</h1>

    <v-row>
      <v-col cols="12" md="7">
        <v-card rounded="lg" border flat>
          <v-card-title class="text-subtitle-1 font-weight-bold">修改密码</v-card-title>
          <v-divider />
          <v-card-text>
            <v-form ref="formRef" @submit.prevent="submit">
              <v-text-field
                v-model="form.oldPassword"
                label="当前密码"
                :type="show.old ? 'text' : 'password'"
                :append-inner-icon="show.old ? 'mdi-eye-off' : 'mdi-eye'"
                variant="outlined"
                prepend-inner-icon="mdi-lock-outline"
                :rules="[(v) => !!v || '请输入当前密码']"
                @click:append-inner="show.old = !show.old"
              />
              <v-text-field
                v-model="form.newPassword"
                label="新密码"
                :type="show.next ? 'text' : 'password'"
                :append-inner-icon="show.next ? 'mdi-eye-off' : 'mdi-eye'"
                variant="outlined"
                prepend-inner-icon="mdi-lock-plus-outline"
                :rules="newRules"
                @click:append-inner="show.next = !show.next"
              />
              <v-text-field
                v-model="form.confirm"
                label="确认新密码"
                :type="show.next ? 'text' : 'password'"
                variant="outlined"
                prepend-inner-icon="mdi-lock-check-outline"
                :rules="confirmRules"
              />
              <v-btn type="submit" color="primary" :loading="saving" class="mt-2">更新密码</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="5">
        <v-card rounded="lg" border flat>
          <v-card-title class="text-subtitle-1 font-weight-bold">账户安全</v-card-title>
          <v-divider />
          <v-list lines="two">
            <v-list-item
              prepend-icon="mdi-clock-outline"
              title="上次登录"
              :subtitle="fmtDateTime(user?.lastLoginAt)"
            />
            <v-list-item
              prepend-icon="mdi-calendar-outline"
              title="注册时间"
              :subtitle="fmtDateTime(user?.createdAt)"
            />
            <v-list-item
              prepend-icon="mdi-shield-check-outline"
              title="账户状态"
            >
              <template #subtitle>
                <v-chip size="x-small" :color="user?.locked ? 'error' : 'success'" variant="tonal">
                  {{ user?.locked ? '已锁定' : '正常' }}
                </v-chip>
              </template>
            </v-list-item>
          </v-list>
        </v-card>
      </v-col>
    </v-row>

    <v-card rounded="lg" border flat class="mt-6">
      <v-card-title class="text-subtitle-1 font-weight-bold d-flex align-center"><v-icon icon="mdi-cellphone-link" class="me-2" />登录设备管理</v-card-title>
      <v-divider />
      <v-card-text>
        <div class="d-flex flex-wrap align-center gap-2 mb-4"><v-btn color="primary" variant="tonal" :loading="sessionsLoading" @click="loadSessions">刷新设备</v-btn><v-btn color="error" variant="tonal" :disabled="!selectedSessions.length" @click="openRevoke">强制下线所选设备</v-btn><v-btn color="grey-darken-1" variant="tonal" :disabled="!selectedSessions.length || selectedSessions.some(id => sessions.find(s => s.id === id)?.online)" @click="deleteOffline">删除离线记录</v-btn></div>
        <v-progress-linear v-if="sessionsLoading" indeterminate color="primary" class="mb-3" />
        <v-table v-else density="comfortable"><thead><tr><th></th><th>设备</th><th>IP</th><th>登录时间</th><th>最近活动</th><th>状态</th></tr></thead><tbody><tr v-for="item in sessions" :key="item.id"><td><v-checkbox-btn v-model="selectedSessions" :value="item.id" :disabled="item.current" /></td><td>{{ item.deviceLabel }}<v-chip v-if="item.current" size="x-small" color="primary" class="ms-2">当前设备</v-chip></td><td>{{ item.ipAddress }}</td><td>{{ fmtDateTime(item.createdAt) }}</td><td>{{ fmtDateTime(item.lastSeenAt) }}</td><td><v-chip size="small" :color="item.online ? 'success' : 'grey'" variant="tonal">{{ item.online ? '在线' : '离线' }}</v-chip></td></tr><tr v-if="!sessions.length"><td colspan="6" class="text-center text-medium-emphasis py-6">暂无设备记录</td></tr></tbody></v-table>
      </v-card-text>
    </v-card>
    <v-dialog v-model="revokeDialog" max-width="440" persistent><v-card rounded="lg"><v-card-title>验证后强制下线</v-card-title><v-card-text><v-text-field v-model="revokePassword" label="当前密码" type="password" variant="outlined" /><v-text-field v-model="revokeCode" label="邮箱验证码" variant="outlined" /><v-alert v-if="captchaQuestion" density="compact" variant="tonal" type="info">人机验证：{{ captchaQuestion }}</v-alert><v-text-field v-if="captchaQuestion" v-model="captchaAnswer" label="算术题答案" variant="outlined" inputmode="numeric" /><v-btn variant="text" :loading="codeLoading" @click="sendCode">发送邮箱验证码</v-btn></v-card-text><v-card-actions><v-spacer /><v-btn variant="text" @click="revokeDialog=false">取消</v-btn><v-btn color="error" :loading="revokeLoading" @click="revoke">确认下线</v-btn></v-card-actions></v-card></v-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { userApi } from '@/api/modules/account'
import { encryptPassword } from '@/api/crypto'
import { fmtDateTime } from '@/utils/format'

const auth = useAuthStore()
const ui = useUiStore()
const router = useRouter()
const { user } = storeToRefs(auth)

const sessions = ref([])
const selectedSessions = ref([])
const sessionsLoading = ref(false)
const revokeDialog = ref(false)
const revokePassword = ref('')
const captchaId = ref('')
const captchaQuestion = ref('')
const captchaAnswer = ref('')
const revokeCode = ref('')
const codeLoading = ref(false)
const revokeLoading = ref(false)
const revokeOfflineOnly = ref(false)
async function loadSessions(){ sessionsLoading.value=true; try { sessions.value=await userApi.sessions()||[] } finally { sessionsLoading.value=false } }
function openRevoke(){ revokePassword.value=''; revokeCode.value=''; captchaId.value=''; captchaQuestion.value=''; captchaAnswer.value=''; revokeOfflineOnly.value=false; revokeDialog.value=true }
async function deleteOffline(){ revokePassword.value=''; revokeCode.value=''; revokeOfflineOnly.value=true; revokeDialog.value=true }
async function sendCode(){ codeLoading.value=true; try { if(!captchaId.value){ const c=await userApi.sessionCaptcha(); captchaId.value=c.challengeId; captchaQuestion.value=c.question } if(!captchaAnswer.value){ ui.error('请先完成算术题'); return } await userApi.sendSessionCode(captchaId.value,captchaAnswer.value); ui.success('验证码已发送') } finally { codeLoading.value=false } }
async function revoke(){ revokeLoading.value=true; try { const encrypted=await encryptPassword(revokePassword.value); let result; if(revokeOfflineOnly.value) result=await userApi.deleteOfflineSessions(selectedSessions.value,encrypted); else if(sessions.value.some(s=>selectedSessions.value.includes(s.id)&&s.online)) result=await userApi.revokeVerifiedSessions(selectedSessions.value,encrypted,revokeCode.value); else result=await userApi.revokeSessions(selectedSessions.value,encrypted); revokeDialog.value=false; selectedSessions.value=[]; if(result?.currentRevoked){ auth.clearSession(); await router.replace({ name: 'login' }); return } await loadSessions() } finally { revokeLoading.value=false } }
onMounted(loadSessions)

const form = reactive({ oldPassword: '', newPassword: '', confirm: '' })
const show = reactive({ old: false, next: false })
const saving = ref(false)
const formRef = ref(null)

const newRules = [
  (v) => !!v || '请输入新密码',
  (v) => (v && v.length >= 6) || '密码至少 6 个字符',
]
const confirmRules = [(v) => v === form.newPassword || '两次输入的密码不一致']

async function submit() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  saving.value = true
  try {
    const [oldPassword, newPassword] = await Promise.all([
      encryptPassword(form.oldPassword),
      encryptPassword(form.newPassword),
    ])
    await userApi.changePassword({ oldPassword, newPassword })
    ui.success('密码已更新，请重新登录')
    await auth.logout()
    router.push({ name: 'login' })
  } catch (e) {
    ui.error(e?.message || '修改失败')
  } finally {
    saving.value = false
  }
}
</script>
