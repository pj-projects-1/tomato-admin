<template>
  <div class="reset-password-container">
    <el-card class="reset-password-card">
      <template #header>
        <div class="reset-password-header">
          <img src="/Logo.png" alt="四月红番天" class="reset-password-logo" />
          <h2>重置密码</h2>
          <p>请输入您的新密码</p>
        </div>
      </template>

      <!-- Error state - no valid session -->
      <div v-if="sessionError" class="session-error">
        <el-result
          icon="error"
          title="链接无效"
          sub-title="此密码重置链接已过期或无效，请重新申请密码重置。"
        >
          <template #extra>
            <el-button type="primary" @click="goToLogin">
              返回登录
            </el-button>
          </template>
        </el-result>
      </div>

      <!-- Success state -->
      <div v-else-if="resetSuccess" class="reset-success">
        <el-result
          icon="success"
          title="密码已重置"
          sub-title="您的密码已成功重置，即将跳转到首页..."
        />
      </div>

      <!-- Form state -->
      <el-form
        v-else
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleSubmit"
      >
        <el-form-item label="姓名（可选）" prop="name">
          <el-input
            v-model="form.name"
            placeholder="请输入姓名"
            prefix-icon="User"
            size="large"
          />
        </el-form-item>

        <el-form-item label="新密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入新密码（至少6位）"
            prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>

        <el-form-item label="确认密码" prop="confirmPassword">
          <el-input
            v-model="form.confirmPassword"
            type="password"
            placeholder="请再次输入新密码"
            prefix-icon="Lock"
            size="large"
            show-password
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            native-type="submit"
            :loading="loading"
            size="large"
            style="width: 100%"
          >
            确认重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { forceUpdateSessionCache } from '@/router'

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const loading = ref(false)
const sessionError = ref(false)
const resetSuccess = ref(false)
const originalName = ref('')

const form = reactive({
  name: '',
  password: '',
  confirmPassword: '',
})

// Password match validator
const validateConfirmPassword = (_rule: unknown, value: string, callback: (error?: Error) => void) => {
  if (value !== form.password) {
    callback(new Error('两次输入的密码不一致'))
  } else {
    callback()
  }
}

const rules: FormRules = {
  name: [
    { max: 50, message: '姓名不能超过50个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    { validator: validateConfirmPassword, trigger: 'blur' },
  ],
}

// Check for valid session on mount
onMounted(async () => {
  // Wait for auth store to initialize
  if (!authStore.initialized) {
    await authStore.initialize()
  }

  // Check if there's a valid session from the magic link
  const isValid = !!authStore.session && !!authStore.user

  if (!isValid) {
    sessionError.value = true
    return
  }

  // Pre-fill name from profile if available
  if (authStore.profile?.name) {
    form.name = authStore.profile.name
    originalName.value = authStore.profile.name
  }
})

async function handleSubmit() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  loading.value = true
  try {
    // Update password
    const passwordResult = await authStore.updateUserPassword(form.password)
    if (!passwordResult.success) {
      ElMessage.error(passwordResult.error || '密码重置失败')
      return
    }

    // Update name if changed
    if (form.name.trim() && form.name.trim() !== originalName.value) {
      const nameResult = await authStore.updateUserName(form.name.trim())
      if (!nameResult.success) {
        // Don't fail the whole process, just show a warning
        console.warn('Failed to update name:', nameResult.error)
      }
    }

    // Show success
    resetSuccess.value = true
    forceUpdateSessionCache(true)
    ElMessage.success('密码已重置')

    // Redirect to home after a short delay
    setTimeout(() => {
      router.push('/')
    }, 2000)
  } catch (error) {
    ElMessage.error('密码重置失败，请重试')
  } finally {
    loading.value = false
  }
}

function goToLogin() {
  router.push('/login')
}
</script>

<style scoped>
.reset-password-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  padding: 16px;
}

.reset-password-card {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
}

.reset-password-header {
  text-align: center;
}

.reset-password-logo {
  width: 80px;
  height: 80px;
  object-fit: contain;
  margin-bottom: 12px;
}

.reset-password-header h2 {
  margin: 0 0 4px 0;
  color: #303133;
  font-size: 24px;
}

.reset-password-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.session-error,
.reset-success {
  padding: 0;
}

.session-error :deep(.el-result__title),
.reset-success :deep(.el-result__title) {
  margin-top: 0;
}

/* Mobile styles */
@media (max-width: 480px) {
  .reset-password-container {
    padding: 12px;
  }

  .reset-password-card {
    border-radius: 8px;
  }

  .reset-password-logo {
    width: 64px;
    height: 64px;
  }

  .reset-password-header h2 {
    font-size: 20px;
  }

  .reset-password-header p {
    font-size: 12px;
  }
}
</style>
