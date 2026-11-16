const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('src/views/auth/ConsentView.vue','utf8').split('<script setup>')[1].split('</script>')[0].replace(/^import .*$/gm,'');
let timer,submitted=0,removed=0,throwSubmit=false,cleanup;
const context=vm.createContext({
 ref:value=>({value}),computed:fn=>({get value(){return fn()}}),useRoute:()=>({query:{token:'test'}}),
 authOrigin:()=> 'https://auth.example.com',onMounted(){},onBeforeUnmount(fn){cleanup=fn},http:{},
 setTimeout(fn,delay){timer={fn,delay};return 1},clearTimeout(){timer=null},
 document:{createElement(){return {appendChild(){},remove(){removed++}}},body:{appendChild(){}},addEventListener(){},removeEventListener(){}},
 HTMLFormElement:{prototype:{submit(){submitted++;if(throwSubmit)throw Error('blocked')}}},
 window:{location:{assign(url){this.target=url}}}
});
vm.runInContext(source,context);
function prepare(){vm.runInContext("status.value='ready';submissionError.value='';submitting.value=false;clientId.value='example-client';approved.value=['openid','profile'];authorizeUrl.value='https://auth.example.com/oauth2/authorize'",context)}
prepare();context.submitForm();assert.equal(timer.delay,15000);context.submitForm();assert.equal(submitted,1);
context.onPolicyViolation({effectiveDirective:'img-src'});assert.equal(vm.runInContext('submitting.value',context),true);
context.onPolicyViolation({effectiveDirective:'form-action'});assert.equal(vm.runInContext('submitting.value',context),false);assert.match(vm.runInContext('submissionError.value',context),/浏览器拦截/);assert.ok(removed>0);
context.restartLogin();assert.equal(context.window.location.href,'https://auth.example.com/auth/login');
prepare();context.submitForm();const timeout=timer.fn;timeout();assert.equal(vm.runInContext('submitting.value',context),false);assert.match(vm.runInContext('submissionError.value',context),/15 秒/);
prepare();throwSubmit=true;context.submitForm();assert.match(vm.runInContext('submissionError.value',context),/未能提交/);cleanup();assert.equal(timer,null);
console.log('PASS: duplicate submission blocked; CSP error stops spinner; 15-second timeout; submit failure recovery; new OAuth flow instead of replay; cleanup');
