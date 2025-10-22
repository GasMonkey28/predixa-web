'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import { configureAmplify } from '@/lib/amplify'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const checkAuth = useAuthStore((state) => state.checkAuth)

  useEffect(() => {
    configureAmplify()
    checkAuth()
  }, [checkAuth])

  return <>{children}</>
}



