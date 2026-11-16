<template>
  <main class="auth-shell" :class="{ 'auth-shell--centered': centered }" :style="backgroundStyle">
    <div class="auth-shell__wash" aria-hidden="true" />
    <div class="auth-shell__orb auth-shell__orb--one" aria-hidden="true" />
    <div class="auth-shell__orb auth-shell__orb--two" aria-hidden="true" />
    <section class="auth-shell__layout">
      <aside v-if="!centered" class="auth-shell__brand" aria-label="AegisPassport">
        <div class="auth-shell__mark"><v-icon icon="mdi-shield-key-outline" size="34" /></div>
        <p class="auth-shell__eyebrow">AegisPassport</p>
        <h2>一次登录，安全抵达。</h2>
        <p class="auth-shell__tagline">以更清晰、更可靠的方式连接你的服务与身份。</p>
        <div class="auth-shell__trust"><v-icon icon="mdi-lock-check-outline" size="18" /><span>安全身份验证</span></div>
      </aside>
      <div class="auth-shell__content" :style="{ '--auth-content-width': `${contentWidth}px` }"><slot /></div>
    </section>
  </main>
</template>

<script setup>
import { useLoginBackground } from '@/composables/useLoginBackground'
const { backgroundStyle } = useLoginBackground()
defineProps({ centered: { type: Boolean, default: false }, contentWidth: { type: [Number, String], default: 520 } })
</script>

