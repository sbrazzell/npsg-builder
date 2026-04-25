'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Building2,
  MapPin,
  Settings,
  BarChart2,
  ClipboardList,
  FileText,
  BookOpen,
  LogOut,
} from 'lucide-react'

const navItems = [
  { href: '/',              label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/organizations', label: 'Organizations', icon: Building2 },
  { href: '/sites',         label: 'Sites',        icon: MapPin },
  { href: '/analyzer',      label: 'Analyzer',     icon: BarChart2 },
  { href: '/readiness',     label: 'Readiness',    icon: ClipboardList },
  { href: '/guide',         label: 'Guide',        icon: BookOpen },
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
  const { days, pct } = getDeadlineInfo()
  const { data: session } = useSession()

  const userName = session?.user?.name ?? session?.user?.email ?? ''
  const userInitial = userName.charAt(0).toUpperCase()

  return (
    <aside
      className="w-[248px] min-h-screen flex flex-col border-r"
      style={{ background: 'var(--paper-2)', borderColor: 'var(--rule)' }}
    >
      {/* Brand */}
      <div className="px-[22px] py-[18px] border-b flex gap-3 items-start"
        style={{ borderColor: 'var(--rule)' }}>
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
                href='/sites'
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
      <div className="mx-3 mb-3 rounded-sm border overflow-hidden" style={{ borderColor: 'var(--rule)' }}>
        {/* Header strip */}
        <div
          className="px-3.5 py-2 flex items-center justify-between"
          style={{ background: 'var(--nav-accent)' }}
        >
          <p className="text-[9.5px] font-semibold tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>
            FY26 NSGP
          </p>
          <p className="text-[9.5px] font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Due May 29
          </p>
        </div>
        {/* Body */}
        <div className="bg-white px-3.5 py-3">
          <div className="flex items-baseline gap-1.5">
            <p
              className="font-serif font-semibold tabular-nums leading-none"
              style={{ fontSize: '40px', letterSpacing: '-0.03em', color: 'var(--ink)' }}
            >
              {days}
            </p>
            <p className="text-[12px] font-medium" style={{ color: 'var(--ink-3)' }}>days left</p>
          </div>
          {/* Progress bar */}
          <div className="mt-2.5 h-[3px] rounded-full overflow-hidden" style={{ background: 'var(--rule-2)' }}>
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                background: pct > 80 ? 'var(--bad)' : pct > 55 ? 'var(--warn)' : 'var(--nav-accent)',
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-[10px]" style={{ color: 'var(--ink-4)' }}>
            <span>Mar 3</span>
            <span>{pct}% elapsed</span>
          </div>
        </div>
      </div>

      {/* User section */}
      {session?.user && (
        <div
          className="mx-3 mb-4 flex items-center gap-2.5 px-3 py-2.5 rounded-sm"
          style={{ border: '1px solid var(--rule)', background: 'white' }}
        >
          {/* Avatar */}
          {session.user.image ? (
            <Image
              src={session.user.image}
              alt={userName}
              width={26}
              height={26}
              className="rounded-full flex-shrink-0"
            />
          ) : (
            <div
              className="w-[26px] h-[26px] rounded-full flex-shrink-0 flex items-center justify-center text-[11px] font-semibold"
              style={{ background: 'var(--nav-accent)', color: '#fff' }}
            >
              {userInitial}
            </div>
          )}
          {/* Name */}
          <p
            className="flex-1 min-w-0 text-[12px] font-medium truncate"
            style={{ color: 'var(--ink-2)' }}
          >
            {session.user.name ?? session.user.email}
          </p>
          {/* Sign out */}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            title="Sign out"
            className="flex-shrink-0 p-1 rounded-sm transition-colors hover:bg-[var(--paper-2)]"
            style={{ color: 'var(--ink-4)' }}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </aside>
  )
}
