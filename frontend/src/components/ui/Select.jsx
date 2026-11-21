import { useId } from 'react'
import { cn } from '../../utils/cn'
import { useFormField } from './formFieldContext'

const sizes = {
  sm: 'h-9 px-3 pr-8 text-xs',
  md: 'h-11 px-3.5 pr-10 text-sm',
  lg: 'h-12 px-4 pr-11 text-base',
}

function Select({
  ref,
  label,
  error,
  helperText,
  id,
  options = [],
  placeholder,
  disabled = false,
  required = false,
  size = 'md',
  className,
  wrapperClassName,
  children,
  ...props
}) {
  const generatedId = useId()
  const formField = useFormField()
  const isInsideFormField = Boolean(formField?.isInsideFormField)

  const effectiveId = id || formField?.fieldId || generatedId
  const effectiveError = error || formField?.error
  const effectiveDisabled = disabled || formField?.disabled
  const effectiveRequired = required || formField?.required
  const effectiveDescriptionId = formField?.descriptionId || (effectiveError || helperText ? `${effectiveId}-description` : undefined)

  const selectElement = (
    <div className="relative">
      <select
        ref={ref}
        id={effectiveId}
        disabled={effectiveDisabled}
        required={effectiveRequired}
        aria-invalid={Boolean(effectiveError)}
        aria-describedby={effectiveDescriptionId}
        className={cn(
          'w-full appearance-none rounded-lg border bg-white text-slate-900',
          'transition-colors duration-200 cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500',
          'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60',
          sizes[size] ?? sizes.md,
          effectiveError
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : 'border-slate-200 hover:border-slate-300',
          className,
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}

        {children ||
          options.map((option) => {
            if (typeof option === 'string') {
              return (
                <option key={option} value={option}>
                  {option}
                </option>
              )
            }
            return (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label ?? option.value}
              </option>
            )
          })}
      </select>

      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400">
        <svg
          className="size-4.5"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    </div>
  )

  if (isInsideFormField) {
    return selectElement
  }

  return (
    <div className={cn('w-full space-y-1.5', wrapperClassName)}>
      {label && (
        <label
          htmlFor={effectiveId}
          className="block text-sm font-medium text-slate-700 select-none"
        >
          {label}
          {effectiveRequired && (
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {selectElement}

      {(effectiveError || helperText) && (
        <p
          id={effectiveDescriptionId}
          className={cn(
            'text-xs',
            effectiveError ? 'text-red-600' : 'text-slate-500',
          )}
        >
          {effectiveError || helperText}
        </p>
      )}
    </div>
  )
}

export default Select
