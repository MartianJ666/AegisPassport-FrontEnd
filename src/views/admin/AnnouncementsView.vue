<template>
  <div>
    <div class="d-flex align-center mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">公告管理</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">发布与维护系统公告</p>
      </div>
      <v-spacer />
      <v-btn color="primary" variant="flat" prepend-icon="mdi-plus" @click="openCreate">新建公告</v-btn>
    </div>

    <v-card rounded="lg" border flat>
      <v-data-table :headers="headers" :items="items" :loading="loading" density="comfortable"
        items-per-page="10">
        <template #[`item.level`]="{ item }">
          <v-chip size="small" variant="tonal" :color="levelColor(item.level)">
            {{ levelLabel(item.level) }}
          </v-chip>
        </template>
        <template #[`item.enabled`]="{ item }">
          <v-icon :icon="item.enabled ? 'mdi-check-circle' : 'mdi-close-circle'"
            :color="item.enabled ? 'success' : 'grey'" size="small" />
        </template>
        <template #[`item.window`]="{ item }">
          <span class="text-caption" style="white-space: normal; word-break: break-word;">{{ fmtWindow(item) }}</span>
        </template>
        <template #[`item.target`]="{ item }">
          <span class="text-caption">{{ fmtTarget(item.targets) }}</span>
        </template>
        <template #[`item.actions`]="{ item }">
          <v-btn icon="mdi-pencil-outline" size="small" variant="text" @click="openEdit(item)" />
          <v-btn icon="mdi-delete-outline" size="small" variant="text" color="error" @click="remove(item)" />
        </template>
        <template #no-data>
          <div class="py-8 text-medium-emphasis">暂无公告</div>
        </template>
      </v-data-table>
    </v-card>

    <v-dialog v-model="dialog" max-width="640" persistent>
      <v-card rounded="lg">
        <v-card-title class="text-subtitle-1 font-weight-bold pt-4">
          {{ editing ? '编辑公告' : '新建公告' }}
        </v-card-title>
        <v-divider />
        <v-card-text>
          <v-text-field v-model="form.title" label="标题" variant="outlined"
            prepend-inner-icon="mdi-format-title" />
          <v-textarea v-model="form.content" label="内容" variant="outlined" rows="4" auto-grow
            prepend-inner-icon="mdi-text" class="mt-2" />
          <v-row dense class="mt-1">
            <v-col cols="12" md="6">
              <v-select v-model="form.level" :items="levelItems" label="级别" variant="outlined"
                prepend-inner-icon="mdi-flag-outline" />
            </v-col>
            <v-col cols="12" md="6" class="d-flex align-center">
              <v-switch v-model="form.enabled" label="启用" color="primary" inset hide-details />
            </v-col>
          </v-row>
          <v-row dense>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.startTime" label="生效时间" type="datetime-local"
                variant="outlined" />
            </v-col>
            <v-col cols="12" md="6">
              <v-text-field v-model="form.endTime" label="结束时间" type="datetime-local"
                variant="outlined" />
            </v-col>
          </v-row>
          <v-row dense>
            <v-col cols="12" md="4" class="d-flex align-center">
              <span class="text-body-2 text-medium-emphasis">发布范围</span>
            </v-col>
            <v-col cols="12" md="8">
              <v-radio-group v-model="scopeMode" hide-details inline density="compact"
                @update:model-value="onScopeChange">
                <v-radio label="全用户" value="all" />
                <v-radio label="指定应用" value="clients" />
              </v-radio-group>
            </v-col>
          </v-row>
          <v-select v-model="form.targets" :items="targetOptions" item-title="clientName"
            item-value="clientId" label="目标应用（可多选）" multiple chips dense variant="outlined"
            class="mt-1" :disabled="scopeMode === 'all'" clearable
            hint="选中的客户端才可见；勾选多个则多端可见"
            persistent-hint />
        </v-card-text>
        <v-divider />
        <v-card-actions class="px-4 py-3">
          <v-spacer />
          <v-btn variant="text" @click="dialog = false">取消</v-btn>
          <v-btn color="primary" variant="flat" :loading="saving" @click="save">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <ConfirmDialog ref="confirmRef" />
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'
import { announcementApi } from '@/api/modules/admin'
import { useUiStore } from '@/stores/ui'
import { fmtDateTime } from '@/utils/format'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const ui = useUiStore()
const items = ref([])
const loading = ref(false)
const dialog = ref(false)
const editing = ref(false)
const saving = ref(false)
const editId = ref(null)
const confirmRef = ref(null)
// 发布范围: 'all' = 全用户(全局) 与 '指定应用' 互斥
const scopeMode = ref('all')
const targetOptions = ref([])
const targetName = ref(new Map())

