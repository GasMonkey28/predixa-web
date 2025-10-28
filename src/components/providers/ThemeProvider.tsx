'use client'

import { useEffect } from 'react'
import { useThemeStore } from '@/lib/theme-store'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { isDarkMode } = useThemeStore()

  useEffect(() => {
    // Apply dark mode class to html element
    if (isDarkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [isDarkMode])

  return <>{children}</>
}
