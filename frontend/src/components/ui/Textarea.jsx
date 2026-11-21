import { cn } from '../../utils/cn'
import { useFormField } from './formFieldContext'

function Textarea({
  ref,
  label,
  error,
  helperText,
  id,
  className,
  wrapperClassName,
  rows = 4,
  required,
  disabled,
  ...props
}) {
  const formField = useFormField()
  const isInsideFormField = Boolean(formField?.isInsideFormField)

  const effectiveId = id || formField?.fieldId || props.name
  const effectiveError = error || formField?.error
  const effectiveDisabled = disabled || formField?.disabled
  const effectiveRequired = required || formField?.required
  const effectiveDescriptionId = formField?.descriptionId || (effectiveError || helperText ? `${effectiveId}-description` : undefined)

  const textareaElement = (
    <textarea
      ref={ref}
      id={effectiveId}
      rows={rows}
      required={effectiveRequired}
      disabled={effectiveDisabled}
      aria-invalid={Boolean(effectiveError)}
      aria-describedby={effectiveDescriptionId}
      className={cn(
        'w-full rounded-lg border bg-white px-3.5 py-3 text-sm text-slate-900',
        'placeholder:text-slate-400',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500',
        'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60',
        'resize-y',
        effectiveError
          ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
          : 'border-slate-200 hover:border-slate-300',
        className,
      )}
      {...props}
    />
  )

  if (isInsideFormField) {
    return textareaElement
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

      {textareaElement}

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

export default Textarea