const hideOnMobile = 'd-none d-sm-table-cell'
const headers = [
  { title: '标题', key: 'title' },
  { title: '级别', key: 'level', width: 100, class: hideOnMobile, cellClass: hideOnMobile },
  { title: '启用', key: 'enabled', width: 80, align: 'center', class: hideOnMobile, cellClass: hideOnMobile },
  { title: '有效期', key: 'window', sortable: false },
  { title: '范围', key: 'target', sortable: false },
  { title: '操作', key: 'actions', sortable: false, align: 'end', width: 120 },
]
const levelItems = [
  { title: '信息', value: 'info' },
  { title: '成功', value: 'success' },
  { title: '警告', value: 'warning' },
  { title: '严重', value: 'error' },
]
const form = reactive({ title: '', content: '', level: 'info', enabled: true, startTime: '', endTime: '', targets: [] })

function levelColor(l) { return { info: 'info', success: 'success', warning: 'warning', error: 'error' }[l] || 'grey' }
function levelLabel(l) { return (levelItems.find((i) => i.value === l) || {}).title || l }
function fmtWindow(item) {
  if (!item.startTime && !item.endTime) return '长期'
  return `${item.startTime ? fmtDateTime(item.startTime) : '—'} ~ ${item.endTime ? fmtDateTime(item.endTime) : '—'}`
}
function toLocalInput(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** 切到「全用户」时清空已选目标,保持互斥。 */
function onScopeChange() {
  if (scopeMode.value === 'all') form.targets = []
}

/** 列表「范围」列显示: 空 = 全用户, 否则显示应用名(找不到回退 id)。 */
function fmtTarget(targets) {
  if (!targets || !targets.length) return '全用户'
  return targets.map((id) => targetName.value.get(id) || id).join('、')
}

async function loadTargets() {
  try {
    const list = (await announcementApi.targetOptions()) || []
    targetOptions.value = list
    const m = new Map()
    list.forEach((c) => m.set(c.clientId, c.clientName))
    targetName.value = m
  } catch (e) {
    // 拉不到目标应用列表不阻断公告管理; 编辑时范围列会回退显示 client id。
    console.warn('加载目标应用列表失败', e)
  }
}

async function load() {
  loading.value = true
  try {
    items.value = (await announcementApi.list()) || []
  } catch (e) {
    ui.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = false
  editId.value = null
  Object.assign(form, { title: '', content: '', level: 'info', enabled: true, startTime: '', endTime: '', targets: [] })
  scopeMode.value = 'all'
  dialog.value = true
}
function openEdit(a) {
  editing.value = true
  editId.value = a.id
  Object.assign(form, {
    title: a.title, content: a.content, level: a.level, enabled: a.enabled,
    startTime: toLocalInput(a.startTime), endTime: toLocalInput(a.endTime),
    targets: a.targets ? [...a.targets] : [],
  })
  scopeMode.value = a.targets && a.targets.length ? 'clients' : 'all'
  dialog.value = true
}

async function save() {
  if (!form.title?.trim()) { ui.error('请填写标题'); return }
  saving.value = true
  try {
    // scopeMode === 'all' 发空数组 = 全用户; 否则发所选应用 id 列表。
    const targets = scopeMode.value === 'all' ? [] : (form.targets || [])
    const payload = {
      title: form.title, content: form.content, level: form.level, enabled: form.enabled,
      startTime: form.startTime ? new Date(form.startTime).toISOString() : null,
      endTime: form.endTime ? new Date(form.endTime).toISOString() : null,
      targets,
    }
    if (editing.value) await announcementApi.update(editId.value, payload)
    else await announcementApi.create(payload)
    ui.success('已保存')
    dialog.value = false
    load()
  } catch (e) {
    ui.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function remove(a) {
  const ok = await confirmRef.value.open({
    title: '删除公告', message: `确定删除「${a.title}」吗？`, confirmText: '删除', confirmColor: 'error',
  })
  if (!ok) return
  try {
    await announcementApi.remove(a.id)
    ui.success('已删除')
    load()
  } catch (e) { ui.error(e?.message || '删除失败') }
}

onMounted(() => {
  loadTargets()
  load()
})
</script>
