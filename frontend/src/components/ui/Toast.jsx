import { useState, useEffect } from 'react'
import { cn } from '../../utils/cn'

const variants = {
  info: {
    iconColor: 'text-blue-600 bg-blue-50',
    icon: (
      <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
      </svg>
    ),
  },
  success: {
    iconColor: 'text-emerald-600 bg-emerald-50',
    icon: (
      <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
      </svg>
    ),
  },
  warning: {
    iconColor: 'text-amber-600 bg-amber-50',
    icon: (
      <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
      </svg>
    ),
  },
  danger: {
    iconColor: 'text-red-600 bg-red-50',
    icon: (
      <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
      </svg>
    ),
  },
}

function Toast({
  variant = 'info',
  title,
  message,
  children,
  onClose,
  action,
  duration,
  className,
  ...props
}) {
  const [isPaused, setIsPaused] = useState(false)
  const currentVariant = variants[variant] ?? variants.info

  useEffect(() => {
    // Only set auto-dismiss if duration is a positive number and onClose is provided
    if (!duration || duration <= 0 || !onClose || isPaused) return

    const timer = setTimeout(() => {
      onClose()
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose, isPaused])

  return (
    <div
      role={variant === 'danger' ? 'alert' : 'status'}
      aria-live="polite"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={cn(
        'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg transition-all duration-200',
        className,
      )}
      {...props}
    >
      <div className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', currentVariant.iconColor)}>
        {currentVariant.icon}
      </div>

      <div className="flex-1 space-y-1 pt-0.5">
        {title && (
          <h4 className="text-sm font-semibold text-slate-900 leading-tight">
            {title}
          </h4>
        )}
        <div className="text-xs text-slate-600 leading-relaxed">
          {children || message}
        </div>
        {action && <div className="pt-2">{action}</div>}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss notification"
          className="shrink-0 -mr-1 -mt-1 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors cursor-pointer"
        >
          <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      )}
    </div>
  )
}

function ToastContainer({
  position = 'bottom-right',
  children,
  className,
  ...props
}) {
  const positions = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
    'top-center': 'top-4 left-1/2 -translate-x-1/2',
    'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2',
  }

  return (
    <div
      className={cn(
        'pointer-events-none fixed z-50 flex flex-col gap-2.5 max-w-sm w-full p-4 sm:p-0',
        positions[position] ?? positions['bottom-right'],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

Toast.Container = ToastContainer

export { ToastContainer }
export default Toast
