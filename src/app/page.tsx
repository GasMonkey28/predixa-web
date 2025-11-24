'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
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
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <img 
              src="/logo.jpg" 
              alt="Predixa Logo" 
              className="h-16 w-16 rounded-2xl"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            SPY Forecast & AI Signals for Active Traders
          </h1>
          
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
          
          <p className="mt-3 text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
            Get daily <strong>SPY Forecast</strong> and <strong>SPY Signals</strong> with direction probability, tier rankings, range forecasts, and options flow analysis. Professional trading analytics built for disciplined market participants.
          </p>
        </div>

        {/* SPY Features Section */}
        <div className="max-w-5xl mx-auto mb-12 space-y-8">
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">What Is the SPY Forecast?</h2>
            <p className="text-gray-700 dark:text-gray-300">
              The SPY forecast provides a probabilistic assessment of potential price movement for the SPDR S&P 500 ETF based on technical analysis, market structure, and signal aggregation. Each forecast includes direction probability, key support and resistance levels, and the factors driving potential movement. Predixa generates daily SPY forecasts by analyzing multiple data sources including price action, volume patterns, options flow, and market sentiment indicators.
            </p>
            <Link
              href="/spy-forecast"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              View SPY Forecast →
            </Link>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">What Are SPY Signals?</h2>
            <p className="text-gray-700 dark:text-gray-300">
              SPY signals are data-driven indicators that suggest potential price movement for the SPDR S&P 500 ETF. These signals aggregate information from multiple sources including technical indicators, price action, volume patterns, options activity, and market structure. Signal strength is calculated using machine learning models that analyze historical patterns and current market data, expressed as probability percentages to help traders assess risk and position size appropriately.
            </p>
            <Link
              href="/spy-signals"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              Learn About SPY Signals →
            </Link>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">What Is the Tier System (SS–D)?</h2>
            <p className="text-gray-700 dark:text-gray-300">
              The SPY tier system classifies price levels by their historical significance and probability of acting as support or resistance. Tiers range from SS (highest significance) to D (lowest significance), creating a hierarchy that helps traders identify which price levels are most likely to influence SPY movement. SS and S tiers represent the most important levels—those that have consistently shown strong support or resistance behavior. The system updates daily to reflect new price action and changing market conditions.
            </p>
            <Link
              href="/ai-tiers"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              Understand Tier System →
            </Link>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">What Are SPY Range Forecasts?</h2>
            <p className="text-gray-700 dark:text-gray-300">
              SPY range forecasts provide expected high and low price levels for a given time period, typically daily or weekly. The model estimates probable trading ranges based on historical volatility, current market conditions, technical levels, and statistical analysis. Range forecasts include probability bands that indicate the likelihood of price reaching different levels, helping traders understand potential price boundaries and plan accordingly.
            </p>
            <Link
              href="/range-forecast"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              Explore Range Forecasts →
            </Link>
          </section>

          <section className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">What Does SPY Options Flow Mean?</h2>
            <p className="text-gray-700 dark:text-gray-300">
              SPY options flow refers to the buying and selling activity in options markets, tracking which contracts are being traded, at what prices, and in what volumes. Options flow analysis examines trading activity in SPY call and put options to understand market sentiment and potential price movement. Flow data includes information such as trade size, strike prices, expiration dates, and whether activity is concentrated in calls or puts, providing insights into how traders are positioning themselves.
            </p>
            <Link
              href="/options-flow"
              className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
            >
              Learn About Options Flow →
            </Link>
          </section>
        </div>

        {/* CTA Section */}
        <div className="max-w-md mx-auto mb-8">
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

        {/* Trust Indicators */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-600 dark:text-gray-400">
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
    </main>
  )
}
