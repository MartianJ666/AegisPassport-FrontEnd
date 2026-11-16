<template>
  <div>
    <div class="d-flex align-center flex-wrap mb-6 gap-2">
      <div>
        <h1 class="text-h5 font-weight-bold">用户管理</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">管理账户、角色分配与直接权限授予</p>
      </div>
      <v-spacer />
      <v-text-field
        v-model="keyword" placeholder="搜索用户名/邮箱/昵称" density="compact" variant="outlined"
        prepend-inner-icon="mdi-magnify" hide-details style="max-width: 280px"
        clearable @keyup.enter="onSearch" @click:clear="resetSearch"
      />
      <v-btn color="primary" variant="flat" @click="onSearch">搜索</v-btn>
      <v-btn color="primary" variant="flat" prepend-icon="mdi-account-plus" @click="openCreate">新增用户</v-btn>
    </div>

    <v-card rounded="lg" border flat>
      <v-toolbar density="compact" color="transparent" v-if="selected.length" class="flex-wrap" style="height: auto; min-height: 48px; padding-block: 4px;">
        <span class="text-body-2 px-4">已选 {{ selected.length }} 项</span>
        <v-btn size="small" variant="text" prepend-icon="mdi-account-check" @click="batchEnable(true)">启用</v-btn>
        <v-btn size="small" variant="text" prepend-icon="mdi-account-cancel" @click="batchEnable(false)">禁用</v-btn>
        <v-btn size="small" variant="text" prepend-icon="mdi-shield-account" @click="openBatchRole">分配角色</v-btn>
        <v-btn size="small" variant="text" color="error" prepend-icon="mdi-delete" @click="batchDelete">删除</v-btn>
      </v-toolbar>
      <v-data-table-server
        v-model="selected"
        :headers="headers"
        :items="items"
        :items-length="total"
        :loading="loading"
        :items-per-page="size"
        :items-per-page-options="[10, 20, 50, 100]"
        :page="page"
        show-select
        item-value="id"
        @update:options="onOptions"
      >
        <template #[`item.username`]="{ item }">
          <div class="d-flex align-center py-1">
            <v-avatar size="32" color="primary" class="me-2">
              <v-img v-if="item.avatar" :src="resolveUrl(item.avatar)" />
              <span v-else class="text-caption">{{ (item.nickname || item.username)[0]?.toUpperCase() }}</span>
            </v-avatar>
            <div>
              <div class="font-weight-medium">{{ item.nickname || item.username }}</div>
              <div class="text-caption text-medium-emphasis">{{ item.username }}</div>
            </div>
          </div>
        </template>
        <template #[`item.roles`]="{ item }">
          <v-chip v-for="r in item.roles" :key="r" size="x-small" class="me-1" variant="tonal">{{ r }}</v-chip>
        </template>
        <template #[`item.enabled`]="{ item }">
          <v-chip size="x-small" :color="item.enabled ? 'success' : 'grey'" variant="tonal">
            {{ item.enabled ? '启用' : '禁用' }}
          </v-chip>
          <v-chip v-if="item.locked" size="x-small" color="error" variant="tonal" class="ms-1">锁定</v-chip>
        </template>
        <template #[`item.actions`]="{ item }">
          <v-btn icon="mdi-pencil-outline" size="small" variant="text" title="编辑" @click="openEdit(item)" />
           <v-btn icon="mdi-lock-reset" size="small" variant="text" title="重置密码" @click="openReset(item)" />
          <v-btn icon="mdi-shield-key-outline" size="small" variant="text" title="权限" @click="openPerms(item)" />
          <v-btn icon="mdi-apps" size="small" variant="text" title="应用访问" @click="openAppAccess(item)" />
          <v-btn icon="mdi-delete-outline" size="small" variant="text" color="error" @click="removeUser(item)" />
        </template>
      </v-data-table-server>
    </v-card>

    <UserEditDialog ref="editRef" :roles="allRoles" @saved="reload" />
     <ResetPasswordDialog ref="resetPasswordRef" @saved="reload" />
    <UserPermissionsDialog ref="permsRef" :permissions="allPermissions" @changed="reload" />
    <UserAppAccessDialog ref="appAccessRef" @changed="reload" />
    <BatchRoleDialog ref="batchRoleRef" :roles="allRoles" @assigned="onBatchAssigned" />
    <ConfirmDialog ref="confirmRef" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { userApi } from '@/api/modules/account'
