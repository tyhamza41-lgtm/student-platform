import { useState, useRef } from 'react'
import { cn } from '../../utils/cn'

const sizes = {
  sm: 'h-9 pl-9 pr-8 text-xs',
  md: 'h-11 pl-10 pr-9 text-sm',
  lg: 'h-12 pl-11 pr-10 text-base',
}

const iconSizes = {
  sm: 'size-4 left-2.5',
  md: 'size-4.5 left-3',
  lg: 'size-5 left-3.5',
}

function SearchInput({
  value,
  defaultValue = '',
  onChange,
  onClear,
  placeholder = 'Search...',
  size = 'md',
  disabled = false,
  className,
  wrapperClassName,
  ...props
}) {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const inputRef = useRef(null)

  const isControlled = value !== undefined
  const currentValue = isControlled ? value : internalValue
  const hasValue = Boolean(currentValue && currentValue.length > 0)

  const handleChange = (e) => {
    if (!isControlled) {
      setInternalValue(e.target.value)
    }
    if (onChange) {
      onChange(e)
    }
  }

  const handleClear = () => {
    if (!isControlled) {
      setInternalValue('')
    }
    if (onClear) {
      onClear()
    } else if (onChange) {
      const syntheticEvent = {
        target: { value: '' },
      }
      onChange(syntheticEvent)
    }
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && hasValue) {
      handleClear()
    }
    if (props.onKeyDown) {
      props.onKeyDown(e)
    }
  }

  return (
    <div className={cn('relative flex w-full items-center', wrapperClassName)}>
      <div
        className={cn(
          'pointer-events-none absolute flex items-center text-slate-400',
          iconSizes[size] ?? iconSizes.md,
        )}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
          className="size-full"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
          />
        </svg>
      </div>

      <input
        ref={inputRef}
        type="search"
        value={currentValue}
        disabled={disabled}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full rounded-lg border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400',
          'transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500',
          'hover:border-slate-300',
          'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60',
          sizes[size] ?? sizes.md,
          className,
        )}
        {...props}
      />

      {hasValue && !disabled && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2.5 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="size-4"
            aria-hidden="true"
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default SearchInput
