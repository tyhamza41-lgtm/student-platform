import { useEffect, useRef } from 'react'
import { cn } from '../../utils/cn'

function Checkbox({
  label,
  description,
  error,
  id,
  checked,
  defaultChecked,
  disabled = false,
  indeterminate = false,
  onChange,
  className,
  ...props
}) {
  const checkboxId = id || props.name || (label ? `checkbox-${label.toString().toLowerCase().replace(/\s+/g, '-')}` : undefined)
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = Boolean(indeterminate)
    }
  }, [indeterminate])

  return (
    <div className={cn('relative flex items-start gap-2.5', className)}>
      <div className="flex h-5 items-center">
        <input
          ref={inputRef}
          id={checkboxId}
          type="checkbox"
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          onChange={onChange}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error
              ? `${checkboxId}-error`
              : description
                ? `${checkboxId}-description`
                : undefined
          }
          className={cn(
            'size-4.5 rounded border transition-colors cursor-pointer',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-red-500 text-red-600 accent-red-600'
              : 'border-slate-300 text-violet-600 accent-violet-600 hover:border-slate-400',
          )}
          {...props}
        />
      </div>

      {(label || description || error) && (
        <div className="flex flex-col text-sm leading-5 select-none">
          {label && (
            <label
              htmlFor={checkboxId}
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
              id={`${checkboxId}-description`}
              className="text-xs text-slate-500 mt-0.5"
            >
              {description}
            </span>
          )}

          {error && (
            <span
              id={`${checkboxId}-error`}
              className="text-xs text-red-600 mt-0.5"
            >
              {error}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default Checkbox
