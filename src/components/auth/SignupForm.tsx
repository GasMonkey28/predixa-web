'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import { subscriptionService } from '@/lib/subscription-service'
import { toast } from 'react-hot-toast'

export default function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [givenName, setGivenName] = useState('')
  const [familyName, setFamilyName] = useState('')
  // Persist confirmation state in localStorage to survive re-renders
  const [isConfirming, setIsConfirming] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('signup_confirming')
      const savedEmail = localStorage.getItem('signup_confirming_email')
      if (saved === 'true' && savedEmail) {
        console.log('🔄 Restoring confirmation state from localStorage, email:', savedEmail)
        return true
      }
    }
    return false
  })
  const [confirmationCode, setConfirmationCode] = useState('')
  const [isResending, setIsResending] = useState(false)
  const [hasInitialized, setHasInitialized] = useState(false)
  const [isConfirmingCode, setIsConfirmingCode] = useState(false)
  
  const router = useRouter()
  const { signUp, confirmSignUp, resendConfirmationCode, signIn, signInWithGoogle, signInWithApple, isLoading, error, clearError, checkAuth } = useAuthStore()

  // Initialize: Restore email from localStorage on mount if in confirmation state
  useEffect(() => {
    if (!hasInitialized && typeof window !== 'undefined') {
      const saved = localStorage.getItem('signup_confirming')
      const savedEmail = localStorage.getItem('signup_confirming_email')
      if (saved === 'true' && savedEmail) {
        console.log('📧 Initializing: Restoring email from localStorage:', savedEmail)
        setEmail(savedEmail)
        setIsConfirming(true)
      }
      setHasInitialized(true)
    }
  }, [hasInitialized])

  // Debug: Log when isConfirming changes
  useEffect(() => {
    console.log('🔍 SignupForm: isConfirming changed to:', isConfirming)
    console.log('🔍 SignupForm: email:', email)
    if (isConfirming) {
      console.log('✅ Confirmation form should be visible now!')
      // Persist to localStorage whenever isConfirming is true
      if (typeof window !== 'undefined' && email) {
        localStorage.setItem('signup_confirming', 'true')
        localStorage.setItem('signup_confirming_email', email)
        console.log('💾 Saved to localStorage: isConfirming=true, email=', email)
      }
    }
    // Don't clear localStorage in useEffect - only clear on explicit actions
  }, [isConfirming, email])

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    
    try {
      const result = await signUp(email, password, givenName, familyName)
      // Sign-up succeeded - always show confirmation form
      // AWS Cognito requires email confirmation for new sign-ups
      console.log('✅ Sign up successful, result:', result)
      console.log('✅ Setting isConfirming to true, email:', email)
      // Persist email, password (temporarily), and confirmation state BEFORE setting state (synchronous)
      if (typeof window !== 'undefined' && email) {
        localStorage.setItem('signup_confirming', 'true')
        localStorage.setItem('signup_confirming_email', email)
        // Store password temporarily in sessionStorage for auto sign-in after confirmation
        // sessionStorage is cleared when tab closes, more secure than localStorage
        if (password) {
          sessionStorage.setItem('signup_password_temp', password)
          console.log('💾 Saved password to sessionStorage for auto sign-in')
        }
        console.log('💾 Saved to localStorage BEFORE state update')
      }
      // Set state immediately - localStorage is already saved
      setIsConfirming(true)
      console.log('✅ State updated: isConfirming = true')
      
      // Double-check localStorage was saved (defensive programming)
      if (typeof window !== 'undefined') {
        const checkSaved = localStorage.getItem('signup_confirming')
        const checkEmail = localStorage.getItem('signup_confirming_email')
        console.log('🔍 Verification: localStorage check:', { checkSaved, checkEmail })
      }
      toast.success('Please check your email for the confirmation code')
    } catch (error: any) {
      // Check if the error indicates the user needs to confirm
      // Some Cognito errors (like user already exists but unconfirmed) still require confirmation
      const errorMessage = error?.message || ''
      const errorCode = error?.code || error?.name || ''
      
      console.log('⚠️ Sign up error:', { errorMessage, errorCode, error })
      
      // If user already exists but is unconfirmed, show confirmation form
      // Also show confirmation form for ANY error if we got this far (code was sent)
      const needsConfirmation = 
        errorMessage.includes('already exists') ||
        errorMessage.includes('UsernameExistsException') ||
        errorMessage.includes('AliasExistsException') ||
        errorCode === 'UsernameExistsException' ||
        errorCode === 'AliasExistsException' ||
        errorMessage.toLowerCase().includes('confirmation') ||
        errorMessage.toLowerCase().includes('unconfirmed') ||
        errorMessage.toLowerCase().includes('code') ||
        errorMessage.toLowerCase().includes('verify')
      
      if (needsConfirmation) {
        // User needs to confirm - show confirmation form
        console.log('✅ User needs confirmation, setting isConfirming to true, email:', email)
        // Persist email and confirmation state
        if (typeof window !== 'undefined' && email) {
          localStorage.setItem('signup_confirming', 'true')
          localStorage.setItem('signup_confirming_email', email)
          console.log('💾 Saved to localStorage BEFORE state update')
        }
        setIsConfirming(true)
        console.log('✅ State updated: isConfirming = true')
        toast.success('Please check your email for the confirmation code')
      } else {
        // For other errors, show error message but still try to show confirmation form
        // because if they received a code, they need to confirm
        console.log('⚠️ Unexpected error, but showing confirmation form anyway, email:', email)
        // Persist email and confirmation state
        if (typeof window !== 'undefined' && email) {
          localStorage.setItem('signup_confirming', 'true')
          localStorage.setItem('signup_confirming_email', email)
          console.log('💾 Saved to localStorage BEFORE state update')
        }
        setIsConfirming(true)
        console.log('✅ State updated: isConfirming = true')
        toast.success('Please check your email for the confirmation code')
        console.error('Sign up error details:', error)
      }
    }
  }

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    setIsConfirmingCode(true)
    
    try {
      const emailToConfirm = email || (typeof window !== 'undefined' ? localStorage.getItem('signup_confirming_email') || '' : '')
      if (!emailToConfirm) {
        toast.error('Email not found. Please try signing up again.')
        setIsConfirmingCode(false)
        return
      }
      
      // Confirm the signup code
      await confirmSignUp(emailToConfirm, confirmationCode)
      console.log('✅ Account confirmed successfully')
      
      // Automatically sign in the user with their credentials
      // Try to get password from state first, then from sessionStorage (for auto sign-in after confirmation)
      const passwordToUse = password || (typeof window !== 'undefined' ? sessionStorage.getItem('signup_password_temp') || '' : '')
      
      if (!passwordToUse) {
        toast.success('Account confirmed! Please sign in to continue.')
        setIsConfirming(false)
        setConfirmationCode('')
        setIsConfirmingCode(false)
        // Clear localStorage and sessionStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('signup_confirming')
          localStorage.removeItem('signup_confirming_email')
          sessionStorage.removeItem('signup_password_temp')
        }
        // Redirect to login
        router.push('/')
        return
      }
      
      try {
        console.log('🔄 Signing in automatically after confirmation...')
        await signIn(emailToConfirm, passwordToUse)
        console.log('✅ Signed in successfully')
        
        // Clear password from sessionStorage immediately after use (security)
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem('signup_password_temp')
        }
        
        // Wait a bit for auth state to update
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Check subscription status
        console.log('🔍 Checking subscription status...')
        const hasActive = await subscriptionService.hasActiveSubscription()
        console.log('📊 Subscription status:', hasActive ? 'Active/Trial' : 'No subscription')
        
        // Clear localStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('signup_confirming')
          localStorage.removeItem('signup_confirming_email')
        }
        
        // Redirect based on subscription status
        if (hasActive) {
          console.log('✅ Redirecting to /daily (has active subscription/trial)')
          toast.success('Welcome! Redirecting to your dashboard...')
          router.push('/daily')
        } else {
          console.log('📝 Redirecting to /account (no active subscription)')
          toast.success('Account confirmed! Please set up your subscription.')
          router.push('/account')
        }
      } catch (signInError: any) {
        console.error('❌ Auto sign-in failed:', signInError)
        // If auto sign-in fails, show success message and redirect to login
        toast.success('Account confirmed! Please sign in to continue.')
        setIsConfirming(false)
        setConfirmationCode('')
        setIsConfirmingCode(false)
        // Clear localStorage and sessionStorage
        if (typeof window !== 'undefined') {
          localStorage.removeItem('signup_confirming')
          localStorage.removeItem('signup_confirming_email')
          sessionStorage.removeItem('signup_password_temp')
        }
        router.push('/')
      }
    } catch (error: any) {
      console.error('❌ Confirmation failed:', error)
      toast.error(error?.message || 'Confirmation failed. Please check your code and try again.')
      setIsConfirmingCode(false)
    }
  }

  const handleResendCode = async () => {
    setIsResending(true)
    clearError()
    
    try {
      const emailToResend = email || (typeof window !== 'undefined' ? localStorage.getItem('signup_confirming_email') || '' : '')
      if (!emailToResend) {
        toast.error('Email not found. Please try signing up again.')
        return
      }
      await resendConfirmationCode(emailToResend)
      toast.success('Confirmation code resent! Please check your email.')
    } catch (error: any) {
      toast.error(error?.message || 'Failed to resend code. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle()
    } catch (error) {
      toast.error('Google sign in failed')
    }
  }

  const handleAppleSignIn = async () => {
    try {
      await signInWithApple()
    } catch (error) {
      toast.error('Apple sign in failed')
    }
  }

  // Check localStorage as fallback in case component remounted
  const shouldShowConfirmation = isConfirming || (typeof window !== 'undefined' && localStorage.getItem('signup_confirming') === 'true')
  
  // Ensure email is set from localStorage if needed
  const displayEmail = email || (typeof window !== 'undefined' ? localStorage.getItem('signup_confirming_email') || '' : '')
  
  // Sync state with localStorage if they're out of sync
  if (!isConfirming && typeof window !== 'undefined' && localStorage.getItem('signup_confirming') === 'true') {
    console.log('🔄 Syncing state with localStorage - setting isConfirming to true')
    setIsConfirming(true)
    if (!email && displayEmail) {
      setEmail(displayEmail)
    }
  }

  if (shouldShowConfirmation) {
    return (
      <div className="max-w-md mx-auto mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md border-2 border-blue-500">
        <div className="mb-4">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-3">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2 text-center text-gray-900 dark:text-white">Check Your Email</h2>
          <p className="text-sm text-center text-gray-600 dark:text-gray-400 mb-4">
            We sent a confirmation code to
          </p>
          <p className="text-sm font-semibold text-center text-gray-900 dark:text-white mb-6">
            {displayEmail}
          </p>
        </div>
        
        <form onSubmit={handleConfirm} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Enter Confirmation Code
            </label>
            <input
              type="text"
              id="code"
              value={confirmationCode}
              onChange={(e) => setConfirmationCode(e.target.value)}
              placeholder="123456"
              required
              autoFocus
              maxLength={6}
              className="mt-1 block w-full px-4 py-3 text-center text-lg font-mono border-2 border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
              Enter the 6-digit code from your email
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || isConfirmingCode || !confirmationCode}
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading || isConfirmingCode ? 'Confirming and signing in...' : 'Confirm Account'}
          </button>

          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-center text-gray-600 dark:text-gray-400 mb-3">
              Didn&apos;t receive the code?
            </p>
            <button
              type="button"
              onClick={handleResendCode}
              disabled={isResending || isLoading}
              className="w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResending ? 'Sending...' : 'Resend Code'}
            </button>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                setIsConfirming(false)
                setConfirmationCode('')
                clearError()
                // Clear localStorage and sessionStorage when going back
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('signup_confirming')
                  localStorage.removeItem('signup_confirming_email')
                  sessionStorage.removeItem('signup_password_temp')
                }
              }}
              className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            >
              ← Back to sign up
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">Sign Up</h2>
      
      {/* Social Sign In Buttons */}
      <div className="space-y-3 mb-6">
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        
        <button
          type="button"
          onClick={handleAppleSignIn}
          disabled={isLoading}
          className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-black text-sm font-medium text-white hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="white">
            <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zm-3.03-16.84c.27-.32.48-.72.62-1.16 0-.01 0-.01 0 0-.56.04-1.22.42-1.61.9-.35.35-.65.9-.57 1.43.04.01.08.01.11.01.57-.02 1.15-.23 1.52-.58.34-.32.58-.82.52-1.3-.01 0-.01 0-.01.01v-.01.01c0-.01 0-.01.01-.01l.01-.01c0 .01 0 .01-.01.01.01-.01.01-.01.01-.01-.01.01-.01.01-.01.01.01-.01.01-.01.01-.01-.01.01-.01.01-.01.01.01 0 .01-.01.01-.01 0 0 0 .01-.01 0-.01 0-.01-.01-.01-.01 0 0-.01 0-.01.01.01 0 .01-.01.01-.01 0 0 0 .01 0 .01.01 0 .01 0 .01-.01-.01.01-.01.01-.01.01.02.02.01 0 .01-.01z"/>
          </svg>
          Continue with Apple
        </button>
      </div>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with email</span>
        </div>
      </div>
      
      <form onSubmit={handleSignUp} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="givenName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              First Name
            </label>
            <input
              type="text"
              id="givenName"
              value={givenName}
              onChange={(e) => setGivenName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="familyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Last Name
            </label>
            <input
              type="text"
              id="familyName"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {error && (
          <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isLoading ? 'Creating Account...' : 'Sign Up'}
        </button>
      </form>
    </div>
  )
}



