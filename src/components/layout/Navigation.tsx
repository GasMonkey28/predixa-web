'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'

const navigationItems = [
  {
    name: 'Weekly',
    href: '/weekly',
    icon: '📊'
  },
  {
    name: 'Daily',
    href: '/daily',
    icon: '📈'
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

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">P</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Predixa</span>
            </Link>
          </div>

          {/* Navigation Items */}
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
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  )}
                >
                  <span className="text-base">{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>

          {/* User Menu (placeholder for now) */}
          <div className="flex items-center">
            <div className="text-sm text-gray-500">
              Trading Analytics
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
