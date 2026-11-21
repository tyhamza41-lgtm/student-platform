import { cn } from '../../utils/cn'

function Divider({
  orientation = 'horizontal',
  label,
  children,
  dashed = false,
  className,
  ...props
}) {
  const content = children || label

  if (orientation === 'vertical') {
    return (
      <div
        role="separator"
        aria-orientation="vertical"
        className={cn(
          'inline-block h-full min-h-[1rem] w-px self-stretch bg-slate-200',
          dashed && 'border-l border-dashed border-slate-300 bg-transparent',
          className,
        )}
        {...props}
      />
    )
  }

  if (content) {
    return (
      <div
        role="separator"
        aria-orientation="horizontal"
        className={cn('relative flex w-full items-center py-2', className)}
        {...props}
      >
        <div
          className={cn(
            'flex-grow border-t border-slate-200',
            dashed && 'border-dashed border-slate-300',
          )}
        />
        <span className="shrink-0 px-3 text-xs font-medium text-slate-500 select-none">
          {content}
        </span>
        <div
          className={cn(
            'flex-grow border-t border-slate-200',
            dashed && 'border-dashed border-slate-300',
          )}
        />
      </div>
    )
  }

  return (
    <hr
      role="separator"
      aria-orientation="horizontal"
      className={cn(
        'my-4 w-full border-0 border-t border-slate-200',
        dashed && 'border-dashed border-slate-300',
        className,
      )}
      {...props}
    />
  )
}

export default Divider
