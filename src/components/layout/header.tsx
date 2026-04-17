import Link from 'next/link'
import { ChevronRight, Home } from 'lucide-react'

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
    <header className="border-b border-border bg-white/80 backdrop-blur-sm px-6 py-2.5">
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="flex items-center hover:text-foreground transition-colors">
          <Home className="h-3 w-3" />
        </Link>
        {breadcrumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-1">
            <ChevronRight className="h-3 w-3 text-slate-300" />
            {crumb.href ? (
              <Link href={crumb.href} className="hover:text-foreground transition-colors font-medium">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-foreground font-semibold">{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>
    </header>
  )
}
