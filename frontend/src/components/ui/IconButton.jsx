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
    'bg-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-violet-500 active:bg-slate-200',

  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 active:bg-red-800 shadow-sm',
}

const sizes = {
  xs: 'size-7 p-1 text-xs',
  sm: 'size-8 p-1.5 text-sm',
  md: 'size-10 p-2 text-base',
  lg: 'size-12 p-2.5 text-lg',
}

const roundedStyles = {
  full: 'rounded-full',
  lg: 'rounded-xl',
  md: 'rounded-lg',
}

function IconButton({
  ref,
  icon,
  children,
  'aria-label': ariaLabel,
  variant = 'ghost',
  size = 'md',
  rounded = 'lg',
  className,
  type = 'button',
  disabled = false,
  isLoading = false,
  ...props
}) {
  if (
    import.meta.env?.DEV &&
    !ariaLabel &&
    !props['aria-label'] &&
    !props['aria-labelledby']
  ) {
    console.warn(
      'IconButton: Missing "aria-label" or "aria-labelledby" prop. An accessible name is required for screen readers.',
    )
  }

  const isDisabled = disabled || isLoading
  const content = icon || children

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      aria-label={ariaLabel}
      aria-busy={isLoading || undefined}
      className={cn(
        'inline-flex shrink-0 items-center justify-center transition-colors duration-200 cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant] ?? variants.ghost,
        sizes[size] ?? sizes.md,
        roundedStyles[rounded] ?? roundedStyles.lg,
        className,
      )}
      {...props}
    >
      {isLoading ? (
        <Spinner
          size={size === 'lg' ? 'md' : 'xs'}
          color={
            variant === 'outline' || variant === 'ghost' || variant === 'secondary'
              ? 'current'
              : 'white'
          }
        />
      ) : (
        content
      )}
    </button>
  )
}

export default IconButton
