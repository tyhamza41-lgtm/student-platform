import { useState, useId } from 'react'
import { cn } from '../../utils/cn'

const switchSizes = {
  sm: {
    track: 'w-8 h-4.5',
    thumb: 'size-3.5 translate-x-0.5',
    thumbChecked: 'translate-x-4',
  },
  md: {
    track: 'w-11 h-6',
    thumb: 'size-5 translate-x-0.5',
    thumbChecked: 'translate-x-5.5',
  },
  lg: {
    track: 'w-14 h-7.5',
    thumb: 'size-6.5 translate-x-0.5',
    thumbChecked: 'translate-x-7',
  },
}

function Switch({
  checked,
  defaultChecked = false,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  id,
  className,
  ...props
}) {
  const generatedId = useId()
  const switchId = id || (label ? `switch-${label.toString().toLowerCase().replace(/\s+/g, '-')}` : generatedId)

  const [internalChecked, setInternalChecked] = useState(defaultChecked)
  const isControlled = checked !== undefined
  const isChecked = isControlled ? checked : internalChecked

  const handleToggle = (e) => {
    if (disabled) return
    const nextChecked = !isChecked
    if (!isControlled) {
      setInternalChecked(nextChecked)
    }
    if (onChange) {
      onChange(nextChecked, e)
    }
  }

  const currentSize = switchSizes[size] ?? switchSizes.md

  return (
    <div className={cn('relative flex items-start gap-3', className)}>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={isChecked}
        disabled={disabled}
        onClick={handleToggle}
        aria-describedby={description ? `${switchId}-description` : undefined}
        className={cn(
          'relative inline-flex shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50 select-none',
          isChecked ? 'bg-violet-600' : 'bg-slate-200 hover:bg-slate-300',
          currentSize.track,
        )}
        {...props}
      >
        <span
          className={cn(
            'pointer-events-none inline-block transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
            'mt-0.5',
            isChecked ? currentSize.thumbChecked : currentSize.thumb,
          )}
        />
      </button>

      {(label || description) && (
        <div className="flex flex-col text-sm leading-5 select-none">
          {label && (
            <label
              htmlFor={switchId}
              className={cn(
                'font-medium text-slate-800 cursor-pointer',
                disabled && 'cursor-not-allowed opacity-60',
              )}
            >
              {label}
            </label>
          )}

          {description && (
            <span
              id={`${switchId}-description`}
              className="text-xs text-slate-500 mt-0.5"
            >
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default Switch
