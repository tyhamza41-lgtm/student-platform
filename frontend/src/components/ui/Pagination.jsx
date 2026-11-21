import { cn } from '../../utils/cn'

function generatePaginationRange(currentPage, totalPages, siblingCount = 1) {
  if (totalPages <= 0) return []

  const safeCurrentPage = Math.max(1, Math.min(currentPage, totalPages))
  const totalPageNumbers = siblingCount * 2 + 5 // siblings + current + first + last + 2 ellipses

  if (totalPages <= totalPageNumbers) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const leftSiblingIndex = Math.max(safeCurrentPage - siblingCount, 1)
  const rightSiblingIndex = Math.min(safeCurrentPage + siblingCount, totalPages)

  const shouldShowLeftDots = leftSiblingIndex > 2
  const shouldShowRightDots = rightSiblingIndex < totalPages - 2

  const firstPageIndex = 1
  const lastPageIndex = totalPages

  if (!shouldShowLeftDots && shouldShowRightDots) {
    const leftItemCount = 3 + 2 * siblingCount
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1)
    return [...leftRange, '...', totalPages]
  }

  if (shouldShowLeftDots && !shouldShowRightDots) {
    const rightItemCount = 3 + 2 * siblingCount
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => totalPages - rightItemCount + i + 1,
    )
    return [firstPageIndex, '...', ...rightRange]
  }

  if (shouldShowLeftDots && shouldShowRightDots) {
    const middleRange = Array.from(
      { length: Math.max(0, rightSiblingIndex - leftSiblingIndex + 1) },
      (_, i) => leftSiblingIndex + i,
    )
    return [firstPageIndex, '...', ...middleRange, '...', lastPageIndex]
  }

  return []
}

function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  siblingCount = 1,
  showPrevNext = true,
  showFirstLast = false,
  disabled = false,
  className,
  ...props
}) {
  if (!totalPages || totalPages <= 1) return null

  const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages))
  const paginationRange = generatePaginationRange(validCurrentPage, totalPages, siblingCount)

  const handlePageClick = (page) => {
    if (disabled || page < 1 || page > totalPages || page === validCurrentPage) return
    if (onPageChange) {
      onPageChange(page)
    }
  }

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn('flex items-center justify-center gap-1 select-none', className)}
      {...props}
    >
      {showFirstLast && (
        <button
          type="button"
          onClick={() => handlePageClick(1)}
          disabled={disabled || validCurrentPage === 1}
          aria-label="Go to first page"
          className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer"
        >
          «
        </button>
      )}

      {showPrevNext && (
        <button
          type="button"
          onClick={() => handlePageClick(validCurrentPage - 1)}
          disabled={disabled || validCurrentPage === 1}
          aria-label="Go to previous page"
          className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer"
        >
          <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {paginationRange.map((page, index) => {
        if (page === '...') {
          return (
            <span
              key={`ellipsis-${index}`}
              className="flex size-9 items-center justify-center text-sm font-medium text-slate-400"
            >
              …
            </span>
          )
        }

        const isCurrent = page === validCurrentPage

        return (
          <button
            key={`page-${page}`}
            type="button"
            onClick={() => handlePageClick(page)}
            disabled={disabled}
            aria-current={isCurrent ? 'page' : undefined}
            aria-label={`Page ${page}`}
            className={cn(
              'flex size-9 items-center justify-center rounded-lg text-sm font-medium transition-colors duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
              'disabled:pointer-events-none disabled:opacity-40 cursor-pointer',
              isCurrent
                ? 'bg-violet-600 text-white shadow-xs font-semibold'
                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900',
            )}
          >
            {page}
          </button>
        )
      })}

      {showPrevNext && (
        <button
          type="button"
          onClick={() => handlePageClick(validCurrentPage + 1)}
          disabled={disabled || validCurrentPage === totalPages}
          aria-label="Go to next page"
          className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer"
        >
          <svg className="size-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <path fillRule="evenodd" d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </button>
      )}

      {showFirstLast && (
        <button
          type="button"
          onClick={() => handlePageClick(totalPages)}
          disabled={disabled || validCurrentPage === totalPages}
          aria-label="Go to last page"
          className="flex size-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 cursor-pointer"
        >
          »
        </button>
      )}
    </nav>
  )
}

export default Pagination
