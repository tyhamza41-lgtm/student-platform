import { useState, useRef, useId, useEffect } from 'react'
import { cn } from '../../utils/cn'

const positions = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}

function Tooltip({
  content,
  children,
  position = 'top',
  delay = 150,
  className,
}) {
  const [isVisible, setIsVisible] = useState(false)
  const timeoutRef = useRef(null)
  const tooltipId = useId()

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  // Dismiss tooltip on Escape key
  useEffect(() => {
    if (!isVisible) return

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        hideTooltip()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isVisible])

  if (!content) return children

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      <div
        className="inline-flex"
        aria-describedby={isVisible ? tooltipId : undefined}
      >
        {children}
      </div>

      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white shadow-md animate-in fade-in zoom-in-95 duration-150',
            positions[position] ?? positions.top,
            className,
          )}
        >
          {content}
        </div>
      )}
    </div>
  )
}

export default Tooltip
