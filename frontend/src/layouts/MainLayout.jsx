import { Outlet } from 'react-router'
import Topbar from '../components/navigation/Topbar'
import Sidebar from '../components/navigation/Sidebar'
import MobileNavigation from '../components/navigation/MobileNavigation'
import MobileFloatingActions from '../components/navigation/MobileFloatingActions'
import PageContainer from '../components/navigation/PageContainer'
import { useAuth } from '../context/AuthContext'
import { isRepresentative } from '../constants/navigation'
import { ROUTES } from '../constants/routes'
import { USER_ROLES } from '../constants/roles'

function getMobileActions(user) {
  if (user?.role === USER_ROLES.ASSOCIATION) {
    return [
      { label: 'Create Post', path: ROUTES.ASSOCIATION.CREATE_POST, icon: 'file-text', primary: true },
    ]
  }

  if (user?.role === USER_ROLES.DIRECTOR) {
    return [
      { label: 'Create Post', path: ROUTES.DIRECTOR.CREATE_POST, icon: 'file-text', primary: true },
    ]
  }

  if (isRepresentative(user)) {
    return [
      { label: 'Create Post', path: ROUTES.REPRESENTATIVE.CREATE_POST, icon: 'file-text', primary: true },
    ]
  }

  return []
}

/**
 * MainLayout
 *
 * Shared authenticated shell with one sticky topbar, a desktop sidebar, and
 * bottom navigation on narrow screens.
 */
function MainLayout() {
  const { currentUser } = useAuth()
  const mobileActions = getMobileActions(currentUser)

  return (
    <div className="min-h-screen bg-[#f3f5f9] xl:px-6 xl:py-5">
      {/* Skip to content link for keyboard / screen-reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-violet-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      <div className="mx-auto grid min-h-screen w-full max-w-[1760px] grid-cols-1 grid-rows-[72px_auto] lg:grid-cols-[224px_minmax(0,1fr)] xl:min-h-[calc(100vh-40px)] xl:grid-cols-[244px_minmax(0,1fr)] xl:grid-rows-[70px_auto] xl:gap-x-6">
        <div className="sticky top-0 z-40 col-start-1 row-start-1 lg:col-span-2 xl:col-span-1 xl:col-start-2 xl:top-5">
          <Topbar />
        </div>

        <div className="hidden min-w-0 lg:col-start-1 lg:row-start-2 lg:block xl:row-span-2 xl:row-start-1">
          <Sidebar />
        </div>

        <div className="col-start-1 row-start-2 min-w-0 lg:col-start-2 lg:row-start-2">
          <PageContainer className={mobileActions.length > 0 ? 'mobile-fab-clearance' : undefined}>
            <Outlet />
          </PageContainer>
        </div>
      </div>

      {/* Bottom navigation — mobile only */}
      <MobileNavigation />
      <MobileFloatingActions actions={mobileActions} />
    </div>
  )
}

export default MainLayout
