'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import type { Role } from '@prisma/client'

const teacherLinks = [
  { href: '/teacher/dashboard', label: 'Dashboard', icon: '◻' },
  { href: '/teacher/courses', label: 'Courses', icon: '📚' },
  { href: '/teacher/students', label: 'Students', icon: '👥' },
]

const studentLinks = [
  { href: '/student/dashboard', label: 'Dashboard', icon: '◻' },
  { href: '/student/courses', label: 'My Courses', icon: '📚' },
]

export function Sidebar({ role, userName }: { role: Role; userName: string }) {
  const pathname = usePathname()
  const links = role === 'TEACHER' ? teacherLinks : studentLinks

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-100 flex flex-col">
      <div className="px-5 py-5 border-b border-gray-100">
        <span className="text-base font-bold text-brand-600">Archouse Learn</span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href} href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span>{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-100">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs font-medium text-gray-900 truncate">{userName}</p>
          <p className="text-xs text-gray-400 capitalize">{role.toLowerCase()}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/' })}
          className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
