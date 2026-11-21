import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '../../utils/cn'
import { useFocusTrap } from './useFocusTrap'

const sizes = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
  xl: 'max-w-4xl',
  full: 'max-w-full m-4',
}

function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  className,
  initialFocusRef = null,
  ...props
}) {
  const dialogRef = useFocusTrap(isOpen, initialFocusRef)

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs transition-opacity duration-200"
      onClick={(event) => {
        if (event.target === event.currentTarget && onClose) {
          onClose()
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby={props['aria-labelledby'] || (title ? 'modal-title' : undefined)}
        aria-describedby={props['aria-describedby'] || (description ? 'modal-description' : undefined)}
        className={cn(
          'w-full rounded-2xl bg-white shadow-2xl border border-slate-200 outline-none',
          'transition-all duration-200 animate-in fade-in zoom-in-95',
          sizes[size] ?? sizes.md,
          className,
        )}
        {...props}
      >
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4.5">
            <div>
              {title && (
                <h2 id="modal-title" className="text-lg font-semibold text-slate-900">
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="mt-1 text-sm text-slate-500">
                  {description}
                </p>
              )}
            </div>

            {showCloseButton && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
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

        <div className="p-6">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function ModalHeader({ className, children, ...props }) {
  return (
    <div
      className={cn('flex items-center justify-between border-b border-slate-100 px-6 py-4.5', className)}
      {...props}
    >
      {children}
    </div>
  )
}

function ModalBody({ className, children, ...props }) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  )
}

function ModalFooter({ className, children, ...props }) {
  return (
    <div
      className={cn('flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50/50 rounded-b-2xl', className)}
      {...props}
    >
      {children}
    </div>
  )
}

Modal.Header = ModalHeader
Modal.Body = ModalBody
Modal.Footer = ModalFooter

export { ModalHeader, ModalBody, ModalFooter }
export default Modal
