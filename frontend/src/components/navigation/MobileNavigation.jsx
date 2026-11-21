import { NavLink } from 'react-router'
import { useAuth } from '../../context/AuthContext'
import { getMobileNavigationItems } from '../../constants/navigation'
import NavigationIcon from './NavigationIcon'
import { cn } from '../../utils/cn'

function MobileNavItem({ item }) {
  return (
    <li className="flex flex-1">
      <NavLink
        to={item.path}
        end={item.end}
        className={({ isActive }) =>
          cn(
            'flex flex-1 flex-col items-center justify-center gap-1 py-2 px-1 text-xs font-medium transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-violet-500',
            isActive
              ? 'text-violet-600'
              : 'text-slate-500 hover:text-slate-800',
          )
        }
      >
        {({ isActive }) => (
          <>
            <NavigationIcon
              name={item.icon}
              className={cn(
                'size-5 shrink-0 transition-colors duration-150',
                isActive ? 'text-violet-600' : 'text-slate-400',
              )}
            />
            <span className="max-w-full truncate leading-tight">{item.label}</span>
          </>
        )}
      </NavLink>
    </li>
  )
}

function MobileNavigation() {
  const { currentUser } = useAuth()
  const mobileItems = getMobileNavigationItems(currentUser)

  if (mobileItems.length === 0) return null

  return (
    <nav
      aria-label="Mobile navigation"
      className={cn(
        'fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-sm',
        'safe-pb', // Respect safe area on devices with notch/home bar
        'lg:hidden', // Desktop uses sidebar
      )}
    >
      <ul
        role="list"
        className="flex h-16 items-stretch"
      >
        {mobileItems.map((item) => (
          <MobileNavItem
            key={item.path}
            item={item}
          />
        ))}
      </ul>
    </nav>
  )
}

export default MobileNavigation
