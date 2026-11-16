<template>
  <div>
    <div class="d-flex align-center mb-6">
      <div>
        <h1 class="text-h5 font-weight-bold">审计日志</h1>
        <p class="text-body-2 text-medium-emphasis mb-0">系统操作与安全事件记录</p>
      </div>
      <v-spacer />
      <v-btn variant="tonal" prepend-icon="mdi-download" :loading="exporting" @click="exportCsv">导出 CSV</v-btn>
    </div>

    <v-row class="mb-2">
      <v-col v-for="s in statCards" :key="s.label" cols="6" md="3">
        <v-card rounded="lg" border flat>
          <v-card-text class="d-flex align-center">
            <v-avatar :color="s.color" variant="tonal" class="me-3"><v-icon :icon="s.icon" /></v-avatar>
            <div>
              <div class="text-h6 font-weight-bold">{{ s.value }}</div>
              <div class="text-caption text-medium-emphasis">{{ s.label }}</div>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-card rounded="lg" border flat class="mb-4">
      <v-card-text>
        <v-row dense align="center">
          <v-col cols="12" md="3">
            <v-text-field v-model="filters.operator" label="操作人" variant="outlined" density="compact"
              prepend-inner-icon="mdi-account-search-outline" hide-details clearable @keyup.enter="applyFilters" />
          </v-col>
          <v-col cols="6" md="2">
            <v-select v-model="filters.module" :items="moduleOptions" label="模块" variant="outlined"
              density="compact" hide-details clearable />
          </v-col>
          <v-col cols="6" md="2">
            <v-autocomplete v-model="filters.action" :items="actionOptions" label="操作" variant="outlined"
              density="compact" hide-details clearable no-data-text="暂无匹配操作"
              :menu-props="{ maxHeight: 360 }" />
          </v-col>
          <v-col cols="6" md="2">
            <v-select v-model="filters.success" :items="successOptions" label="结果" variant="outlined"
              density="compact" hide-details clearable />
          </v-col>
          <v-col cols="6" md="3" class="d-flex gap-2">
            <v-btn color="primary" variant="flat" @click="applyFilters">查询</v-btn>
            <v-btn variant="text" @click="resetFilters">重置</v-btn>
          </v-col>
        </v-row>
      </v-card-text>
    </v-card>

    <v-card rounded="lg" border flat>
      <v-data-table-server
        class="audit-table"
        v-model:options="tableOptions"
        :headers="headers"
        :items="items"
        :items-length="total"
        :loading="loading"
        :items-per-page-options="[10, 20, 50, 100]"
        density="comfortable"
        hover
        @click:row="(_, { item }) => showDetail(item)"
      >
        <template #[`item.eventId`]="{ item }">
          <v-tooltip :text="item.eventId || ''" location="top" :disabled="!item.eventId">
            <template #activator="{ props }">
              <span v-bind="props" class="event-id">{{ shortEventId(item.eventId) }}</span>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.module`]="{ item }">
          <v-chip size="small" variant="tonal" density="compact">{{ moduleLabel(item.module) }}</v-chip>
        </template>
        <template #[`item.action`]="{ item }">
          <span class="text-body-2">{{ actionLabel(item.action) }}</span>
        </template>
        <template #[`item.description`]="{ item }">
          <v-tooltip :text="descriptionLabel(item)" location="top"
            :disabled="descriptionLabel(item).length < 40">
            <template #activator="{ props }">
              <span v-bind="props" class="text-body-2">{{ truncate(descriptionLabel(item), 60) }}</span>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.device`]="{ item }">
          <span class="text-caption text-medium-emphasis">{{ parseDevice(item.userAgent) }}</span>
        </template>
        <template #[`item.ipAddress`]="{ item }">
          <v-tooltip :text="item.ipAddress || '—'" location="top" :disabled="!item.ipAddress">
            <template #activator="{ props }">
              <span v-bind="props" class="ip-address" tabindex="0">{{ item.ipAddress || '—' }}</span>
            </template>
          </v-tooltip>
        </template>
        <template #[`item.success`]="{ item }">
          <v-chip size="small" variant="tonal" density="compact" :color="item.success ? 'success' : 'error'">
            {{ item.success ? '成功' : '失败' }}
          </v-chip>
        </template>
        <template #[`item.executionMs`]="{ item }">
          <span class="text-caption" :class="{ 'text-error font-weight-bold': (item.executionMs ?? 0) > 1000 }">
            {{ item.executionMs != null ? `${item.executionMs} ms` : '—' }}
          </span>
        </template>
        <template #[`item.timestamp`]="{ item }">
          <span class="text-caption">{{ fmtDateTimeSeconds(item.timestamp) }}</span>
        </template>
        <template #[`item.detail`]="{ item }">
          <v-btn icon="mdi-information-outline" size="small" variant="text" @click.stop="showDetail(item)" />
        </template>
        <template #no-data>
          <v-alert type="info" variant="tonal" class="ma-4" density="compact">暂无审计记录</v-alert>
        </template>
      </v-data-table-server>
    </v-card>

    <v-dialog v-model="detailDialog" max-width="640" scrollable>
      <v-card rounded="lg" v-if="current">
        <v-card-title class="text-subtitle-1 font-weight-bold pt-4">日志详情</v-card-title>
        <v-divider />
        <v-card-text style="max-height: 60vh">
          <v-list density="compact">
            <v-list-item v-for="row in detailRows" :key="row.label" :title="row.label">
              <template #subtitle><span class="text-body-2 detail-value">{{ row.value }}</span></template>
            </v-list-item>
          </v-list>
          <div v-if="current.params" class="mt-2">
            <div class="text-caption text-medium-emphasis mb-1">请求参数</div>
            <pre class="params-box">{{ current.params }}</pre>
          </div>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer /><v-btn color="primary" variant="text" @click="detailDialog = false">关闭</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { auditApi } from '@/api/modules/admin'
