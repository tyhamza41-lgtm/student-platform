import { createContext, useContext, useState, useId } from 'react'
import { cn } from '../../utils/cn'

const AccordionContext = createContext(null)
const AccordionItemContext = createContext(null)

function Accordion({
  type = 'single',
  collapsible = true,
  defaultValue,
  value,
  onValueChange,
  children,
  className,
  ...props
}) {
  const initialValue = defaultValue !== undefined
    ? (Array.isArray(defaultValue) ? defaultValue : [defaultValue])
    : []

  const [internalValue, setInternalValue] = useState(initialValue)

  const isControlled = value !== undefined
  const activeValues = isControlled
    ? (Array.isArray(value) ? value : [value])
    : internalValue

  const toggleItem = (itemValue) => {
    let nextValues
    const isCurrentlyActive = activeValues.includes(itemValue)

    if (type === 'single') {
      if (isCurrentlyActive) {
        nextValues = collapsible ? [] : [itemValue]
      } else {
        nextValues = [itemValue]
      }
    } else {
      if (isCurrentlyActive) {
        nextValues = activeValues.filter((v) => v !== itemValue)
      } else {
        nextValues = [...activeValues, itemValue]
      }
    }

    if (!isControlled) {
      setInternalValue(nextValues)
    }

    if (onValueChange) {
      onValueChange(type === 'single' ? (nextValues[0] ?? null) : nextValues)
    }
  }

  return (
    <AccordionContext.Provider value={{ activeValues, toggleItem }}>
      <div
        className={cn('divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-xs', className)}
        {...props}
      >
        {children}
      </div>
    </AccordionContext.Provider>
  )
}

function AccordionItem({
  value,
  disabled = false,
  children,
  className,
  ...props
}) {
  const { activeValues, toggleItem } = useContext(AccordionContext)
  const isExpanded = activeValues.includes(value)
  const id = useId()
  const triggerId = `accordion-trigger-${id}`
  const contentId = `accordion-content-${id}`

  return (
    <AccordionItemContext.Provider
      value={{
        value,
        isExpanded,
        disabled,
        triggerId,
        contentId,
        toggle: () => !disabled && toggleItem(value),
      }}
    >
      <div className={cn('overflow-hidden first:rounded-t-xl last:rounded-b-xl', className)} {...props}>
        {children}
      </div>
    </AccordionItemContext.Provider>
  )
}

function AccordionTrigger({
  children,
  className,
  ...props
}) {
  const { isExpanded, disabled, triggerId, contentId, toggle } = useContext(AccordionItemContext)

  return (
    <button
      id={triggerId}
      type="button"
      aria-expanded={isExpanded}
      aria-controls={contentId}
      disabled={disabled}
      onClick={toggle}
      className={cn(
        'flex w-full items-center justify-between p-4.5 text-left text-sm font-semibold text-slate-800 transition-colors cursor-pointer select-none',
        'hover:bg-slate-50 hover:text-slate-900',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-inset',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      <svg
        className={cn(
          'size-4.5 text-slate-400 transition-transform duration-200 shrink-0',
          isExpanded && 'rotate-180 text-violet-600',
        )}
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
    </button>
  )
}

function AccordionContent({
  children,
  className,
  ...props
}) {
  const { isExpanded, triggerId, contentId } = useContext(AccordionItemContext)

  if (!isExpanded) return null

  return (
    <div
      id={contentId}
      role="region"
      aria-labelledby={triggerId}
      className={cn(
        'px-4.5 pb-4.5 pt-0 text-sm text-slate-600 leading-relaxed animate-in fade-in duration-150',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

Accordion.Item = AccordionItem
Accordion.Trigger = AccordionTrigger
Accordion.Content = AccordionContent

export {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
}

export default Accordion
