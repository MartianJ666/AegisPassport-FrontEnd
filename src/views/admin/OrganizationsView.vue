<template>
  <div>
    <div class="d-flex align-center flex-wrap ga-3 mb-6">
      <div><h1 class="text-h5 font-weight-bold">组织管理</h1><p class="text-body-2 text-medium-emphasis mb-0">先创建组织，再分配成员与应用访问范围。</p></div>
      <v-spacer /><v-btn v-if="canWrite" color="primary" prepend-icon="mdi-domain-plus" @click="editOrganization()">新建组织</v-btn>
    </div>
    <v-alert v-if="loadError" type="error" variant="tonal" class="mb-4" role="alert">{{ loadError }}<v-btn variant="text" @click="load">重新加载</v-btn></v-alert>
    <v-progress-linear v-if="loading" indeterminate aria-label="加载组织" />
    <v-card v-else-if="!organizations.length && !loadError" border flat rounded="lg" class="pa-8 text-center">
      <v-icon icon="mdi-domain" size="40" class="mb-3" /><h2 class="text-h6">还没有组织</h2>
      <p class="text-body-2 text-medium-emphasis mt-2">创建组织后，用户管理中的组织下拉框才会出现可选项。</p>
      <v-btn v-if="canWrite" color="primary" class="mt-4" @click="editOrganization()">新建组织</v-btn>
    </v-card>
    <v-row v-else class="mt-1">
      <v-col v-for="org in organizations" :key="org.id" cols="12" md="6" lg="4">
        <v-card rounded="lg" border flat class="h-100 d-flex flex-column">
          <v-card-item><template #prepend><v-avatar color="primary" variant="tonal"><v-icon icon="mdi-domain" /></v-avatar></template>
            <v-card-title class="text-subtitle-1 font-weight-bold text-wrap">{{ org.name }}</v-card-title>
            <v-card-subtitle>{{ org.userCount }} 位成员</v-card-subtitle>
          </v-card-item>
          <v-card-text class="text-body-2 text-medium-emphasis">{{ org.description || '尚未填写组织说明' }}</v-card-text>
          <v-card-actions class="flex-wrap ga-1">
            <v-btn v-if="auth.hasPermission('user:read')" prepend-icon="mdi-account-group-outline" @click="openMembers(org)">成员</v-btn>
            <v-btn v-if="auth.hasPermission('client:read')" prepend-icon="mdi-apps" @click="openApps(org)">应用访问</v-btn>
            <v-spacer /><v-btn v-if="canWrite" icon="mdi-pencil-outline" aria-label="编辑组织" @click="editOrganization(org)" />
            <v-btn v-if="canWrite" icon="mdi-delete-outline" color="error" aria-label="删除组织" @click="removeOrganization(org)" />
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="editDialog" max-width="520" :persistent="saving"><v-card rounded="lg">
      <v-card-title class="pt-4">{{ editing?.id ? '编辑组织' : '新建组织' }}</v-card-title><v-divider />
      <v-card-text><v-form ref="editForm" @submit.prevent="saveOrganization">
        <v-text-field v-model="form.name" label="组织名称" maxlength="100" counter variant="outlined" :rules="[v => !!v?.trim() || '请输入组织名称']" autofocus />
        <v-textarea v-model="form.description" label="组织说明（可选）" maxlength="255" counter variant="outlined" rows="3" />
        <v-alert v-if="editError" type="error" variant="tonal" role="alert">{{ editError }}</v-alert>
        <button type="submit" hidden aria-hidden="true" tabindex="-1" />
      </v-form></v-card-text>
      <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn :disabled="saving" @click="editDialog=false">取消</v-btn><v-btn color="primary" :loading="saving" @click="saveOrganization">{{ editing?.id ? '保存组织' : '创建组织' }}</v-btn></v-card-actions>
    </v-card></v-dialog>

    <v-dialog v-model="memberDialog" max-width="680" scrollable :persistent="memberSaving"><v-card rounded="lg">
      <v-card-title class="pt-4 text-wrap">{{ current?.name }} · 成员管理</v-card-title><v-divider />
      <v-card-text>
        <p class="text-body-2 text-medium-emphasis mb-4">每个账户归属一个组织。添加已有组织的用户会将其移入当前组织，角色保持不变。</p>
        <div v-if="canManageMembers" class="d-flex flex-wrap ga-2 mb-4">
          <v-autocomplete v-model="selectedUser" v-model:search="userSearch" :items="userOptions" item-title="label" item-value="id" label="搜索并选择用户" variant="outlined" density="compact" hide-details :loading="searching" clearable no-filter no-data-text="输入用户名、邮箱或昵称查找" class="flex-grow-1" style="min-width: 220px" />
          <v-btn color="primary" :disabled="!selectedUser || memberLoading" :loading="memberSaving" @click="setMember(selectedUser,true)">添加成员</v-btn>
        </div>
        <v-alert v-if="memberError" type="error" variant="tonal" class="mb-3" role="alert">{{ memberError }}<v-btn variant="text" @click="loadMembers">重新加载</v-btn></v-alert>
        <v-progress-linear v-if="memberLoading" indeterminate />
        <p v-else-if="!members.length" class="text-center text-medium-emphasis py-6">该组织暂无成员</p>
        <v-list v-else><v-list-item v-for="m in members" :key="m.id" :title="m.nickname || m.username" :subtitle="m.username">
          <template #append><v-btn v-if="canManageMembers" variant="text" color="error" :disabled="memberSaving" @click="setMember(m.id,false)">移出组织</v-btn></template>
        </v-list-item></v-list>
      </v-card-text><v-card-actions><v-spacer /><v-btn :disabled="memberSaving" @click="memberDialog=false">关闭</v-btn></v-card-actions>
    </v-card></v-dialog>

    <v-dialog v-model="appDialog" max-width="760" scrollable :persistent="appSaving"><v-card rounded="lg">
      <v-card-title class="pt-4 text-wrap">{{ current?.name }} · 应用访问</v-card-title><v-divider />
      <v-card-text>
        <v-alert type="info" variant="tonal" class="mb-4">这里仅设置组织门禁。管理员直接放行优先于组织和角色门禁；未获直接放行的账户必须通过组织门禁及角色检查。个人禁止规则始终生效。</v-alert>
        <v-alert v-if="appError" type="error" variant="tonal" class="mb-3" role="alert">{{ appError }}<v-btn v-if="!apps.length" variant="text" @click="openApps(current)">重新加载</v-btn></v-alert>
        <v-progress-linear v-if="appLoading" indeterminate />
        <p v-else-if="!apps.length" class="text-center text-medium-emphasis py-6">尚未注册 OAuth 应用</p>
        <v-list v-else><v-list-item v-for="app in apps" :key="app.clientId" class="py-2" :title="app.clientName" :subtitle="app.restricted ? '应用仅允许指定组织' : '应用默认不限组织，可在此单独禁止本组织'">
          <template #append><div class="d-flex align-center ga-2"><v-chip v-if="!app.enabled" size="small" variant="tonal">应用已停用</v-chip>
            <v-switch v-model="app.allowed" :label="app.allowed ? '允许' : '禁止'" :aria-label="`${app.clientName}的组织访问`" :disabled="!canManageApps || appSaving" color="primary" inset hide-details density="compact" /></div></template>
        </v-list-item></v-list>
      </v-card-text><v-divider /><v-card-actions class="px-4 pb-4"><v-spacer /><v-btn :disabled="appSaving" @click="appDialog=false">关闭</v-btn><v-btn v-if="canManageApps" color="primary" :loading="appSaving" :disabled="appLoading || !appChanged" @click="saveApps">保存应用访问</v-btn></v-card-actions>
    </v-card></v-dialog>
    <ConfirmDialog ref="confirmRef" />
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { organizationApi } from '@/api/modules/organizations'
import { userApi } from '@/api/modules/account'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
const auth=useAuthStore(),ui=useUiStore()
const organizations=ref([]),loading=ref(false),loadError=ref(''),current=ref(null)
const canWrite=computed(()=>auth.hasPermission('organization:write'))
const canManageMembers=computed(()=>canWrite.value && auth.hasPermission('user:write'))
const canManageApps=computed(()=>canWrite.value && auth.hasPermission('client:write'))
const editDialog=ref(false),editing=ref(null),editForm=ref(null),saving=ref(false),editError=ref(''),form=reactive({name:'',description:''})
const memberDialog=ref(false),members=ref([]),memberLoading=ref(false),memberSaving=ref(false),memberError=ref(''),selectedUser=ref(null),userSearch=ref(''),userOptions=ref([]),searching=ref(false)
const appDialog=ref(false),apps=ref([]),appLoading=ref(false),appSaving=ref(false),appError=ref(''),originalApps=ref({}),confirmRef=ref(null)
const appChanged=computed(()=>apps.value.some(a=>a.allowed!==originalApps.value[a.clientId]))
async function load(){loading.value=true;loadError.value='';try{organizations.value=await organizationApi.list()}catch(e){loadError.value=e.message||'组织加载失败'}finally{loading.value=false}}
function editOrganization(org=null){editing.value=org;Object.assign(form,{name:org?.name||'',description:org?.description||''});editError.value='';editDialog.value=true}
async function saveOrganization(){if(saving.value || !(await editForm.value.validate()).valid)return;saving.value=true;editError.value='';try{
  const payload={name:form.name.trim(),description:form.description.trim()}
  if(editing.value?.id)await organizationApi.update(editing.value.id,payload);else await organizationApi.create(payload)
  editDialog.value=false;ui.success('组织已保存');await Promise.all([load(),auth.fetchProfile()])
}catch(e){editError.value=e.message||'组织保存失败'}finally{saving.value=false}}
async function removeOrganization(org){if(!await confirmRef.value.open({title:'删除组织',message:`删除「${org.name}」？只有没有成员且没有应用规则引用的组织才能删除。`,confirmText:'删除组织',confirmColor:'error'}))return;try{await organizationApi.remove(org.id);ui.success('组织已删除');await load()}catch(e){ui.error(e.message)}}
async function openMembers(org){current.value=org;members.value=[];memberError.value='';selectedUser.value=null;userOptions.value=[];userSearch.value='';memberDialog.value=true;await loadMembers();await searchUsers('')}
async function loadMembers(){const id=current.value.id;memberLoading.value=true;memberError.value='';try{const result=await organizationApi.members(id);if(current.value.id===id)members.value=result}catch(e){if(current.value.id===id)memberError.value=e.message||'成员加载失败'}finally{if(current.value.id===id)memberLoading.value=false}}
async function setMember(id,member){if(memberSaving.value)return;memberSaving.value=true;memberError.value='';try{await organizationApi.setMember(current.value.id,id,member);selectedUser.value=null;await loadMembers();await Promise.all([load(),auth.fetchProfile()]);await searchUsers(userSearch.value||'');ui.success(member?'成员已加入组织':'成员已移出组织')}catch(e){memberError.value=e.message||'成员调整失败'}finally{memberSaving.value=false}}
let searchTimer,searchSequence=0
async function searchUsers(query){const seq=++searchSequence;searching.value=true;try{const res=query.trim()?await userApi.search({keyword:query.trim(),page:0,size:20}):await userApi.list({page:0,size:20});if(seq!==searchSequence)return;const list=Array.isArray(res)?res:res.items||res.content||[];const ids=new Set(members.value.map(m=>m.id));userOptions.value=list.filter(u=>!ids.has(u.id)).map(u=>({...u,label:`${u.nickname||u.username} · ${u.username}${u.orgName?' · '+u.orgName:''}`}))}catch(e){if(seq===searchSequence)memberError.value=e.message||'用户搜索失败'}finally{if(seq===searchSequence)searching.value=false}}
watch(userSearch,q=>{clearTimeout(searchTimer);if(memberDialog.value)searchTimer=setTimeout(()=>searchUsers(q||''),250)})
onUnmounted(()=>{clearTimeout(searchTimer);searchSequence++})
async function openApps(org){current.value=org;apps.value=[];originalApps.value={};appError.value='';appLoading.value=true;appDialog.value=true;try{apps.value=await organizationApi.apps(org.id);originalApps.value=Object.fromEntries(apps.value.map(a=>[a.clientId,a.allowed]))}catch(e){appError.value=e.message||'应用加载失败'}finally{appLoading.value=false}}
async function saveApps(){if(appSaving.value)return;appSaving.value=true;appError.value='';try{const changes=Object.fromEntries(apps.value.filter(a=>a.allowed!==originalApps.value[a.clientId]).map(a=>[a.clientId,a.allowed]));await organizationApi.setApps(current.value.id,changes);originalApps.value=Object.fromEntries(apps.value.map(a=>[a.clientId,a.allowed]));ui.success('组织应用门禁已保存')}catch(e){appError.value=e.message||'应用门禁保存失败'}finally{appSaving.value=false}}
onMounted(load)
</script>
