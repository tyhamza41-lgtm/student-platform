import { cn } from '../../utils/cn'
import Spinner from './Spinner'

const variants = {
  primary:
    'bg-violet-600 text-white hover:bg-violet-700 focus-visible:ring-violet-500 active:bg-violet-800 shadow-sm',

  secondary:
    'bg-slate-100 text-slate-700 hover:bg-slate-200 focus-visible:ring-slate-400 active:bg-slate-300',

  outline:
    'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 focus-visible:ring-violet-500 active:bg-slate-100 shadow-sm',

  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus-visible:ring-violet-500 active:bg-slate-200',

  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 active:bg-red-800 shadow-sm',

  success:
    'bg-emerald-600 text-white hover:bg-emerald-700 focus-visible:ring-emerald-500 active:bg-emerald-800 shadow-sm',

  warning:
    'bg-amber-600 text-white hover:bg-amber-700 focus-visible:ring-amber-500 active:bg-amber-800 shadow-sm',
}

const sizes = {
  xs: 'h-7 px-2.5 text-xs',
  sm: 'h-8 px-3 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
}

function Button({
  ref,
  children,
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  disabled = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  ...props
}) {
  const isDisabled = disabled || isLoading

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-busy={isLoading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
        variants[variant] ?? variants.primary,
        sizes[size] ?? sizes.md,
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <Spinner
            size={size === 'lg' ? 'md' : 'sm'}
            color={
              variant === 'outline' || variant === 'ghost' || variant === 'secondary'
                ? 'current'
                : 'white'
            }
          />
          <span>{children}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
          {children}
          {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
        </>
      )}
    </button>
  )
}

export default Button
