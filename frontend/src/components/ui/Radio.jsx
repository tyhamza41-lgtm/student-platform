import { createContext, useContext, useState, useId } from 'react'
import { cn } from '../../utils/cn'

const RadioGroupContext = createContext(null)

function RadioGroup({
  name,
  value,
  defaultValue,
  onChange,
  disabled = false,
  orientation = 'vertical',
  label,
  children,
  className,
  ...props
}) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const isControlled = value !== undefined
  const currentValue = isControlled ? value : internalValue

  const handleValueChange = (nextVal) => {
    if (!isControlled) {
      setInternalValue(nextVal)
    }
    if (onChange) {
      onChange(nextVal)
    }
  }

  return (
    <RadioGroupContext.Provider
      value={{
        name,
        value: currentValue,
        onChange: handleValueChange,
        disabled,
      }}
    >
      <div
        role="radiogroup"
        aria-label={typeof label === 'string' ? label : undefined}
        className={cn('space-y-2', className)}
        {...props}
      >
        {label && (
          <span className="block text-sm font-medium text-slate-700 select-none mb-1">
            {label}
          </span>
        )}
        <div
          className={cn(
            'flex',
            orientation === 'horizontal' ? 'flex-row gap-4 flex-wrap' : 'flex-col space-y-2.5',
          )}
        >
          {children}
        </div>
      </div>
    </RadioGroupContext.Provider>
  )
}

function Radio({
  label,
  description,
  id,
  name,
  value,
  checked,
  defaultChecked,
  disabled = false,
  onChange,
  className,
  ...props
}) {
  const generatedId = useId()
  const context = useContext(RadioGroupContext)

  const radioName = name || context?.name
  const isGrouped = Boolean(context)
  const isDisabled = disabled || context?.disabled || false

  // In a RadioGroup, the group context controls selection state
  const isChecked = isGrouped
    ? context.value === value
    : checked

  const handleChange = (e) => {
    if (isDisabled) return
    if (onChange) onChange(e)
    if (context?.onChange) context.onChange(value)
  }

  const radioId = id || (radioName && value !== undefined ? `${radioName}-${value}` : generatedId)

  return (
    <div className={cn('relative flex items-start gap-2.5', className)}>
      <div className="flex h-5 items-center">
        <input
          id={radioId}
          type="radio"
          name={radioName}
          value={value}
          disabled={isDisabled}
          onChange={handleChange}
          aria-describedby={description ? `${radioId}-description` : undefined}
          className={cn(
            'size-4.5 rounded-full border border-slate-300 text-violet-600 accent-violet-600 cursor-pointer transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
          {...(isGrouped
            ? { checked: isChecked }
            : checked !== undefined
              ? { checked }
              : { defaultChecked })}
          {...props}
        />
      </div>

      {(label || description) && (
        <div className="flex flex-col text-sm leading-5 select-none">
          {label && (
            <label
              htmlFor={radioId}
              className={cn(
                'font-medium text-slate-800 cursor-pointer',
                isDisabled && 'cursor-not-allowed opacity-60',
              )}
            >
              {label}
            </label>
          )}

          {description && (
            <span
              id={`${radioId}-description`}
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

Radio.Group = RadioGroup

export { RadioGroup }
export default Radio
