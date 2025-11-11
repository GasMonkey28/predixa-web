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
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-300">
            Intraday levels, curated commentary, and economic context—built for active traders.
          </p>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Join to unlock the daily tier dashboard, weekly outlook, and instant billing controls.
          </p>
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
                onClick={handleShowLogin}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Sign In
              </button>
              <button
                onClick={handleShowSignup}
                className="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
