import { render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'
import { MOCK_AUTH_SESSION_KEY } from '../features/auth/auth.service'
import { resetMockDatabase } from '../mocks/mockDatabase'

const student = {
  id: 'student-1',
  name: 'Sam Student',
  role: 'STUDENT',
}

function AuthProbe() {
  const { currentUser, isAuthenticated, isInitializing, login, logout } = useAuth()

  return (
    <div>
      <p role="status">
        {isInitializing ? 'Restoring session' : isAuthenticated ? 'Authenticated' : 'Unauthenticated'}
      </p>
      <p>{currentUser?.name ?? 'No current user'}</p>
      <p>{currentUser?.email ?? 'No current email'}</p>
      <button type="button" onClick={() => login(student)}>
        Log in
      </button>
      <button type="button" onClick={logout}>
        Log out
      </button>
    </div>
  )
}

beforeEach(async () => {
  localStorage.clear()
  await resetMockDatabase()
})

describe('AuthContext', () => {
  it('starts unauthenticated and exposes the logged-in user until logout', async () => {
    const user = userEvent.setup()

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Unauthenticated'))
    expect(screen.getByText('No current user')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(screen.getByRole('status')).toHaveTextContent('Authenticated')
    expect(screen.getByText('Sam Student')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(screen.getByRole('status')).toHaveTextContent('Unauthenticated')
    expect(screen.getByText('No current user')).toBeInTheDocument()
    expect(localStorage.getItem(MOCK_AUTH_SESSION_KEY)).toBeNull()
  })

  it('persists only the account ID and restores the canonical user record', async () => {
    const user = userEvent.setup()
    const firstRender = render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(localStorage.getItem(MOCK_AUTH_SESSION_KEY)).toBe('student-1')
    firstRender.unmount()

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Authenticated'))
    expect(screen.getByText('sam@studentplatform.ma')).toBeInTheDocument()
    expect(localStorage.getItem(MOCK_AUTH_SESSION_KEY)).toBe('student-1')
  })

  it('clears a session whose canonical account no longer exists', async () => {
    localStorage.setItem(MOCK_AUTH_SESSION_KEY, 'missing-account')

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Unauthenticated'))
    expect(localStorage.getItem(MOCK_AUTH_SESSION_KEY)).toBeNull()
  })

  it('throws when useAuth is called outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider',
    )
  })
})
