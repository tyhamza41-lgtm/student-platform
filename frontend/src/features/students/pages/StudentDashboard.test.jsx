import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { AuthProvider } from '../../../context/AuthContext'
import { AuthSession } from '../../../../tests/auth-test-utils'
import { users } from '../../../../tests/auth-fixtures'
import StudentDashboard from './StudentDashboard'
import { posts } from '../../../mocks/data/posts'
import { issues } from '../../../mocks/data/issues'
import { comments } from '../../../mocks/data/comments'
import { resetMockDatabase, transact } from '../../../mocks/mockDatabase'

beforeEach(async () => {
  localStorage.clear()
  await resetMockDatabase()
})

async function renderDashboard({ postsData = posts, includeEvents = true } = {}) {
  if (!includeEvents) {
    await transact((database) => {
      database.events = []
      database.registrations = []
    })
  }
  const result = render(
    <MemoryRouter initialEntries={['/feed']}>
      <AuthProvider>
        <AuthSession user={users.student}>
          <Routes>
            <Route
              path="/feed"
              element={<StudentDashboard postsData={postsData} />}
            />
            <Route path="/events" element={<h1>Events page</h1>} />
            <Route path="/issues" element={<h1>Class issues page</h1>} />
            <Route path="/profile" element={<h1>Profile page</h1>} />
          </Routes>
        </AuthSession>
      </AuthProvider>
    </MemoryRouter>,
  )

  await userEvent.setup().click(
    screen.getByRole('button', { name: 'Initialize authenticated fixture' }),
  )

  return result
}

