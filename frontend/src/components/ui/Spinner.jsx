
import { cn } from '../../utils/cn'

const sizes = {
  xs: 'size-3.5 border-2',
  sm: 'size-4 border-2',
  md: 'size-6 border-2',
  lg: 'size-8 border-3',
  xl: 'size-10 border-4',
}

const colors = {
  primary: 'border-slate-200 border-t-violet-600',
  white: 'border-white/30 border-t-white',
  current: 'border-current/20 border-t-current',
  slate: 'border-slate-200 border-t-slate-700',
}

function Spinner({
  size = 'md',
  color = 'primary',
  className,
  label = 'Loading...',
}) {
  return (
    <div
      role="status"
      aria-label={label}
      className={cn(
        'inline-block animate-spin rounded-full border-solid',
        sizes[size] ?? sizes.md,
        colors[color] ?? colors.primary,
        className,
      )}
    />
  )
}

export default Spinner
