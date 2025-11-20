'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/auth-store'
import LoginForm from '@/components/auth/LoginForm'
import SignupForm from '@/components/auth/SignupForm'

export default function HomePage() {
  const { isAuthenticated, isLoading } = useAuthStore()
  const router = useRouter()
  const [showLogin, setShowLogin] = useState(false)
  const [showSignup, setShowSignup] = useState(false)

  // Redirect authenticated users to /daily
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/daily')
    }
  }, [isAuthenticated, isLoading, router])

  // Reset forms when switching between them
  const handleShowLogin = () => {
    setShowSignup(false)
    setShowLogin(true)
  }

  const handleShowSignup = () => {
    setShowLogin(false)
    setShowSignup(true)
  }

  // Show loading while redirecting authenticated users
  if (isAuthenticated) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      </main>
    )
  }

  return (
    <main className="relative mx-auto max-w-7xl p-6">
      {isLoading && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/70 dark:bg-gray-900/70">
          <div className="animate-spin rounded-full h-24 w-24 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      <div className={isLoading ? 'pointer-events-none opacity-50' : ''}>
        <div className="text-center mb-10">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.jpg" 
              alt="Predixa Logo" 
              className="h-16 w-16 rounded-2xl"
            />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Predixa</h1>
          
          {/* Free Trial Badge */}
          <div className="mt-4 mb-4 inline-block">
            <div className="relative inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-full shadow-lg transform hover:scale-105 transition-transform duration-200">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 rounded-full animate-pulse opacity-75"></div>
              <div className="relative flex items-center gap-2">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-white font-bold text-lg">14 Days Free Trial</span>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>
          
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">
            Intraday levels, curated commentary, and economic context—built for active traders.
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Join to unlock the daily tier dashboard, weekly outlook, and instant billing controls.
          </p>
          
          {/* Trust Indicators */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto">
          {showLogin ? (
            <div>
              <LoginForm />
              <p className="text-center mt-4 text-gray-600 dark:text-gray-300">
                Don&apos;t have an account?{' '}
                <button
                  onClick={handleShowSignup}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Sign up
                </button>
              </p>
            </div>
          ) : showSignup ? (
            <div>
              <SignupForm />
              <p className="text-center mt-4 text-gray-600 dark:text-gray-300">
                Already have an account?{' '}
                <button
                  onClick={handleShowLogin}
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={handleShowSignup}
                className="w-full relative py-4 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-[1.02] font-semibold text-lg"
              >
                <div className="flex items-center justify-center gap-2">
                  <span>Start Your Free Trial</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
                <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-2 py-1 rounded-full shadow-md">
                  14 Days Free
                </div>
              </button>
              <button
                onClick={handleShowLogin}
                className="w-full py-3 px-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Sign In
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
