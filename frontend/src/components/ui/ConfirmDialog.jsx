import { useRef } from 'react'
import Modal from './Modal'
import Button from './Button'

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  children,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
  size = 'sm',
  initialFocus = 'cancel',
  ...props
}) {
  const cancelBtnRef = useRef(null)
  const confirmBtnRef = useRef(null)

  const initialFocusRef = initialFocus === 'confirm' ? confirmBtnRef : cancelBtnRef

  const handleConfirm = async () => {
    if (onConfirm) {
      try {
        await onConfirm()
      } catch (error) {
        if (import.meta.env?.DEV) {
          console.error('ConfirmDialog action failed:', error)
        }
      }
    }
  }

  const iconColors = {
    danger: 'bg-red-100 text-red-600',
    warning: 'bg-amber-100 text-amber-600',
    primary: 'bg-violet-100 text-violet-600',
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      size={size}
      showCloseButton={false}
      initialFocusRef={initialFocusRef}
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      {...props}
    >
      <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3.5">
          <div
            className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${iconColors[variant] ?? iconColors.danger}`}
          >
            {variant === 'danger' ? (
              <svg
                className="size-5.5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.75"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            ) : variant === 'warning' ? (
              <svg
                className="size-5.5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.75"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z"
                />
              </svg>
            ) : (
              <svg
                className="size-5.5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.75"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
                />
              </svg>
            )}
          </div>

          <div className="space-y-1">
            <h3 id="confirm-dialog-title" className="text-base font-semibold text-slate-900 leading-tight">
              {title}
            </h3>
            <div id="confirm-dialog-description" className="text-sm text-slate-500 leading-relaxed">
              {children || message}
            </div>
          </div>
        </div>

        <div className="mt-6 flex w-full flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
          <Button
            ref={cancelBtnRef}
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </Button>
          <Button
            ref={confirmBtnRef}
            variant={variant}
            onClick={handleConfirm}
            isLoading={isLoading}
            className="w-full sm:w-auto"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default ConfirmDialog
