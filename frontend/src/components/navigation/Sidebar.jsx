import { NavLink } from 'react-router'
import { useAuth } from '../../context/AuthContext'
import { getNavigationItems, getUserRoleLabel } from '../../constants/navigation'
import { Avatar, Badge } from '../ui'
import NavigationIcon from './NavigationIcon'
import { cn } from '../../utils/cn'
import { ROUTES } from '../../constants/routes'

function SidebarNavItem({ item }) {
  return (
    <li>
      <NavLink
        to={item.path}
        end={item.end}
        className={({ isActive }) =>
          cn(
            'group flex h-11 items-center gap-3 rounded-lg px-3 text-[13px] font-semibold transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
            isActive
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
          )
        }
      >
        {({ isActive }) => (
          <>
            <NavigationIcon
              name={item.icon}
              className={cn(
                'size-5 shrink-0 transition-colors duration-150',
                isActive
                  ? 'text-indigo-600'
                  : 'text-slate-400 group-hover:text-slate-600',
              )}
            />
            <span className="truncate">{item.label}</span>
          </>
        )}
      </NavLink>
    </li>
  )
}

function Sidebar() {
  const { currentUser, logout } = useAuth()
  const navItems = getNavigationItems(currentUser)
  const roleLabel = getUserRoleLabel(currentUser)

  return (
    <aside
      role="complementary"
      aria-label="Main navigation"
      className={cn(
        'sticky top-0 hidden h-[calc(100vh-4rem)] w-[224px] flex-col bg-white lg:top-[72px] lg:h-[calc(100vh-6rem)] lg:flex',
        'border-r border-slate-200 lg:shadow-sm',
        'xl:top-5 xl:h-[calc(100vh-40px)] xl:w-full',
        'xl:rounded-2xl xl:border xl:border-slate-200/80',
        'xl:shadow-[0_12px_36px_rgba(15,23,42,0.045)]',
      )}
    >
      <div className="flex h-[72px] shrink-0 items-center border-b border-slate-100 px-6 xl:h-[76px] xl:px-5">
          <NavLink
            to={ROUTES.HOME}
            aria-label="Student Platform — go to home"
            className="flex items-center gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
          >
            <span className="flex size-9 items-center justify-center rounded-[10px] bg-indigo-600 text-white shadow-sm">
              <NavigationIcon name="cap" className="size-5" aria-hidden />
            </span>
            <span className="text-[15px] font-bold tracking-tight text-slate-900">
              Campus<span className="text-indigo-600">Space</span>
            </span>
          </NavLink>
      </div>

      <nav
        aria-label="Application navigation"
        className="flex flex-1 flex-col overflow-y-auto px-4 py-7 xl:px-4 xl:py-8"
      >
        <ul role="list" className="flex flex-col gap-0.5">
          {navItems.map((item) => (
            <SidebarNavItem key={item.path} item={item} />
          ))}
        </ul>
      </nav>

      {currentUser && (
        <div className="shrink-0 border-t border-slate-200 px-4 py-5 xl:border-slate-100">
          <div className="flex items-center gap-3 rounded-lg px-1 py-1">
            <Avatar
              src={currentUser.avatarUrl}
              name={currentUser.name || currentUser.email || ''}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {currentUser.name || currentUser.email}
              </p>
              <Badge variant="primary" size="xs" className="mt-0.5">
                {roleLabel}
              </Badge>
            </div>

            <button
              type="button"
              onClick={logout}
              aria-label="Sign out"
              className={cn(
                'shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors',
                'hover:bg-slate-100 hover:text-slate-700',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
              )}
            >
              <NavigationIcon name="log-out" className="size-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}

export default Sidebar
