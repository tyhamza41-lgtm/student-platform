import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { users } from '../../tests/auth-fixtures'
import { AuthSession } from '../../tests/auth-test-utils'
import { USER_ROLES } from '../constants/roles'
import { AuthProvider } from '../context/AuthContext'
import {
  PublicOnlyRoute,
  RequireAuth,
  RequireRepresentative,
  RequireRole,
} from './RouteGuards'

function LoginPage() {
  const location = useLocation()
  return (
    <div>
      <h1>Login page</h1>
      <p>{location.state?.from?.pathname ?? 'No return path'}</p>
    </div>
  )
}

const guardRoutes = [
  {
    element: <PublicOnlyRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/public', element: <h1>Public page</h1> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      { path: '/protected', element: <h1>Protected page</h1> },
      {
        path: '/director-only',
        element: (
          <RequireRole roles={[USER_ROLES.DIRECTOR]}>
            <h1>Director-only page</h1>
          </RequireRole>
        ),
      },
      {
        path: '/representative-only',
        element: (
          <RequireRepresentative>
            <h1>Representative-only page</h1>
          </RequireRepresentative>
        ),
      },
      { path: '/feed', element: <h1>Feed destination</h1> },
      { path: '/director/dashboard', element: <h1>Director dashboard</h1> },
    ],
  },
]

beforeEach(() => {
  localStorage.clear()
})

async function renderGuard(path, user) {
  const router = createMemoryRouter(guardRoutes, { initialEntries: [path] })

  render(
    <AuthProvider>
      <AuthSession user={user}>
        <RouterProvider router={router} />
      </AuthSession>
    </AuthProvider>,
  )

  if (user) {
    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Initialize authenticated fixture' }),
    )
  }

  return router
}

describe('route guards', () => {
  it('redirects unauthenticated protected access to login with the original location', async () => {
    const router = await renderGuard('/protected')

    expect(await screen.findByRole('heading', { name: 'Login page' })).toBeInTheDocument()
    expect(screen.getByText('/protected')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('allows authenticated users through RequireAuth', async () => {
    await renderGuard('/protected', users.student)

    expect(await screen.findByRole('heading', { name: 'Protected page' })).toBeInTheDocument()
  })

  it('allows the required role and redirects another role to its role home', async () => {
    await renderGuard('/director-only', users.director)
    expect(await screen.findByRole('heading', { name: 'Director-only page' })).toBeInTheDocument()
  })

  it('redirects a role mismatch to the feed', async () => {
    await renderGuard('/director-only', users.student)

    expect(await screen.findByRole('heading', { name: 'Feed destination' })).toBeInTheDocument()
  })

  it('handles unauthenticated role-specific access through RequireAuth', async () => {
    await renderGuard('/director-only')

    expect(await screen.findByRole('heading', { name: 'Login page' })).toBeInTheDocument()
  })

  it('allows unauthenticated users to access public-only routes', async () => {
    await renderGuard('/public')

    expect(await screen.findByRole('heading', { name: 'Public page' })).toBeInTheDocument()
  })

  it.each([
    ['student', users.student, 'Feed destination'],
    ['association', users.association, 'Feed destination'],
    ['director', users.director, 'Director dashboard'],
  ])('redirects an authenticated %s away from public-only routes', async (_role, user, heading) => {
    await renderGuard('/public', user)

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Public page' })).not.toBeInTheDocument()
  })

  it('allows an active representative based on a normalized API status', async () => {
    const representative = {
      ...users.student,
      classId: 'class-ginf-2',
      representativeStatus: ' active ',
    }

    await renderGuard('/representative-only', representative)

    expect(await screen.findByRole('heading', { name: 'Representative-only page' })).toBeInTheDocument()
  })

  it('allows the nested active representative status format', async () => {
    const representative = {
      ...users.student,
      classId: 'class-ginf-2',
      representative: { status: 'ACTIVE' },
    }

    await renderGuard('/representative-only', representative)

    expect(await screen.findByRole('heading', { name: 'Representative-only page' })).toBeInTheDocument()
  })

  it.each([
    [
      'inactive student even when flagged',
      { ...users.representative, representativeStatus: 'INACTIVE', isRepresentative: true },
      'Feed destination',
    ],
    [
      'inactive account with an active representative designation',
      { ...users.representative, isActive: false },
      'Feed destination',
    ],
    [
      'unassigned active representative',
      { ...users.representative, classId: undefined },
      'Feed destination',
    ],
    ['ordinary student', users.student, 'Feed destination'],
    ['association', users.association, 'Feed destination'],
    ['director', users.director, 'Director dashboard'],
  ])('denies a %s from representative-only routes', async (_case, user, heading) => {
    await renderGuard('/representative-only', user)

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Representative-only page' })).not.toBeInTheDocument()
  })
})
