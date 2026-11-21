import { createContext, useContext, useState, useRef } from 'react'
import { cn } from '../../utils/cn'

const TabsContext = createContext(null)

function Tabs({
  value,
  defaultValue,
  onChange,
  onValueChange,
  variant = 'underline',
  items,
  children,
  className,
  ...props
}) {
  const initialValue = defaultValue !== undefined ? defaultValue : items?.[0]?.id ?? ''
  const [internalValue, setInternalValue] = useState(initialValue)

  const isControlled = value !== undefined
  const activeValue = isControlled ? value : internalValue

  const setActiveValue = (nextValue) => {
    if (!isControlled) {
      setInternalValue(nextValue)
    }
    if (onChange) onChange(nextValue)
    if (onValueChange) onValueChange(nextValue)
  }

  return (
    <TabsContext.Provider value={{ activeValue, setActiveValue, variant }}>
      <div className={cn('w-full', className)} {...props}>
        {items ? (
          <>
            <TabList>
              {items.map((item) => (
                <Tab
                  key={item.id}
                  value={item.id}
                  disabled={item.disabled}
                  icon={item.icon}
                  badge={item.badge}
                >
                  {item.label}
                </Tab>
              ))}
            </TabList>

            <div className="mt-4">
              {items.map((item) => (
                <TabPanel key={item.id} value={item.id}>
                  {item.content}
                </TabPanel>
              ))}
            </div>
          </>
        ) : (
          children
        )}
      </div>
    </TabsContext.Provider>
  )
}

function TabList({ children, className, ...props }) {
  const { variant } = useContext(TabsContext)
  const listRef = useRef(null)

  const handleKeyDown = (e) => {
    const list = listRef.current
    if (!list) return

    const tabs = Array.from(list.querySelectorAll('[role="tab"]:not([disabled])'))
    const activeIndex = tabs.findIndex((tab) => tab === document.activeElement)
    if (activeIndex === -1) return

    let nextIndex

    if (e.key === 'ArrowRight') {
      nextIndex = (activeIndex + 1) % tabs.length
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (activeIndex - 1 + tabs.length) % tabs.length
    } else if (e.key === 'Home') {
      nextIndex = 0
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1
    } else {
      return
    }

    e.preventDefault()
    tabs[nextIndex]?.focus()
    tabs[nextIndex]?.click()
  }

  return (
    <div
      ref={listRef}
      role="tablist"
      onKeyDown={handleKeyDown}
      className={cn(
        'flex items-center',
        variant === 'underline'
          ? 'border-b border-slate-200 gap-6'
          : 'rounded-xl bg-slate-100 p-1 gap-1',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function Tab({
  value,
  children,
  icon,
  badge,
  disabled = false,
  className,
  ...props
}) {
  const { activeValue, setActiveValue, variant } = useContext(TabsContext)
  const isSelected = activeValue === value

  const handleClick = () => {
    if (!disabled) {
      setActiveValue(value)
    }
  }

  return (
    <button
      type="button"
      role="tab"
      aria-selected={isSelected}
      aria-controls={`panel-${value}`}
      id={`tab-${value}`}
      tabIndex={isSelected ? 0 : -1}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'inline-flex items-center gap-2 font-medium transition-all duration-200 cursor-pointer select-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variant === 'underline'
          ? cn(
              'pb-3 pt-1 text-sm border-b-2 -mb-px',
              isSelected
                ? 'border-violet-600 text-violet-600 font-semibold'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800',
            )
          : cn(
              'rounded-lg px-3.5 py-1.5 text-xs sm:text-sm',
              isSelected
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:bg-slate-200/60 hover:text-slate-900',
            ),
        className,
      )}
      {...props}
    >
      {icon && <span className="size-4 shrink-0">{icon}</span>}
      <span>{children}</span>
      {badge !== undefined && (
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-semibold',
            isSelected
              ? 'bg-violet-100 text-violet-700'
              : 'bg-slate-200 text-slate-600',
          )}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

function TabPanel({
  value,
  children,
  className,
  ...props
}) {
  const { activeValue } = useContext(TabsContext)
  const isSelected = activeValue === value

  if (!isSelected) return null

  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      tabIndex={0}
      className={cn(
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg animate-in fade-in duration-150',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function TabPanels({ children, className, ...props }) {
  return (
    <div className={cn('mt-4', className)} {...props}>
      {children}
    </div>
  )
}

Tabs.List = TabList
Tabs.Tab = Tab
Tabs.Panels = TabPanels
Tabs.Panel = TabPanel

export { TabList, Tab, TabPanels, TabPanel }
export default Tabs