describe('StudentDashboard', () => {
  it('renders personalized student dashboard content and mock statistics', async () => {
    await renderDashboard()

    expect(screen.getByRole('heading', { name: /welcome back, sam student/i })).toBeInTheDocument()
    expect(screen.getByText('Overview statistics')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Latest announcements' })).toBeInTheDocument()
    expect(screen.getByText('Events joined')).toBeInTheDocument()
    expect(screen.queryByText('My posts')).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Quick actions' })).not.toBeInTheDocument()

    for (const post of posts) {
      expect(screen.getAllByText(post.authorName, { exact: true }).length).toBeGreaterThan(0)
    }
  })

  it('handles like, dislike, switching, and removing reactions', async () => {
    const user = userEvent.setup()
    await renderDashboard()

    const feed = screen.getByRole('heading', { name: 'Latest announcements' }).closest('section')
    const firstPost = within(feed).getAllByRole('article')[0]
    const likeButton = within(firstPost).getByRole('button', { name: `Like post by ${posts[0].authorName}` })
    const dislikeButton = within(firstPost).getByRole('button', { name: `Dislike post by ${posts[0].authorName}` })
    const likeCount = within(firstPost).getByRole('button', { name: /View users who liked this post/ })
    const dislikeCount = within(firstPost).getByRole('button', { name: /View users who disliked this post/ })

    await waitFor(() => expect(likeButton).toBeEnabled())
    await user.click(likeButton)
    expect(likeButton).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(likeCount).toHaveTextContent(String(posts[0].likeCount + 1)))

    await waitFor(() => expect(likeButton).toBeEnabled())
    await user.click(likeButton)
    expect(likeButton).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(likeCount).toHaveTextContent(String(posts[0].likeCount)))

    await waitFor(() => expect(dislikeButton).toBeEnabled())
    await user.click(dislikeButton)
    expect(dislikeButton).toHaveAttribute('aria-pressed', 'true')
    await waitFor(() => expect(dislikeCount).toHaveTextContent(String(posts[0].dislikeCount + 1)))

    await waitFor(() => expect(dislikeButton).toBeEnabled())
    await user.click(dislikeButton)
    expect(dislikeButton).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(dislikeCount).toHaveTextContent(String(posts[0].dislikeCount)))

    await waitFor(() => expect(dislikeButton).toBeEnabled())
    await user.click(dislikeButton)
    await waitFor(() => expect(dislikeButton).toHaveAttribute('aria-pressed', 'true'))
    await waitFor(() => expect(likeButton).toBeEnabled())
    await user.click(likeButton)
    await waitFor(() => expect(likeButton).toHaveAttribute('aria-pressed', 'true'))
    expect(likeButton).toHaveAttribute('aria-pressed', 'true')
    expect(dislikeButton).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(likeCount).toHaveTextContent(String(posts[0].likeCount + 1)))
    expect(dislikeCount).toHaveTextContent(String(posts[0].dislikeCount))

    await waitFor(() => expect(dislikeButton).toBeEnabled())
    await user.click(dislikeButton)
    await waitFor(() => expect(dislikeButton).toHaveAttribute('aria-pressed', 'true'))
    expect(dislikeButton).toHaveAttribute('aria-pressed', 'true')
    expect(likeButton).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(likeCount).toHaveTextContent(String(posts[0].likeCount)))
    expect(dislikeCount).toHaveTextContent(String(posts[0].dislikeCount + 1))
  })

  it('keeps reactions independent across multiple posts', async () => {
    const user = userEvent.setup()
    await renderDashboard()

    const feed = screen.getByRole('heading', { name: 'Latest announcements' }).closest('section')
    const postArticles = within(feed).getAllByRole('article')
    const firstLike = within(postArticles[0]).getByRole('button', { name: `Like post by ${posts[0].authorName}` })
    const secondLike = within(postArticles[1]).getByRole('button', { name: `Like post by ${posts[1].authorName}` })

    await waitFor(() => expect(firstLike).toBeEnabled())
    await user.click(firstLike)
    await waitFor(() => expect(firstLike).toHaveAttribute('aria-pressed', 'true'))
    expect(secondLike).toHaveAttribute('aria-pressed', 'false')

    await waitFor(() => expect(secondLike).toBeEnabled())
    await user.click(secondLike)
    await waitFor(() => expect(secondLike).toHaveAttribute('aria-pressed', 'true'))
    expect(firstLike).toHaveAttribute('aria-pressed', 'true')
    expect(secondLike).toHaveAttribute('aria-pressed', 'true')
  })

  it('opens a comments preview', async () => {
    const user = userEvent.setup()
    await renderDashboard()

    const commentsButton = screen.getByRole('button', { name: `Show comments for post by ${posts[0].authorName}` })
    await user.click(commentsButton)

    expect(commentsButton).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Merci pour le rappel, Omar !')).toBeInTheDocument()
    expect(screen.getByText(`${comments.filter((comment) => comment.postId === posts[0].id).length} comments`)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: `Hide comments for post by ${posts[0].authorName}` }))
    expect(screen.queryByText('Merci pour le rappel, Omar !')).not.toBeInTheDocument()
  })

  it('shows the correct comment count and an empty state for posts without comments', async () => {
    const user = userEvent.setup()
    await renderDashboard()

    const feed = screen.getByRole('heading', { name: 'Latest announcements' }).closest('section')
    const postArticles = within(feed).getAllByRole('article')
    const emptyPost = postArticles.find((article) => within(article).queryByText(posts[3].content))
    const emptyCommentsButton = within(emptyPost).getByRole('button', { name: `Show comments for post by ${posts[3].authorName}` })

    expect(within(emptyPost).getByText('0 comments')).toBeInTheDocument()
    await user.click(emptyCommentsButton)
    expect(within(emptyPost).getByText('No comments yet.')).toBeInTheDocument()
  })

  it('validates event registration and updates participation after successful submission', async () => {
    const user = userEvent.setup()
    await renderDashboard()

    const eventHeading = await screen.findByRole('heading', { name: 'Conférence IA responsable' })
    const eventCard = eventHeading.closest('article')
    const participateButton = within(eventCard).getByRole('button', { name: 'Participate' })

    await user.click(participateButton)
    const dialog = await screen.findByRole('dialog', { name: 'Register for Conférence IA responsable' })
    const phone = within(dialog).getByRole('textbox', { name: 'Phone number' })
    const submit = within(dialog).getByRole('button', { name: 'Confirm registration' })

    await user.click(submit)
    expect(await within(dialog).findByText('Enter your phone number to register.')).toBeInTheDocument()

    await user.type(phone, '555abc')
    await user.click(submit)
    expect(await within(dialog).findByText('Enter a valid phone number with 7 to 15 digits.')).toBeInTheDocument()

    await user.clear(phone)
    await user.type(phone, '+212612345678')
    const message = within(dialog).getByRole('textbox', { name: 'Message (optional)' })
    await user.type(message, 'I will arrive early.')
    await user.click(submit)

    expect(await screen.findByRole('dialog', { name: 'Registration confirmed' })).toBeInTheDocument()
    expect(within(eventCard).getByText('49 participants')).toBeInTheDocument()
    expect(within(eventCard).getByText('You’re registered')).toBeInTheDocument()
    expect(within(eventCard).queryByRole('button', { name: 'Participate' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cancel participation' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    const secondEventHeading = screen.getByRole('heading', { name: 'Hackathon Green Campus' })
    const secondEventCard = secondEventHeading.closest('article')
    expect(within(secondEventCard).getByText('You’re registered')).toBeInTheDocument()
    expect(within(secondEventCard).queryByRole('button', { name: 'Participate' })).not.toBeInTheDocument()
    expect(within(secondEventCard).getByText('32 participants')).toBeInTheDocument()
  })

  it('renders class issues without adding quick actions', async () => {
    await renderDashboard()

    for (const issue of issues) {
      expect(screen.getByText(issue.title)).toBeInTheDocument()
    }
    expect(screen.getByText('IN PROGRESS')).toBeInTheDocument()
    expect(screen.getByText('VIEWED')).toBeInTheDocument()
    expect(screen.getByText('RESOLVED')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Quick actions' })).not.toBeInTheDocument()
  })

  it('uses the available width when only posts or only events exist', async () => {
    const { container: eventsOnly } = await renderDashboard({ postsData: [] })
    expect(screen.queryByRole('heading', { name: 'Latest announcements' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Upcoming events' })).toBeInTheDocument()
    expect(eventsOnly.querySelector('[data-dashboard-layout="events-only"]')).toBeInTheDocument()
  })

  it('renders a full-width feed and no empty events section when posts exist alone', async () => {
    await renderDashboard({ postsData: posts, includeEvents: false })

    expect(screen.getByRole('heading', { name: 'Latest announcements' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Upcoming events' })).not.toBeInTheDocument()
    expect(document.querySelector('[data-dashboard-layout="posts-only"]')).toBeInTheDocument()
  })

  it('shows contextual empty states when neither posts nor events exist', async () => {
    await renderDashboard({ postsData: [], includeEvents: false })

    expect(screen.getByText('No campus posts yet')).toBeInTheDocument()
    expect(screen.getByText('No upcoming events')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Latest announcements' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Upcoming events' })).not.toBeInTheDocument()
  })
})
