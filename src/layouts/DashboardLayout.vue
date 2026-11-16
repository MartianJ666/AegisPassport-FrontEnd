<template>
  <div>
    <v-navigation-drawer v-model="drawer" :rail="rail" width="264" color="surface">
      <div class="d-flex align-center pa-4" style="min-height: 64px">
        <v-avatar color="primary" size="36" class="me-3">
          <v-icon icon="mdi-shield-key" color="white" />
        </v-avatar>
        <span v-if="!rail" class="text-subtitle-1 font-weight-bold">AegisPassport</span>
      </div>
      <v-divider />

      <v-list nav density="comfortable">
        <template v-for="section in visibleSections" :key="section.title">
          <v-list-subheader v-if="!rail">{{ section.title }}</v-list-subheader>
          <v-list-item
            v-for="item in section.items"
            :key="item.title"
            :to="item.to"
            :prepend-icon="item.icon"
            :title="item.title"
            rounded="lg"
            color="primary"
          />
        </template>
      </v-list>
    </v-navigation-drawer>

    <v-app-bar flat border color="surface" height="64">
      <v-app-bar-nav-icon @click="toggleDrawer" />
      <v-toolbar-title class="text-body-1 font-weight-medium">{{ pageTitle }}</v-toolbar-title>
      <v-spacer />
      <div class="d-flex align-center ga-1 me-2 text-body-2 text-medium-emphasis" style="min-width:0;max-width:28vw" :title="auth.user?.orgName || '未分配组织'">
        <v-icon icon="mdi-domain" size="18" class="d-none d-sm-inline-flex" /><span class="text-truncate">{{ auth.user?.orgName || '未分配组织' }}</span>
      </div>
      <v-btn :icon="ui.theme === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night'"
             variant="text" @click="ui.toggleTheme()" />

      <v-menu>
        <template #activator="{ props }">
          <v-btn v-bind="props" variant="text" class="text-none px-2">
            <v-avatar color="primary" size="32" class="me-2">
              <v-img v-if="auth.user?.avatar" :src="auth.user.avatar" />
              <span v-else class="text-caption">{{ initials }}</span>
            </v-avatar>
            <span class="d-none d-sm-inline">{{ auth.displayName }}</span>
            <v-icon icon="mdi-chevron-down" size="small" class="ms-1" />
          </v-btn>
        </template>
        <v-list density="compact" min-width="180">
          <v-list-item prepend-icon="mdi-account-outline" title="个人资料" :to="{ name: 'profile' }" />
          <v-list-item prepend-icon="mdi-shield-lock-outline" title="安全设置" :to="{ name: 'security' }" />
          <v-divider />
          <v-list-item prepend-icon="mdi-logout" title="退出登录" @click="onLogout" />
        </v-list>
      </v-menu>
    </v-app-bar>

    <v-main>
      <v-container fluid class="pa-4 pa-md-6" style="max-width: 1400px; position: relative;">
        <div class="watermark" v-if="auth.user">
          <span v-for="r in 14" :key="r" class="w-row">
            <span v-for="c in 6" :key="c" class="w-cell">{{ auth.displayName }}-{{ currentDate }} {{ currentTime }}</span>
          </span>
        </div>
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </v-container>
    </v-main>
  </div>
</template>

<script setup>
import { computed, onUnmounted, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { navSections } from './navigation'

const auth = useAuthStore()
const ui = useUiStore()
const route = useRoute()
const router = useRouter()
const { mobile } = useDisplay()

// Watermark time
const currentTime = ref('')
const currentDate = ref('')
let timeTimer = null
function updateTime() {
  const now = new Date()
  const y = now.getFullYear()
  const mo = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const h = String(now.getHours()).padStart(2, '0')
  const m = String(now.getMinutes()).padStart(2, '0')
  const s = String(now.getSeconds()).padStart(2, '0')
  currentDate.value = `${y}-${mo}-${d}`
  currentTime.value = `${h}:${m}:${s}`
}
updateTime()
timeTimer = setInterval(updateTime, 1000)
onUnmounted(() => { if (timeTimer) clearInterval(timeTimer) })

const drawer = ref(!mobile.value)
const rail = ref(false)

function toggleDrawer() {
  if (mobile.value) drawer.value = !drawer.value
  else rail.value = !rail.value
}

// 移动端导航后自动收起抽屉，避免抽屉盖住内容区
watch(
  () => route.name,
  () => {
    if (mobile.value) drawer.value = false
  }
)

// Hide nav items the user has no permission for; drop empty sections.
// Supports both a single `permission` code and `permissionAny` (any-of list).
const visibleSections = computed(() =>
  navSections
    .map((s) => ({
      ...s,
      items: s.items.filter((i) =>
        (!i.permission || auth.hasPermission(i.permission)) &&
        (!i.permissionAny || auth.hasAnyPermission(i.permissionAny))),
    }))
    .filter((s) => s.items.length),
)

const pageTitle = computed(() => {
  for (const s of navSections) {
    const hit = s.items.find((i) => i.to.name === route.name)
    if (hit) return hit.title
  }
  return 'AegisPassport'
})

const initials = computed(() => (auth.displayName || '?').slice(0, 1).toUpperCase())

async function onLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}
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
.watermark {
  position: fixed;
  inset: -100px -100px;
  pointer-events: none;
  z-index: 2;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  transform: rotate(-35deg);
}
.w-row {
  display: flex;
  justify-content: space-around;
  white-space: nowrap;
}
@media (max-width: 900px) {
  .watermark { inset: -80px -120px; opacity: .78; }
  .w-cell { font-size: 12px; padding-inline: 28px; margin-block: 6px; }
}
@media (max-width: 600px) {
  .watermark { inset: -80px -180px; opacity: .52; }
  .w-row { justify-content: space-between; }
  .w-cell { font-size: 10px; letter-spacing: .5px; padding-inline: 22px; margin-block: 4px; }
}
@media (orientation: landscape) and (max-height: 540px) {
  .watermark { inset: -120px -160px; opacity: .46; }
  .w-cell { font-size: 10px; margin-block: 2px; }
}
.w-cell {
  font-size: 14px;
  color: rgba(128, 128, 128, 0.13);
  font-family: 'Roboto', sans-serif;
  user-select: none;
  letter-spacing: 1px;
  padding: 0 40px;
  margin: 8px 0;
}
</style>
