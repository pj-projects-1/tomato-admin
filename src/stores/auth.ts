import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase, getProfile } from '@/api/supabase'
import { setErrorMonitoringUser } from '@/lib/errorMonitoring'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const profile = ref<Profile | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(false)
  const initialized = ref(false)

  const isAuthenticated = computed(() => !!user.value)
  const isAdmin = computed(() => profile.value?.role === 'admin')
  const userName = computed(() => profile.value?.name || user.value?.email || 'Unknown')

  async function initialize() {
    if (initialized.value) return

    loading.value = true
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession()
      if (currentSession) {
        session.value = currentSession
        user.value = currentSession.user
        try {
          profile.value = await getProfile(currentSession.user.id)
          // Set user context for error monitoring
          setErrorMonitoringUser({
            id: currentSession.user.id,
            email: currentSession.user.email,
            name: profile.value?.name,
          })
        } catch (error) {
          console.error('Failed to load profile:', error)
          // Continue without profile - user can still access basic features
        }
      }

      // Listen for auth changes
      supabase.auth.onAuthStateChange(async (event, newSession) => {
        session.value = newSession
        user.value = newSession?.user ?? null

        if (event === 'SIGNED_IN' && newSession) {
          try {
            profile.value = await getProfile(newSession.user.id)
            // Set user context for error monitoring
            setErrorMonitoringUser({
              id: newSession.user.id,
              email: newSession.user.email,
              name: profile.value?.name,
            })
          } catch (error) {
            console.error('Failed to load profile after sign in:', error)
          }
        } else if (event === 'SIGNED_OUT') {
          profile.value = null
          user.value = null
          session.value = null
          // Clear user context in error monitoring
          setErrorMonitoringUser(null)
        } else if (event === 'TOKEN_REFRESHED') {
          // Session already updated above
        }
      })

      initialized.value = true
    } catch (error) {
      console.error('Auth initialization error:', error)
    } finally {
      loading.value = false
    }
  }

  /**
   * Check if input is an email address
   */
  function isEmail(input: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)
  }

  /**
   * Look up email by username from profiles table
   * Note: This is called BEFORE login, so we don't use withRetry
   * which requires a valid session
   */
  async function getEmailByUsername(username: string): Promise<string | null> {
    // Trim whitespace and use exact match for Chinese username compatibility
    const trimmedUsername = username.trim()

    const { data, error } = await supabase
      .from('profiles')
      .select('email')
      .eq('name', trimmedUsername)
      .single()

    if (error || !data) {
      console.error('Email lookup error:', error)
      return null
    }

    return data.email
  }

  /**
   * Sign in with either email or username
   */
  async function signIn(identifier: string, password: string) {
    loading.value = true
    try {
      // Trim and determine if identifier is email or username
      const trimmedIdentifier = identifier.trim()
      let email = trimmedIdentifier

      if (!isEmail(trimmedIdentifier)) {
        // Look up email by username
        const foundEmail = await getEmailByUsername(trimmedIdentifier)
        if (!foundEmail) {
          return { success: false, error: '用户名或密码错误' }
        }
        email = foundEmail
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error

      session.value = data.session
      user.value = data.user
      try {
        profile.value = await getProfile(data.user.id)
      } catch {
        // Profile may not exist yet for new users
      }

      return { success: true }
    } catch (error) {
      const message = (error as Error).message
      if (message.includes('Invalid login credentials')) {
        return { success: false, error: '用户名或密码错误' }
      }
      return { success: false, error: message }
    } finally {
      loading.value = false
    }
  }

  async function signUp(email: string, password: string, name: string) {
    loading.value = true
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
        },
      })
      if (error) throw error

      // User should be immediately signed in (email confirmation disabled)
      if (data.user && data.session) {
        session.value = data.session
        user.value = data.user
        try {
          profile.value = await getProfile(data.user.id)
        } catch {
          // Profile will be created by trigger
        }
      }

      return { success: true, user: data.user }
    } catch (error) {
      const message = (error as Error).message
      // Translate common error messages
      if (message.includes('already registered')) {
        return { success: false, error: '该邮箱已被注册' }
      }
      if (message.includes('Password')) {
        return { success: false, error: '密码强度不足，请使用至少6位密码' }
      }
      return { success: false, error: message }
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    loading.value = true
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      user.value = null
      profile.value = null
      session.value = null

      // Clear user context in error monitoring
      setErrorMonitoringUser(null)

      return { success: true }
    } catch (error) {
      // Clear local state anyway
      user.value = null
      profile.value = null
      session.value = null
      // Clear user context in error monitoring
      setErrorMonitoringUser(null)
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  async function updateProfile(updates: Partial<Profile>) {
    if (!user.value) return { success: false, error: 'Not authenticated' }

    loading.value = true
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.value.id)
        .select()
        .single()

      if (error) throw error
      profile.value = data as Profile

      return { success: true }
    } catch (error) {
      return { success: false, error: (error as Error).message }
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    profile,
    session,
    loading,
    initialized,
    isAuthenticated,
    isAdmin,
    userName,
    initialize,
    signIn,
    signUp,
    signOut,
    updateProfile,
  }
})
