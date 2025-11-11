'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { useAuthStore } from '@/lib/auth-store'

const navigationItems = [
  {
    name: 'Daily',
    href: '/daily',
    icon: '📈'
  },
  {
    name: 'Weekly',
    href: '/weekly',
    icon: '📊'
  },
  {
    name: 'Future',
    href: '/future',
    icon: '🎯'
  },
  {
    name: 'Account',
    href: '/account',
    icon: '👤'
  }
]
const SOCIAL_LINKS = [
  {
    name: 'Follow us on X',
    href: 'https://twitter.com/Predixa28',
    label: 'Predixa on X',
  },
]

export default function Navigation() {
  const pathname = usePathname()
  const { isAuthenticated } = useAuthStore()

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 flex items-center justify-center">
                <img 
                  src="/logo.jpg" 
                  alt="Predixa Logo" 
                  className="h-8 w-8 rounded-lg"
                />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">Predixa</span>
            </Link>
          </div>

          {/* Navigation Items - Only show when authenticated */}
          {isAuthenticated && (
            <div className="flex items-center space-x-8">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={clsx(
                      'flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200',
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                    )}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          )}

          {/* User Menu */}
          <div className="flex items-center space-x-3">
            {SOCIAL_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={item.label}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-800"
              >
                <span className="text-base leading-none">𝕏</span>
                {item.name}
              </a>
            ))}
          </div>
        </div>
      </div>
    </nav>
  )
}
