<template>
  <v-dialog v-model="dialog" max-width="480" persistent>
    <v-card rounded="lg">
      <v-card-title class="text-subtitle-1 font-weight-bold pt-4 d-flex align-center">
        <v-icon icon="mdi-lock-reset" class="mr-2" color="primary" />重置用户密码
      </v-card-title>
      <v-divider />
      <v-card-text>
        <v-alert type="warning" variant="tonal" density="comfortable" class="mb-4">
          正在重置「{{ target?.nickname || target?.username || '' }}」的密码。重置后该用户现有登录会话将立即失效。
        </v-alert>
        <v-form ref="formRef" @submit.prevent="submit">
          <v-text-field v-model="form.password" label="新密码" type="password" variant="outlined"
            autocomplete="new-password" prepend-inner-icon="mdi-lock-plus-outline" :rules="passwordRules" />
          <v-text-field v-model="form.confirm" label="确认新密码" type="password" variant="outlined"
            autocomplete="new-password" prepend-inner-icon="mdi-lock-check-outline" :rules="confirmRules" />
        </v-form>
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn variant="text" :disabled="saving" @click="close">取消</v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" @click="submit">确认重置</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { reactive, ref } from 'vue'
import { userApi } from '@/api/modules/account'
import { encryptPasswordStrict } from '@/api/crypto'
import { useUiStore } from '@/stores/ui'

const emit = defineEmits(['saved'])
const ui = useUiStore()
const dialog = ref(false)
const saving = ref(false)
const formRef = ref(null)
const target = ref(null)
const form = reactive({ password: '', confirm: '' })
const passwordRules = [
  (v) => !!v?.trim() || '请输入新密码',
  (v) => v.length >= 6 || '密码至少 6 个字符',
  (v) => v.length <= 72 || '密码不能超过 72 个字符',
]
const confirmRules = [(v) => v === form.password || '两次输入的密码不一致']

function open(user) {
  target.value = user
  form.password = ''
  form.confirm = ''
  dialog.value = true
}
function close() {
  if (saving.value) return
  dialog.value = false
  form.password = ''
  form.confirm = ''
  target.value = null
}
async function submit() {
  const result = await formRef.value?.validate()
  if (!result?.valid || !target.value) return
  saving.value = true
  try {
    const [passwordEncrypted, confirmPasswordEncrypted] = await Promise.all([
      encryptPasswordStrict(form.password),
      encryptPasswordStrict(form.confirm),
    ])
    await userApi.resetPassword(target.value.id, { passwordEncrypted, confirmPasswordEncrypted })
    ui.success(`用户「${target.value.username}」的密码已重置`)
    close()
    emit('saved')
  } catch (e) {
    ui.error(e?.message || '重置密码失败')
  } finally {
    saving.value = false
  }
}
defineExpose({ open })
</script>
