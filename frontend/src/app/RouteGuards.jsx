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
  const { isAuthenticated, isInitializing } = useAuth()
  const location = useLocation()

  if (isInitializing) {
    return <p role="status" className="p-6 text-center text-sm text-slate-500">Restoring your session…</p>
  }

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
  const { currentUser, isAuthenticated, isInitializing } = useAuth()

  if (isInitializing) {
    return <p role="status" className="p-6 text-center text-sm text-slate-500">Checking your session…</p>
  }

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
