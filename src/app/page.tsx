'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/auth-store'
import LoginForm from '@/components/auth/LoginForm'
import SignupForm from '@/components/auth/SignupForm'

export default function HomePage() {
  const { isAuthenticated, user, signOut } = useAuthStore()
  const [showLogin, setShowLogin] = useState(false)
  const [showSignup, setShowSignup] = useState(false)

  const handleForceSignOut = async () => {
    try {
      // Clear local storage
      localStorage.clear()
      // Clear session storage
      sessionStorage.clear()
      // Force reload to clear auth state
      window.location.href = '/'
    } catch (error) {
      console.error('Error clearing session:', error)
      // Force reload anyway
      window.location.href = '/'
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="mx-auto max-w-7xl p-6">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900">Predixa Web</h1>
          <p className="mt-2 text-lg text-gray-600">
            Professional trading analytics and market insights
          </p>
          <p className="mt-2 text-sm text-red-600">
            Having sign-in issues?{' '}
            <button
              onClick={handleForceSignOut}
              className="underline hover:text-red-800"
            >
              Clear Session
            </button>
          </p>
        </div>

        <div className="max-w-md mx-auto">
          {showLogin ? (
            <div>
              <LoginForm />
              <p className="text-center mt-4">
                Don&apos;t have an account?{' '}
                <button
                  onClick={() => setShowLogin(false)}
                  className="text-blue-600 hover:underline"
                >
                  Sign up
                </button>
              </p>
            </div>
          ) : showSignup ? (
            <div>
              <SignupForm />
              <p className="text-center mt-4">
                Already have an account?{' '}
                <button
                  onClick={() => setShowSignup(false)}
                  className="text-blue-600 hover:underline"
                >
                  Sign in
                </button>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={() => setShowLogin(true)}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Sign In
              </button>
              <button
                onClick={() => setShowSignup(true)}
                className="w-full py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </main>
    )
  }

  return (
    <div className="mx-auto max-w-7xl p-6">
      {/* Sign Out Button */}
      <div className="flex justify-end mb-4">
        <button
          onClick={async () => {
            try {
              await signOut()
            } catch (error) {
              console.error('Sign out failed:', error)
            }
          }}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
        >
          Sign Out
        </button>
      </div>

      {/* Hero Section */}
      <div className="text-center py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Welcome back, {user?.givenName || user?.email}!
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Professional trading analytics and market insights at your fingertips
        </p>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-lg border p-6 shadow-sm">
            <div className="text-2xl font-bold text-blue-600">📊</div>
            <h3 className="font-semibold text-gray-900 mt-2">Weekly Analysis</h3>
            <p className="text-sm text-gray-600">OHLC data & forecasts</p>
          </div>
          <div className="bg-white rounded-lg border p-6 shadow-sm">
            <div className="text-2xl font-bold text-green-600">📈</div>
            <h3 className="font-semibold text-gray-900 mt-2">Daily Insights</h3>
            <p className="text-sm text-gray-600">Intraday market data</p>
          </div>
          <div className="bg-white rounded-lg border p-6 shadow-sm">
            <div className="text-2xl font-bold text-purple-600">🎯</div>
            <h3 className="font-semibold text-gray-900 mt-2">Options Flow</h3>
            <p className="text-sm text-gray-600">Key levels & deltas</p>
          </div>
          <div className="bg-white rounded-lg border p-6 shadow-sm">
            <div className="text-2xl font-bold text-orange-600">👤</div>
            <h3 className="font-semibold text-gray-900 mt-2">Account</h3>
            <p className="text-sm text-gray-600">Profile & subscription</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card href="/weekly" title="Weekly Analysis" description="View weekly OHLC data and forecasts" />
          <Card href="/daily" title="Daily Insights" description="Explore daily market data and trends" />
          <Card href="/future" title="Options Flow" description="Analyze options flow and key levels" />
          <Card href="/account" title="Account Settings" description="Manage your profile and subscription" />
        </div>
      </div>
    </div>
  )
}

function Card({ href, title, description }: { href: string; title: string; description: string }) {
  return (
    <Link href={href} className="block rounded-lg border p-4 shadow-sm transition hover:shadow-md">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
    </Link>
  )
}

