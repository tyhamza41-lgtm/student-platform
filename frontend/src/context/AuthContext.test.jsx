import { render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AuthProvider, useAuth } from './AuthContext'

const student = {
  id: 'student-1',
  name: 'Sam Student',
  role: 'STUDENT',
}

function AuthProbe() {
  const { currentUser, isAuthenticated, login, logout } = useAuth()

  return (
    <div>
      <p role="status">{isAuthenticated ? 'Authenticated' : 'Unauthenticated'}</p>
      <p>{currentUser?.name ?? 'No current user'}</p>
      <button type="button" onClick={() => login(student)}>
        Log in
      </button>
      <button type="button" onClick={logout}>
        Log out
      </button>
    </div>
  )
}

describe('AuthContext', () => {
  it('starts unauthenticated and exposes the logged-in user until logout', async () => {
    const user = userEvent.setup()

    render(
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>,
    )

    expect(screen.getByRole('status')).toHaveTextContent('Unauthenticated')
    expect(screen.getByText('No current user')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Log in' }))

    expect(screen.getByRole('status')).toHaveTextContent('Authenticated')
    expect(screen.getByText('Sam Student')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(screen.getByRole('status')).toHaveTextContent('Unauthenticated')
    expect(screen.getByText('No current user')).toBeInTheDocument()
  })

  it('throws when useAuth is called outside AuthProvider', () => {
    expect(() => renderHook(() => useAuth())).toThrow(
      'useAuth must be used within an AuthProvider',
    )
  })
})
