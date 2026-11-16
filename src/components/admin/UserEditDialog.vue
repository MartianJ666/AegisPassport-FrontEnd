<template>
  <v-dialog v-model="dialog" max-width="520" persistent scrollable>
    <v-card rounded="lg">
      <v-card-title class="text-subtitle-1 font-weight-bold pt-4">
        {{ isCreate ? '新增用户' : '编辑用户' }}
      </v-card-title>
      <v-divider />
      <v-card-text style="max-height: 70vh">
        <v-form ref="formRef">
          <v-text-field v-if="isCreate" v-model="form.username" label="用户名" variant="outlined"
            :rules="[(v) => !!v || '请输入用户名']" prepend-inner-icon="mdi-account" />
          <v-text-field v-else :model-value="form.username" label="用户名" variant="outlined" readonly
            prepend-inner-icon="mdi-account" />
          <v-text-field v-model="form.nickname" label="昵称" variant="outlined"
            prepend-inner-icon="mdi-card-account-details-outline" />
          <v-text-field v-model="form.email" label="邮箱" variant="outlined" type="email"
            prepend-inner-icon="mdi-email-outline" />
          <v-text-field v-model="form.phone" label="手机号" variant="outlined"
            prepend-inner-icon="mdi-phone-outline" />
          <v-autocomplete v-model="form.organizationId" :items="organizations" item-title="name" item-value="id" label="所属组织" variant="outlined" clearable
            prepend-inner-icon="mdi-domain" :loading="orgLoading" :disabled="orgLoading || !!orgError" no-data-text="暂无组织，请先在组织管理页新建" hint="从已创建的组织中选择；清空表示不归属组织" persistent-hint />
          <v-alert v-if="orgError" type="error" variant="tonal" class="mb-3" role="alert">{{ orgError }}<v-btn variant="text" @click="loadOrganizations">重新加载</v-btn></v-alert>
          <v-text-field v-if="isCreate" v-model="form.password" label="密码"
            type="password" variant="outlined"
            :rules="[(v) => !!v || '请输入密码']"
            prepend-inner-icon="mdi-lock-reset" />
          <v-select v-model="form.roleCodes" multiple chips closable-chips :items="roleItems" label="角色" variant="outlined"
            :rules="[(v) => !!v?.length || '请选择至少一个角色']" prepend-inner-icon="mdi-shield-account-outline" />
          <div class="d-flex gap-4 mt-1">
            <v-switch v-model="form.enabled" label="启用" color="primary" density="compact" hide-details inset />
          </div>
        </v-form>
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">取消</v-btn>
        <v-btn color="primary" variant="flat" :loading="saving" :disabled="orgLoading || !!orgError" @click="save">
          {{ isCreate ? '创建' : '保存' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { userApi } from '@/api/modules/account'
import { organizationApi } from '@/api/modules/organizations'
import { useUiStore } from '@/stores/ui'
import { encryptPassword } from '@/api/crypto'

const props = defineProps({ roles: { type: Array, default: () => [] } })
const emit = defineEmits(['saved'])

const ui = useUiStore()
const dialog = ref(false)
const saving = ref(false)
const formRef = ref(null)
const isCreate = ref(false)
const current = ref(null)
const organizations=ref([]),orgLoading=ref(false),orgError=ref('')
async function loadOrganizations(){orgLoading.value=true;orgError.value='';try{organizations.value=await organizationApi.list()}catch(e){orgError.value=e.message||'组织列表加载失败，暂时不能保存'}finally{orgLoading.value=false}}
const form = reactive({
  username: '', nickname: '', email: '', phone: '', organizationId: null,
  password: '', roleCodes: [], enabled: true,
})

const roleItems = computed(() => props.roles.map((r) => ({ title: `${r.name} (${r.code})`, value: r.code })))

function open(user) {
  isCreate.value = false
  current.value = user
  Object.assign(form, {
    username: user.username,
    nickname: user.nickname || '',
    email: user.email || '',
    phone: user.phone || '',
    organizationId: user.organizationId || null,
    password: '',
    roleCodes: [...(user.roles || [])],
    enabled: user.enabled,
  })
  dialog.value = true
  loadOrganizations()
}

function openCreate() {
  isCreate.value = true
  current.value = null
  Object.assign(form, {
    username: '', nickname: '', email: '', phone: '', organizationId: null,
    password: '', roleCodes: ['user'], enabled: true,
  })
  dialog.value = true
  loadOrganizations()
}

async function save() {
  if(saving.value || orgLoading.value || orgError.value)return
  const { valid } = await formRef.value.validate()
  if (!valid) return
  saving.value = true
  try {
    if (isCreate.value) {
      const encryptedPwd = await encryptPassword(form.password)
      await userApi.create({
        username: form.username,
        password: encryptedPwd,
        nickname: form.nickname || form.username,
        email: form.email || '',
        phone: form.phone || '',
        organizationId: form.organizationId || 0,
        groups: form.roleCodes, enabled: form.enabled,
      })
    } else {
      const payload = {
        nickname: form.nickname, email: form.email, phone: form.phone,
        organizationId: form.organizationId || 0, groups: form.roleCodes, enabled: form.enabled,
      }
      await userApi.update(current.value.id, payload)

    }
    ui.success(isCreate.value ? '用户已创建' : '已保存')
    dialog.value = false
    emit('saved')
  } catch (e) {
    ui.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

defineExpose({ open, openCreate })
</script>
