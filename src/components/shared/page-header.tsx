import { ReactNode } from 'react'

interface PageHeaderProps {
  title: string
  eyebrow?: string
  description?: string
  action?: ReactNode
}

export function PageHeader({ title, eyebrow, description, action }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-7">
      <div>
        {eyebrow && (
          <p className="eyebrow mb-2">{eyebrow}</p>
        )}
        <h1
          className="font-serif font-medium leading-[1.05]"
          style={{ fontSize: '28px', letterSpacing: '-0.02em', color: 'var(--ink)' }}
        >
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: 'var(--ink-3)', maxWidth: '560px' }}>
            {description}
          </p>
        )}
      </div>
      {action && <div className="ml-6 flex-shrink-0 mt-0.5">{action}</div>}
    </div>
  )
}
