import { useId } from 'react'
import { cn } from '../../utils/cn'
import Label from './Label'
import { FormFieldContext } from './formFieldContext'

function FormField({
  label,
  error,
  helperText,
  required = false,
  disabled = false,
  id,
  children,
  className,
  orientation = 'vertical',
}) {
  const generatedId = useId()
  const fieldId = id || generatedId
  const descriptionId = `${fieldId}-description`
  const hasDescription = Boolean(error || helperText)

  return (
    <FormFieldContext.Provider
      value={{
        isInsideFormField: true,
        fieldId,
        error,
        helperText,
        required,
        disabled,
        descriptionId: hasDescription ? descriptionId : undefined,
      }}
    >
      <div
        className={cn(
          'w-full',
          orientation === 'horizontal'
            ? 'grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 sm:items-start'
            : 'space-y-1.5',
          className,
        )}
      >
        {label && (
          <div className={orientation === 'horizontal' ? 'sm:pt-2' : ''}>
            <Label
              htmlFor={fieldId}
              required={required}
              error={Boolean(error)}
              disabled={disabled}
            >
              {label}
            </Label>
          </div>
        )}

        <div className={orientation === 'horizontal' ? 'sm:col-span-2 space-y-1.5' : 'space-y-1.5'}>
          {children}

          {hasDescription && (
            <p
              id={descriptionId}
              className={cn(
                'text-xs',
                error ? 'text-red-600 font-medium' : 'text-slate-500',
              )}
            >
              {error || helperText}
            </p>
          )}
        </div>
      </div>
    </FormFieldContext.Provider>
  )
}

export default FormField
