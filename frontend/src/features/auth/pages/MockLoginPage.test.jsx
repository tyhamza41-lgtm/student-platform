import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { AuthProvider, useAuth } from '../../../context/AuthContext'
import { MOCK_AUTH_SESSION_KEY } from '../auth.service'
import { resetMockDatabase } from '../../../mocks/mockDatabase'
import * as profilesService from '../../profiles/profiles.service'
import MockLoginPage from './MockLoginPage'

beforeEach(async () => {
  localStorage.clear()
  await resetMockDatabase()
})

function FeedPreview() {
  const { currentUser } = useAuth()
  const { logout } = useAuth()
  const navigate = useNavigate()

  if (!currentUser) return null

  return (
    <>
      <h1>{currentUser.role === 'DIRECTOR' ? 'Director dashboard preview' : 'Account preview'}</h1>
      <p>{currentUser.id}</p>
      <p>{currentUser.name}</p>
      <p>{currentUser.role}</p>
      <p>{currentUser.classId}</p>
      <p>{currentUser.email}</p>
      <img src={currentUser.avatarUrl} alt="Signed-in account avatar" />
      <button
        type="button"
        onClick={() => {
          logout()
          navigate('/login')
        }}
      >
        Sign out
      </button>
    </>
  )
}

function renderLogin() {
  render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<MockLoginPage />} />
          <Route path="/feed" element={<FeedPreview />} />
          <Route path="/director/dashboard" element={<FeedPreview />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

describe('MockLoginPage', () => {
  it('renders seeded accounts for students, representatives, associations, and the Director', async () => {
    renderLogin()

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByText('Development only')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Sam Student/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Omar Benali.*Active Representative \(Student\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Bureau des Arts.*Association/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Club Innovation & Technologies.*Association/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Dr\. Nadia Alaoui.*Director/i })).toBeInTheDocument()
  })

  it('signs in a mock student through AuthContext and opens the feed', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(await screen.findByRole('button', { name: /Sam Student/i }))

    expect(await screen.findByRole('heading', { name: 'Account preview' })).toBeInTheDocument()
    expect(screen.getByText('student-1')).toBeInTheDocument()
    expect(screen.getByText('STUDENT')).toBeInTheDocument()
    expect(localStorage.getItem(MOCK_AUTH_SESSION_KEY)).toBe('student-1')
  })

  it('keeps an active Representative authenticated as a Student', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(await screen.findByRole('button', { name: /Omar Benali.*Active Representative \(Student\)/i }))

    expect(await screen.findByText('representative-1')).toBeInTheDocument()
    expect(screen.getByText('STUDENT')).toBeInTheDocument()
    expect(screen.getByText('class-ginf-2')).toBeInTheDocument()
    expect(localStorage.getItem(MOCK_AUTH_SESSION_KEY)).toBe('representative-1')
  })

  it('authenticates the selected Association using its canonical persisted identity', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(await screen.findByRole('button', { name: /Bureau des Arts.*Association/i }))

    expect(await screen.findByRole('heading', { name: 'Account preview' })).toBeInTheDocument()
    expect(screen.getByText('association-1')).toBeInTheDocument()
    expect(screen.getByText('ASSOCIATION')).toBeInTheDocument()
    expect(screen.getByText('arts@studentplatform.ma')).toBeInTheDocument()
    expect(localStorage.getItem(MOCK_AUTH_SESSION_KEY)).toBe('association-1')
  })

  it('authenticates the selected Director and lands on the Director dashboard', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(await screen.findByRole('button', { name: /Dr\. Nadia Alaoui.*Director/i }))

    expect(await screen.findByRole('heading', { name: 'Director dashboard preview' })).toBeInTheDocument()
    expect(screen.getByText('director-1')).toBeInTheDocument()
    expect(screen.getByText('DIRECTOR')).toBeInTheDocument()
    expect(screen.getByText('direction@studentplatform.ma')).toBeInTheDocument()
    expect(localStorage.getItem(MOCK_AUTH_SESSION_KEY)).toBe('director-1')
  })

  it('clears the previous account identity when switching Association, Director, and Student', async () => {
    const user = userEvent.setup()
    renderLogin()

    await user.click(await screen.findByRole('button', { name: /Bureau des Arts.*Association/i }))
    expect(await screen.findByText('association-1')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Signed-in account avatar' }))
      .toHaveAttribute('src', expect.stringContaining('photo-1529156069898'))

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(await screen.findByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
    expect(localStorage.getItem(MOCK_AUTH_SESSION_KEY)).toBeNull()

    await user.click(screen.getByRole('button', { name: /Dr\. Nadia Alaoui.*Director/i }))
    expect(await screen.findByText('director-1')).toBeInTheDocument()
    expect(screen.queryByText('arts@studentplatform.ma')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Signed-in account avatar' }))
      .toHaveAttribute('src', expect.stringContaining('photo-1573496359142'))

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    await user.click(await screen.findByRole('button', { name: /Sam Student/i }))
    expect(await screen.findByText('student-1')).toBeInTheDocument()
    expect(screen.getByText('STUDENT')).toBeInTheDocument()
    expect(screen.queryByText('direction@studentplatform.ma')).not.toBeInTheDocument()
    expect(localStorage.getItem(MOCK_AUTH_SESSION_KEY)).toBe('student-1')
  })

  it('uses the saved local profile picture instead of the seed photo after sign-in', async () => {
    const savedPhoto = 'data:image/jpeg;base64,profile-photo'
    await profilesService.update('student-1', { avatarUrl: savedPhoto }, 'student-1')
    const user = userEvent.setup()
    renderLogin()

    await user.click(await screen.findByRole('button', { name: /Sam Student/i }))

    expect(await screen.findByRole('img', { name: 'Signed-in account avatar' }))
      .toHaveAttribute('src', savedPhoto)
  })

  it('shows the latest persisted picture in account switching options', async () => {
    const savedPhoto = 'data:image/jpeg;base64,latest-account-photo'
    await profilesService.update('student-1', { avatarUrl: savedPhoto }, 'student-1')
    renderLogin()

    const accountButton = await screen.findByRole('button', { name: /Sam Student/i })
    expect(accountButton.querySelector('img')).toHaveAttribute('src', savedPhoto)
  })
})
