'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Settings,
  BarChart2,
  ClipboardList,
  FileText,
} from 'lucide-react'

const navItems = [
  { href: '/',              label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/organizations', label: 'Organizations', icon: Building2 },
  { href: '/facilities',    label: 'Facilities',   icon: MapPin },
  { href: '/analyzer',      label: 'Analyzer',     icon: BarChart2 },
  { href: '/readiness',     label: 'Readiness',    icon: ClipboardList },
]

// Days remaining until the NSGP deadline (hardcoded to FY26 target)
function getDeadlineInfo() {
  const deadline = new Date('2026-05-29')
  const today = new Date()
  const diff = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const opened = new Date('2026-03-03')
  const totalDays = Math.ceil((deadline.getTime() - opened.getTime()) / (1000 * 60 * 60 * 24))
  const elapsed = totalDays - Math.max(0, diff)
  const pct = Math.min(100, Math.round((elapsed / totalDays) * 100))
  return { days: Math.max(0, diff), pct, deadline }
}

function NavLink({ href, label, icon: Icon, isActive }: {
  href: string; label: string; icon: React.ElementType; isActive: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        'relative flex items-center gap-2.5 px-3 py-1.5 rounded-sm text-[13px] font-medium transition-colors duration-150',
        isActive
          ? 'bg-white text-[var(--ink)] shadow-[inset_0_0_0_1px_var(--rule)]'
          : 'text-[var(--ink-3)] hover:bg-black/5 hover:text-[var(--ink)]'
      )}
    >
      {/* Left accent bar for active item */}
      {isActive && (
        <span className="absolute left-0 top-[8px] bottom-[8px] w-[2px] rounded-r-[1px]"
          style={{ background: 'var(--nav-accent)', transform: 'translateX(-12px)' }} />
      )}
      <Icon className={cn('h-[15px] w-[15px] flex-shrink-0',
        isActive ? 'text-[var(--nav-accent)]' : 'text-[var(--ink-4)]'
      )} />
      <span className="flex-1">{label}</span>
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { days, pct, deadline } = getDeadlineInfo()

  return (
    <aside
      className="w-[248px] min-h-screen flex flex-col border-r"
      style={{ background: 'var(--paper-2)', borderColor: 'var(--rule)' }}
    >
      {/* Brand */}
      <div className="px-[22px] py-[18px] border-b flex gap-3 items-start"
        style={{ borderColor: 'var(--rule)' }}>
        {/* Serif "N" mark */}
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

      {/* Main nav */}
      <nav className="flex-1 px-3 py-3.5">
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
                  <NavLink {...item} isActive={isActive} />
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
              <NavLink
                href="/facilities"
                label="Filings & Drafts"
                icon={FileText}
                isActive={false}
              />
            </li>
            <li>
              <NavLink
                href="/settings"
                label="Settings"
                icon={Settings}
                isActive={pathname === '/settings'}
              />
            </li>
          </ul>
        </div>
      </nav>

      {/* Deadline countdown */}
      <div className="mx-3 mb-4 p-3.5 rounded-sm border bg-white"
        style={{ borderColor: 'var(--rule)' }}>
        <p className="eyebrow" style={{ fontSize: '9.5px' }}>FY26 NSGP · Submission due</p>
        <p className="font-serif font-semibold leading-none mt-1.5 tabular-nums"
          style={{ fontSize: '36px', letterSpacing: '-0.02em', color: 'var(--ink)' }}>
          {days}
        </p>
        <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--ink-3)' }}>days remaining</p>
        {/* Progress bar */}
        <div className="mt-2.5 h-[3px] rounded-full overflow-hidden" style={{ background: 'var(--rule-2)' }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--nav-accent)' }} />
        </div>
        <div className="flex justify-between mt-2 text-[10.5px]" style={{ color: 'var(--ink-3)' }}>
          <span>Opened Mar 3</span>
          <span>May 29</span>
        </div>
      </div>
    </aside>
  )
}
