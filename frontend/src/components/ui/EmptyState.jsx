import { cn } from '../../utils/cn'
import Button from './Button'

function EmptyState({
  icon,
  title,
  description,
  action,
  actionLabel,
  onAction,
  actionVariant = 'primary',
  className,
  ...props
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center',
        className,
      )}
      {...props}
    >
      <div className="flex size-14 items-center justify-center rounded-2xl bg-violet-50 text-violet-600 mb-4 shadow-xs">
        {icon || (
          <svg
            className="size-7"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m6 4.125 2.25 2.25m0 0 2.25 2.25M12 13.875l2.25-2.25M12 13.875l-2.25 2.25M3.75 7.5h16.5M6 7.5V4.875C6 4.253 6.504 3.75 7.125 3.75h9.75c.621 0 1.125.504 1.125 1.125V7.5"
            />
          </svg>
        )}
      </div>

      {title && (
        <h3 className="text-base font-semibold text-slate-900 leading-tight">
          {title}
        </h3>
      )}

      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-slate-500 leading-relaxed">
          {description}
        </p>
      )}

      {(action || (actionLabel && onAction)) && (
        <div className="mt-5 flex items-center justify-center gap-3">
          {action || (
            <Button
              variant={actionVariant}
              onClick={onAction}
            >
              {actionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default EmptyState
