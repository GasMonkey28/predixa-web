import './globals.css'
import type { Metadata } from 'next'
import { ClientLayout } from '@/components/layout/ClientLayout'

export const metadata: Metadata = {
  title: 'Predixa',
  description: 'Professional Trading Analytics Platform',
  icons: {
    icon: '/logo.jpg',
    shortcut: '/logo.jpg',
    apple: '/logo.jpg',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-gray-50">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  )
}

