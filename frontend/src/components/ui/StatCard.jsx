import { cn } from '../../utils/cn'
import Card from './Card'
import Badge from './Badge'

function StatCard({
  title,
  value,
  icon,
  change,
  changeType = 'neutral',
  description,
  footer,
  className,
  ...props
}) {
  const changeVariants = {
    positive: {
      badgeVariant: 'success',
      icon: (
        <svg className="size-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M10 17a.75.75 0 0 1-.75-.75V5.612L5.29 9.77a.75.75 0 0 1-1.08-1.04l5.25-5.5a.75.75 0 0 1 1.08 0l5.25 5.5a.75.75 0 1 1-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0 1 10 17Z" clipRule="evenodd" />
        </svg>
      ),
    },
    negative: {
      badgeVariant: 'danger',
      icon: (
        <svg className="size-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clipRule="evenodd" />
        </svg>
      ),
    },
    neutral: {
      badgeVariant: 'default',
      icon: null,
    },
  }

  const currentChange = changeVariants[changeType] ?? changeVariants.neutral

  return (
    <Card
      className={cn('flex flex-col justify-between', className)}
      padding="md"
      {...props}
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          {title && (
            <span className="text-sm font-medium text-slate-500 truncate">
              {title}
            </span>
          )}
          {icon && (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              {icon}
            </div>
          )}
        </div>

        <div className="mt-2 flex items-baseline">
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </span>
        </div>

        {(change || description) && (
          <div className="mt-3 flex items-center gap-2 text-xs">
            {change && (
              <Badge
                variant={currentChange.badgeVariant}
                size="xs"
                className="gap-1 font-semibold"
              >
                {currentChange.icon}
                <span>{change}</span>
              </Badge>
            )}

            {description && (
              <span className="text-slate-500 truncate">
                {description}
              </span>
            )}
          </div>
        )}
      </div>

      {footer && (
        <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
          {footer}
        </div>
      )}
    </Card>
  )
}

export default StatCard
