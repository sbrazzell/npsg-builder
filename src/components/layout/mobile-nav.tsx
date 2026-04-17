'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Settings,
  Menu,
  X,
  BarChart2,
  ClipboardList,
  FileText,
} from 'lucide-react'

const navItems = [
  { href: '/',              label: 'Dashboard',       icon: LayoutDashboard },
  { href: '/organizations', label: 'Organizations',   icon: Building2 },
  { href: '/facilities',    label: 'Facilities',      icon: MapPin },
  { href: '/analyzer',      label: 'Analyzer',        icon: BarChart2 },
  { href: '/readiness',     label: 'Readiness',       icon: ClipboardList },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded-sm hover:bg-black/5 md:hidden transition-colors"
        style={{ color: 'var(--ink-3)' }}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          style={{ background: 'rgba(26,24,20,0.4)', backdropFilter: 'blur(2px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          'fixed top-0 left-0 h-full w-[248px] z-50 flex flex-col transition-transform duration-200 md:hidden',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
        style={{ background: 'var(--paper-2)', borderRight: '1px solid var(--rule)' }}
      >
        {/* Brand */}
        <div className="px-[22px] py-[18px] border-b flex gap-3 items-start justify-between"
          style={{ borderColor: 'var(--rule)' }}>
          <div className="flex gap-3 items-start">
            <div
              className="w-[34px] h-[34px] flex-shrink-0 flex items-center justify-center rounded-sm relative"
              style={{ background: 'var(--nav-accent)', color: '#fff' }}
            >
              <span className="font-serif font-bold text-[18px] leading-none">N</span>
              <span className="absolute inset-[3px] border border-white/20 rounded-[1px] pointer-events-none" />
            </div>
            <div>
              <p className="font-serif font-semibold text-[15px] leading-[1.15]"
                style={{ color: 'var(--ink)', letterSpacing: '-0.01em' }}>
                NSGP Builder
              </p>
              <p className="text-[10.5px] mt-0.5" style={{ color: 'var(--ink-3)' }}>
                Security Grant Planner
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-sm transition-colors mt-0.5"
            style={{ color: 'var(--ink-4)' }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-3.5 overflow-y-auto">
          <div className="mb-1">
            <p className="px-3 mb-2 font-mono-label" style={{ color: 'var(--ink-4)', fontSize: '10px' }}>
              Workspace
            </p>
            <ul className="space-y-0.5">
              {navItems.map((item) => {
                const isActive = item.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        'relative flex items-center gap-2.5 px-3 py-1.5 rounded-sm text-[13px] font-medium transition-colors duration-150',
                        isActive
                          ? 'bg-white text-[var(--ink)] shadow-[inset_0_0_0_1px_var(--rule)]'
                          : 'text-[var(--ink-3)] hover:bg-black/5 hover:text-[var(--ink)]'
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-[8px] bottom-[8px] w-[2px] rounded-r-[1px]"
                          style={{ background: 'var(--nav-accent)', transform: 'translateX(-12px)' }} />
                      )}
                      <item.icon className={cn('h-[15px] w-[15px] flex-shrink-0',
                        isActive ? 'text-[var(--nav-accent)]' : 'text-[var(--ink-4)]'
                      )} />
                      <span className="flex-1">{item.label}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="mt-6">
            <p className="px-3 mb-2 font-mono-label" style={{ color: 'var(--ink-4)', fontSize: '10px' }}>
              Review
            </p>
            <ul className="space-y-0.5">
              <li>
                <Link
                  href="/facilities"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-1.5 rounded-sm text-[13px] font-medium text-[var(--ink-3)] hover:bg-black/5 hover:text-[var(--ink)] transition-colors duration-150"
                >
                  <FileText className="h-[15px] w-[15px] flex-shrink-0 text-[var(--ink-4)]" />
                  <span>Filings &amp; Drafts</span>
                </Link>
              </li>
              <li>
                <Link
                  href="/settings"
                  onClick={() => setOpen(false)}
                  className={cn(
                    'relative flex items-center gap-2.5 px-3 py-1.5 rounded-sm text-[13px] font-medium transition-colors duration-150',
                    pathname === '/settings'
                      ? 'bg-white text-[var(--ink)] shadow-[inset_0_0_0_1px_var(--rule)]'
                      : 'text-[var(--ink-3)] hover:bg-black/5 hover:text-[var(--ink)]'
                  )}
                >
                  <Settings className={cn('h-[15px] w-[15px] flex-shrink-0',
                    pathname === '/settings' ? 'text-[var(--nav-accent)]' : 'text-[var(--ink-4)]'
                  )} />
                  <span>Settings</span>
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* Footer */}
        <div className="px-5 py-3 border-t" style={{ borderColor: 'var(--rule-2)' }}>
          <p className="text-[10.5px]" style={{ color: 'var(--ink-4)' }}>
            FY2026 Application Cycle
          </p>
        </div>
      </div>
    </>
  )
}
