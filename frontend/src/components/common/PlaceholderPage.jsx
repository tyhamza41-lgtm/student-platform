import { cn } from '../../utils/cn'

/**
 * PlaceholderPage — a minimal stub used during the layout phase.
 * Replace with the real page component once feature pages are implemented.
 */
function PlaceholderPage({ title, description }) {
  return (
    <div
      className={cn(
        'flex min-h-64 flex-col items-center justify-center rounded-xl',
        'border-2 border-dashed border-slate-200 bg-white px-6 py-12 text-center',
      )}
    >
      <div className="size-12 rounded-full bg-violet-50 flex items-center justify-center mb-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-6 text-violet-400"
          aria-hidden="true"
        >
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 9h6M9 12h6M9 15h4" />
        </svg>
      </div>
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>
      )}
      <p className="mt-4 text-xs text-slate-400 uppercase tracking-wide font-medium">
        Coming soon
      </p>
    </div>
  )
}

export default PlaceholderPage
