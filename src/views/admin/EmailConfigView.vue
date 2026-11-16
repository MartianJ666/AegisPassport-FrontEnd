<template>
  <div>
    <div class="mb-6">
      <h1 class="text-h5 font-weight-bold">邮件配置</h1>
      <p class="text-body-2 text-medium-emphasis mb-0">配置 SMTP 服务用于发送验证码与通知邮件</p>
    </div>

    <v-row>
      <v-col cols="12" md="8">
        <v-card rounded="lg" border flat>
          <v-card-text class="pa-6">
            <v-form ref="formRef" @submit.prevent="save">
              <div class="d-flex align-center mb-4">
                <v-switch v-model="form.enabled" color="primary" hide-details density="compact"
                  label="启用邮件服务" inset />
              </div>
              <v-divider class="mb-4" />

              <v-row dense>
                <v-col cols="12" md="8">
                  <v-text-field v-model="form.smtpHost" label="SMTP 主机" variant="outlined" density="comfortable"
                    :rules="[required]" placeholder="smtp.example.com" />
                </v-col>
                <v-col cols="12" md="4">
                  <v-text-field v-model.number="form.smtpPort" label="端口" type="number" variant="outlined"
                    density="comfortable" :rules="[required]" placeholder="465" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="form.smtpUsername" label="用户名" variant="outlined" density="comfortable"
                    autocomplete="off" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="form.smtpPassword" label="密码 / 授权码" variant="outlined"
                    density="comfortable" :type="showPwd ? 'text' : 'password'" autocomplete="new-password"
                    :append-inner-icon="showPwd ? 'mdi-eye-off' : 'mdi-eye'"
                    placeholder="留空则保持不变" @click:append-inner="showPwd = !showPwd" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="form.fromEmail" label="发件邮箱" variant="outlined" density="comfortable"
                    :rules="[required, emailRule]" placeholder="noreply@example.com" />
                </v-col>
                <v-col cols="12" md="6">
                  <v-text-field v-model="form.fromName" label="发件人名称" variant="outlined" density="comfortable"
                    placeholder="AegisPassport" />
                </v-col>
              </v-row>

              <div class="d-flex align-center gap-6 mt-2">
                <v-switch v-model="form.useSsl" color="primary" hide-details density="compact"
                  label="使用 SSL" inset />
                <v-switch v-model="form.useTls" color="primary" hide-details density="compact"
                  label="使用 TLS (STARTTLS)" inset />
              </div>

              <v-divider class="my-4" />
              <div class="d-flex align-center gap-2">
                <v-btn color="primary" variant="flat" type="submit" :loading="saving">保存配置</v-btn>
                <v-btn variant="tonal" prepend-icon="mdi-email-fast-outline" :disabled="!form.enabled"
                  @click="testDialog = true">发送测试邮件</v-btn>
                <v-spacer />
                <span v-if="form.updatedAt" class="text-caption text-medium-emphasis">
                  最后更新 {{ fmtDateTime(form.updatedAt) }}
                </span>
              </div>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>

      <v-col cols="12" md="4">
        <v-card rounded="lg" border flat color="surface-variant" variant="tonal">
          <v-card-text class="pa-5">
            <div class="d-flex align-center mb-2">
              <v-icon icon="mdi-lightbulb-on-outline" color="primary" class="me-2" />
              <span class="text-subtitle-2 font-weight-bold">常见配置</span>
            </div>
            <div class="text-body-2 text-medium-emphasis">
              <p class="mb-2"><strong>QQ 邮箱：</strong>smtp.qq.com，端口 465，SSL 开启，密码使用授权码。</p>
              <p class="mb-2"><strong>Gmail：</strong>smtp.gmail.com，端口 587，TLS 开启。</p>
              <p class="mb-0"><strong>阿里云：</strong>smtpdm.aliyun.com，端口 465，SSL 开启。</p>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="testDialog" max-width="440">
      <v-card rounded="lg">
        <v-card-title class="text-subtitle-1 font-weight-bold pt-4">发送测试邮件</v-card-title>
        <v-card-text>
          <p class="text-body-2 text-medium-emphasis mb-4">向指定邮箱发送一封测试邮件以验证配置。</p>
          <v-text-field v-model="testEmail" label="收件邮箱" variant="outlined" density="comfortable"
            :rules="[required, emailRule]" prepend-inner-icon="mdi-email-outline" />
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="testDialog = false">取消</v-btn>
          <v-btn color="primary" variant="flat" :loading="testing" @click="sendTest">发送</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { emailApi } from '@/api/modules/admin'
import { useUiStore } from '@/stores/ui'
import { fmtDateTime } from '@/utils/format'

const ui = useUiStore()
const formRef = ref(null)
const saving = ref(false)
const testing = ref(false)
const showPwd = ref(false)
const testDialog = ref(false)
const testEmail = ref('')

const form = reactive({
  smtpHost: '', smtpPort: 465, smtpUsername: '', smtpPassword: '',
  fromEmail: '', fromName: '', useSsl: true, useTls: false, enabled: false, updatedAt: null,
})

const required = (v) => (v !== null && v !== undefined && v !== '') || '必填项'
const emailRule = (v) => !v || /.+@.+\..+/.test(v) || '邮箱格式不正确'

async function load() {
  try {
    const cfg = await emailApi.get()
    if (cfg) {
      Object.assign(form, cfg)
      form.smtpPassword = '' // never surface stored secret
    }
  } catch (e) {
    ui.error(e?.message || '加载失败')
  }
}

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  saving.value = true
  try {
    const payload = { ...form }
    if (!payload.smtpPassword) delete payload.smtpPassword // keep existing secret
    delete payload.updatedAt
    await emailApi.save(payload)
    ui.success('配置已保存')
    load()
  } catch (e) {
    ui.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function sendTest() {
  if (!testEmail.value || !/.+@.+\..+/.test(testEmail.value)) {
    ui.error('请输入有效邮箱')
    return
  }
  testing.value = true
  try {
    await emailApi.test(testEmail.value)
    ui.success('测试邮件已发送，请查收')
    testDialog.value = false
  } catch (e) {
    ui.error(e?.message || '发送失败')
  } finally {
    testing.value = false
  }
}

onMounted(load)
</script>
