<template>
  <v-dialog v-model="dialog" max-width="420" persistent>
    <v-card rounded="lg">
      <v-card-title class="text-subtitle-1 font-weight-bold pt-4">批量分配角色</v-card-title>
      <v-divider />
      <v-card-text>
        <v-select v-model="roleCode" :items="roleItems" label="选择角色" variant="outlined"
          prepend-inner-icon="mdi-shield-account-outline" :rules="[(v) => !!v || '请选择角色']" />
      </v-card-text>
      <v-card-actions class="px-4 pb-4">
        <v-spacer />
        <v-btn variant="text" @click="dialog = false">取消</v-btn>
        <v-btn color="primary" variant="flat" :disabled="!roleCode" @click="confirm">确定</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({ roles: { type: Array, default: () => [] } })
const emit = defineEmits(['assigned'])

const dialog = ref(false)
const roleCode = ref('')

const roleItems = computed(() => props.roles.map((r) => ({ title: `${r.name} (${r.code})`, value: r.code })))

function open() {
  roleCode.value = ''
  dialog.value = true
}

function confirm() {
  if (!roleCode.value) return
  emit('assigned', roleCode.value)
  dialog.value = false
}

defineExpose({ open })
</script>