import { rbacApi } from '@/api/modules/rbac'
import { useUiStore } from '@/stores/ui'
import { resolveAssetUrl as resolveUrl } from '@/utils/url'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import UserEditDialog from '@/components/admin/UserEditDialog.vue'
import ResetPasswordDialog from '@/components/admin/ResetPasswordDialog.vue'
import UserPermissionsDialog from '@/components/admin/UserPermissionsDialog.vue'
import UserAppAccessDialog from '@/components/admin/UserAppAccessDialog.vue'
import BatchRoleDialog from '@/components/admin/BatchRoleDialog.vue'

const ui = useUiStore()
const items = ref([])
const total = ref(0)
const page = ref(1)
const size = ref(20)
const sortBy = ref('createdAt')
const dir = ref('desc')
const keyword = ref('')
const loading = ref(false)
const selected = ref([])
const allRoles = ref([])
const allPermissions = ref([])

const editRef = ref(null)
const resetPasswordRef = ref(null)
const permsRef = ref(null)
const batchRoleRef = ref(null)
const confirmRef = ref(null)
const appAccessRef = ref(null)

const hideOnMobile = 'd-none d-sm-table-cell'
const headers = [
  { title: '用户', key: 'username', sortable: false },
  { title: '邮箱', key: 'email', sortable: false, class: hideOnMobile, cellClass: hideOnMobile },
  { title: '组织', key: 'orgName', sortable: false, class: hideOnMobile, cellClass: hideOnMobile },
  { title: '角色', key: 'roles', sortable: false, class: hideOnMobile, cellClass: hideOnMobile },
  { title: '状态', key: 'enabled', sortable: false, class: hideOnMobile, cellClass: hideOnMobile },
  { title: '操作', key: 'actions', sortable: false, align: 'end' },
]

async function load() {
  loading.value = true
  try {
    let res
    if (keyword.value?.trim()) {
      res = await userApi.search({ keyword: keyword.value.trim(), page: page.value - 1, size: size.value })
    } else {
      res = await userApi.list({ page: page.value - 1, size: size.value, sortBy: sortBy.value, dir: dir.value })
    }
    items.value = Array.isArray(res) ? res : (res.items || res.content || [])
    total.value = Array.isArray(res) ? res.length : (res.total ?? res.totalElements ?? 0)
  } catch (e) {
    ui.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function onOptions({ page: p, itemsPerPage, sortBy: sb }) {
  page.value = p
  size.value = itemsPerPage
  if (sb?.length) {
    sortBy.value = sb[0].key
    dir.value = sb[0].order
  }
  load()
}

function onSearch() {
  page.value = 1
  load()
}
function resetSearch() {
  keyword.value = ''
  page.value = 1
  load()
}
function reload() {
  selected.value = []
  load()
}

function openEdit(u) { editRef.value.open(u) }
function openCreate() { editRef.value.openCreate() }
function openReset(u) { resetPasswordRef.value.open(u) }
function openPerms(u) { permsRef.value.open(u) }
function openAppAccess(u) { appAccessRef.value.open(u) }
function openBatchRole() { batchRoleRef.value.open() }

async function removeUser(u) {
  const ok = await confirmRef.value.open({
    title: '删除用户', message: `确定删除用户「${u.username}」吗？此操作不可撤销。`,
    confirmText: '删除', confirmColor: 'error',
  })
  if (!ok) return
  try {
    await userApi.remove(u.id)
    ui.success('已删除')
    reload()
  } catch (e) { ui.error(e?.message || '删除失败') }
}

async function batchEnable(enabled) {
  try {
    await userApi.batchEnable(selected.value, enabled)
    ui.success(enabled ? '已批量启用' : '已批量禁用')
    reload()
  } catch (e) { ui.error(e?.message || '操作失败') }
}

async function batchDelete() {
  const ok = await confirmRef.value.open({
    title: '批量删除', message: `确定删除选中的 ${selected.value.length} 个用户吗？`,
    confirmText: '删除', confirmColor: 'error',
  })
  if (!ok) return
  try {
    await userApi.batchDelete(selected.value)
    ui.success('已批量删除')
    reload()
  } catch (e) { ui.error(e?.message || '删除失败') }
}

async function onBatchAssigned(roleCode) {
  try {
    await userApi.batchAssignRole(selected.value, roleCode)
    ui.success('已批量分配角色')
    reload()
  } catch (e) { ui.error(e?.message || '操作失败') }
}

onMounted(async () => {
  try {
    allRoles.value = (await rbacApi.listRoles()) || []
    allPermissions.value = (await rbacApi.listPermissions()) || []
  } catch { /* non-fatal */ }
  load()
})
</script>
