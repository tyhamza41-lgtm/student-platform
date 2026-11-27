import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { users } from '../../tests/auth-fixtures'
import { AuthSession } from '../../tests/auth-test-utils'
import { REPRESENTATIVE_STATUS } from '../constants/roles'
import router from './router'
import { AuthProvider } from '../context/AuthContext'
import { UIProvider } from '../context/UIContext'

const activeRouters = new Set()

beforeEach(() => {
  localStorage.clear()
  vi.stubGlobal('matchMedia', (media) => ({
    matches: false,
    media,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
})

afterEach(() => {
  activeRouters.forEach((memoryRouter) => memoryRouter.dispose())
  activeRouters.clear()
  vi.unstubAllGlobals()
})

async function renderRoute(path, user) {
  const memoryRouter = createMemoryRouter(router.routes, {
    initialEntries: [path],
  })
  activeRouters.add(memoryRouter)

  render(
    <AuthProvider>
      <AuthSession user={user}>
        <UIProvider>
          <RouterProvider router={memoryRouter} />
        </UIProvider>
      </AuthSession>
    </AuthProvider>,
  )

  if (user) {
    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Initialize authenticated fixture' }),
    )
  }

  return memoryRouter
}

describe('application router', () => {
  it.each([
    ['/login', 'Sign in'],
    ['/register', 'Create account'],
  ])('renders the public route %s', async (path, heading) => {
    await renderRoute(path)

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
  })

  it('keeps public registration as a placeholder without role selection', async () => {
    await renderRoute('/register')

    expect(await screen.findByRole('heading', { name: 'Create account' })).toBeInTheDocument()
    expect(screen.getByText('Registration page — coming soon.')).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Association|Director/i })).not.toBeInTheDocument()
  })

  it('redirects unauthenticated direct access to a protected route to login', async () => {
    const memoryRouter = await renderRoute('/feed')

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(memoryRouter.state.location.pathname).toBe('/login')
  })

  it.each([
    ['student', users.student],
    ['representative', users.representative],
    ['association', users.association],
    ['Director', users.director],
  ])('renders My Activity for an authenticated %s', async (_role, user) => {
    await renderRoute('/my-activity', user)
    expect(await screen.findByRole('heading', { name: 'My Activity' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Filter activity' })).toBeInTheDocument()
    const mobileNavigation = within(screen.getByRole('navigation', { name: 'Mobile navigation' }))
    if (user.role === 'ASSOCIATION') {
      expect(mobileNavigation.queryByRole('link', { name: 'My Activity' })).not.toBeInTheDocument()
      await userEvent.setup().click(screen.getByRole('button', { name: 'Open user menu' }))
      expect(screen.getByRole('menuitem', { name: 'My Activity' })).toBeInTheDocument()
    } else {
      expect(mobileNavigation.getByRole('link', { name: 'My Activity' })).toBeInTheDocument()
    }
  })

  it.each([
    ['inactive representative', { ...users.representative, isActive: false }],
    ['unassigned representative', { ...users.representative, classId: undefined }],
  ])('blocks direct issue creation access for an %s', async (_case, user) => {
    const memoryRouter = await renderRoute('/issues/create', user)

    expect(await screen.findByRole('heading', { name: /Welcome back/i })).toBeInTheDocument()
    expect(memoryRouter.state.location.pathname).toBe('/feed')
    expect(screen.queryByRole('heading', { name: 'Create Class Issue' })).not.toBeInTheDocument()
  })

  it('renders the student dashboard at the existing feed route', async () => {
    await renderRoute('/feed', users.student)

    expect(await screen.findByRole('heading', { name: /Welcome back, Sam Student/i })).toBeInTheDocument()
    expect(
      within(document.querySelector('header[role="banner"]')).getByRole('link', {
        name: 'NEXUS — go to home',
      }),
    ).toBeInTheDocument()
  })

  it.each([
    ['student', { ...users.student, classId: 'class-ginf-2' }],
    ['association', users.association],
    ['Director', users.director],
  ])('lets an authenticated %s browse and open Class Issues', async (_role, user) => {
    const memoryRouter = await renderRoute('/issues', user)

    expect(await screen.findByRole('heading', { name: 'Class Issues' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Climatiseur en panne dans la salle B12' })).toBeInTheDocument()
    await userEvent.setup().click(
      screen.getByRole('link', { name: 'View issue: Climatiseur en panne dans la salle B12' }),
    )
    expect(await screen.findByRole('heading', { name: 'Climatiseur en panne dans la salle B12' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Add a comment' })).toBeInTheDocument()
    expect(memoryRouter.state.location.pathname).toBe('/issues/issue-1')
  })

  it.each([
    ['student', users.student, []],
    ['representative', users.representative, ['Create Post']],
    ['association', users.association, ['Create Post']],
    ['director', users.director, ['Create Post']],
  ])('shows the correct mobile actions for a %s', async (_role, user, expectedActions) => {
    await renderRoute('/feed', user)

    const actionGroup = screen.queryByRole('group', { name: 'Quick actions' })

    if (expectedActions.length === 0) {
      expect(actionGroup).not.toBeInTheDocument()
      return
    }

    const actions = within(actionGroup).getAllByRole('link')
    expect(actions.map((action) => action.getAttribute('aria-label'))).toEqual(expectedActions)
    expect(actionGroup.className).toContain('fixed')
    expect(actionGroup.className).toContain('lg:hidden')
    expect(actionGroup.className).toContain('safe-area-inset-bottom')

    const content = document.getElementById('main-content')
    expect(content.className).toContain('mobile-fab-clearance')
    expect(screen.getByRole('navigation', { name: 'Mobile navigation' })).toBeInTheDocument()
  })

  it.each([
    ['representative', users.representative, 'Create Post', '/posts/create', 'Create Post'],
    ['association', users.association, 'Create Post', '/association/posts/create', 'Create Post'],
    ['director', users.director, 'Create Post', '/director/posts/create', 'Create Post'],
  ])('routes the %s %s action to its integration point', async (_role, user, action, path, heading) => {
    const memoryRouter = await renderRoute('/feed', user)

    const actionGroup = screen.getByRole('group', { name: 'Quick actions' })
    await userEvent.setup().click(within(actionGroup).getByRole('link', { name: action }))

    expect(memoryRouter.state.location.pathname).toBe(path)
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Post content' })).toBeInTheDocument()
  })

  it('shows Create Issue before account actions for an active representative', async () => {
    await renderRoute('/feed', users.representative)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open user menu' }))

    const menu = screen.getByRole('menu')
    expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent.trim())).toEqual([
      'Create Issue',
      'My Profile',
      'Settings',
      'Sign out',
    ])
    expect(within(menu).getAllByRole('separator')).toHaveLength(3)
  })

  it.each([
    ['student', users.student],
    ['inactive representative', {
      ...users.representative,
      representativeStatus: REPRESENTATIVE_STATUS.INACTIVE,
    }],
    ['association', users.association],
    ['director', users.director],
  ])('does not show Create Issue to a %s', async (_role, user) => {
    await renderRoute('/feed', user)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open user menu' }))

    expect(screen.queryByRole('menuitem', { name: 'Create Issue' })).not.toBeInTheDocument()
  })

  it('shows Create Event before account actions for an association', async () => {
    await renderRoute('/feed', users.association)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open user menu' }))

    const menu = screen.getByRole('menu')
    expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent.trim())).toEqual([
      'Create Event',
      'My Profile',
      'Class Issues',
      'My Activity',
      'Settings',
      'Sign out',
    ])
    expect(within(menu).getByRole('menuitem', { name: 'Class Issues' }).parentElement).toHaveClass('lg:hidden')
    expect(within(menu).getByRole('menuitem', { name: 'My Activity' }).parentElement).toHaveClass('lg:hidden')
  })

  it.each([
    ['student', users.student],
    ['representative', users.representative],
    ['director', users.director],
  ])('does not show Create Event to a %s', async (_role, user) => {
    await renderRoute('/feed', user)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open user menu' }))

    expect(screen.queryByRole('menuitem', { name: 'Create Event' })).not.toBeInTheDocument()
  })

  it.each([
    ['representative', users.representative, 'Create Issue', '/issues/create', 'Create Class Issue'],
    ['association', users.association, 'Create Event', '/association/events/create', 'Create Event'],
  ])('navigates the %s creation menu action to its integration route', async (_role, user, label, path, heading) => {
    const memoryRouter = await renderRoute('/feed', user)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open user menu' }))
    await userEvent.setup().click(screen.getByRole('menuitem', { name: label }))

    expect(memoryRouter.state.location.pathname).toBe(path)
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    if (path === '/association/events/create') {
      expect(screen.getByRole('textbox', { name: 'Event title' })).toBeInTheDocument()
    } else {
      expect(screen.getByRole('textbox', { name: 'Issue title' })).toBeInTheDocument()
    }
  })

  it('keeps My Profile, Settings, and Sign out dropdown actions available', async () => {
    const memoryRouter = await renderRoute('/feed', users.student)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'Open user menu' }))
    let menu = screen.getByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: 'My Profile' })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Settings' })).toBeInTheDocument()
    expect(within(menu).getByRole('menuitem', { name: 'Sign out' })).toBeInTheDocument()

    await user.click(within(menu).getByRole('menuitem', { name: 'Settings' }))
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(memoryRouter.state.location.pathname).toBe('/feed')

    await user.click(screen.getByRole('button', { name: 'Open user menu' }))
    menu = screen.getByRole('menu')
    await user.click(within(menu).getByRole('menuitem', { name: 'My Profile' }))
    expect(memoryRouter.state.location.pathname).toBe('/profile')
    expect(await screen.findByRole('heading', { name: 'My Profile' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open user menu' }))
    menu = screen.getByRole('menu')
    await user.click(within(menu).getByRole('menuitem', { name: 'Sign out' }))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(memoryRouter.state.location.pathname).toBe('/login')
  })

  it.each([
    ['student', users.student, '/association/posts/create', '/feed'],
    ['student', users.student, '/association/events/create', '/feed'],
    ['student', users.student, '/association/events', '/feed'],
    ['student', users.student, '/issues/create', '/feed'],
    ['association', users.association, '/issues/create', '/feed'],
    ['representative', users.representative, '/association/events', '/feed'],
    ['director', users.director, '/issues/create', '/director/dashboard'],
    ['director', users.director, '/association/events', '/director/dashboard'],
    ['student', users.student, '/director/issues', '/feed'],
    ['student', users.student, '/director/posts/create', '/feed'],
    ['director', users.director, '/association/events/create', '/director/dashboard'],
    ['director', users.director, '/association/posts/create', '/director/dashboard'],
    ['association', users.association, '/director/posts/create', '/feed'],
  ])('keeps a %s user out of the role-protected route %s', async (_role, user, path, destination) => {
    const memoryRouter = await renderRoute(path, user)

    await screen.findByRole('heading', { name: /Welcome back|Dashboard/ })

    expect(memoryRouter.state.location.pathname).toBe(destination)
  })

  it('renders representative-only routes for active representatives', async () => {
    await renderRoute('/posts/create', users.representative)

    expect(await screen.findByRole('heading', { name: 'Create Post' })).toBeInTheDocument()
  })

  it('redirects an ordinary student away from representative-only routes', async () => {
    await renderRoute('/posts/create', users.student)

    expect(await screen.findByRole('heading', { name: /Welcome back, Sam Student/i })).toBeInTheDocument()
  })

  it('renders an association route for an association user', async () => {
    await renderRoute('/association/events', users.association)

    expect(await screen.findByRole('heading', { name: 'Manage Events' })).toBeInTheDocument()
  })

  it('shows My Events in the Association mobile navigation and opens its existing route', async () => {
    const memoryRouter = await renderRoute('/feed', users.association)
    const mobileNavigation = within(screen.getByRole('navigation', { name: 'Mobile navigation' }))

    expect(mobileNavigation.getAllByRole('link')).toHaveLength(4)
    await userEvent.setup().click(mobileNavigation.getByRole('link', { name: 'My Events' }))

    expect(memoryRouter.state.location.pathname).toBe('/association/events')
    expect(await screen.findByRole('heading', { name: 'Manage Events' })).toBeInTheDocument()
  })

  it('places Association Class Issues and My Activity in the mobile dropdown, preserving desktop navigation', async () => {
    const memoryRouter = await renderRoute('/feed', users.association)
    const desktopNavigation = within(screen.getByRole('navigation', { name: 'Application navigation' }))
    const mobileNavigation = within(screen.getByRole('navigation', { name: 'Mobile navigation' }))
    const user = userEvent.setup()
    const trigger = screen.getByRole('button', { name: 'Open user menu' })

    expect(desktopNavigation.getByRole('link', { name: 'Class Issues' })).toHaveAttribute('href', '/issues')
    expect(desktopNavigation.getByRole('link', { name: 'My Activity' }))
      .toHaveAttribute('href', '/my-activity')
    expect(mobileNavigation.getAllByRole('link')).toHaveLength(4)
    expect(mobileNavigation.queryByRole('link', { name: 'Class Issues' })).not.toBeInTheDocument()
    expect(mobileNavigation.queryByRole('link', { name: 'My Activity' })).not.toBeInTheDocument()

    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await user.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    let menu = screen.getByRole('menu')
    await user.click(within(menu).getByRole('menuitem', { name: 'Class Issues' }))

    expect(memoryRouter.state.location.pathname).toBe('/issues')
    expect(await screen.findByRole('heading', { name: 'Class Issues' })).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    trigger.focus()
    await user.keyboard('{Enter}')
    expect(await screen.findByRole('menu')).toBeInTheDocument()
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    menu = screen.getByRole('menu')
    await user.click(within(menu).getByRole('menuitem', { name: 'My Activity' }))
    expect(memoryRouter.state.location.pathname).toBe('/my-activity')
    expect(await screen.findByRole('heading', { name: /My Activity/i })).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it.each([
    ['student', users.student],
    ['representative', users.representative],
    ['director', users.director],
  ])('does not expose Association My Events in the %s mobile navigation', async (_role, user) => {
    await renderRoute('/feed', user)

    expect(within(screen.getByRole('navigation', { name: 'Mobile navigation' }))
      .queryByRole('link', { name: 'My Events' })).not.toBeInTheDocument()
  })

  it('renders a director route for a director user', async () => {
    await renderRoute('/director/representatives', users.director)

    expect(await screen.findByRole('heading', { name: 'Representatives' })).toBeInTheDocument()
  })

  it('renders Director management pages and links them from the mobile account menu without moderation', async () => {
    const memoryRouter = await renderRoute('/director/dashboard', users.director)
    const desktopNavigation = within(screen.getByRole('navigation', { name: 'Application navigation' }))

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(desktopNavigation.getByRole('link', { name: 'Create Post' })).toHaveAttribute('href', '/director/posts/create')
    expect(desktopNavigation.getByRole('link', { name: 'User Deletion' })).toHaveAttribute('href', '/director/students')
    expect(desktopNavigation.getByRole('link', { name: 'Associations Management' })).toHaveAttribute('href', '/director/associations')
    expect(desktopNavigation.getByRole('link', { name: 'Representatives Management' })).toHaveAttribute('href', '/director/representatives')
    expect(desktopNavigation.queryByRole('link', { name: 'Moderation' })).not.toBeInTheDocument()

    await userEvent.setup().click(desktopNavigation.getByRole('link', { name: 'Create Post' }))
    expect(memoryRouter.state.location.pathname).toBe('/director/posts/create')
    expect(await screen.findByRole('heading', { name: 'Create Post' })).toBeInTheDocument()

    await userEvent.setup().click(screen.getByRole('button', { name: 'Open user menu' }))
    const menu = screen.getByRole('menu')
    expect(within(menu).queryByRole('menuitem', { name: 'Moderation' })).not.toBeInTheDocument()
    await userEvent.setup().click(within(menu).getByRole('menuitem', { name: 'User Deletion' }))

    expect(memoryRouter.state.location.pathname).toBe('/director/students')
    expect(await screen.findByRole('heading', { name: 'User Deletion' })).toBeInTheDocument()
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('renders 404 for the removed director moderation route', async () => {
    await renderRoute('/director/moderation', users.director)

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })

  it.each([
    ['student', users.student],
    ['association', users.association],
  ])('does not expose Director management links to a %s account', async (_role, user) => {
    await renderRoute('/feed', user)
    await userEvent.setup().click(screen.getByRole('button', { name: 'Open user menu' }))

    expect(screen.queryByRole('menuitem', { name: 'User Deletion' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Associations Management' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Representatives Management' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'Moderation' })).not.toBeInTheDocument()
  })

  it('redirects a director accessing a public auth route to the director dashboard', async () => {
    const memoryRouter = await renderRoute('/login', users.director)

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(memoryRouter.state.location.pathname).toBe('/director/dashboard')
  })

  it('renders the not-found page for an unknown URL', async () => {
    await renderRoute('/this-route-does-not-exist')

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  })
})
