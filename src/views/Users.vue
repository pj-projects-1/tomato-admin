<template>
  <div class="page-container" ref="pageContainerRef">
    <!-- Pull to refresh indicator -->
    <PullRefreshIndicator
      :pull-distance="pullDistance"
      :is-refreshing="isRefreshing"
      :threshold="THRESHOLD"
    />

    <div class="page-header">
      <h1 class="page-title">用户管理</h1>
      <div class="header-actions">
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          创建用户
        </el-button>
      </div>
    </div>

    <!-- User List -->
    <el-card shadow="never">
      <!-- Desktop: Table view -->
      <el-table
        :data="users"
        v-loading="loading"
        style="width: 100%"
        class="desktop-table"
      >
        <el-table-column prop="name" label="姓名" min-width="100">
          <template #default="{ row }">
            <div class="name-cell">
              <span>{{ row.name }}</span>
              <el-button
                v-if="row.id !== authStore.user?.id"
                link
                type="primary"
                size="small"
                @click="showEditNameDialog(row)"
              >
                编辑
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="email" label="邮箱" min-width="180" />
        <el-table-column prop="role" label="角色" width="140">
          <template #default="{ row }">
            <div class="role-cell">
              <el-tag :type="row.role === 'admin' ? 'danger' : 'info'" size="small">
                {{ row.role === 'admin' ? '管理员' : '员工' }}
              </el-tag>
              <el-select
                v-if="row.id !== authStore.user?.id"
                v-model="row.role"
                size="small"
                style="width: 80px; margin-left: 8px;"
                @change="(val: 'admin' | 'staff') => handleRoleChange(row, val)"
              >
                <el-option label="管理员" value="admin" />
                <el-option label="员工" value="staff" />
              </el-select>
              <el-tooltip
                v-if="row.id === authStore.user?.id"
                content="无法修改自己的角色"
                placement="top"
              >
                <el-icon class="lock-icon"><Lock /></el-icon>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="120">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120">
          <template #default="{ row }">
            <el-button
              link
              type="primary"
              @click="handleResetPassword(row)"
              :disabled="resettingPassword === row.id"
            >
              {{ resettingPassword === row.id ? '发送中...' : '重置密码' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- Mobile: Card view -->
      <div class="mobile-card-list" v-loading="loading">
        <div v-if="users.length > 0" class="mobile-count-indicator">
          共 {{ users.length }} 个用户
        </div>

        <div
          v-for="user in users"
          :key="user.id"
          class="user-mobile-card"
        >
          <div class="card-header-row">
            <span class="user-name">{{ user.name }}</span>
            <el-tag :type="user.role === 'admin' ? 'danger' : 'info'" size="small">
              {{ user.role === 'admin' ? '管理员' : '员工' }}
            </el-tag>
          </div>
          <div class="card-info-row">
            <span>{{ user.email }}</span>
          </div>
          <div class="card-footer">
            <span class="created-time">创建于 {{ formatDate(user.created_at) }}</span>
          </div>
          <div class="card-actions">
            <el-button
              size="small"
              @click="showEditNameDialog(user)"
              :disabled="user.id === authStore.user?.id"
            >
              编辑姓名
            </el-button>
            <el-button
              size="small"
              @click="showRoleChangeDialog(user)"
              :disabled="user.id === authStore.user?.id"
            >
              修改角色
            </el-button>
            <el-button
              size="small"
              type="warning"
              @click="handleResetPassword(user)"
              :loading="resettingPassword === user.id"
            >
              重置密码
            </el-button>
          </div>
        </div>

        <el-empty v-if="users.length === 0 && !loading" description="暂无用户" />
      </div>
    </el-card>

    <!-- Create User Dialog -->
    <el-dialog
      v-model="createDialogVisible"
      title="创建用户"
      width="500px"
      destroy-on-close
    >
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="80px"
      >
        <el-form-item label="姓名" prop="name">
          <el-input v-model="createForm.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="createForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="createForm.password"
            type="password"
            placeholder="请输入密码"
            show-password
          />
        </el-form-item>
        <el-form-item label="角色" prop="role">
          <el-select v-model="createForm.role" style="width: 100%">
            <el-option label="管理员" value="admin" />
            <el-option label="员工" value="staff" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="creating"
          @click="handleCreateUser"
        >
          创建
        </el-button>
      </template>
    </el-dialog>

    <!-- Edit Name Dialog -->
    <el-dialog
      v-model="editNameDialogVisible"
      title="编辑姓名"
      width="400px"
      destroy-on-close
    >
      <el-form
        ref="editNameFormRef"
        :model="editNameForm"
        :rules="editNameRules"
        label-width="60px"
      >
        <el-form-item label="姓名" prop="name">
          <el-input v-model="editNameForm.name" placeholder="请输入姓名" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editNameDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="updatingName"
          @click="handleUpdateName"
        >
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- Role Change Warning Dialog -->
    <el-dialog
      v-model="roleChangeDialogVisible"
      title="修改角色"
      width="400px"
      destroy-on-close
    >
      <div class="role-change-content">
        <p>确定要将用户 <strong>{{ roleChangeUser?.name }}</strong> 的角色修改为:</p>
        <el-select v-model="pendingRole" style="width: 100%; margin-top: 12px;">
          <el-option label="管理员" value="admin" />
          <el-option label="员工" value="staff" />
        </el-select>
        <el-alert
          v-if="pendingRole === 'staff' && roleChangeUser?.role === 'admin'"
          type="warning"
          title="警告：降级管理员权限"
          description="此操作将移除该用户的管理员权限，用户将无法访问管理功能。"
          show-icon
          :closable="false"
          style="margin-top: 12px;"
        />
      </div>
      <template #footer>
        <el-button @click="roleChangeDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="updatingRole"
          @click="confirmRoleChange"
        >
          确认修改
        </el-button>
      </template>
    </el-dialog>

    <!-- Reset Password Confirmation Dialog -->
    <el-dialog
      v-model="resetPasswordDialogVisible"
      title="重置密码"
      width="400px"
      destroy-on-close
    >
      <div class="reset-password-content">
        <el-icon class="warning-icon"><WarningFilled /></el-icon>
        <p>确定要为用户 <strong>{{ resetPasswordUser?.name }}</strong> 发送密码重置邮件吗？</p>
        <p class="email-hint">重置邮件将发送至: {{ resetPasswordUser?.email }}</p>
      </div>
      <template #footer>
        <el-button @click="resetPasswordDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="resettingPassword === resetPasswordUser?.id"
          @click="confirmResetPassword"
        >
          发送重置邮件
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { Plus, Lock, WarningFilled } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { supabase } from '@/api/supabase'
import { useAuthStore } from '@/stores/auth'
import { usePullRefresh } from '@/composables/usePullRefresh'
import PullRefreshIndicator from '@/components/PullRefreshIndicator.vue'
import type { Profile } from '@/types'

const authStore = useAuthStore()

// Pull to refresh setup
const pageContainerRef = ref<HTMLElement | null>(null)
const {
  isRefreshing,
  pullDistance,
  setupListeners,
  cleanupListeners,
  THRESHOLD,
} = usePullRefresh(async () => {
  await fetchUsers()
})

// State
const loading = ref(false)
const users = ref<Profile[]>([])
const resettingPassword = ref<string | null>(null)

// Create user dialog
const createDialogVisible = ref(false)
const creating = ref(false)
const createFormRef = ref<FormInstance>()
const createForm = reactive({
  name: '',
  email: '',
  password: '',
  role: 'staff' as 'admin' | 'staff',
})

const createRules: FormRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度应为2-20个字符', trigger: 'blur' },
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入有效的邮箱地址', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' },
  ],
  role: [
    { required: true, message: '请选择角色', trigger: 'change' },
  ],
}

