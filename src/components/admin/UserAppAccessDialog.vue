<template>
 <v-dialog v-model="dialog" max-width="760" persistent scrollable><v-card rounded="lg">
  <v-card-title class="pt-4 text-wrap">应用访问 · {{ user?.nickname || user?.username }}</v-card-title><v-divider />
  <v-card-text style="max-height:68vh">
   <v-alert type="info" variant="tonal" density="compact" class="mb-4">管理员特批优先于组织、角色限制；到期或撤销后恢复原规则。账号封禁、应用停用及个人禁止仍会拦截。时长从保存成功时起计算。</v-alert>
   <v-alert v-if="error" type="error" variant="tonal" class="mb-3" role="alert">{{ error }}<v-btn v-if="!clients.length" variant="text" @click="load">重新加载</v-btn></v-alert>
   <v-progress-linear v-if="loading" indeterminate />
   <p v-else-if="!clients.length && !error" class="text-center text-medium-emphasis py-6">暂无应用</p>
   <v-card v-for="c in clients" :key="c.clientId" border flat rounded="lg" class="pa-3 mb-3">
    <div class="d-flex align-center flex-wrap ga-2"><span class="text-body-1 font-weight-medium">{{ c.clientName }}</span><v-spacer /><v-chip size="small" variant="tonal" :color="c.effectiveAllowed?'success':'default'">当前{{ c.effectiveAllowed?'允许':'拒绝' }}</v-chip></div>
    <p class="text-caption text-medium-emphasis mt-1 mb-3">{{ c.clientId }}<span v-if="!c.enabled"> · 应用已停用</span><span v-if="c.expired"> · 上次特批已到期</span><span v-else-if="c.mode==='allow'"> · {{ c.expiresAt ? `特批至 ${fmtDateTime(c.expiresAt)}` : '永久特批' }}</span></p>
    <v-row dense>
     <v-col cols="12" :sm="draft[c.clientId].mode==='allow'?6:12"><v-select v-model="draft[c.clientId].mode" :items="modes" label="处理方式" variant="outlined" density="compact" hide-details :disabled="saving || !auth.isAdmin" /></v-col>
     <v-col v-if="draft[c.clientId].mode==='allow'" cols="12" sm="6"><v-select v-model="draft[c.clientId].duration" :items="durations" label="特批有效期" variant="outlined" density="compact" hide-details :disabled="saving || !auth.isAdmin" /></v-col>
     <v-col v-if="draft[c.clientId].mode==='allow' && draft[c.clientId].duration===-1" cols="12"><v-text-field v-model.number="draft[c.clientId].customHours" type="number" min="1" max="8760" label="自定义小时数" hint="1-8760 小时的整数" persistent-hint variant="outlined" density="compact" :disabled="saving" /></v-col>
    </v-row>
    <div v-if="c.mode==='allow' && draft[c.clientId].mode==='allow'" class="mt-2"><v-btn v-if="!draft[c.clientId].renew" size="small" variant="text" :disabled="saving || !auth.isAdmin" @click="draft[c.clientId].renew=true">按所选时长续期</v-btn><span v-else class="text-caption text-primary">保存后从现在重新计算有效期</span></div>
   </v-card>
  </v-card-text><v-divider /><v-card-actions class="px-4 pb-3"><span class="text-caption text-medium-emphasis">已修改 {{ changed.length }} 个应用</span><v-spacer /><v-btn :disabled="saving" @click="dialog=false">取消</v-btn><v-btn color="primary" variant="flat" :loading="saving" :disabled="loading || !auth.isAdmin || !changed.length" @click="save">保存修改</v-btn></v-card-actions>
 </v-card></v-dialog>
</template>
<script setup>
import {computed,ref} from 'vue'
import {clientApi} from '@/api/modules/rbac'
import {useAuthStore} from '@/stores/auth'
import {useUiStore} from '@/stores/ui'
import {fmtDateTime} from '@/utils/format'
const auth=useAuthStore(),ui=useUiStore(),dialog=ref(false),user=ref(null),clients=ref([]),draft=ref({}),original=ref({}),loading=ref(false),saving=ref(false),error=ref('')
const modes=[{title:'按组织、角色规则',value:'default'},{title:'管理员特批',value:'allow'},{title:'个人禁止',value:'deny'}]
const durations=[1,2,4,8,24,72,168].map(value=>({title:`${value} 小时`,value})).concat([{title:'永久有效',value:0},{title:'自定义小时数',value:-1}])
const changed=computed(()=>clients.value.filter(c=>JSON.stringify(draft.value[c.clientId])!==original.value[c.clientId]))
function reset(c){const hours=c.expiresAt?Math.max(1,Math.ceil((Date.parse(c.expiresAt)-Date.now())/3600000)):4;const duration=c.mode==='allow'&&!c.expiresAt?0:durations.some(d=>d.value===hours)?hours:-1;draft.value[c.clientId]={mode:c.mode,duration,customHours:hours,renew:false};original.value[c.clientId]=JSON.stringify(draft.value[c.clientId])}
async function load(){loading.value=true;error.value='';try{clients.value=await clientApi.appAccess(user.value.id);for(const c of clients.value)reset(c)}catch(e){error.value=e.message||'应用访问加载失败'}finally{loading.value=false}}
async function open(u){user.value=u;clients.value=[];draft.value={};original.value={};dialog.value=true;await load()}
async function save(){if(saving.value || !auth.isAdmin)return;error.value='';for(const c of changed.value){const d=draft.value[c.clientId];if(d.mode==='allow' && d.duration===-1 && (!Number.isInteger(d.customHours)||d.customHours<1||d.customHours>8760)){error.value='自定义有效期需为 1-8760 小时的整数';return}}saving.value=true;try{for(const c of [...changed.value]){const d=draft.value[c.clientId],hours=d.mode==='allow'?(d.duration===0?null:d.duration===-1?d.customHours:d.duration):null;Object.assign(c,await clientApi.setAppAccess(user.value.id,c.clientId,{mode:d.mode,hours}));reset(c)}ui.success('应用访问规则已保存');dialog.value=false}catch(e){error.value=e.message||'保存失败；已成功的项目已保留，可重试其余项目'}finally{saving.value=false}}
defineExpose({open})
</script>
