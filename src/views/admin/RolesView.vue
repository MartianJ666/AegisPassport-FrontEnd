<template>
  <div>
    <div class="d-flex align-center mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">角色管理</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">管理角色成员与权限</p>
      </div>
      <v-spacer />
    </div>

    <v-row>
      <v-col v-for="role in roles" :key="role.code" cols="12" md="4">
        <v-card rounded="lg" border flat class="h-100">
          <v-card-item>
            <template #prepend>
              <v-avatar :color="role.code === 'admin' ? 'error' : role.code === 'member' ? 'warning' : 'primary'"
                variant="tonal">
                <v-icon :icon="role.code === 'admin' ? 'mdi-shield-lock' : role.code === 'member' ? 'mdi-shield-account' : 'mdi-account'" />
              </v-avatar>
            </template>
            <v-card-title class="text-subtitle-1 font-weight-bold">
              {{ role.name }}
              <v-chip v-if="role.builtin" size="x-small" color="secondary" variant="tonal" class="ms-1">内置</v-chip>
            </v-card-title>
            <v-card-subtitle>{{ role.code }} · {{ role.userCount }} 用户</v-card-subtitle>
          </v-card-item>
          <v-card-text>
            <p class="text-body-2 text-medium-emphasis mb-2">{{ role.description }}</p>
            <div class="text-caption text-medium-emphasis mb-1">权限 ({{ role.permissions.length }})</div>
            <v-chip-group column>
              <v-chip v-for="p in role.permissions.slice(0, 5)" :key="p" size="x-small" variant="tonal">{{ p }}</v-chip>
              <v-chip v-if="role.permissions.length > 5" size="x-small" variant="text">
                +{{ role.permissions.length - 5 }}
              </v-chip>
            </v-chip-group>
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn size="small" variant="text" prepend-icon="mdi-account-group" @click.stop="manageMembers(role)">
              管理成员
            </v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <!-- Role member management dialog -->
    <v-dialog v-model="memberDialog" max-width="640" persistent>
      <v-card rounded="lg">
        <v-card-title class="text-subtitle-1 font-weight-bold pt-4 d-flex align-center">
          <v-icon class="me-2">mdi-account-group</v-icon>
          {{ currentRole?.name }} — 成员管理
          <v-spacer />
          <v-chip size="small" variant="tonal">{{ members.length }} 用户</v-chip>
        </v-card-title>
        <v-divider />
        <v-card-text style="max-height: 60vh; overflow-y: auto;">
          <!-- Add user section -->
          <div class="d-flex align-center flex-wrap gap-2 mb-4">
            <v-autocomplete
              v-model="selectedUser"
              :items="availableUsers"
              item-title="username"
              item-value="id"
              label="添加用户"
              variant="outlined"
              density="compact"
              hide-details
              clearable
              prepend-inner-icon="mdi-account-plus"
              style="flex: 1 1 auto; min-width: 200px;"
            />
            <v-btn color="primary" variant="flat" :disabled="!selectedUser"
              :loading="adding" @click="addMember">
              添加
            </v-btn>
          </div>
          <v-divider class="mb-3" />
          <div v-if="!members.length" class="text-center text-medium-emphasis py-6">
            <v-icon icon="mdi-account-off" size="40" class="mb-2" />
            <div class="text-body-2">该角色暂无用户</div>
          </div>
          <v-list v-else lines="one" density="compact">
            <v-list-item v-for="m in members" :key="m.id">
              <template #prepend>
                <v-avatar size="32" color="primary">
                  <span class="text-caption">{{ (m.nickname || m.username)[0]?.toUpperCase() }}</span>
                </v-avatar>
              </template>
              <v-list-item-title>{{ m.nickname || m.username }}</v-list-item-title>
              <v-list-item-subtitle>{{ m.email || m.username }}</v-list-item-subtitle>
              <template #append>
                <v-btn icon="mdi-close" size="x-small" variant="text" color="error"
                  :loading="removingId === m.id" @click="removeMember(m)" />
              </template>
            </v-list-item>
          </v-list>
        </v-card-text>
        <v-divider />
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="memberDialog = false">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { rbacApi } from '@/api/modules/rbac'
import { userApi } from '@/api/modules/account'
import { useUiStore } from '@/stores/ui'

const ui = useUiStore()
const roles = ref([])
const memberDialog = ref(false)
const currentRole = ref(null)
const members = ref([])
const availableUsers = ref([])
const selectedUser = ref(null)
const adding = ref(false)
const removingId = ref(null)

async function load() {
  try {
    roles.value = (await rbacApi.listRoles()) || []
  } catch (e) {
    ui.error(e?.message || '加载失败')
  }
}

async function manageMembers(role) {
  currentRole.value = role
  selectedUser.value = null
  memberDialog.value = true
  await loadMembers()
  await loadAvailableUsers()
}

async function loadMembers() {
  if (!currentRole.value) return
  try {
    members.value = (await rbacApi.getRoleUsers(currentRole.value.code)) || []
  } catch (e) {
    ui.error(e?.message || '加载成员失败')
  }
}

async function loadAvailableUsers() {
  try {
    // Find users NOT in this role
    const res = await userApi.list({ page: 0, size: 999, sortBy: 'id', dir: 'desc' })
    const all = Array.isArray(res) ? res : (res.items || res.content || [])
    const memberIds = new Set(members.value.map((m) => m.id))
    availableUsers.value = all.filter((u) => !memberIds.has(u.id))
  } catch (e) {
    /* non-fatal */
  }
}

async function addMember() {
  if (!selectedUser.value) return
  adding.value = true
  try {
    const target=availableUsers.value.find(u=>u.id===selectedUser.value)
    await userApi.assignRoles(selectedUser.value, [...new Set([...(target?.roles||[]),currentRole.value.code])])
    ui.success('已添加')
    selectedUser.value = null
    await loadMembers()
    await loadAvailableUsers()
    // Refresh the role user count
    await load()
  } catch (e) {
    ui.error(e?.message || '添加失败')
  } finally {
    adding.value = false
  }
}

async function removeMember(m) {
  removingId.value = m.id
  try {
    const remaining=(m.roles||[]).filter(r=>r!==currentRole.value.code)
    await userApi.assignRoles(m.id, remaining.length?remaining:['user'])
    ui.success('已移除')
    await loadMembers()
    await loadAvailableUsers()
    await load()
  } catch (e) {
    ui.error(e?.message || '移除失败')
  } finally {
    removingId.value = null
  }
}

onMounted(load)
</script>
