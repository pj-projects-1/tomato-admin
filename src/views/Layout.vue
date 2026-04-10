<template>
  <el-container class="layout-container">
    <!-- Desktop Sidebar -->
    <el-aside v-if="!isMobile" :width="isCollapse ? '64px' : '220px'" class="sidebar">
      <div class="logo">
        <img src="/Logo.png" alt="四月红番天" class="logo-img" />
        <span v-show="!isCollapse" class="logo-text">四月红番天</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        router
        background-color="#3D2B1F"
        text-color="#D4C4B0"
        active-text-color="#C84B31"
      >
        <el-menu-item index="/">
          <el-icon><DataBoard /></el-icon>
          <template #title>仪表盘</template>
        </el-menu-item>
        <el-menu-item index="/customers">
          <el-icon><User /></el-icon>
          <template #title>客户管理</template>
        </el-menu-item>
        <el-menu-item index="/orders">
          <el-icon><Document /></el-icon>
          <template #title>订单管理</template>
        </el-menu-item>
        <el-menu-item index="/stocks">
          <el-icon><Box /></el-icon>
          <template #title>库存管理</template>
        </el-menu-item>
        <el-menu-item index="/deliveries">
          <el-icon><Van /></el-icon>
          <template #title>配送规划</template>
        </el-menu-item>
        <el-menu-item v-if="isAdmin" index="/users">
          <el-icon><Setting /></el-icon>
          <template #title>用户管理</template>
        </el-menu-item>
        <el-menu-item v-if="showInstallMenuItem" @click="handleInstallApp">
          <el-icon><Iphone /></el-icon>
          <template #title>{{ isAppInstalled ? '已安装' : '安装应用' }}</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- Mobile Drawer -->
    <el-drawer
      v-model="drawerVisible"
      direction="ltr"
      :with-header="false"
      size="220px"
      class="mobile-drawer"
    >
      <div class="sidebar drawer-sidebar">
        <div class="logo">
          <img src="/Logo.png" alt="四月红番天" class="logo-img" />
          <span class="logo-text">四月红番天</span>
        </div>
        <el-menu
          :default-active="activeMenu"
          router
          background-color="#3D2B1F"
          text-color="#D4C4B0"
          active-text-color="#C84B31"
          @select="drawerVisible = false"
        >
          <el-menu-item index="/">
            <el-icon><DataBoard /></el-icon>
            <template #title>仪表盘</template>
          </el-menu-item>
          <el-menu-item index="/customers">
            <el-icon><User /></el-icon>
            <template #title>客户管理</template>
          </el-menu-item>
          <el-menu-item index="/orders">
            <el-icon><Document /></el-icon>
            <template #title>订单管理</template>
          </el-menu-item>
          <el-menu-item index="/stocks">
            <el-icon><Box /></el-icon>
            <template #title>库存管理</template>
          </el-menu-item>
          <el-menu-item index="/deliveries">
            <el-icon><Van /></el-icon>
            <template #title>配送规划</template>
          </el-menu-item>
          <el-menu-item v-if="isAdmin" index="/users">
            <el-icon><Setting /></el-icon>
            <template #title>用户管理</template>
          </el-menu-item>
          <el-menu-item v-if="showInstallMenuItem" @click="handleInstallApp">
            <el-icon><Iphone /></el-icon>
            <template #title>{{ isAppInstalled ? '已安装' : '安装应用' }}</template>
          </el-menu-item>
        </el-menu>
      </div>
    </el-drawer>

    <el-container>
      <el-header class="header">
        <div class="header-left">
          <!-- Mobile hamburger menu -->
          <el-icon
            v-if="isMobile"
            class="hamburger-btn"
            @click="drawerVisible = true"
          >
            <Expand />
          </el-icon>
          <!-- Desktop collapse button -->
          <el-icon
            v-else
            class="collapse-btn"
            @click="isCollapse = !isCollapse"
          >
            <component :is="isCollapse ? 'Expand' : 'Fold'" />
          </el-icon>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-avatar :size="32" icon="UserFilled" />
              <span class="user-name">{{ userName }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item disabled>
                  <el-tag :type="isAdmin ? 'danger' : 'info'" size="small">
                    {{ isAdmin ? '管理员' : '员工' }}
                  </el-tag>
                </el-dropdown-item>
                <el-dropdown-item divided command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main-content">
        <router-view />
      </el-main>
    </el-container>

    <!-- PWA Install Banner -->
    <InstallBanner />

    <!-- Offline Indicator -->
    <Transition name="fade">
      <div v-if="isOffline" class="offline-indicator">
        <el-icon><WarningFilled /></el-icon>
        <span>网络已断开，部分功能受限</span>
      </div>
    </Transition>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessageBox, ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { usePWAInstall } from '@/composables/usePWAInstall'
import InstallBanner from '@/components/InstallBanner.vue'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

// PWA install
const {
  isInstalled: isAppInstalled,
  isIOS,
  install,
  openIOSGuide,
} = usePWAInstall()

const isCollapse = ref(false)
const isMobile = ref(false)
const drawerVisible = ref(false)
const isOffline = ref(false)

const MOBILE_BREAKPOINT = 768

function checkMobile() {
  isMobile.value = window.innerWidth < MOBILE_BREAKPOINT
  // Auto-collapse sidebar on tablet
  if (window.innerWidth < 1024 && window.innerWidth >= MOBILE_BREAKPOINT) {
    isCollapse.value = true
  }
}

// Offline detection
function updateOnlineStatus() {
  isOffline.value = !navigator.onLine
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // Offline detection
  updateOnlineStatus()
  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('online', updateOnlineStatus)
  window.removeEventListener('offline', updateOnlineStatus)
})

