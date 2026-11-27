import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, MemoryRouter, RouterProvider } from 'react-router'
import { AuthProvider, useAuth } from '../../context/AuthContext'
import { resetMockDatabase, transact } from '../../mocks/mockDatabase'
import { users as authUsers } from '../../../tests/auth-fixtures'
import { AuthSession } from '../../../tests/auth-test-utils'
import * as commentsService from '../comments/comments.service'
import * as reactionsService from '../reactions/reactions.service'
import * as activityService from './activity.service'
import MyActivityPage from './pages/MyActivityPage'

beforeEach(async () => {
  localStorage.clear()
  await resetMockDatabase()
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function renderActivityPage(user) {
  const router = createMemoryRouter([
    { path: '/my-activity', element: <MyActivityPage /> },
    { path: '/posts/:postId', element: <h1>Post destination</h1> },
    { path: '/events/:eventId', element: <h1>Event destination</h1> },
    { path: '/issues/:issueId', element: <h1>Issue destination</h1> },
  ], { initialEntries: ['/my-activity'] })

  const view = render(
    <AuthProvider>
      <AuthSession user={user}>
        <RouterProvider router={router} />
      </AuthSession>
    </AuthProvider>,
  )
  await userEvent.setup().click(
    screen.getByRole('button', { name: 'Initialize authenticated fixture' }),
  )
  return { ...view, router }
}

function ActivityAccountSwitcher() {
  const { currentUser, login } = useAuth()
  return (
    <>
      <div>
        <button type="button" onClick={() => login(authUsers.student)}>Sign in as student</button>
        <button type="button" onClick={() => login(authUsers.association)}>Sign in as Association</button>
      </div>
      {currentUser ? <MyActivityPage /> : <p>Choose an account</p>}
    </>
  )
}

describe('My Activity page', () => {
  it.each([
    ['student', authUsers.student, ['Comments', 'Reactions', 'Events'], ['Posts', 'Class Issues']],
    ['representative', authUsers.representative, ['Posts', 'Comments', 'Reactions', 'Events', 'Class Issues'], []],
    ['Association', authUsers.association, ['Posts', 'Comments', 'Reactions', 'Events'], ['Class Issues']],
    ['Director', authUsers.director, ['Posts', 'Comments', 'Reactions'], ['Events', 'Class Issues']],
  ])('shows the activities and filters allowed for a %s', async (_role, user, visibleFilters, hiddenFilters) => {
    await renderActivityPage(user)

    expect(await screen.findByRole('heading', { name: 'My Activity' })).toBeInTheDocument()
    for (const filter of visibleFilters) {
      expect(screen.getByRole('button', { name: filter })).toBeInTheDocument()
    }
    for (const filter of hiddenFilters) {
      expect(screen.queryByRole('button', { name: filter })).not.toBeInTheDocument()
    }
  })

  it('filters a student’s activity and navigates to the related post', async () => {
    const user = userEvent.setup()
    const comment = await commentsService.add({
      postId: 'post-1',
      content: 'My response to the announcement.',
    }, 'student-1')
    await reactionsService.togglePostReaction('post-1', 'student-1', 'LIKE')
    const page = await renderActivityPage(authUsers.student)

    await screen.findByText('My response to the announcement.')
    await user.click(screen.getByRole('button', { name: 'Reactions' }))
    expect(screen.getByText('Liked a post')).toBeInTheDocument()
    expect(screen.queryByText(comment.content)).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Comments' }))
    expect(screen.getByText(comment.content)).toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'View related post' }))
    expect(await screen.findByRole('heading', { name: 'Post destination' })).toBeInTheDocument()
    expect(page.router.state.location.pathname).toBe('/posts/post-1')
  })

  it('shows an empty state for a role-specific filter with no matching activity', async () => {
    const user = userEvent.setup()
    await renderActivityPage(authUsers.association)

    await user.click(screen.getByRole('button', { name: 'Reactions' }))
    expect(await screen.findByRole('heading', { name: 'No reactions yet' })).toBeInTheDocument()
  })

  it('navigates a Representative to a related Class Issue', async () => {
    const user = userEvent.setup()
    const page = await renderActivityPage(authUsers.representative)

    expect(await screen.findAllByText('Submitted a Class Issue')).toHaveLength(3)
    await user.click(screen.getAllByRole('link', { name: 'View related issue' })[0])
    expect(await screen.findByRole('heading', { name: 'Issue destination' })).toBeInTheDocument()
    expect(page.router.state.location.pathname).toMatch(/^\/issues\/issue-/)
  })

  it('navigates a student to a registered event', async () => {
    const user = userEvent.setup()
    const page = await renderActivityPage(authUsers.student)

    await user.click(await screen.findByRole('link', { name: 'View related event' }))

    expect(await screen.findByRole('heading', { name: 'Event destination' })).toBeInTheDocument()
    expect(page.router.state.location.pathname).toBe('/events/event-2')
  })

  it('shows the empty activity state for a newly created account', async () => {
    const emptyAccount = await transact((database, createId) => {
      const user = {
        id: createId('users'),
        name: 'No Activity',
        email: 'no-activity@studentplatform.test',
        role: 'STUDENT',
        isActive: true,
      }
      database.users.push(user)
      return user
    })
    await renderActivityPage(emptyAccount)

    expect(await screen.findByRole('heading', { name: 'No activity yet' })).toBeInTheDocument()
  })

  it('shows a retryable error when activity cannot be loaded', async () => {
    vi.spyOn(activityService, 'getMyActivity').mockRejectedValue(new Error('Mock data is unavailable.'))
    await renderActivityPage(authUsers.student)

    expect(await screen.findByRole('alert')).toHaveTextContent('Mock data is unavailable.')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('clears the previous account’s activity when the authenticated account changes', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <AuthProvider>
          <ActivityAccountSwitcher />
        </AuthProvider>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Sign in as student' }))
    expect(await screen.findByText('Registered for an event')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Sign in as Association' }))
    expect(await screen.findByText(/Les inscriptions sont ouvertes pour le concours photographie/))
      .toBeInTheDocument()
    expect(screen.queryByText('Registered for an event')).not.toBeInTheDocument()
  })
})
