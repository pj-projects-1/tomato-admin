<template>
  <div class="login-container">
    <el-card class="login-card">
      <template #header>
        <div class="login-header">
          <img src="/Logo.png" alt="四月红番天" class="login-logo" />
          <h2>四月红番天</h2>
          <p>有机番茄销售管理系统</p>
        </div>
      </template>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-position="top"
        @submit.prevent="handleLogin"
      >
        <el-form-item label="用户名/邮箱" prop="identifier">
          <el-input
            v-model="form.identifier"
            placeholder="请输入用户名或邮箱"
            prefix-icon="User"
            size="large"
          />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
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
            登录
          </el-button>
        </el-form-item>

        <div style="text-align: center; margin-top: -12px; margin-bottom: 12px;">
          <el-button text type="primary" @click="showForgotPassword = true">
            忘记密码?
          </el-button>
        </div>
      </el-form>

      <el-divider>或</el-divider>

      <el-button
        text
        type="primary"
        @click="showRegister = true"
        style="width: 100%"
      >
        没有账号？点击注册
      </el-button>
    </el-card>

    <!-- Register Dialog -->
    <el-dialog
      v-model="showRegister"
      title="注册新账号"
      width="400px"
      class="register-dialog"
    >
      <el-form
        ref="registerFormRef"
        :model="registerForm"
        :rules="registerRules"
        label-position="top"
      >
        <el-form-item label="姓名" prop="name">
          <el-input v-model="registerForm.name" placeholder="请输入姓名" />
        </el-form-item>

        <el-form-item label="邮箱" prop="email">
          <el-input v-model="registerForm.email" placeholder="请输入邮箱" />
        </el-form-item>

        <el-form-item label="密码" prop="password">
          <el-input
            v-model="registerForm.password"
            type="password"
            placeholder="请输入密码（至少6位）"
            show-password
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRegister = false">取消</el-button>
        <el-button type="primary" :loading="registerLoading" @click="handleRegister">
          注册
        </el-button>
      </template>
    </el-dialog>

    <!-- Forgot Password Dialog -->
    <el-dialog
      v-model="showForgotPassword"
      title="重置密码"
      width="400px"
      class="register-dialog"
    >
      <el-form
        ref="forgotPasswordFormRef"
        :model="forgotPasswordForm"
        :rules="forgotPasswordRules"
        label-position="top"
      >
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="forgotPasswordForm.email" placeholder="请输入注册时使用的邮箱" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showForgotPassword = false">取消</el-button>
        <el-button type="primary" :loading="forgotPasswordLoading" @click="handleForgotPassword">
          发送重置邮件
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { forceUpdateSessionCache } from '@/router'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const registerFormRef = ref<FormInstance>()
const forgotPasswordFormRef = ref<FormInstance>()
const loading = ref(false)
const showRegister = ref(false)
const registerLoading = ref(false)
const showForgotPassword = ref(false)
const forgotPasswordLoading = ref(false)

const form = reactive({
  identifier: '',
  password: '',
})

const registerForm = reactive({
  name: '',
  email: '',
  password: '',
})

const forgotPasswordForm = reactive({
  email: '',
})

const rules: FormRules = {
  identifier: [
    { required: true, message: '请输入用户名或邮箱', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
  ],
}

const registerRules: FormRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少6位', trigger: 'blur' },
  ],
}

const forgotPasswordRules: FormRules = {
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' },
  ],
}

async function handleLogin() {
  const valid = await formRef.value?.validate()
  if (!valid) return

  loading.value = true
  try {
    const result = await authStore.signIn(form.identifier, form.password)
    if (result.success) {
      forceUpdateSessionCache(true)
      ElMessage.success('登录成功')
      const redirect = route.query.redirect as string
      router.push(redirect || '/')
    } else {
      ElMessage.error(result.error || '登录失败')
    }
  } catch (error) {
    ElMessage.error('登录失败，请重试')
  } finally {
    loading.value = false
  }
}

async function handleRegister() {
  const valid = await registerFormRef.value?.validate()
  if (!valid) return

  registerLoading.value = true
  try {
    const result = await authStore.signUp(
      registerForm.email,
      registerForm.password,
      registerForm.name
    )
    if (result.success) {
      ElMessage.success('注册成功！')
      showRegister.value = false
      // Auto-login after registration
      const loginResult = await authStore.signIn(registerForm.email, registerForm.password)
      if (loginResult.success) {
        forceUpdateSessionCache(true)
        router.push('/')
      }
    } else {
      ElMessage.error(result.error || '注册失败')
    }
  } catch (error) {
    ElMessage.error('注册失败，请重试')
  } finally {
    registerLoading.value = false
  }
}

async function handleForgotPassword() {
  const valid = await forgotPasswordFormRef.value?.validate()
  if (!valid) return

  forgotPasswordLoading.value = true
  try {
    const result = await authStore.sendPasswordResetEmail(forgotPasswordForm.email)
    if (result.success) {
      ElMessage.success('重置邮件已发送，请查收邮箱')
      showForgotPassword.value = false
      forgotPasswordForm.email = ''
    } else {
      ElMessage.error(result.error || '发送失败')
    }
  } catch (error) {
    ElMessage.error('发送失败，请重试')
  } finally {
    forgotPasswordLoading.value = false
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  padding: 16px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  border-radius: 12px;
}

.login-header {
  text-align: center;
}

.login-logo {
  width: 80px;
  height: 80px;
  object-fit: contain;
  margin-bottom: 12px;
}

.login-header h2 {
  margin: 0 0 4px 0;
  color: #303133;
  font-size: 24px;
}

.login-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

/* Mobile styles */
@media (max-width: 480px) {
  .login-container {
    padding: 12px;
  }

  .login-card {
    border-radius: 8px;
  }

  .login-logo {
    width: 64px;
    height: 64px;
  }

  .login-header h2 {
    font-size: 20px;
  }

  .login-header p {
    font-size: 12px;
  }
}

/* Register dialog mobile styles */
@media (max-width: 480px) {
  .register-dialog :deep(.el-dialog) {
    width: 90% !important;
    margin: 10vh auto !important;
  }

  .register-dialog :deep(.el-dialog__body) {
    padding: 16px;
  }
}
</style>