const activeMenu = computed(() => route.path)
const userName = computed(() => authStore.userName)
const isAdmin = computed(() => authStore.isAdmin)

// Show install menu item if not installed or is iOS
const showInstallMenuItem = computed(() => !isAppInstalled.value)
const iOSInstallGuideUrl = 'https://support.apple.com/zh-cn/guide/iphone/iph42ab2f3a7/ios'

/**
 * Handle install app from sidebar menu
 */
async function handleInstallApp() {
  // Close mobile drawer if open
  drawerVisible.value = false

  if (isIOS.value) {
    // iOS: open guide
    window.open(iOSInstallGuideUrl, '_blank', 'noopener,noreferrer')
  } else {
    // Try native install
    const success = await install()
    if (!success) {
      ElMessage.info('请使用浏览器菜单中的"添加到主屏幕"功能')
    }
  }
}

async function handleCommand(command: string) {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      })
      await authStore.signOut()
      router.push('/login')
    } catch (e: any) {
      if (e === 'cancel' || e === 'close') return
      console.error('Logout error:', e)
      ElMessage.error(e.message || '退出失败')
    }
  }
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.sidebar {
  background-color: #3D2B1F;
  transition: width 0.3s;
  overflow: hidden;
}

.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  border-bottom: 1px solid #4D3B2F;
  padding: 0 10px;
}

.logo-img {
  width: 36px;
  height: 36px;
  object-fit: contain;
  flex-shrink: 0;
}

.logo-text {
  white-space: nowrap;
  overflow: hidden;
}

.el-menu {
  border-right: none;
}

.header {
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 20px;
}

.header-left {
  display: flex;
  align-items: center;
}

.collapse-btn {
  font-size: 20px;
  cursor: pointer;
  color: var(--warm-gray);
}

.collapse-btn:hover {
  color: var(--tomato-red);
}

.header-right {
  display: flex;
  align-items: center;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.user-name {
  font-size: 14px;
  color: #303133;
}

.main-content {
  background-color: #f5f7fa;
  overflow-y: auto;
}

/* Mobile styles */
.hamburger-btn {
  font-size: 28px;
  cursor: pointer;
  color: var(--warm-gray);
  padding: 10px;
  min-width: 48px;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background-color 0.2s;
}

.hamburger-btn:hover {
  color: var(--tomato-red);
  background-color: rgba(200, 75, 49, 0.1);
}

.drawer-sidebar {
  height: 100vh;
}

/* Mobile drawer overrides */
:deep(.mobile-drawer .el-drawer__body) {
  padding: 0;
  background-color: #3D2B1F;
}

/* Mobile header adjustments */
@media (max-width: 767px) {
  .header {
    padding: 0 12px;
  }

  .user-name {
    display: none;
  }
}

/* Offline indicator */
.offline-indicator {
  position: fixed;
  top: 60px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--harvest-gold);
  color: #fff;
  padding: 8px 16px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  z-index: 2000;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.15);
}

/* Fade transition */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