// Edit name dialog
const editNameDialogVisible = ref(false)
const updatingName = ref(false)
const editNameFormRef = ref<FormInstance>()
const editNameForm = reactive({
  name: '',
})
const editingUserId = ref<string | null>(null)

const editNameRules: FormRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度应为2-20个字符', trigger: 'blur' },
  ],
}

// Role change dialog
const roleChangeDialogVisible = ref(false)
const updatingRole = ref(false)
const roleChangeUser = ref<Profile | null>(null)
const pendingRole = ref<'admin' | 'staff'>('staff')

// Reset password dialog
const resetPasswordDialogVisible = ref(false)
const resetPasswordUser = ref<Profile | null>(null)

onMounted(() => {
  fetchUsers()
  // Setup pull-to-refresh listeners
  if (pageContainerRef.value) {
    setupListeners(pageContainerRef.value)
  }
})

onUnmounted(() => {
  cleanupListeners()
})

async function fetchUsers() {
  loading.value = true
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    users.value = data as Profile[]
  } catch (error) {
    console.error('Failed to fetch users:', error)
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

function formatDate(date: string) {
  return dayjs(date).format('YYYY-MM-DD')
}

// Create user
function showCreateDialog() {
  Object.assign(createForm, {
    name: '',
    email: '',
    password: '',
    role: 'staff',
  })
  createDialogVisible.value = true
}

async function handleCreateUser() {
  const valid = await createFormRef.value?.validate()
  if (!valid) return

  creating.value = true
  try {
    // Use authStore.signUp to create user
    const result = await authStore.signUp(
      createForm.email,
      createForm.password,
      createForm.name
    )

    if (!result.success) {
      ElMessage.error(result.error || '创建用户失败')
      return
    }

    // Update role if not staff (default)
    if (createForm.role === 'admin' && result.user) {
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: 'admin' })
        .eq('id', result.user.id)

      if (roleError) {
        console.error('Failed to update role:', roleError)
        ElMessage.warning('用户已创建，但角色更新失败')
      }
    }

    ElMessage.success('用户创建成功')
    createDialogVisible.value = false
    await fetchUsers()
  } catch (error) {
    console.error('Create user error:', error)
    ElMessage.error('创建用户失败')
  } finally {
    creating.value = false
  }
}

