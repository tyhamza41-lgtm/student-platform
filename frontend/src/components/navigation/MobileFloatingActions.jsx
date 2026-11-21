import { Link } from 'react-router'
import NavigationIcon from './NavigationIcon'

function MobileFloatingActions({ actions = [] }) {
  if (actions.length === 0) {
    return null
  }

  return (
    <div
      role="group"
      aria-label="Quick actions"
      className="pointer-events-none fixed bottom-[calc(5rem+1px+env(safe-area-inset-bottom,0px))] right-4 z-40 flex flex-col items-end gap-3 lg:hidden"
    >
      {actions.map((action) => (
        <Link
          key={action.label}
          to={action.path}
          aria-label={action.label}
          title={action.label}
          className={[
            'group relative flex shrink-0 items-center justify-center rounded-full',
            'transition duration-200 ease-out hover:-translate-y-0.5 active:scale-95',
            'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-violet-300 focus-visible:ring-offset-2',
            'pointer-events-auto',
            action.primary
              ? 'size-14 bg-violet-600 text-white shadow-lg shadow-violet-900/20 hover:bg-violet-700'
              : 'size-12 border border-violet-200 bg-white text-violet-700 shadow-md shadow-slate-900/10 hover:bg-violet-50',
          ].join(' ')}
        >
          <NavigationIcon
            name={action.icon}
            className={action.primary ? 'size-6' : 'size-5'}
          />
          <span className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-md bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            {action.label}
          </span>
        </Link>
      ))}
    </div>
  )
}

export default MobileFloatingActions
