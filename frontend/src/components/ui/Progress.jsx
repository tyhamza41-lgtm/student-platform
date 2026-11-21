import { cn } from '../../utils/cn'

const variants = {
  primary: 'bg-violet-600',
  success: 'bg-emerald-600',
  warning: 'bg-amber-500',
  danger: 'bg-red-600',
  info: 'bg-blue-600',
}

const sizes = {
  xs: 'h-1',
  sm: 'h-1.5',
  md: 'h-2.5',
  lg: 'h-4',
}

function Progress({
  value = 0,
  max = 100,
  size = 'md',
  variant = 'primary',
  showValue = false,
  label,
  indeterminate = false,
  className,
  ...props
}) {
  const safeMax = typeof max === 'number' && max > 0 ? max : 100
  const safeValue = typeof value === 'number' && !Number.isNaN(value) ? Math.max(0, value) : 0
  const percentage = Math.min(100, Math.round((safeValue / safeMax) * 100))

  return (
    <div className={cn('w-full space-y-1.5', className)} {...props}>
      {(label || showValue) && (
        <div className="flex items-center justify-between text-xs font-medium text-slate-700">
          {label && <span>{label}</span>}
          {showValue && !indeterminate && (
            <span className="text-slate-500 tabular-nums">{percentage}%</span>
          )}
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label || 'Progress'}
        className={cn(
          'w-full overflow-hidden rounded-full bg-slate-100',
          sizes[size] ?? sizes.md,
        )}
      >
        {indeterminate ? (
          <div
            className={cn(
              'h-full w-1/3 animate-pulse rounded-full',
              variants[variant] ?? variants.primary,
            )}
          />
        ) : (
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300 ease-out',
              variants[variant] ?? variants.primary,
            )}
            style={{ width: `${percentage}%` }}
          />
        )}
      </div>
    </div>
  )
}

export default Progress
