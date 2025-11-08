'use client'

import { useState } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { toast } from 'react-hot-toast'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [resetStage, setResetStage] = useState<'request' | 'confirm' | 'success'>('request')
  const [verificationCode, setVerificationCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const {
    signIn,
    signInWithGoogle,
    signInWithApple,
    requestPasswordReset,
    confirmPasswordReset,
    isLoading,
    error,
    clearError,
  } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    
    try {
      await signIn(email, password)
      toast.success('Signed in successfully!')
    } catch (error) {
      toast.error('Sign in failed')
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

  const handleForgotPasswordClick = () => {
    clearError()
    setShowForgotPassword(true)
    setResetStage('request')
    setVerificationCode('')
    setNewPassword('')
  }

  const handleBackToLogin = () => {
    clearError()
    setShowForgotPassword(false)
    setResetStage('request')
    setVerificationCode('')
    setNewPassword('')
  }

  const handlePasswordResetRequest = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    try {
      const result = await requestPasswordReset(email)
      const nextStep = result?.nextStep?.step

      if (nextStep === 'CONFIRM_RESET_PASSWORD_WITH_CODE') {
        toast.success('Reset code sent! Check your email.')
        setResetStage('confirm')
      } else if (nextStep === 'DONE') {
        toast.success('Password reset complete. You can sign in now.')
        setResetStage('success')
      } else {
        toast.success('Password reset requested. Follow the instructions sent to your email.')
        setResetStage('confirm')
      }
    } catch (error) {
      toast.error('Failed to send reset code')
    }
  }

  const handlePasswordResetConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()

    try {
      await confirmPasswordReset(email, verificationCode, newPassword)
      toast.success('Password reset successful! You can sign in with your new password.')
      setResetStage('success')
      setPassword('')
      setVerificationCode('')
      setNewPassword('')
    } catch (error) {
      toast.error('Failed to reset password')
    }
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-900 dark:text-white">
        {showForgotPassword ? (resetStage === 'success' ? 'All Set!' : 'Reset Password') : 'Sign In'}
      </h2>
      
      {!showForgotPassword && (
        <>
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
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with email</span>
            </div>
          </div>
        </>
      )}
      
      {!showForgotPassword && (
        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="text-right">
            <button
              type="button"
              onClick={handleForgotPasswordClick}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Forgot password?
            </button>
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      )}

      {showForgotPassword && resetStage === 'request' && (
        <form onSubmit={handlePasswordResetRequest} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Enter your email address and we&apos;ll send you a verification code to reset your password.
          </p>

          <div>
            <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <input
              type="email"
              id="reset-email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Sending reset code...' : 'Send reset code'}
          </button>

          <div className="text-center text-sm text-gray-600 dark:text-gray-300">
            Remembered your password?{' '}
            <button
              type="button"
              onClick={handleBackToLogin}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Back to sign in
            </button>
          </div>
        </form>
      )}

      {showForgotPassword && resetStage === 'confirm' && (
        <form onSubmit={handlePasswordResetConfirm} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            We&apos;ve sent a verification code to <span className="font-medium">{email}</span>. Enter it below along with your new password.
          </p>

          <div>
            <label htmlFor="verification-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Verification Code
            </label>
            <input
              type="text"
              id="verification-code"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              New Password
            </label>
            <input
              type="password"
              id="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={isLoading || !verificationCode || !newPassword}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Resetting password...' : 'Reset password'}
          </button>

          <div className="text-center text-sm text-gray-600 dark:text-gray-300">
            Need to try again?{' '}
            <button
              type="button"
              onClick={() => {
                clearError()
                setResetStage('request')
                setVerificationCode('')
                setNewPassword('')
              }}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Resend code
            </button>
            {' '}·{' '}
            <button
              type="button"
              onClick={handleBackToLogin}
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Back to sign in
            </button>
          </div>
        </form>
      )}

      {showForgotPassword && resetStage === 'success' && (
        <div className="space-y-4 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Your password has been reset successfully. You can now sign in with your new password.
          </p>
          <button
            type="button"
            onClick={handleBackToLogin}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Return to sign in
          </button>
        </div>
      )}
    </div>
  )
}



