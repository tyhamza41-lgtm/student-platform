import { Outlet } from 'react-router'

/**
 * PublicLayout — minimal wrapper for unauthenticated pages (login, register, etc.).
 * Renders a full-height centred column with a neutral background, leaving page
 * components free to define their own card/form structure.
 */
function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      {/* Skip-to-content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-violet-600 focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col">
        <Outlet />
      </main>
    </div>
  )
}

export default PublicLayout