<style scoped>
.auth-shell{min-height:100vh;min-height:100dvh;position:relative;display:grid;place-items:center;isolation:isolate;overflow:hidden;padding:max(24px,env(safe-area-inset-top)) max(24px,env(safe-area-inset-right)) max(32px,env(safe-area-inset-bottom)) max(24px,env(safe-area-inset-left));background-color:rgb(var(--v-theme-background));background-position:center;background-size:cover}
.auth-shell__wash{position:absolute;inset:0;z-index:-1;background:transparent;backdrop-filter:none}
.auth-shell__orb{position:absolute;z-index:-1;width:clamp(180px,30vw,420px);aspect-ratio:1;border-radius:50%;filter:blur(4px);opacity:.65;pointer-events:none}.auth-shell__orb--one{top:-12%;right:8%;background:radial-gradient(circle at 35% 30%,#fff 0 5%,#D8C5F4 30%,#A58ACD 72%,transparent 73%)}.auth-shell__orb--two{bottom:-22%;left:-8%;background:radial-gradient(circle at 45% 35%,#FFF1F5,#FFD8E4 35%,#D49BB9 74%,transparent 75%)}
.auth-shell__layout{position:relative;z-index:1;width:min(1080px,100%);display:grid;grid-template-columns:minmax(280px,1fr) minmax(360px,auto);align-items:center;gap:clamp(40px,8vw,104px)}.auth-shell--centered .auth-shell__layout{display:block;width:100%}.auth-shell__brand{max-width:460px;color:rgb(var(--v-theme-primary));text-shadow:0 2px 24px rgba(255,255,255,.35)}.auth-shell__mark{width:68px;height:68px;display:grid;place-items:center;margin-bottom:28px;border:1px solid rgba(255,255,255,.55);border-radius:24px;background:rgba(255,255,255,.24);backdrop-filter:blur(22px) saturate(1.5);box-shadow:inset 0 1px rgba(255,255,255,.8),0 16px 40px rgba(var(--v-theme-primary),.18)}.auth-shell__eyebrow{margin:0 0 12px;font-size:.75rem;font-weight:800;letter-spacing:.18em;opacity:.84}.auth-shell__brand h2{margin:0;max-width:430px;font-size:clamp(2.5rem,5vw,4.5rem);line-height:.98;letter-spacing:-.04em}.auth-shell__tagline{max-width:400px;margin:24px 0 0;font-size:1rem;line-height:1.7;opacity:.88}.auth-shell__trust{display:flex;align-items:center;gap:8px;margin-top:34px;font-size:.85rem;font-weight:700;opacity:.9}.auth-shell__content{width:min(var(--auth-content-width,520px),100%);min-width:0;margin-left:auto;animation:auth-enter .45s cubic-bezier(.2,.8,.2,1) both}.auth-shell--centered .auth-shell__content{margin-inline:auto}.auth-shell__content :deep(.auth-card){position:relative;width:100%!important;max-width:100%!important;overflow:visible;border:1px solid rgba(255,255,255,.62)!important;border-radius:32px!important;background:linear-gradient(145deg,rgba(255,255,255,.72),rgba(var(--v-theme-surface),.70))!important;backdrop-filter:blur(30px) saturate(1.55);box-shadow:inset 0 1px rgba(255,255,255,.95),inset 0 -1px rgba(255,255,255,.2),0 26px 80px rgba(var(--v-theme-primary),.20)!important}.auth-shell__content :deep(.auth-card::before){content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;background:linear-gradient(120deg,rgba(255,255,255,.45),transparent 34%,rgba(255,255,255,.16));opacity:.8}.auth-shell__content :deep(.auth-card > *){position:relative;z-index:1}
.auth-shell__content :deep(.auth-card__footer){display:flex;align-items:center;justify-content:center;gap:4px;margin-top:24px;padding-top:16px;border-top:1px solid rgba(var(--v-theme-outline),.18);font-size:.875rem;color:rgb(var(--v-theme-on-surface-variant))}.auth-shell__content :deep(.auth-icon){box-shadow:0 10px 26px rgba(var(--v-theme-primary),.20)}
@keyframes auth-enter{from{opacity:0;transform:translateY(14px) scale(.985)}}
@media(max-width:760px){.auth-shell{place-items:center;overflow-y:auto;padding:18px max(16px,env(safe-area-inset-right)) max(30px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}.auth-shell__layout{grid-template-columns:1fr;gap:18px}.auth-shell__brand{display:flex;align-items:center;gap:12px}.auth-shell__mark{width:48px;height:48px;border-radius:18px;margin:0;flex:0 0 auto}.auth-shell__eyebrow{margin:0 0 3px}.auth-shell__brand h2{font-size:1.25rem;letter-spacing:0}.auth-shell__tagline,.auth-shell__trust{display:none}.auth-shell__content{width:100%;margin-inline:auto}.auth-shell__content :deep(.auth-card){border-radius:28px!important}}
@media (min-width:761px) and (max-width:1040px){.auth-shell{padding-inline:clamp(20px,4vw,48px)}.auth-shell__layout{grid-template-columns:minmax(220px,.8fr) minmax(340px,1fr);gap:clamp(24px,5vw,56px)}.auth-shell__brand h2{font-size:clamp(2.1rem,5vw,3.4rem)}}
@media (min-width:761px) and (max-height:760px){.auth-shell{place-items:start center;overflow-y:auto}.auth-shell__layout{margin-block:auto}.auth-shell__brand h2{font-size:clamp(2rem,5vh,3.4rem)}.auth-shell__mark{margin-bottom:16px}.auth-shell__tagline{margin-top:14px}.auth-shell__trust{margin-top:18px}}
@media (max-width:540px){.auth-shell{padding-inline:12px}.auth-shell__content{--auth-content-width:100%!important}.auth-shell__content :deep(.auth-card){border-radius:24px!important}.auth-shell__orb{opacity:.45}}
@media (orientation:landscape) and (max-height:540px){.auth-shell{place-items:start center;padding-block:12px}.auth-shell__layout{gap:10px}.auth-shell__brand{display:none}.auth-shell__content{max-width:min(520px,calc(100vw - 24px))}}
@media (max-width:760px) and (max-height:700px){.auth-shell{place-items:start center;padding-top:24px;padding-bottom:32px}}
@media(prefers-reduced-motion:reduce){.auth-shell__content{animation:none}}
</style>
