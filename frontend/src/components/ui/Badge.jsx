
import { cn } from '../../utils/cn'

const variants = {
  default: 'bg-slate-100 text-slate-700 border-slate-200',
  primary: 'bg-violet-100 text-violet-700 border-violet-200',
  secondary: 'bg-slate-100 text-slate-800 border-slate-200',
  success: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  warning: 'bg-amber-100 text-amber-800 border-amber-200',
  danger: 'bg-red-100 text-red-700 border-red-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
  outline: 'bg-transparent text-slate-700 border-slate-300',
}

const dotColors = {
  default: 'bg-slate-500',
  primary: 'bg-violet-600',
  secondary: 'bg-slate-600',
  success: 'bg-emerald-600',
  warning: 'bg-amber-600',
  danger: 'bg-red-600',
  info: 'bg-blue-600',
  outline: 'bg-slate-500',
}

const sizes = {
  xs: 'px-2 py-0.5 text-[10px] gap-1',
  sm: 'px-2.5 py-0.5 text-xs gap-1.5',
  md: 'px-3 py-1 text-sm gap-1.5',
}

function Badge({
  children,
  variant = 'default',
  size = 'sm',
  dot = false,
  className,
  ...props
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border border-transparent transition-colors',
        variants[variant] ?? variants.default,
        sizes[size] ?? sizes.sm,
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'size-1.5 rounded-full shrink-0',
            dotColors[variant] ?? dotColors.default,
          )}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  )
}

export default Badge
