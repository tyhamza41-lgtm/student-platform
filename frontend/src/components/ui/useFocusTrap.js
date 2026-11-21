import { useLayoutEffect, useRef } from 'react'

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  'iframe',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]',
].join(', ')

function isVisible(element) {
  if (
    !element.isConnected ||
    element.closest('[hidden], [inert], [aria-hidden="true"]')
  ) {
    return false
  }

  const styles = window.getComputedStyle(element)

  return (
    styles.display !== 'none' &&
    styles.visibility !== 'hidden' &&
    styles.visibility !== 'collapse' &&
    element.getClientRects().length > 0
  )
}

function isFocusable(element) {
  return (
    !element.matches(':disabled, [aria-disabled="true"]') &&
    element.tabIndex >= 0 &&
    isVisible(element)
  )
}

function canRestoreFocus(element) {
  return (
    element &&
    element !== document.body &&
    element !== document.documentElement &&
    typeof element.focus === 'function' &&
    !element.matches(':disabled, [aria-disabled="true"]') &&
    isVisible(element)
  )
}

function focusElement(element) {
  element.focus({ preventScroll: true })
}

function getFocusableElements(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE_SELECTORS))
    .filter(isFocusable)
}

export function useFocusTrap(isOpen, initialFocusRef = null) {
  const containerRef = useRef(null)
  const previousFocusRef = useRef(null)
  const lastFocusedRef = useRef(null)

  useLayoutEffect(() => {
    if (!isOpen || typeof document === 'undefined') return

    const container = containerRef.current
    if (!container) return

    previousFocusRef.current = document.activeElement

    const getFocusable = () => getFocusableElements(container)
    const focusInitialElement = () => {
      const focusable = getFocusable()
      const initialElement = initialFocusRef?.current

      if (initialElement && focusable.includes(initialElement)) {
        focusElement(initialElement)
      } else if (focusable.length > 0) {
        focusElement(focusable[0])
      } else {
        focusElement(container)
      }
    }

    function handleFocusIn(event) {
      if (container.contains(event.target)) {
        if (isFocusable(event.target)) {
          lastFocusedRef.current = event.target
        }
        return
      }

      const focusable = getFocusable()
      const lastFocused = lastFocusedRef.current
      const target = lastFocused && focusable.includes(lastFocused)
        ? lastFocused
        : focusable[0] ?? container

      focusElement(target)
    }

    function handleKeyDown(event) {
      if (event.key !== 'Tab') return

      const focusable = getFocusable()
      if (focusable.length === 0) {
        event.preventDefault()
        focusElement(container)
        return
      }

      const activeIndex = focusable.indexOf(document.activeElement)
      if (activeIndex === -1) {
        event.preventDefault()
        focusElement(event.shiftKey ? focusable[focusable.length - 1] : focusable[0])
        return
      }

      if (event.shiftKey && activeIndex === 0) {
        event.preventDefault()
        focusElement(focusable[focusable.length - 1])
      } else if (!event.shiftKey && activeIndex === focusable.length - 1) {
        event.preventDefault()
        focusElement(focusable[0])
      }
    }

    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('keydown', handleKeyDown)
    focusInitialElement()

    return () => {
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('keydown', handleKeyDown)

      const previousFocus = previousFocusRef.current
      previousFocusRef.current = null
      lastFocusedRef.current = null

      if (canRestoreFocus(previousFocus)) {
        focusElement(previousFocus)
      }
    }
  }, [isOpen, initialFocusRef])

  return containerRef
}
