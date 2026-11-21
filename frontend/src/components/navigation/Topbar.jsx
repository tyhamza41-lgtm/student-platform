import { useLocation, NavLink, useNavigate } from 'react-router'
import { useAuth } from '../../context/AuthContext'
import { getUserRoleLabel, isRepresentative } from '../../constants/navigation'
import { ROUTES } from '../../constants/routes'
import { USER_ROLES } from '../../constants/roles'
import { Avatar, Dropdown, DropdownItem, DropdownDivider, Badge } from '../ui'
import NavigationIcon from './NavigationIcon'
import UserSearch from './UserSearch'
import { cn } from '../../utils/cn'

function Topbar() {
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const roleLabel = getUserRoleLabel(currentUser)
  const creationAction = currentUser?.role === USER_ROLES.ASSOCIATION
    ? {
      label: 'Create Event',
      path: ROUTES.ASSOCIATION.CREATE_EVENT,
      icon: 'calendar-plus',
    }
    : isRepresentative(currentUser)
      ? {
        label: 'Create Issue',
        path: ROUTES.REPRESENTATIVE.CREATE_ISSUE,
        icon: 'message-square-plus',
      }
      : null
  const pageTitle = location.pathname === ROUTES.FEED
    ? 'Dashboard'
    : location.pathname === ROUTES.EVENTS
      ? 'Events'
      : location.pathname === ROUTES.ISSUES
        ? 'Class issues'
        : location.pathname === ROUTES.PROFILE
          ? 'Profile'
          : 'Student Platform'

  return (
    <header
      className="relative flex h-[72px] items-center gap-2 border-b border-slate-200/80 bg-white px-3 sm:gap-3 sm:px-5 lg:px-7 xl:h-[70px] xl:rounded-2xl xl:border xl:border-slate-200/80 xl:px-7 xl:shadow-[0_8px_24px_rgba(15,23,42,0.035)]"
      role="banner"
    >
      <NavLink
        to={ROUTES.HOME}
        aria-label="Student Platform — go to home"
        className="flex shrink-0 items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 lg:hidden"
      >
        <span className="flex size-9 items-center justify-center rounded-[10px] bg-indigo-600 text-white shadow-sm">
          <NavigationIcon name="cap" className="size-5" aria-hidden />
        </span>
        <span className="hidden text-[15px] font-bold tracking-tight text-slate-900 sm:inline">
          Campus<span className="text-indigo-600">Space</span>
        </span>
      </NavLink>

      <div className="hidden min-w-0 lg:block">
        <p className="truncate text-sm font-bold text-slate-900 sm:text-base">{pageTitle}</p>
        <p className="hidden text-xs text-slate-500 sm:block">Student workspace</p>
      </div>

      <UserSearch />

      <div className="hidden flex-1 lg:block" />

      {/* Right-side actions */}
      <div className="flex items-center gap-1.5">
        {/* Notifications placeholder */}
        <button
          type="button"
          aria-label="Notifications"
          className={cn(
            'relative inline-flex items-center justify-center rounded-lg p-2 text-slate-500',
            'transition-colors hover:bg-slate-100 hover:text-slate-800',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
          )}
        >
          <NavigationIcon name="bell" />
        </button>

        {/* User account dropdown */}
        {currentUser ? (
          <Dropdown
            align="right"
            trigger={
              <button
                type="button"
                className={cn(
                  'flex items-center gap-2 rounded-lg px-2 py-1.5',
                  'text-sm text-slate-700 transition-colors',
                  'hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
                )}
                aria-label="Open user menu"
              >
                <Avatar
                  src={currentUser.avatarUrl}
                  name={currentUser.name || currentUser.email || ''}
                  size="xs"
                />
                <span className="hidden max-w-32 truncate font-medium sm:block">
                  {currentUser.name || currentUser.email}
                </span>
                <NavigationIcon name="chevron-down" className="size-4 text-slate-400" aria-hidden />
              </button>
            }
          >
            <div className="px-3 py-2">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {currentUser.name || currentUser.email}
              </p>
              <div className="mt-0.5 flex items-center gap-1.5">
                <Badge variant="primary" size="xs">{roleLabel}</Badge>
              </div>
            </div>

            <DropdownDivider />

            {creationAction && (
              <>
                <DropdownItem
                  icon={<NavigationIcon name={creationAction.icon} className="size-4" />}
                  onClick={() => navigate(creationAction.path)}
                >
                  {creationAction.label}
                </DropdownItem>
                <DropdownDivider />
              </>
            )}

            <DropdownItem
              icon={<NavigationIcon name="user-round" className="size-4" />}
              onClick={() => navigate(ROUTES.PROFILE)}
            >
              My Profile
            </DropdownItem>

            <DropdownItem
              icon={<NavigationIcon name="settings" className="size-4" />}
              onClick={() => {}}
            >
              Settings
            </DropdownItem>

            <DropdownDivider />

            <DropdownItem
              danger
              icon={<NavigationIcon name="log-out" className="size-4" />}
              onClick={logout}
            >
              Sign out
            </DropdownItem>
          </Dropdown>
        ) : (
          <NavLink
            to={ROUTES.AUTH.LOGIN}
            className={cn(
              'inline-flex items-center rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white',
              'transition-colors hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500',
            )}
          >
            Sign in
          </NavLink>
        )}
      </div>
    </header>
  )
}

export default Topbar
