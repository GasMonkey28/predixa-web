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
    name: 'News',
    href: '/news/spy',
    icon: '📰'
  },
  {
    name: 'History',
    href: '/history',
    icon: '📜'
  },
  {
    name: 'Account',
    href: '/account',
    icon: '👤'
  }
]
const APP_STORE_URL = 'https://apps.apple.com/app/id6753886048'

const SOCIAL_LINKS = [
  {
    name: '',
    href: 'https://www.tiktok.com/@predixa',
    label: 'Predixa on TikTok',
    icon: 'tiktok',
  },
  {
    name: '',
    href: 'https://www.instagram.com/predixa',
    label: 'Predixa on Instagram',
    icon: 'instagram',
  },
  {
    name: '',
    href: 'https://www.youtube.com/@predixa28',
    label: 'Predixa on YouTube',
    icon: 'youtube',
  },
  {
    name: '',
    href: 'https://twitter.com/Predixa28',
    label: 'Predixa on X',
    icon: 'x',
  },
]

export default function Navigation() {
  const pathname = usePathname()
  const { isAuthenticated } = useAuthStore()

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="mx-auto max-w-7xl px-6 sm:px-8 lg:px-12">
        <div className="flex h-16 items-center justify-between gap-6">
          {/* Logo/Brand */}
          <div className="flex items-center flex-shrink-0">
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
            <div className="flex items-center justify-center flex-1 gap-1">
              {navigationItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/news/spy' && pathname?.startsWith(item.href))
                
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={clsx(
                      'flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 whitespace-nowrap',
                      isActive
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700'
                        : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                    )}
                  >
                    <span className="text-base leading-none">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </div>
          )}

          {/* Right Side Menu */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* App Store Download Link */}
            <a
              href={APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Download Predixa on the App Store"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-md text-xs font-medium hover:bg-gray-800 transition-colors dark:bg-gray-900 dark:hover:bg-gray-700 whitespace-nowrap"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span>App Store</span>
            </a>
            
            {/* Social Links Group */}
            <div className="flex items-center gap-2 pl-2 border-l border-gray-200 dark:border-gray-700">
              <span className="text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:inline">Follow</span>
              <div className="flex items-center gap-1.5">
                {SOCIAL_LINKS.map((item) => (
                  <a
                    key={item.href}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    className="inline-flex items-center justify-center rounded-full border border-gray-200 bg-white p-1.5 text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:border-gray-600 dark:hover:bg-gray-800"
                  >
                    {item.icon === 'x' && (
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                    )}
                    {item.icon === 'tiktok' && (
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
                      </svg>
                    )}
                    {item.icon === 'instagram' && (
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    )}
                    {item.icon === 'youtube' && (
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                    )}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
