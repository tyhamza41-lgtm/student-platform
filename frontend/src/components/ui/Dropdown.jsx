import {
  useEffect,
  useRef,
  useState,
  createContext,
  useContext,
  isValidElement,
  cloneElement,
} from 'react'
import { cn } from '../../utils/cn'

const DropdownContext = createContext(null)

function Dropdown({
  trigger,
  children,
  align = 'right',
  className,
  closeOnClick = true,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)

  const getMenuItems = () => {
    if (!menuRef.current) return []
    return Array.from(
      menuRef.current.querySelectorAll('[role="menuitem"]:not([disabled])'),
    )
  }

  const focusMenuItem = (index) => {
    const items = getMenuItems()
    if (items.length === 0) return
    const safeIndex = (index + items.length) % items.length
    items[safeIndex]?.focus()
  }

  const closeAndRestoreFocus = () => {
    setIsOpen(false)
    const triggerTarget = triggerRef.current?.querySelector('button, [tabindex="0"]') || triggerRef.current
    triggerTarget?.focus()
  }

  const toggle = () => {
    setIsOpen((previous) => !previous)
  }

  const close = () => {
    setIsOpen(false)
  }

  const handleTriggerKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setIsOpen(true)
      setTimeout(() => {
        focusMenuItem(0)
      }, 15)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setIsOpen(true)
      setTimeout(() => {
        const items = getMenuItems()
        focusMenuItem(items.length - 1)
      }, 15)
    }
  }

  const handleMenuKeyDown = (event) => {
    const items = getMenuItems()
    const currentIndex = items.indexOf(document.activeElement)

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusMenuItem(currentIndex + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusMenuItem(currentIndex - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusMenuItem(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusMenuItem(items.length - 1)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      closeAndRestoreFocus()
    } else if (event.key === 'Tab') {
      setIsOpen(false)
    }
  }

  useEffect(() => {
    if (!isOpen) return

    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        closeAndRestoreFocus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const isStringTrigger = typeof trigger === 'string'
  const isInteractiveElement = isValidElement(trigger) && (
    trigger.type === 'button' ||
    trigger.type === 'a' ||
    trigger.props?.role === 'button' ||
    trigger.type?.name === 'Button' ||
    trigger.type?.name === 'IconButton'
  )

  const renderTrigger = () => {
    if (isStringTrigger) {
      return (
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="menu"
          aria-expanded={isOpen}
          onClick={toggle}
          onKeyDown={handleTriggerKeyDown}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          {trigger}
        </button>
      )
    }

    if (isInteractiveElement) {
      // Wrapper without nested button/tabIndex to avoid invalid nested interactive elements
      return (
        <div
          ref={triggerRef}
          onClick={toggle}
          onKeyDown={handleTriggerKeyDown}
          aria-haspopup="menu"
          aria-expanded={isOpen}
          className="inline-flex cursor-pointer"
        >
          {cloneElement(trigger, {
            'aria-haspopup': 'menu',
            'aria-expanded': isOpen,
          })}
        </div>
      )
    }

    // Generic non-interactive elements (spans, icons, avatars)
    return (
      <div
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={toggle}
        onKeyDown={handleTriggerKeyDown}
        className="inline-flex cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg"
      >
        {trigger}
      </div>
    )
  }

  return (
    <DropdownContext.Provider value={{ isOpen, close, closeOnClick }}>
      <div ref={dropdownRef} className="relative inline-block text-left">
        {renderTrigger()}

        {isOpen && (
          <div
            ref={menuRef}
            role="menu"
            aria-orientation="vertical"
            tabIndex={-1}
            onKeyDown={handleMenuKeyDown}
            className={cn(
              'absolute top-full z-40 mt-1.5 min-w-48 py-1',
              'rounded-xl border border-slate-200 bg-white shadow-lg outline-none',
              'transition-all duration-150 animate-in fade-in zoom-in-95',
              align === 'right' ? 'right-0' : 'left-0',
              className,
            )}
          >
            {children}
          </div>
        )}
      </div>
    </DropdownContext.Provider>
  )
}

function DropdownItem({
  children,
  onClick,
  disabled = false,
  danger = false,
  icon,
  className,
  ...props
}) {
  const context = useContext(DropdownContext)

  const handleClick = (event) => {
    if (disabled) return
    if (onClick) onClick(event)
    if (context?.closeOnClick && !event.defaultPrevented) {
      context.close()
    }
  }

  return (
    <button
      type="button"
      role="menuitem"
      tabIndex={-1}
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        'w-full flex items-center gap-2.5 px-3 py-2 text-left text-sm font-medium',
        'transition-colors duration-150 outline-none cursor-pointer',
        'disabled:cursor-not-allowed disabled:opacity-50',
        danger
          ? 'text-red-600 hover:bg-red-50 focus-visible:bg-red-50 focus:bg-red-50'
          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 focus-visible:bg-slate-100 focus:bg-slate-100 focus:text-slate-900',
        className,
      )}
      {...props}
    >
      {icon && <span className="size-4 shrink-0 text-slate-400">{icon}</span>}
      <span className="flex-1 truncate">{children}</span>
    </button>
  )
}

function DropdownHeader({ children, className, ...props }) {
  return (
    <div
      className={cn('px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider', className)}
      {...props}
    >
      {children}
    </div>
  )
}

function DropdownDivider({ className, ...props }) {
  return (
    <div
      role="separator"
      className={cn('my-1 h-px bg-slate-100', className)}
      {...props}
    />
  )
}

Dropdown.Item = DropdownItem
Dropdown.Header = DropdownHeader
Dropdown.Divider = DropdownDivider

export { DropdownItem, DropdownHeader, DropdownDivider }
export default Dropdown
