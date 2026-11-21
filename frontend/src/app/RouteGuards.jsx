import { Navigate, Outlet, useLocation } from 'react-router'
import { isRepresentative } from '../constants/navigation'
import { ROUTES } from '../constants/routes'
import { USER_ROLES } from '../constants/roles'
import { useAuth } from '../context/AuthContext'

function getRoleHomeRoute(user) {
  return user?.role === USER_ROLES.DIRECTOR
    ? ROUTES.DIRECTOR.DASHBOARD
    : ROUTES.FEED
}

export function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return (
      <Navigate
        to={ROUTES.AUTH.LOGIN}
        replace
        state={{ from: location }}
      />
    )
  }

  return children ?? <Outlet />
}

export function PublicOnlyRoute({ children }) {
  const { currentUser, isAuthenticated } = useAuth()

  return isAuthenticated
    ? <Navigate to={getRoleHomeRoute(currentUser)} replace />
    : children ?? <Outlet />
}

export function RequireRole({ roles = [], children }) {
  const { currentUser } = useAuth()

  return roles.includes(currentUser?.role)
    ? children
    : <Navigate to={getRoleHomeRoute(currentUser)} replace />
}

export function RequireRepresentative({ children }) {
  const { currentUser } = useAuth()

  return isRepresentative(currentUser)
    ? children
    : <Navigate to={getRoleHomeRoute(currentUser)} replace />
}
