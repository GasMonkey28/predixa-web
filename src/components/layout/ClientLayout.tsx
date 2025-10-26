'use client'

import { AuthProvider } from '@/components/providers/AuthProvider'
import Navigation from '@/components/layout/Navigation'
import { Toaster } from 'react-hot-toast'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Navigation />
      <main className="min-h-screen">
        {children}
      </main>
      <Toaster position="top-right" />
    </AuthProvider>
  )
}

