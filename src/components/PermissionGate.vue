<template>
  <slot v-if="allowed" />
</template>

<script setup>
import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

// Declarative permission gate. Wrap any element to hide it when the current
// user lacks the required permission(s).
//   <permission-gate code="user:delete"> <v-btn .../> </permission-gate>
//   <permission-gate :any="['user:read','user:write']"> ... </permission-gate>
const props = defineProps({
  code: { type: String, default: '' },
  any: { type: Array, default: () => [] },
})

const auth = useAuthStore()

const allowed = computed(() => {
  if (props.any.length) return auth.hasAnyPermission(props.any)
  return auth.hasPermission(props.code)
})
</script>
