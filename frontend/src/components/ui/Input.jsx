import { useId } from 'react'
import { cn } from '../../utils/cn'
import { useFormField } from './formFieldContext'

const sizes = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-3.5 text-sm',
  lg: 'h-12 px-4 text-base',
}

function Input({
  ref,
  label,
  error,
  helperText,
  id,
  className,
  wrapperClassName,
  type = 'text',
  size = 'md',
  leftIcon,
  rightIcon,
  required,
  disabled,
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

  const inputElement = (
    <div className="relative flex items-center">
      {leftIcon && (
        <div className="pointer-events-none absolute left-3 flex items-center text-slate-400">
          {leftIcon}
        </div>
      )}

      <input
        ref={ref}
        id={effectiveId}
        type={type}
        required={effectiveRequired}
        disabled={effectiveDisabled}
        aria-invalid={Boolean(effectiveError)}
        aria-describedby={effectiveDescriptionId}
        className={cn(
          'w-full rounded-lg border bg-white text-slate-900',
          'placeholder:text-slate-400',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500',
          'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60',
          sizes[size] ?? sizes.md,
          leftIcon && 'pl-10',
          rightIcon && 'pr-10',
          effectiveError
            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
            : 'border-slate-200 hover:border-slate-300',
          className,
        )}
        {...props}
      />

      {rightIcon && (
        <div className="absolute right-3 flex items-center text-slate-400">
          {rightIcon}
        </div>
      )}
    </div>
  )

  if (isInsideFormField) {
    return inputElement
  }

  return (
    <div className={cn('w-full space-y-1.5', wrapperClassName)}>
      {label && (
        <label
          htmlFor={effectiveId}
          className="block text-sm font-medium text-slate-700"
        >
          {label}
          {effectiveRequired && (
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      {inputElement}

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

export default Input
