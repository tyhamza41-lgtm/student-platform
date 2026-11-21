import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthProvider } from '../../../context/AuthContext'
import MockLoginPage from './MockLoginPage'

function renderLogin() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<MockLoginPage />} />
          <Route path="/feed" element={<h1>Student dashboard preview</h1>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('MockLoginPage', () => {
  it('renders a visible development-only indicator and mock student options', () => {
    renderLogin()

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByText('Development only')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Sam Student/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Omar Benali/i })).toBeInTheDocument()
  })

  it('signs in a mock student through AuthContext and opens the feed', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(screen.getByRole('button', { name: /Sam Student/i }))

    expect(await screen.findByRole('heading', { name: 'Student dashboard preview' })).toBeInTheDocument()
  })
})
