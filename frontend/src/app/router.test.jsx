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

  it('redirects unauthenticated direct access to a protected route to login', async () => {
    const memoryRouter = await renderRoute('/feed')

    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(memoryRouter.state.location.pathname).toBe('/login')
  })

  it('renders a student route for an authenticated student', async () => {
    await renderRoute('/my-activity', users.student)

    expect(await screen.findByRole('heading', { name: 'My Activity' })).toBeInTheDocument()
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
      'Settings',
      'Sign out',
    ])
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
    expect(screen.getByText('Coming soon')).toBeInTheDocument()
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

    await user.click(screen.getByRole('button', { name: 'Open user menu' }))
    menu = screen.getByRole('menu')
    await user.click(within(menu).getByRole('menuitem', { name: 'Sign out' }))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(memoryRouter.state.location.pathname).toBe('/login')
  })

  it.each([
    ['student', users.student, '/association/posts/create', '/feed'],
    ['student', users.student, '/association/events/create', '/feed'],
    ['student', users.student, '/director/posts/create', '/feed'],
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

  it('renders a director route for a director user', async () => {
    await renderRoute('/director/representatives', users.director)

    expect(await screen.findByRole('heading', { name: 'Representatives' })).toBeInTheDocument()
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
