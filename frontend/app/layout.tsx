import type { Metadata, Viewport } from 'next'
import { Inter, Source_Serif_4 } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/contexts/ThemeContext'

// next/font downloads each font at build time and exposes it as a CSS variable.
// tailwind.config.js points `font-sans` and `font-serif` at these variables.
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

// Display serif for headings and the wordmark. The optical-size axis lets
// the same font draw finer details at headline sizes.
const display = Source_Serif_4({
  subsets: ['latin'],
  axes: ['opsz'],
  display: 'swap',
  variable: '--font-display',
})

export const metadata: Metadata = {
  title: 'Vidhived.ai — AI Legal Document Intelligence',
  description: 'Upload a legal contract and get AI-powered risk analysis, clause summaries, and document Q&A.',
  keywords: ['legal', 'AI', 'document analysis', 'contract review', 'risk assessment'],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

/*
 * Runs before the page is painted, so the saved theme is applied without a
 * flash. Dark is the default when nothing has been saved. The same key
 * ('vidhived-theme') is read and written by contexts/ThemeContext.tsx.
 */
const themeScript = `(function(){var t='dark';try{var s=localStorage.getItem('vidhived-theme');if(s==='light'||s==='dark')t=s}catch(e){}var c=document.documentElement.classList;c.remove('light','dark');c.add(t)})()`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`dark ${inter.variable} ${display.variable}`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
