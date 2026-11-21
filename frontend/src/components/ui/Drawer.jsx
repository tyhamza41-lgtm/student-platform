import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../utils/cn'
import { useFocusTrap } from './useFocusTrap'

const positionClasses = {
  right: 'inset-y-0 right-0',
  left: 'inset-y-0 left-0',
  top: 'inset-x-0 top-0',
  bottom: 'inset-x-0 bottom-0',
}

const sizeClasses = {
  right: {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-xl',
    full: 'max-w-full',
  },
  left: {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-xl',
    full: 'max-w-full',
  },
  top: {
    sm: 'max-h-60',
    md: 'max-h-96',
    lg: 'max-h-[80vh]',
    full: 'max-h-full',
  },
  bottom: {
    sm: 'max-h-60',
    md: 'max-h-96',
    lg: 'max-h-[80vh]',
    full: 'max-h-full',
  },
}

function Drawer({
  isOpen,
  onClose,
  title,
  description,
  position = 'right',
  size = 'md',
  children,
  footer,
  className,
}) {
  const drawerRef = useFocusTrap(isOpen)

  useEffect(() => {
    if (!isOpen) return

    function handleKeyDown(event) {
      if (event.key === 'Escape' && onClose) {
        onClose()
      }
    }

    const originalOverflow = document.body.style.overflow
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen, onClose])

  if (!isOpen || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex bg-slate-900/50 backdrop-blur-xs transition-opacity duration-300"
      onClick={(event) => {
        if (event.target === event.currentTarget && onClose) {
          onClose()
        }
      }}
    >
      <div
        ref={drawerRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
        aria-describedby={description ? 'drawer-description' : undefined}
        className={cn(
          'fixed flex flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out w-full outline-none',
          positionClasses[position] ?? positionClasses.right,
          sizeClasses[position]?.[size] ?? sizeClasses.right.md,
          className,
        )}
      >
        {(title || onClose) && (
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              {title && (
                <h2 id="drawer-title" className="text-lg font-semibold text-slate-900">
                  {title}
                </h2>
              )}
              {description && (
                <p id="drawer-description" className="mt-0.5 text-xs text-slate-500">
                  {description}
                </p>
              )}
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close drawer"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors cursor-pointer"
              >
                <svg
                  className="size-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {footer && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}

export default Drawer
