import { useState } from 'react'
import { cn } from '../../utils/cn'

const sizes = {
  xs: 'size-7 text-xs',
  sm: 'size-9 text-sm',
  md: 'size-11 text-base',
  lg: 'size-14 text-lg',
  xl: 'size-20 text-2xl',
}

const statusSizes = {
  xs: 'size-2 border',
  sm: 'size-2.5 border-1.5',
  md: 'size-3 border-2',
  lg: 'size-3.5 border-2',
  xl: 'size-4 border-2',
}

const statusColors = {
  online: 'bg-emerald-500',
  offline: 'bg-slate-400',
  away: 'bg-amber-500',
  busy: 'bg-red-500',
}

/**
 * Validates that an image URL uses an allowed, safe scheme.
 * Allows http, https, data:image/*, blob, and relative path URLs.
 */
function isSafeImageUrl(url) {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()

  // Reject explicitly unsafe schemes
  if (/^(javascript|vbscript):/i.test(trimmed)) {
    return false
  }

  // Reject data URIs that are not image types
  if (/^data:/i.test(trimmed) && !/^data:image\//i.test(trimmed)) {
    return false
  }

  // Accept http, https, data:image, blob, and relative paths
  return (
    /^(https?:\/\/|data:image\/|blob:)/i.test(trimmed) ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../')
  )
}

function Avatar({
  src,
  alt = 'User avatar',
  name = '',
  size = 'md',
  status,
  className,
}) {
  const [hasError, setHasError] = useState(false)
  const [prevSrc, setPrevSrc] = useState(src)

  if (prevSrc !== src) {
    setPrevSrc(src)
    setHasError(false)
  }

  const initials = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')

  const isValidUrl = isSafeImageUrl(src)
  const showImage = src && isValidUrl && !hasError

  return (
    <div className="relative inline-block shrink-0">
      <div
        className={cn(
          'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
          'bg-violet-100 font-semibold text-violet-700 select-none',
          sizes[size] ?? sizes.md,
          className,
        )}
      >
        {showImage ? (
          <img
            src={src}
            alt={alt}
            className="size-full object-cover"
            onError={() => setHasError(true)}
          />
        ) : (
          <span aria-label={alt}>
            {initials || '?'}
          </span>
        )}
      </div>

      {status && statusColors[status] && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full border-white',
            statusSizes[size] ?? statusSizes.md,
            statusColors[status],
          )}
          aria-label={`Status: ${status}`}
        />
      )}
    </div>
  )
}

export default Avatar