// Edit name
function showEditNameDialog(user: Profile) {
  if (user.id === authStore.user?.id) {
    ElMessage.warning('无法通过此页面修改自己的姓名')
    return
  }
  editingUserId.value = user.id
  editNameForm.name = user.name
  editNameDialogVisible.value = true
}

async function handleUpdateName() {
  const valid = await editNameFormRef.value?.validate()
  if (!valid || !editingUserId.value) return

  updatingName.value = true
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ name: editNameForm.name.trim() })
      .eq('id', editingUserId.value)

    if (error) throw error

    // Update local state
    const userIndex = users.value.findIndex(u => u.id === editingUserId.value)
    if (userIndex !== -1 && users.value[userIndex]) {
      users.value[userIndex].name = editNameForm.name.trim()
    }

    ElMessage.success('姓名更新成功')
    editNameDialogVisible.value = false
  } catch (error) {
    console.error('Update name error:', error)
    ElMessage.error('更新姓名失败')
  } finally {
    updatingName.value = false
  }
}

// Role change
function showRoleChangeDialog(user: Profile) {
  if (user.id === authStore.user?.id) {
    ElMessage.warning('无法修改自己的角色')
    return
  }
  roleChangeUser.value = user
  pendingRole.value = user.role
  roleChangeDialogVisible.value = true
}

async function handleRoleChange(user: Profile, newRole: 'admin' | 'staff') {
  if (user.id === authStore.user?.id) {
    ElMessage.warning('无法修改自己的角色')
    // Revert the change
    const userIndex = users.value.findIndex(u => u.id === user.id)
    if (userIndex !== -1 && users.value[userIndex]) {
      users.value[userIndex].role = user.role
    }
    return
  }

  // Show confirmation for demoting admin
  if (user.role === 'admin' && newRole === 'staff') {
    showRoleChangeDialog(user)
    return
  }

  // Direct update for promotion
  await updateRole(user.id, newRole)
}

