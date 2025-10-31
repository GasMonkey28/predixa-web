'use client'

import { AuthProvider } from '@/components/providers/AuthProvider'
import Navigation from '@/components/layout/Navigation'
import Footer from '@/components/layout/Footer'
import { Toaster } from 'react-hot-toast'

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="flex flex-col min-h-screen">
        <Navigation />
        <main className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
      <Toaster position="top-right" />
    </AuthProvider>
  )
}

