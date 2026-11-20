'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  toggleTheme: () => void
}

const STORAGE_KEY = 'vidhived-theme'

const ThemeContext = createContext<ThemeContextType>({ theme: 'dark', toggleTheme: () => { } })

/*
 * The theme class on <html> is first set by the inline script in
 * app/layout.tsx (before paint). This provider only mirrors that class into
 * React state and changes it when the user clicks the toggle.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')

  // After mount, read what the inline script decided.
  useEffect(() => {
    setTheme(document.documentElement.classList.contains('light') ? 'light' : 'dark')
  }, [])

  const toggleTheme = useCallback(() => {
    const root = document.documentElement
    const next: Theme = root.classList.contains('light') ? 'dark' : 'light'
    root.classList.remove('light', 'dark')
    root.classList.add(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Storage can be blocked (private mode). The theme still changes for this visit.
    }
    setTheme(next)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