import http from '@/api/http'
import { useUiStore } from '@/stores/ui'
import { fmtDateTimeSeconds, truncate } from '@/utils/format'
import { actionLabel, moduleLabel, parseDevice, shortEventId, descriptionLabel } from '@/utils/audit'

const ui = useUiStore()
const items = ref([])
const total = ref(0)
const loading = ref(false)
const moduleOptions = ref([])
const actionOptions = ref([])
const stats = ref({ total: 0, succeeded: 0, failed: 0, last24h: 0 })
const detailDialog = ref(false)
const current = ref(null)
const exporting = ref(false)

const filters = reactive({ operator: '', module: null, action: null, success: null })
const successOptions = [{ title: '成功', value: true }, { title: '失败', value: false }]

// 单一分页来源。后端 page 从 0 开始、size 上限 200；这里在发请求前一律钳制，
// 避免 Vuetify 边界状态下发出 page=-1 / size=0 触发后端的 400。
const tableOptions = ref({ page: 1, itemsPerPage: 20, sortBy: [] })

// 移动端通过 d-none d-sm-table-cell 隐藏次要列，避免 11 列在手机上挤压不可用
const hideOnMobile = 'd-none d-sm-table-cell'
const headers = [
  { title: '事件ID', key: 'eventId', width: 130, sortable: false, class: hideOnMobile, cellClass: hideOnMobile },
  { title: '模块', key: 'module', width: 110, sortable: false },
  { title: '操作', key: 'action', width: 130, sortable: false },
  { title: '操作人', key: 'operatorName', width: 110, sortable: false },
  { title: '描述', key: 'description', width: 240, sortable: false, class: hideOnMobile, cellClass: hideOnMobile },
  { title: 'IP 地址', key: 'ipAddress', width: 160, sortable: false, class: hideOnMobile, cellClass: hideOnMobile },
  { title: '机型', key: 'device', width: 120, sortable: false, class: hideOnMobile, cellClass: hideOnMobile },
  { title: '结果', key: 'success', width: 80, sortable: false, align: 'center' },
  { title: '耗时', key: 'executionMs', width: 90, sortable: false, align: 'end', class: hideOnMobile, cellClass: hideOnMobile },
  { title: '时间', key: 'timestamp', width: 150, sortable: false },
  { title: '详情', key: 'detail', width: 56, sortable: false, align: 'end' },
]

const statCards = computed(() => [
  { label: '总记录', value: stats.value.total, icon: 'mdi-database', color: 'primary' },
  { label: '成功', value: stats.value.succeeded, icon: 'mdi-check-circle', color: 'success' },
  { label: '失败', value: stats.value.failed, icon: 'mdi-alert-circle', color: 'error' },
  { label: '近 24h', value: stats.value.last24h, icon: 'mdi-clock-outline', color: 'info' },
])

