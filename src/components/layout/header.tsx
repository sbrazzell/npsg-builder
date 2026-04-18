import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
}

interface HeaderProps {
  breadcrumbs?: BreadcrumbItem[]
}

export function Header({ breadcrumbs }: HeaderProps) {
  if (!breadcrumbs || breadcrumbs.length === 0) return null

  return (
    <header
      className="border-b px-8 py-2.5 sticky top-12 z-20"
      style={{ borderColor: 'var(--rule)', background: 'var(--paper)' }}
    >
      <nav className="flex items-center gap-1">
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-3 w-3 flex-shrink-0" style={{ color: 'var(--rule)' }} />
            )}
            {crumb.href ? (
              <Link
                href={crumb.href}
                className="text-[12.5px] font-medium transition-colors hover:text-[var(--ink)]"
                style={{ color: 'var(--ink-3)' }}
              >
                {crumb.label}
              </Link>
            ) : (
              <span className="text-[12.5px] font-medium" style={{ color: 'var(--ink)' }}>
                {crumb.label}
              </span>
            )}
          </span>
        ))}
      </nav>
    </header>
  )
}
