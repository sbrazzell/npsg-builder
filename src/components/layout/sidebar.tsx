'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Shield,
  Settings,
  BarChart2,
} from 'lucide-react'

const navItems = [
  {
    href: '/',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    href: '/organizations',
    label: 'Organizations',
    icon: Building2,
  },
  {
    href: '/facilities',
    label: 'Facilities',
    icon: MapPin,
  },
  {
    href: '/analyzer',
    label: 'Analyzer',
    icon: BarChart2,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 min-h-screen bg-white border-r border-slate-200 flex flex-col">
      {/* Logo / Brand */}
      <div className="px-6 py-5 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Shield className="h-6 w-6 text-indigo-600" />
          <div>
            <p className="font-bold text-slate-900 leading-none">NSGP Builder</p>
            <p className="text-xs text-slate-400 mt-0.5">Security Grant Planner</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                    isActive
                      ? 'bg-indigo-50 text-indigo-700 font-medium'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  <item.icon className="h-4 w-4 flex-shrink-0" />
                  {item.label}
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="mt-8">
          <p className="px-3 text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">
            Settings
          </p>
          <ul className="space-y-1">
            <li>
              <Link
                href="/settings"
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                  pathname === '/settings'
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                )}
              >
                <Settings className="h-4 w-4 flex-shrink-0" />
                Settings
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-200">
        <p className="text-xs text-slate-400">Local-first. Your data stays here.</p>
      </div>
    </aside>
  )
}
