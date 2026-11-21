import { useState, useRef, useId } from 'react'
import { cn } from '../../utils/cn'

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

/**
 * Validates a file against an accept string (extensions like .png, .pdf or MIME types like image/*, application/pdf).
 * NOTE: Client-side validation improves user experience by filtering invalid files early,
 * but it must always be backed by rigorous server-side file inspection and virus scanning.
 */
function isFileTypeAccepted(file, accept) {
  if (!accept) return true
  const patterns = accept.split(',').map((p) => p.trim().toLowerCase())
  const fileName = file.name.toLowerCase()
  const fileType = file.type.toLowerCase()

  return patterns.some((pattern) => {
    if (pattern.startsWith('.')) {
      return fileName.endsWith(pattern)
    }
    if (pattern.endsWith('/*')) {
      const typePrefix = pattern.slice(0, -1)
      return fileType.startsWith(typePrefix)
    }
    return fileType === pattern
  })
}

function FileUpload({
  files,
  value,
  defaultFiles,
  label,
  helperText = 'SVG, PNG, JPG, or PDF (up to 10MB)',
  error,
  accept,
  multiple = false,
  maxSize,
  disabled = false,
  required = false,
  onChange,
  onFilesSelected,
  id,
  className,
  ...props
}) {
  const generatedId = useId()
  const uploadId = id || (label ? `upload-${label.toString().toLowerCase().replace(/\s+/g, '-')}` : generatedId)

  const [selectedFiles, setSelectedFiles] = useState(defaultFiles || [])
  const [isDragOver, setIsDragOver] = useState(false)
  const [fileError, setFileError] = useState(null)
  const fileInputRef = useRef(null)

  const isControlled = files !== undefined || value !== undefined
  const currentFiles = isControlled ? (files || value || []) : selectedFiles

  const handleFiles = (fileList) => {
    if (!fileList || fileList.length === 0) return

    const incoming = Array.from(fileList)
    const validFiles = []
    const errorMessages = []

    for (const file of incoming) {
      if (maxSize && file.size > maxSize) {
        errorMessages.push(`"${file.name}" exceeds the maximum allowed size of ${formatBytes(maxSize)}.`)
        continue
      }
      if (accept && !isFileTypeAccepted(file, accept)) {
        errorMessages.push(`"${file.name}" is not an accepted format (${accept}).`)
        continue
      }
      validFiles.push(file)
    }

    if (errorMessages.length > 0) {
      setFileError(errorMessages.join(' '))
    } else {
      setFileError(null)
    }

    if (validFiles.length > 0) {
      const updated = multiple ? [...currentFiles, ...validFiles] : validFiles
      if (!isControlled) {
        setSelectedFiles(updated)
      }
      if (onChange) onChange(updated)
      if (onFilesSelected) onFilesSelected(updated)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (disabled) return
    if (e.dataTransfer?.files) {
      handleFiles(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) {
      setIsDragOver(true)
    }
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleRemoveFile = (indexToRemove, e) => {
    e.stopPropagation()
    const updated = currentFiles.filter((_, idx) => idx !== indexToRemove)
    if (!isControlled) {
      setSelectedFiles(updated)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    if (onChange) onChange(updated)
    if (onFilesSelected) onFilesSelected(updated)
  }

  const handleClickZone = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleKeyDown = (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault()
      fileInputRef.current?.click()
    }
  }

  const displayError = error || fileError

  return (
    <div className={cn('w-full space-y-2', className)}>
      {label && (
        <label
          htmlFor={uploadId}
          className="block text-sm font-medium text-slate-700 select-none"
        >
          {label}
          {required && (
            <span className="ml-1 text-red-500" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClickZone}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-disabled={disabled}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition-colors duration-200 cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2',
          isDragOver
            ? 'border-violet-500 bg-violet-50/50'
            : displayError
              ? 'border-red-300 bg-red-50/20 hover:border-red-400'
              : 'border-slate-300 bg-slate-50/50 hover:border-violet-400 hover:bg-slate-50',
          disabled && 'cursor-not-allowed opacity-60 bg-slate-100 hover:border-slate-300 hover:bg-slate-100',
        )}
      >
        <input
          ref={fileInputRef}
          id={uploadId}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
          {...props}
        />

        <div className="flex size-11 items-center justify-center rounded-full bg-violet-100 text-violet-600 mb-3">
          <svg
            className="size-6"
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
              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
            />
          </svg>
        </div>

        <p className="text-sm font-medium text-slate-800">
          <span className="text-violet-600 hover:text-violet-700 underline font-semibold">
            Click to upload
          </span>{' '}
          or drag and drop
        </p>

        {helperText && (
          <p className="text-xs text-slate-500 mt-1">{helperText}</p>
        )}
      </div>

      {displayError && (
        <p className="text-xs text-red-600 font-medium">{displayError}</p>
      )}

      {currentFiles.length > 0 && (
        <ul className="mt-3 divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {currentFiles.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between p-3 text-sm"
            >
              <div className="flex items-center space-x-2.5 truncate">
                <svg
                  className="size-5 text-slate-400 shrink-0"
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
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
                <div className="truncate">
                  <p className="truncate font-medium text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
                </div>
              </div>

              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => handleRemoveFile(index, e)}
                  aria-label={`Remove ${file.name}`}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 transition-colors cursor-pointer"
                >
                  <svg
                    className="size-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                  </svg>
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default FileUpload
