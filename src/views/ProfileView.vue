<template>
  <div>
    <h1 class="text-h5 font-weight-bold mb-6">个人资料</h1>

    <v-row>
      <v-col cols="12" md="4">
        <v-card rounded="lg" border flat class="pa-6 text-center">
          <v-avatar size="120" color="primary" class="mb-4">
            <v-img v-if="avatarUrl" :src="avatarUrl" cover />
            <span v-else class="text-h3 text-white">{{ initial }}</span>
          </v-avatar>
          <div class="text-h6 font-weight-bold">{{ user?.nickname || user?.username }}</div>
          <div class="text-body-2 text-medium-emphasis mb-4">{{ user?.email || '未绑定邮箱' }}</div>
          <div class="d-flex justify-center align-center ga-1 mb-3 text-body-2"><v-icon icon="mdi-domain" size="18" />{{ user?.orgName || '未分配组织' }}</div>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            hidden
            @change="onAvatarSelected"
          />
          <v-btn color="primary" variant="tonal" prepend-icon="mdi-camera" class="mt-2"
            @click="$refs.fileInput.click()">
            更换头像
          </v-btn>
        </v-card>
      </v-col>

      <v-col cols="12" md="8">
        <v-card rounded="lg" border flat class="mb-4">
          <v-card-title class="text-subtitle-1 font-weight-bold">用户名</v-card-title>
          <v-divider />
          <v-card-text>
            <div class="d-flex align-center">
              <v-text-field v-model="usernameInput" label="用户名" variant="outlined"
                prepend-inner-icon="mdi-account-edit-outline" :rules="usernameRules"
                hide-details="auto" class="mr-3" @keyup.enter="saveUsername" />
              <v-btn color="primary" :loading="savingUsername" @click="saveUsername">保存</v-btn>
            </div>
            <div class="text-caption text-medium-emphasis mt-2">用于登录；修改后会自动更新当前登录会话。</div>
          </v-card-text>
        </v-card>
        <v-card rounded="lg" border flat>
          <v-card-title class="text-subtitle-1 font-weight-bold">基本信息</v-card-title>
          <v-divider />
          <v-card-text>
            <v-form ref="formRef" @submit.prevent="save">
              <v-row>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="form.nickname" label="昵称" variant="outlined" prepend-inner-icon="mdi-account-outline" />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="form.email" label="邮箱" variant="outlined" prepend-inner-icon="mdi-email-outline" :rules="emailRules" />
                </v-col>
                <v-col v-if="form.email && (!user?.emailVerified || form.email !== user?.email)" cols="12">
                  <div class="text-caption mb-2">此邮箱尚未验证，连接的应用会收到未验证状态。</div>
                  <div class="d-flex align-center ga-3">
                    <v-text-field v-model="emailCode" label="邮箱验证码" variant="outlined" hide-details maxlength="6" />
                    <v-btn :loading="sendingEmailCode" @click="sendEmailCode">发送验证码</v-btn>
                  </div>
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field v-model="form.phone" label="手机号" variant="outlined" prepend-inner-icon="mdi-phone-outline" />
                </v-col>
                <v-col cols="12" sm="6">
                  <v-text-field :model-value="user?.orgName || '未分配组织'" label="所属组织" variant="outlined" prepend-inner-icon="mdi-office-building-outline" readonly hint="由管理员分配，如需调整请联系管理员" persistent-hint />
                </v-col>
              </v-row>
              <v-btn type="submit" color="primary" :loading="saving" class="mt-2">保存修改</v-btn>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <v-dialog v-model="cropDialog" max-width="520" persistent>
      <v-card rounded="xl">
        <v-card-title class="text-subtitle-1 font-weight-bold pt-4">裁剪头像</v-card-title>
        <v-divider />
        <v-card-text>
          <div ref="cropViewport" class="crop-viewport" @pointerdown="startDrag" @pointermove="drag" @pointerup="endDrag" @pointercancel="endDrag">
            <img v-if="cropUrl" ref="cropImage" :src="cropUrl" alt="头像裁剪预览" draggable="false" :style="cropImageStyle" @load="onCropImageLoad" />
            <div class="crop-mask" aria-hidden="true" />
          </div>
          <div class="text-caption text-medium-emphasis mt-3">拖动图片调整位置，滑动缩放后将自动裁成正方形。</div>
          <v-slider v-model="cropZoom" :min="1" :max="3" :step="0.01" color="primary" prepend-icon="mdi-magnify-minus-outline" append-icon="mdi-magnify-plus-outline" hide-details class="mt-2" />
          <v-btn-toggle v-model="cropSize" mandatory color="primary" variant="outlined" divided class="mt-4" density="comfortable">
            <v-btn :value="512">512</v-btn><v-btn :value="648">648</v-btn><v-btn :value="1024">1024</v-btn>
          </v-btn-toggle>
        </v-card-text>
        <v-card-actions class="px-4 pb-4"><v-spacer /><v-btn variant="text" :disabled="avatarUploading" @click="closeCrop">取消</v-btn><v-btn color="primary" :loading="avatarUploading" @click="confirmCrop">裁剪并上传</v-btn></v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useUiStore } from '@/stores/ui'
