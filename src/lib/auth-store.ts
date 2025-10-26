import { create } from 'zustand'
import { getCurrentUser, signIn, signUp, confirmSignUp, signOut, fetchUserAttributes, signInWithRedirect } from 'aws-amplify/auth'

export interface User {
  userId: string
  email: string
  givenName?: string
  familyName?: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, givenName?: string, familyName?: string) => Promise<void>
  confirmSignUp: (email: string, code: string) => Promise<void>
  signOut: () => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithApple: () => Promise<void>
  checkAuth: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState & AuthActions>((set, get) => ({
  // State
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  // Actions
  signIn: async (email: string, password: string) => {
    set({ isLoading: true, error: null })
    try {
      await signIn({ username: email, password })
      await get().checkAuth()
    } catch (error: any) {
      set({ error: error.message || 'Sign in failed', isLoading: false })
      throw error
    }
  },

  signUp: async (email: string, password: string, givenName?: string, familyName?: string) => {
    set({ isLoading: true, error: null })
    try {
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
            given_name: givenName || '',
            family_name: familyName || '',
          }
        }
      })
      set({ isLoading: false })
    } catch (error: any) {
      set({ error: error.message || 'Sign up failed', isLoading: false })
      throw error
    }
  },

  confirmSignUp: async (email: string, code: string) => {
    set({ isLoading: true, error: null })
    try {
      await confirmSignUp({ username: email, confirmationCode: code })
      set({ isLoading: false })
    } catch (error: any) {
      set({ error: error.message || 'Confirmation failed', isLoading: false })
      throw error
    }
  },

  signOut: async () => {
    set({ isLoading: true, error: null })
    try {
      await signOut()
      set({ user: null, isAuthenticated: false, isLoading: false })
    } catch (error: any) {
      set({ error: error.message || 'Sign out failed', isLoading: false })
      throw error
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null })
    try {
      await signInWithRedirect({ provider: 'Google' })
    } catch (error: any) {
      set({ error: error.message || 'Google sign in failed', isLoading: false })
      throw error
    }
  },

  signInWithApple: async () => {
    set({ isLoading: true, error: null })
    try {
      await signInWithRedirect({ provider: 'SignInWithApple' })
    } catch (error: any) {
      set({ error: error.message || 'Apple sign in failed', isLoading: false })
      throw error
    }
  },

  checkAuth: async () => {
    set({ isLoading: true })
    try {
      const user = await getCurrentUser()
      const attributes = await fetchUserAttributes()
      
      set({
        user: {
          userId: user.userId,
          email: attributes.email || '',
          givenName: attributes.given_name,
          familyName: attributes.family_name,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null
      })
    } catch (error) {
      set({ user: null, isAuthenticated: false, isLoading: false, error: null })
    }
  },

  clearError: () => set({ error: null }),
}))



