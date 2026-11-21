import { cn } from '../../utils/cn'

function Label({
  children,
  htmlFor,
  required = false,
  error = false,
  disabled = false,
  className,
  ...props
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={cn(
        'block text-sm font-medium leading-none select-none',
        error ? 'text-red-600' : 'text-slate-700',
        disabled && 'cursor-not-allowed opacity-60',
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-1 text-red-500" aria-hidden="true">
          *
        </span>
      )}
    </label>
  )
}

export default Label
