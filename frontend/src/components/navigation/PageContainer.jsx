import { cn } from '../../utils/cn'

/**
 * PageContainer
 *
 * A standardised content wrapper that constrains max-width, applies consistent
 * horizontal padding, and adds bottom padding to clear the mobile bottom nav bar.
 *
 * @param {React.ReactNode} children
 * @param {'sm'|'md'|'lg'|'xl'|'2xl'|'full'} maxWidth – controls the max-width constraint
 * @param {string}  className  – additional classes passed through to the root element
 * @param {boolean} noPadding  – disables default horizontal padding (for full-bleed sections)
 */
function PageContainer({
  children,
  maxWidth = '2xl',
  className,
  noPadding = false,
  ...props
}) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full',
  }

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className={cn(
        'mx-auto w-full flex-1',
        // Responsive horizontal padding
        !noPadding && 'px-4 sm:px-6 lg:px-8 xl:px-8',
        // Top padding
        'py-8 sm:py-9',
        // Clear the mobile nav and its safe-area padding.
        'mobile-nav-clearance lg:pb-8',
        // Max-width constraint
        maxWidthClasses[maxWidth] ?? maxWidthClasses.xl,
        className,
      )}
      {...props}
    >
      {children}
    </main>
  )
}

export default PageContainer