const detailRows = computed(() => {
  const c = current.value || {}
  return [
    { label: '事件 ID', value: c.eventId || '—' },
    { label: '模块', value: moduleLabel(c.module) },
    { label: '操作', value: actionLabel(c.action) },
    { label: '描述', value: descriptionLabel(c) },
    ...(c.module === 'page' && c.description && !/[\u4e00-\u9fff]/.test(c.description)
      ? [{ label: '原始页面标识', value: c.description }] : []),
    { label: '操作人', value: c.operatorName || '—' },
    { label: '目标', value: c.targetId || '—' },
    { label: 'IP 地址', value: c.ipAddress || '—' },
    { label: '机型', value: parseDevice(c.userAgent) },
    { label: '请求', value: `${c.requestMethod || ''} ${c.requestPath || ''}`.trim() || '—' },
    { label: 'User-Agent', value: c.userAgent || '—' },
    { label: '耗时', value: c.executionMs != null ? `${c.executionMs} ms` : '—' },
    { label: '时间', value: fmtDateTimeSeconds(c.timestamp) },
    { label: '错误信息', value: c.errorMessage || '—' },
  ]
})

async function loadMeta() {
  try {
    const mods = (await auditApi.modules()) || []
    moduleOptions.value = mods.map((m) => ({ title: moduleLabel(m), value: m }))
    const acts = (await auditApi.actions()) || []
    actionOptions.value = acts.map((a) => ({ title: actionLabel(a), value: a }))
  } catch { /* non-fatal */ }
}
async function loadStats() {
  try {
    const s = await auditApi.statistics({})
    if (s) stats.value = { ...stats.value, ...s }
  } catch { /* non-fatal */ }
}

async function load() {
  loading.value = true
  const o = tableOptions.value
  const params = {
    page: Math.max((Number(o.page) || 1) - 1, 0),
    size: Math.min(Math.max(Number(o.itemsPerPage) || 20, 1), 200),
    operator: filters.operator || undefined,
    module: filters.module || undefined,
    action: filters.action || undefined,
    success: filters.success ?? undefined,
  }
  try {
    const res = await auditApi.list(params)
    items.value = res?.items || []
    total.value = res?.total ?? items.value.length
  } catch (e) {
    ui.error(e?.message || '加载失败')
  } finally {
    loading.value = false
  }
}

// 用户在表格里翻页/改每页条数 → v-model:options 更新 → 重新拉数据。
// 挂载阶段 Vuetify 写入初始 options 时 mounted 尚未置位，直接吸收，不重复请求。
let mounted = false
watch(tableOptions, () => {
  if (!mounted) return
  load()
}, { deep: true })

function applyFilters() {
  // 回到第一页。整体替换 options 对象（而非原地改 page），确保 Vuetify 的
  // options prop 能感知到变化并同步分页脚；watcher 随之触发 load()。
  if (tableOptions.value.page !== 1) {
    tableOptions.value = { ...tableOptions.value, page: 1 }
  } else {
    load()
  }
  loadStats()
}
function resetFilters() {
  filters.operator = ''
  filters.module = null
  filters.action = null
  filters.success = null
  applyFilters()
}
function showDetail(item) {
  current.value = item
  detailDialog.value = true
}

async function exportCsv() {
  exporting.value = true
  try {
    const res = await http.get('/admin/audit-logs/export', {
      params: {
        operator: filters.operator || undefined,
        module: filters.module || undefined,
        action: filters.action || undefined,
        success: filters.success ?? undefined,
      },
      responseType: 'blob',
    })
    const blob = new Blob([res], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-logs.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch (e) {
    ui.error(e?.message || '导出失败')
  } finally {
    exporting.value = false
  }
}

onMounted(() => {
  mounted = true
  loadMeta()
  loadStats()
  load()
})
</script>

<style scoped>
.audit-table :deep(.v-table__wrapper > table) { table-layout: fixed; min-width: 1280px; }
.ip-address { display: block; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: ui-monospace, Consolas, monospace; font-size: .8125rem; }
.ip-address:focus-visible { outline: 2px solid rgb(var(--v-theme-primary)); outline-offset: 2px; border-radius: 2px; }
.detail-value { white-space: normal; overflow-wrap: anywhere; }
.params-box {
  background: rgba(var(--v-theme-on-surface), 0.05);
  padding: 12px; border-radius: 8px; font-size: 12px;
  white-space: pre-wrap; word-break: break-all; max-height: 200px; overflow: auto;
}
.event-id {
  font-family: ui-monospace, 'SFMono-Regular', Consolas, monospace;
  font-size: 12px;
  letter-spacing: .02em;
  color: rgba(var(--v-theme-on-surface), 0.8);
}
</style>
