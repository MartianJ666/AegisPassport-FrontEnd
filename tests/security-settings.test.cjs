const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
let calls=[];const api={sessionPolicy:async()=>({allowMultipleDevices:false}),saveSessionPolicy:async()=>{},globalLogout:async(...args)=>{calls.push(args);return {revokedSessions:3}}};
const ctx=vm.createContext({ref:v=>({value:v}),systemConfigApi:api,encryptPassword:async value=>'encrypted:'+value,useUiStore:()=>({success(){}})});
vm.runInContext(fs.readFileSync('src/views/admin/SystemSettingsView.vue','utf8').split('<script setup>')[1].split('</script>')[0].replace(/^import .*$/gm,''),ctx);
(async()=>{
 await ctx.loadPolicy();assert.equal(vm.runInContext('allowMultipleDevices.value',ctx),false);
 vm.runInContext('allowMultipleDevices.value=true',ctx);api.saveSessionPolicy=async()=>{throw Error('save failed')};await ctx.savePolicy(true);assert.equal(vm.runInContext('allowMultipleDevices.value',ctx),false);
 await ctx.globalLogout();assert.equal(calls.length,0);
 ctx.openGlobalLogout();vm.runInContext("logoutPassword.value='fixture-password';revokeOAuthSessions.value=true",ctx);await ctx.globalLogout();assert.deepEqual(calls,[[true,'encrypted:fixture-password']]);assert.equal(vm.runInContext('logoutPassword.value',ctx),'');assert.equal(vm.runInContext('logoutDialog.value',ctx),false);
 console.log('PASS security-policy save failure restores actual value; global logout requires password; RSA ciphertext sent; password cleared after success');
 const client={interceptors:{request:{use(){}},response:{use(ok,bad){this.bad=bad}}}};
 let cleared=0,redirected=0;
 const httpctx=vm.createContext({isConsentOrigin:()=>false,axios:{create:()=>client,isCancel:error=>!!error.__CANCEL__},useAuthStore:()=>({clearSession(){cleared++}}),useUiStore:()=>({error(){}}),router:{currentRoute:{value:{name:'security',fullPath:'/security'}},push(){redirected++}},window:{location:{hostname:'auth.example.com'}},normalizeApiError:error=>Object.assign(new Error('confirmation failed'),{errorCode:error.response.data.errorCode})});
 vm.runInContext(fs.readFileSync('src/api/http.js','utf8').replace(/^import .*$/gm,'').replace(/^export default .*$/gm,'').replace('export class','class'),httpctx);
 for(const path of ['/config/admin/security/global-logout','/user/sessions/revoke','/user/change-password','/external-identities/oidc/bind','/external/setup/merge'])await assert.rejects(()=>client.interceptors.response.bad({response:{status:401,data:{errorCode:'INVALID_CREDENTIALS'}},config:{url:path}}));
 assert.equal(cleared,0);assert.equal(redirected,0);
 await assert.rejects(()=>client.interceptors.response.bad({response:{status:401,data:{errorCode:'UNAUTHORIZED'}},config:{url:'/config/admin/security/global-logout'}}));assert.equal(cleared,1);assert.equal(redirected,1);
 console.log('PASS wrong confirmation password keeps authenticated session; actual session expiry still redirects to login');
})().catch(e=>{console.error(e);process.exitCode=1});
