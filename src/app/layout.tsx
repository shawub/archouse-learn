import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Footer } from '@/components/footer'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Archouse Learn',
  description: 'A learning platform for UK primary and secondary schools',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-GB">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <div className="flex-1 flex flex-col">{children}</div>
        <Footer />
      </body>
    </html>
  )
}
