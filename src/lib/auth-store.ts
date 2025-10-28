import { create } from 'zustand'
import { getCurrentUser, signIn, signUp, confirmSignUp, signOut, fetchUserAttributes, signInWithRedirect, updateUserAttributes, fetchAuthSession } from 'aws-amplify/auth'

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
  updateUserProfile: (givenName: string, familyName: string) => Promise<void>
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
      console.log('Attempting email/password sign in for:', email)
      await signIn({ username: email, password })
      console.log('Email/password sign in successful')
      await get().checkAuth()
    } catch (error: any) {
      console.error('Email/password sign in error:', error)
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
      console.log('Signing out...')
      await signOut()
      console.log('Sign out successful')
      set({ user: null, isAuthenticated: false, isLoading: false })
    } catch (error: any) {
      console.error('Sign out error:', error)
      // Even if signOut fails, clear the local state
      set({ user: null, isAuthenticated: false, isLoading: false })
      // Don't throw error for sign out - just log it
      console.log('Sign out completed (with error)')
    }
  },

  signInWithGoogle: async () => {
    set({ isLoading: true, error: null })
    try {
      console.log('Attempting Google sign in...')
      await signInWithRedirect({ provider: 'Google' })
      console.log('Google sign in redirect initiated')
    } catch (error: any) {
      console.error('Google sign in error:', error)
      set({ error: error.message || 'Google sign in failed', isLoading: false })
      throw error
    }
  },

  signInWithApple: async () => {
    set({ isLoading: true, error: null })
    try {
      console.log('Attempting Apple sign in...')
      await signInWithRedirect({ provider: 'Apple' })
      console.log('Apple sign in redirect initiated')
    } catch (error: any) {
      console.error('Apple sign in error:', error)
      set({ error: error.message || 'Apple sign in failed', isLoading: false })
      throw error
    }
  },

  updateUserProfile: async (givenName: string, familyName: string) => {
    set({ isLoading: true, error: null })
    try {
      console.log('Updating user profile:', { givenName, familyName })
      
      try {
        // Try to update Cognito attributes (works for email users)
        await updateUserAttributes({
          userAttributes: {
            given_name: givenName || '',
            family_name: familyName || ''
          }
        })
        console.log('Profile updated in Cognito')
      } catch (error: any) {
        // If Cognito fails (OAuth users without write scope), use API route
        if (error.message?.includes('required scopes') || error.code === 'NotAuthorizedException') {
          console.log('OAuth user detected, using API route')
          
          const session = await fetchAuthSession()
          const userId = (await getCurrentUser()).userId
          
          // Call server-side API route
          const response = await fetch('/api/user/profile', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.tokens?.idToken?.toString() || ''}`,
            },
            body: JSON.stringify({
              userId,
              email: session.tokens?.idToken?.payload?.email || '',
              givenName,
              familyName,
            }),
          })
          
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            console.error('API error response:', errorData)
            throw new Error(errorData.error || 'Failed to update profile via API')
          }
          
          const result = await response.json()
          console.log('Profile updated via API route:', result)
        } else {
          throw error
        }
      }
      
      // Refresh user data
      await get().checkAuth()
      
      set({ isLoading: false })
    } catch (error: any) {
      console.error('Error updating profile:', error)
      console.error('Error code:', error?.code)
      console.error('Error message:', error?.message)
      const errorMessage = error?.message || error?.name || 'Failed to update profile'
      set({ error: errorMessage, isLoading: false })
      throw error
    }
  },

  checkAuth: async () => {
    console.log('checkAuth: Starting auth check...')
    set({ isLoading: true })
    try {
      // First check if we have a valid session
      const session = await fetchAuthSession()
      if (!session || !session.tokens || !session.tokens.idToken) {
        console.log('checkAuth: No valid session found')
        set({ user: null, isAuthenticated: false, isLoading: false, error: null })
        return
      }
      
      const user = await getCurrentUser()
      console.log('checkAuth: User found:', user.userId)
      
      // Extract email from token
      const email = session.tokens?.idToken?.payload?.email as string || ''
      console.log('checkAuth: Email from token:', email)
      
      let givenName = ''
      let familyName = ''
      
      // Try to get user attributes (works for email users)
      try {
        const attributes = await fetchUserAttributes()
        console.log('checkAuth: All attributes fetched:', JSON.stringify(attributes, null, 2))
        console.log('checkAuth: Email:', attributes.email)
        console.log('checkAuth: Given name:', attributes.given_name)
        console.log('checkAuth: Family name:', attributes.family_name)
        console.log('checkAuth: Name:', attributes.name)
        
        givenName = attributes.given_name || ''
        familyName = attributes.family_name || ''
        
        // Handle Google/Apple sign-in where attributes might be in 'name' instead
        if (!givenName && !familyName && attributes.name) {
          // Google/Apple sign-in - split the name
          const nameParts = attributes.name.split(' ')
          if (nameParts.length >= 2) {
            givenName = nameParts[0]
            familyName = nameParts.slice(1).join(' ')
          } else {
            givenName = attributes.name
          }
        }
      } catch (attrError: any) {
        console.log('checkAuth: Could not fetch user attributes (OAuth user):', attrError.message)
        // This is expected for OAuth users without proper scopes
        // We'll get the name from DynamoDB or use defaults
      }
      
      // Try to fetch from DynamoDB for OAuth users or if name is missing
      // This ensures we show the latest edited name
      try {
        const response = await fetch(`/api/user/profile?userId=${user.userId}`)
        if (response.ok) {
          const dbProfile = await response.json()
          if (dbProfile && (dbProfile.givenName || dbProfile.familyName)) {
            console.log('checkAuth: Found profile in DynamoDB:', dbProfile)
            // Prioritize DynamoDB data (most recent)
            if (dbProfile.givenName) givenName = dbProfile.givenName
            if (dbProfile.familyName) familyName = dbProfile.familyName
            console.log('checkAuth: Using DynamoDB profile data')
          }
        }
      } catch (error) {
        console.error('checkAuth: Error fetching from DynamoDB:', error)
        // Continue with defaults
      }
      
      // If we still don't have names, use email as fallback
      if (!givenName && !familyName) {
        givenName = email.split('@')[0] || 'User'
        console.log('checkAuth: Using email as fallback name')
      }
      
      set({
        user: {
          userId: user.userId,
          email: email,
          givenName: givenName,
          familyName: familyName,
        },
        isAuthenticated: true,
        isLoading: false,
        error: null
      })
      console.log('checkAuth: Auth state updated successfully')
    } catch (error) {
      console.error('checkAuth: Error checking auth:', error)
      set({ user: null, isAuthenticated: false, isLoading: false, error: null })
    }
  },

  clearError: () => set({ error: null }),
}))
