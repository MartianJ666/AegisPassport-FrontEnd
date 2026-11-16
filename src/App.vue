<template>
  <v-app>
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    <global-snackbar />
  </v-app>
</template>

<script setup>
import { watch } from 'vue'
import { useTheme } from 'vuetify'
import GlobalSnackbar from '@/components/GlobalSnackbar.vue'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const theme = useTheme()
// 初始同步 + 双向绑定：Pinia ui.theme <-> Vuetify theme.global.name。
// 必须在组件 setup 内调用 useTheme()，才能拿到 app 真正安装的 theme 实例。
theme.global.name.value = ui.theme
watch(
  () => ui.theme,
  (val) => { theme.global.name.value = val },
)
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
