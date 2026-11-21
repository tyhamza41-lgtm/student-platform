
import { cn } from '../../utils/cn'

const variants = {
  rectangular: 'rounded-lg',
  circular: 'rounded-full',
  text: 'rounded-md h-4 w-full',
}

function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
  style,
  ...props
}) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse bg-slate-200',
        variants[variant] ?? variants.rectangular,
        className,
      )}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  )
}

export default Skeleton