async function confirmRoleChange() {
  if (!roleChangeUser.value) return

  await updateRole(roleChangeUser.value.id, pendingRole.value)
  roleChangeDialogVisible.value = false
}

async function updateRole(userId: string, newRole: 'admin' | 'staff') {
  updatingRole.value = true
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (error) throw error

    // Update local state
    const userIndex = users.value.findIndex(u => u.id === userId)
    if (userIndex !== -1 && users.value[userIndex]) {
      users.value[userIndex].role = newRole
    }

    ElMessage.success('角色更新成功')
  } catch (error) {
    console.error('Update role error:', error)
    ElMessage.error('更新角色失败')
    // Refresh to get correct state
    await fetchUsers()
  } finally {
    updatingRole.value = false
  }
}

// Reset password
function handleResetPassword(user: Profile) {
  resetPasswordUser.value = user
  resetPasswordDialogVisible.value = true
}

async function confirmResetPassword() {
  if (!resetPasswordUser.value) return

  resettingPassword.value = resetPasswordUser.value.id
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(
      resetPasswordUser.value.email,
      {
        redirectTo: `${window.location.origin}/reset-password`,
      }
    )

    if (error) throw error

    ElMessage.success('密码重置邮件已发送')
    resetPasswordDialogVisible.value = false
  } catch (error) {
    console.error('Reset password error:', error)
    ElMessage.error('发送重置邮件失败')
  } finally {
    resettingPassword.value = null
  }
}
</script>

<style scoped>
.page-container {
  position: relative;
  min-height: 100%;
}

.name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-cell {
  display: flex;
  align-items: center;
}

.lock-icon {
  margin-left: 8px;
  color: #909399;
  cursor: not-allowed;
}

/* Mobile card list - hidden on desktop */
.mobile-card-list {
  display: none;
}

/* Mobile responsive styles */
@media (max-width: 767px) {
  /* Hide desktop table */
  .desktop-table {
    display: none !important;
  }

  .mobile-card-list {
    display: flex;
    flex-direction: column;
    min-height: 300px;
  }

  .mobile-count-indicator {
    text-align: center;
    padding: 8px;
    font-size: 13px;
    color: #909399;
    background: #f5f7fa;
    border-radius: 4px;
    margin-bottom: 8px;
  }

  /* Mobile card styles */
  .user-mobile-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    margin-bottom: 8px;
    background: #fff;
    border: 1px solid #e4e7ed;
    border-radius: 8px;
  }

  .user-mobile-card .card-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }

  .user-mobile-card .user-name {
    font-weight: 500;
    font-size: 15px;
    flex: 1;
  }

  .user-mobile-card .card-info-row {
    font-size: 13px;
    color: #606266;
  }

  .user-mobile-card .card-footer .created-time {
    font-size: 12px;
    color: #909399;
  }

  .user-mobile-card .card-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid #ebeef5;
  }

  :deep(.el-card__body) {
    padding: 8px;
  }

  /* Dialog responsive */
  :deep(.el-dialog) {
    width: 95% !important;
    margin: 5vh auto !important;
  }

  :deep(.el-dialog__body) {
    padding: 16px;
    max-height: 70vh;
    overflow-y: auto;
  }

  :deep(.el-dialog .el-form-item__label) {
    float: none;
    text-align: left;
    padding-bottom: 4px;
    width: 80px !important;
  }

  :deep(.el-dialog .el-form-item__content) {
    margin-left: 0 !important;
  }
}

/* Role change and reset password dialog styles */
.role-change-content,
.reset-password-content {
  text-align: center;
  padding: 16px 0;
}

.role-change-content p,
.reset-password-content p {
  margin: 0;
  line-height: 1.6;
}

.reset-password-content .warning-icon {
  font-size: 48px;
  color: #e6a23c;
  margin-bottom: 16px;
}

.reset-password-content .email-hint {
  color: #909399;
  font-size: 13px;
  margin-top: 8px;
}
</style>
