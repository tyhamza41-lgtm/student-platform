import { useState, useRef, useEffect, isValidElement } from 'react'
import { cn } from '../../utils/cn'

const sidePositions = {
  bottom: {
    left: 'top-full left-0 mt-2',
    right: 'top-full right-0 mt-2',
    center: 'top-full left-1/2 -translate-x-1/2 mt-2',
  },
  top: {
    left: 'bottom-full left-0 mb-2',
    right: 'bottom-full right-0 mb-2',
    center: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  },
}

function Popover({
  trigger,
  children,
  side = 'bottom',
  align = 'center',
  isOpen,
  onOpenChange,
  className,
}) {
  const [internalOpen, setInternalOpen] = useState(false)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)

  const isControlled = isOpen !== undefined
  const open = isControlled ? isOpen : internalOpen

  const setOpen = (next) => {
    if (!isControlled) {
      setInternalOpen(next)
    }
    if (onOpenChange) {
      onOpenChange(next)
    }
  }

  useEffect(() => {
    if (!open) return

    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        if (!isControlled) {
          setInternalOpen(false)
        }
        if (onOpenChange) {
          onOpenChange(false)
        }
      }
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        if (!isControlled) {
          setInternalOpen(false)
        }
        if (onOpenChange) {
          onOpenChange(false)
        }
        const triggerTarget = triggerRef.current?.querySelector('button, [tabindex="0"]') || triggerRef.current
        triggerTarget?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open, isControlled, onOpenChange])

  const toggle = () => setOpen(!open)

  const isStringTrigger = typeof trigger === 'string'
  const isInteractiveElement = isValidElement(trigger) && (
    trigger.type === 'button' ||
    trigger.type === 'a' ||
    trigger.props?.role === 'button' ||
    trigger.type?.name === 'Button' ||
    trigger.type?.name === 'IconButton'
  )

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      toggle()
    }
  }

  const renderTrigger = () => {
    if (isStringTrigger) {
      return (
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={toggle}
          onKeyDown={handleKeyDown}
          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          {trigger}
        </button>
      )
    }

    if (isInteractiveElement) {
      return (
        <div
          ref={triggerRef}
          onClick={toggle}
          onKeyDown={handleKeyDown}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="inline-flex cursor-pointer"
        >
          {trigger}
        </div>
      )
    }

    return (
      <div
        ref={triggerRef}
        role="button"
        tabIndex={0}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={toggle}
        onKeyDown={handleKeyDown}
        className="inline-flex cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded-lg"
      >
        {trigger}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      {renderTrigger()}

      {open && (
        <div
          role="dialog"
          aria-modal="false"
          className={cn(
            'absolute z-50 min-w-56 rounded-xl border border-slate-200 bg-white p-4 shadow-xl',
            'transition-all duration-150 animate-in fade-in zoom-in-95',
            sidePositions[side]?.[align] ?? sidePositions.bottom.center,
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

export default Popover
