import { cn } from '../../utils/cn'

const variants = {
  info: {
    container: 'bg-blue-50 text-blue-900 border-blue-200',
    iconColor: 'text-blue-600',
    defaultIcon: (
      <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
      </svg>
    ),
  },
  success: {
    container: 'bg-emerald-50 text-emerald-950 border-emerald-200',
    iconColor: 'text-emerald-600',
    defaultIcon: (
      <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
      </svg>
    ),
  },
  warning: {
    container: 'bg-amber-50 text-amber-950 border-amber-200',
    iconColor: 'text-amber-600',
    defaultIcon: (
      <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
      </svg>
    ),
  },
  danger: {
    container: 'bg-red-50 text-red-950 border-red-200',
    iconColor: 'text-red-600',
    defaultIcon: (
      <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
      </svg>
    ),
  },
  primary: {
    container: 'bg-violet-50 text-violet-950 border-violet-200',
    iconColor: 'text-violet-600',
    defaultIcon: (
      <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
      </svg>
    ),
  },
}

function Alert({
  variant = 'info',
  title,
  children,
  icon,
  onClose,
  action,
  className,
  ...props
}) {
  const currentVariant = variants[variant] ?? variants.info
  const renderedIcon = icon ?? currentVariant.defaultIcon

  return (
    <div
      role="alert"
      className={cn(
        'relative flex items-start gap-3 rounded-xl border p-4 text-sm leading-normal',
        currentVariant.container,
        className,
      )}
      {...props}
    >
      {renderedIcon && (
        <div className={cn('shrink-0 pt-0.5', currentVariant.iconColor)}>
          {renderedIcon}
        </div>
      )}

      <div className="flex-1 space-y-1">
        {title && (
          <h4 className="font-semibold tracking-tight text-slate-900 leading-tight">
            {title}
          </h4>
        )}
        <div className="text-slate-700 leading-relaxed">{children}</div>
        {action && <div className="pt-2">{action}</div>}
      </div>

      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss alert"
          className="shrink-0 -mr-1 -mt-1 rounded-lg p-1.5 text-slate-400 hover:bg-black/5 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
        >
          <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default Alert