import { userApi } from '@/api/modules/account'
import { fileApi } from '@/api/modules/admin'
import { resolveAssetUrl } from '@/utils/url'
import http from '@/api/http'

const auth = useAuthStore()
const ui = useUiStore()
const { user } = storeToRefs(auth)

const emailCode = ref('')
const sendingEmailCode = ref(false)
const form = reactive({ nickname: '', email: '', phone: '', orgName: '' })
const saving = ref(false)
const fileInput = ref(null)
const formRef = ref(null)
const usernameInput = ref('')
const savingUsername = ref(false)
const cropDialog = ref(false)
const cropUrl = ref('')
const cropFile = ref(null)
const cropImage = ref(null)
const cropViewport = ref(null)
const cropZoom = ref(1)
const cropSize = ref(648)
const cropOffset = reactive({ x: 0, y: 0 })
const cropNatural = reactive({ width: 1, height: 1 })
const avatarUploading = ref(false)
let dragState = null

const usernameRules = [
  (v) => !!v || '请输入用户名',
  (v) => (v || '').length >= 3 && (v || '').length <= 50 || '用户名需 3-50 个字符',
]

const emailRules = [(v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || '邮箱格式不正确']
const initial = computed(() => (user.value?.username || '?').charAt(0).toUpperCase())
const avatarUrl = computed(() => resolveAssetUrl(user.value?.avatar))

function hydrate() {
  if (!user.value) return
  form.nickname = user.value.nickname || ''
  form.email = user.value.email || ''
  form.phone = user.value.phone || ''
  form.orgName = user.value.orgName || ''
  usernameInput.value = user.value?.username || ''
}

async function saveUsername() {
  const username = usernameInput.value?.trim() || ''
  if (username.length < 3 || username.length > 50) { ui.error('用户名需 3-50 个字符'); return }
  if (/\s/.test(username)) { ui.error('用户名不能包含空格'); return }
  savingUsername.value = true
  try {
    const res = await userApi.changeUsername({ username })
    auth.setToken(res.token)
    await auth.fetchProfile()
    ui.success('用户名已更新')
  } catch (e) {
    ui.error(e?.message || '修改失败')
  } finally {
    savingUsername.value = false
  }
}

async function sendEmailCode() {
  if (!form.email || emailRules[0](form.email) !== true) { ui.error('请填写有效邮箱'); return }
  sendingEmailCode.value = true
  try { await http.post('/auth/send-verification-code', { email: form.email.trim() }); ui.success('验证码已发送') }
  catch (e) { ui.error(e?.message || '发送失败') }
  finally { sendingEmailCode.value = false }
}

async function save() {
  const { valid } = await formRef.value.validate()
  if (!valid) return
  saving.value = true
  try {
    await userApi.updateProfile({ nickname: form.nickname, email: form.email, phone: form.phone, verificationCode: emailCode.value || undefined })
    emailCode.value = ''
    await auth.fetchProfile()
    ui.success('资料已更新')
  } catch (e) {
    ui.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const cropImageStyle = computed(() => ({
  transform: `translate(calc(-50% + ${cropOffset.x}px), calc(-50% + ${cropOffset.y}px)) scale(${cropZoom.value})`,
}))

function cleanupCropUrl() {
  if (cropUrl.value) URL.revokeObjectURL(cropUrl.value)
  cropUrl.value = ''
  cropFile.value = null
  if (fileInput.value) fileInput.value.value = ''
}
function closeCrop() { cropDialog.value = false; cleanupCropUrl() }
function onAvatarSelected(e) {
  const file = e.target?.files?.[0]
  if (!file) return
  if (!/^image\/(jpeg|png|gif|webp)$/i.test(file.type)) { ui.error('请选择 JPG、PNG、GIF 或 WebP 图片'); cleanupCropUrl(); return }
  cropFile.value = file
  cropUrl.value = URL.createObjectURL(file)
  cropZoom.value = 1
  cropOffset.x = 0; cropOffset.y = 0
  cropDialog.value = true
}
function onCropImageLoad() {
  cropNatural.width = cropImage.value?.naturalWidth || 1
  cropNatural.height = cropImage.value?.naturalHeight || 1
}
function startDrag(e) { if (!cropImage.value) return; dragState = { x: e.clientX, y: e.clientY, ox: cropOffset.x, oy: cropOffset.y }; e.currentTarget.setPointerCapture?.(e.pointerId) }
function drag(e) { if (!dragState) return; cropOffset.x = dragState.ox + e.clientX - dragState.x; cropOffset.y = dragState.oy + e.clientY - dragState.y }
function endDrag() { dragState = null }
async function canvasBlob(canvas, quality = .88) { return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality)) }
async function confirmCrop() {
  if (!cropImage.value || avatarUploading.value) return
  avatarUploading.value = true
  try {
    const viewport = cropViewport.value.getBoundingClientRect()
    const vw = viewport.width
    const vh = viewport.height
    const baseScale = Math.max(vw / cropNatural.width, vh / cropNatural.height)
    const renderedScale = baseScale * cropZoom.value
    const sourceSize = Math.min(vw, vh) / renderedScale
    const centerX = cropNatural.width / 2 - cropOffset.x / renderedScale
    const centerY = cropNatural.height / 2 - cropOffset.y / renderedScale
    const sx = Math.max(0, Math.min(cropNatural.width - sourceSize, centerX - sourceSize / 2))
    const sy = Math.max(0, Math.min(cropNatural.height - sourceSize, centerY - sourceSize / 2))
    const canvas = document.createElement('canvas')
    canvas.width = cropSize.value; canvas.height = cropSize.value
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(cropImage.value, sx, sy, sourceSize, sourceSize, 0, 0, canvas.width, canvas.height)
    let blob = await canvasBlob(canvas, .88)
    if (!blob) throw new Error('图片处理失败')
    if (blob.size > 5 * 1024 * 1024) blob = await canvasBlob(canvas, .72)
    const fd = new FormData()
    fd.append('file', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
    await fileApi.uploadAvatar(fd)
    await auth.fetchProfile()
    ui.success('头像已裁剪并更新')
    cropDialog.value = false
    cleanupCropUrl()
  } catch (e) {
    ui.error(e?.message || '头像处理或上传失败')
  } finally { avatarUploading.value = false }
}

onMounted(hydrate)
onUnmounted(cleanupCropUrl)
</script>

<style scoped>
.crop-viewport{position:relative;width:min(320px,78vw);aspect-ratio:1;margin-inline:auto;overflow:hidden;border-radius:28px;background:#E3EFF7;touch-action:none;cursor:grab;user-select:none}.crop-viewport:active{cursor:grabbing}.crop-viewport img{position:absolute;left:50%;top:50%;width:100%;height:100%;object-fit:cover;max-width:none;will-change:transform;pointer-events:none}.crop-mask{position:absolute;inset:0;border:2px solid rgba(var(--v-theme-primary),.75);border-radius:28px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.7);pointer-events:none}
</style>
