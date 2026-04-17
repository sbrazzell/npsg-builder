'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Shield,
  Settings,
  Menu,
  X,
  BarChart2,
  ClipboardList,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/organizations', label: 'Organizations', icon: Building2 },
  { href: '/facilities', label: 'Facilities', icon: MapPin },
  { href: '/analyzer', label: 'Analyzer', icon: BarChart2 },
  { href: '/readiness', label: 'Readiness', icon: ClipboardList },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-md text-slate-600 hover:bg-slate-100 md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 left-0 h-full w-64 z-50 flex flex-col transition-transform duration-250 md:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{
          background: 'linear-gradient(160deg, oklch(0.18 0.06 264) 0%, oklch(0.13 0.03 250) 60%, oklch(0.11 0.02 240) 100%)',
        }}
      >
        <div className="px-5 py-5 border-b border-white/8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2" style={{ background: 'oklch(0.47 0.18 264 / 0.35)' }}>
              <Shield className="h-5 w-5 text-indigo-300" />
            </div>
            <div>
              <p className="font-bold text-white leading-none tracking-tight text-sm">NSGP Builder</p>
              <p className="text-xs mt-0.5" style={{ color: 'oklch(0.7 0.06 264)' }}>Security Grant Planner</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-500 hover:text-white transition-colors p-1 rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                      isActive
                        ? 'text-white'
                        : 'text-slate-400 hover:text-white hover:bg-white/8'
                    )}
                    style={isActive ? {
                      background: 'oklch(0.47 0.18 264 / 0.35)',
                      boxShadow: 'inset 0 0 0 1px oklch(0.65 0.18 264 / 0.3)',
                    } : undefined}
                  >
                    <item.icon
                      className={cn(
                        'h-4 w-4 flex-shrink-0 transition-colors duration-200',
                        isActive ? 'text-indigo-300' : 'text-slate-500 group-hover:text-slate-300'
                      )}
                    />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>

          <div className="mt-8">
            <p className="px-3 text-xs font-semibold uppercase tracking-widest mb-2"
              style={{ color: 'oklch(0.45 0.03 250)' }}>
              Settings
            </p>
            <ul className="space-y-0.5">
              <li>
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    pathname === '/settings'
                      ? 'text-white'
                      : 'text-slate-400 hover:text-white hover:bg-white/8'
                  )}
                  style={pathname === '/settings' ? {
                    background: 'oklch(0.47 0.18 264 / 0.35)',
                    boxShadow: 'inset 0 0 0 1px oklch(0.65 0.18 264 / 0.3)',
                  } : undefined}
                >
                  <Settings
                    className={cn(
                      'h-4 w-4 flex-shrink-0',
                      pathname === '/settings' ? 'text-indigo-300' : 'text-slate-500 group-hover:text-slate-300'
                    )}
                  />
                  Settings
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        <div className="px-5 py-4 border-t border-white/8">
          <p className="text-xs" style={{ color: 'oklch(0.42 0.03 250)' }}>
            Local-first · Your data stays here
          </p>
        </div>
      </div>
    </>
  )
}
