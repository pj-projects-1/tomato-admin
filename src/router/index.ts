import { createRouter, createWebHistory } from 'vue-router'
import { supabase, ensureValidSession } from '@/api/supabase'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/Login.vue'),
      meta: { requiresGuest: true },
    },
    {
      path: '/',
      component: () => import('@/views/Layout.vue'),
      meta: { requiresAuth: true },
      children: [
        {
          path: '',
          name: 'Dashboard',
          component: () => import('@/views/Dashboard.vue'),
        },
        {
          path: 'customers',
          name: 'Customers',
          component: () => import('@/views/Customers.vue'),
        },
        {
          path: 'orders',
          name: 'Orders',
          component: () => import('@/views/Orders.vue'),
        },
        {
          path: 'orders/:id',
          name: 'OrderDetail',
          component: () => import('@/views/OrderDetail.vue'),
        },
        {
          path: 'stocks',
          name: 'Stocks',
          component: () => import('@/views/Stocks.vue'),
        },
        {
          path: 'deliveries',
          name: 'Deliveries',
          component: () => import('@/views/Deliveries.vue'),
        },
        {
          path: 'deliveries/:id',
          name: 'DeliveryDetail',
          component: () => import('@/views/DeliveryDetail.vue'),
        },
      ],
    },
  ],
})

// Cache session status to avoid repeated calls
let lastSessionCheck = 0
let cachedSessionValid = false
const SESSION_CHECK_INTERVAL = 30000 // 30 seconds

/**
 * Wait for auth store to initialize with timeout
 */
function waitForAuthInit(timeoutMs = 3000): Promise<void> {
  return new Promise((resolve) => {
    const authStore = useAuthStore()
    if (authStore.initialized) {
      resolve()
      return
    }

    const startTime = Date.now()
    const checkInterval = 100

    const check = () => {
      if (authStore.initialized) {
        resolve()
        return
      }

      if (Date.now() - startTime > timeoutMs) {
        // Timeout reached - proceed anyway, auth will catch up
        resolve()
        return
      }

      setTimeout(check, checkInterval)
    }

    check()
  })
}

/**
 * Force update session cache - call this after successful login/registration
 * to ensure immediate navigation works without waiting for auth state change
 */
export function forceUpdateSessionCache(valid: boolean) {
  cachedSessionValid = valid
  lastSessionCheck = Date.now()
}

// Auth guard - simplified and more efficient
router.beforeEach(async (to, _from, next) => {
  const requiresAuth = to.meta.requiresAuth
  const requiresGuest = to.meta.requiresGuest

  // Skip auth check for public routes
  if (!requiresAuth && !requiresGuest) {
    next()
    return
  }

  // Wait for auth to initialize (with timeout)
  await waitForAuthInit()

  // Use cached result if recent
  const now = Date.now()
  if (now - lastSessionCheck < SESSION_CHECK_INTERVAL) {
    if (requiresAuth && !cachedSessionValid) {
      next({ name: 'Login', query: { redirect: to.fullPath } })
      return
    }
    if (requiresGuest && cachedSessionValid) {
      next({ name: 'Dashboard' })
      return
    }
    next()
    return
  }

  // Full session check with token refresh if needed
  const isValid = await ensureValidSession()
  lastSessionCheck = Date.now()
  cachedSessionValid = isValid

  if (requiresAuth && !isValid) {
    next({ name: 'Login', query: { redirect: to.fullPath } })
    return
  }

  if (requiresGuest && isValid) {
    next({ name: 'Dashboard' })
    return
  }

  next()
})

// Update session cache on auth changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' && session) {
    cachedSessionValid = true
    lastSessionCheck = Date.now()
  } else if (event === 'SIGNED_OUT') {
    cachedSessionValid = false
    lastSessionCheck = 0
  }
})

export default router
