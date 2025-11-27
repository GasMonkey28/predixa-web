'use client'

import { useState, useEffect } from 'react'
import HistoryPageContent from './HistoryPageContent'

// Access control: Check if user has access via code or local development
function useAccessControl() {
  const [hasAccess, setHasAccess] = useState(false)
  const [isChecking, setIsChecking] = useState(true)
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check if running locally (development mode)
    const isLocal = process.env.NODE_ENV === 'development' || 
                    window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1'
    
    if (isLocal) {
      setHasAccess(true)
      setIsChecking(false)
      return
    }

    // Check if access code is stored in sessionStorage
    const storedAccess = sessionStorage.getItem('history-20-access')
    if (storedAccess === 'granted') {
      setHasAccess(true)
      setIsChecking(false)
      return
    }

    setIsChecking(false)
  }, [])

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Get access code from environment variable (client-side check)
    // Note: In production, this should be checked server-side
    const correctCode = process.env.NEXT_PUBLIC_HISTORY_20_CODE || 'predixa20'
    
    if (code === correctCode) {
      sessionStorage.setItem('history-20-access', 'granted')
      setHasAccess(true)
      setError(null)
    } else {
      setError('Invalid access code')
      setCode('')
    }
  }

  return { hasAccess, isChecking, code, setCode, error, handleCodeSubmit }
}

export default function History20Page() {
  const { hasAccess, isChecking, code, setCode, error, handleCodeSubmit } = useAccessControl()

  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm">
          <h1 className="text-2xl font-bold text-white mb-4 text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Access Required
          </h1>
          <p className="text-zinc-300 text-center mb-6">
            This page is restricted. Please enter the access code to continue.
          </p>
          <form onSubmit={handleCodeSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter access code"
                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
              {error && (
                <p className="mt-2 text-sm text-red-400">{error}</p>
              )}
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200"
            >
              Access Page
            </button>
          </form>
        </div>
      </div>
    )
  }

  return <HistoryPageContent />
}

