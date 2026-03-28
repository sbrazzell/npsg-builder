import { cn } from '@/lib/utils'

interface ScoreDisplayProps {
  label: string
  value: number
  max?: number
  className?: string
}

export function ScoreDisplay({ label, value, max = 5, className }: ScoreDisplayProps) {
  const dots = Array.from({ length: max }, (_, i) => i < value)

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="text-sm text-muted-foreground w-24 truncate">{label}</span>
      <div className="flex gap-1">
        {dots.map((filled, i) => (
          <div
            key={i}
            className={cn(
              'w-3 h-3 rounded-full',
              filled ? 'bg-blue-500' : 'bg-gray-200'
            )}
          />
        ))}
      </div>
      <span className="text-sm font-medium text-gray-700">{value}/{max}</span>
    </div>
  )
}
