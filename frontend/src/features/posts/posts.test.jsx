import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '../../context/AuthContext'
import { AuthSession } from '../../../tests/auth-test-utils'
import { users as authUsers } from '../../../tests/auth-fixtures'
import StudentDashboard from '../students/pages/StudentDashboard'
import PostDetailsPage from './pages/PostDetailsPage'
import PostFormPage from './pages/PostFormPage'
import MyPostsPage from './pages/MyPostsPage'
import PublicProfilePage from '../profiles/pages/PublicProfilePage'
import { resetMockDatabase, transact } from '../../mocks/mockDatabase'
import * as commentsService from '../comments/comments.service'
import * as postsService from './posts.service'
import * as reactionsService from '../reactions/reactions.service'

beforeEach(async () => {
  localStorage.clear()
  await resetMockDatabase()
})

async function renderPostsRoute(path, user = authUsers.student, { clearEvents = true } = {}) {
  if (clearEvents) {
    await transact((database) => {
      database.events = []
      database.registrations = []
    })
  }
  const router = createMemoryRouter([
    { path: '/feed', element: <StudentDashboard /> },
    { path: '/posts/create', element: <PostFormPage /> },
    { path: '/posts/:postId/edit', element: <PostFormPage /> },
    { path: '/posts/:postId', element: <PostDetailsPage /> },
    { path: '/my-posts', element: <MyPostsPage /> },
    { path: '/users/:userId', element: <PublicProfilePage /> },
  ], { initialEntries: [path] })

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

describe('posts experience', () => {
  it('opens the actual author profile from a Post photo', async () => {
    const user = userEvent.setup()
    const { router } = await renderPostsRoute('/feed')
    const post = await screen.findByText('Class Representative')
    const authorLink = within(post.closest('article'))
      .getByRole('link', { name: "View Omar Benali's profile" })

    await user.click(authorLink)

    expect(await screen.findByRole('heading', { name: 'Omar Benali' })).toBeInTheDocument()
    expect(screen.getByText('Class/Group: GINF 2 — Génie Informatique (class-ginf-2)')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/users/representative-1')
  })

  it('opens comment author profiles from comment photos and names', async () => {
    const user = userEvent.setup()
    const feed = await renderPostsRoute('/feed')
    await user.click(screen.getByRole('button', { name: 'Show comments for post by Omar Benali' }))
    await user.click(await screen.findByRole('link', { name: "View Sara Amrani's profile" }))

    expect(await screen.findByRole('heading', { name: 'Sara Amrani' })).toBeInTheDocument()
    expect(screen.getByText('Class/Group: GINF 2 — Génie Informatique (class-ginf-2)')).toBeInTheDocument()
    feed.unmount()
    feed.router.dispose()

    const details = await renderPostsRoute('/posts/post-1')
    await user.click(await screen.findByRole('link', { name: 'Sara Amrani' }))

    expect(await screen.findByRole('heading', { name: 'Sara Amrani' })).toBeInTheDocument()
    expect(details.router.state.location.pathname).toBe('/users/student-3')
  })

  it('loads the dashboard feed from the centralized posts service', async () => {
    await renderPostsRoute('/feed')

    expect(await screen.findByRole('heading', { name: 'Latest announcements' })).toBeInTheDocument()
    expect(await screen.findByText(/Rappel important : le cours de programmation distribuée/)).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(4)
    const representativePost = screen.getByText('Class Representative').closest('article')
    expect(within(representativePost).getByRole('link', { name: "View Omar Benali's profile" }))
      .toHaveAttribute('href', '/users/representative-1')
    expect(within(representativePost).getByRole('img', { name: 'Omar Benali profile' }))
      .toHaveAttribute('src', expect.stringContaining('photo-1506794778202'))
    expect(within(representativePost).getByText('Class/Group: GINF 2 — Génie Informatique (class-ginf-2)'))
      .toBeInTheDocument()
  })

  it('shows empty and recoverable error states for the service-backed dashboard feed', async () => {
    await transact((database) => {
      database.posts = []
      database.comments = []
      database.reactions = []
    })
    const emptyView = await renderPostsRoute('/feed')
    expect(await screen.findByText('No campus posts yet')).toBeInTheDocument()
    emptyView.unmount()

    localStorage.setItem('student-platform.mock-database.v1', '{invalid')
    await renderPostsRoute('/feed', authUsers.student, { clearEvents: false })
    const errors = await screen.findAllByRole('alert')
    expect(errors.some((alert) => alert.textContent.includes('Stored mock data is not valid JSON'))).toBe(true)

    localStorage.clear()
    await resetMockDatabase()
    await userEvent.setup().click(screen.getAllByRole('button', { name: 'Try again' })[0])
    expect(await screen.findByRole('heading', { name: 'Latest announcements' })).toBeInTheDocument()
  })

  it('validates creation and creates a representative post with its assigned class and image', async () => {
    const user = userEvent.setup()
    await renderPostsRoute('/posts/create', authUsers.representative)

    const content = screen.getByRole('textbox', { name: 'Post content' })
    await user.click(screen.getByRole('button', { name: 'Publish post' }))
    expect(await screen.findByText('Write something before publishing your post.')).toBeInTheDocument()

    await user.type(content, 'Class photo day is Friday.')
    const image = new File([new Uint8Array([137, 80, 78, 71])], 'campus.png', { type: 'image/png' })
    await user.upload(document.querySelector('input[type="file"]'), image)
    expect(await screen.findByAltText('Preview of the post attachment')).toHaveAttribute('src', expect.stringContaining('data:image/png;base64'))
    expect(screen.queryByText('Click to upload')).not.toBeInTheDocument()
    expect(document.querySelector('input[type="file"]')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Remove selected image' }))
    expect(screen.queryByAltText('Preview of the post attachment')).not.toBeInTheDocument()
    const resetInput = document.querySelector('input[type="file"]')
    expect(resetInput).not.toBeNull()
    expect(resetInput.value).toBe('')

    await user.upload(resetInput, image)
    expect(await screen.findByAltText('Preview of the post attachment')).toHaveAttribute('src', expect.stringContaining('data:image/png;base64'))
    await user.click(screen.getByRole('button', { name: 'Remove selected image' }))

    const replacementImage = new File([new Uint8Array([255, 216, 255])], 'campus-replacement.jpg', { type: 'image/jpeg' })
    await user.upload(document.querySelector('input[type="file"]'), replacementImage)
    expect(await screen.findByAltText('Preview of the post attachment')).toHaveAttribute('src', expect.stringContaining('data:image/jpeg;base64'))

    await user.click(screen.getByRole('button', { name: 'Publish post' }))
    expect(await screen.findByRole('heading', { name: /Comments/ })).toBeInTheDocument()
    const created = (await postsService.getAll()).find((post) => post.content === 'Class photo day is Friday.')
    expect(created).toMatchObject({
      authorId: 'representative-1',
      authorRole: 'Class Representative',
      classId: 'class-ginf-2',
    })
    expect(created.imageUrl).toContain('data:image/jpeg;base64')
  })

  it('does not attach a selected image after it is removed before publishing', async () => {
    const user = userEvent.setup()
    await renderPostsRoute('/posts/create', authUsers.representative)
    await user.type(screen.getByRole('textbox', { name: 'Post content' }), 'Post without an attachment.')

    const image = new File([new Uint8Array([137, 80, 78, 71])], 'remove-me.png', { type: 'image/png' })
    await user.upload(document.querySelector('input[type="file"]'), image)
    expect(await screen.findByAltText('Preview of the post attachment')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove selected image' }))
    expect(document.querySelector('input[type="file"]')).not.toBeNull()

    await user.click(screen.getByRole('button', { name: 'Publish post' }))
    expect(await screen.findByRole('heading', { name: /Comments/ })).toBeInTheDocument()
    const created = (await postsService.getAll()).find((post) => post.content === 'Post without an attachment.')
    expect(created.imageUrl).toBeNull()
  })

  it('does not expose post creation to a student and rejects the action in the service', async () => {
    await renderPostsRoute('/posts/create', authUsers.student)
    expect(await screen.findByRole('alert')).toHaveTextContent('Your account does not have permission to create posts.')
    expect(screen.queryByRole('button', { name: 'Publish post' })).not.toBeInTheDocument()
    await expect(postsService.create({ content: 'Not allowed' }, authUsers.student.id)).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })

  it('creates association posts under the authenticated association and permits Director posts', async () => {
    const user = userEvent.setup()
    const associationView = await renderPostsRoute('/posts/create', authUsers.association)
    await user.type(screen.getByRole('textbox', { name: 'Post content' }), 'Arts open studio this week.')
    await user.click(screen.getByRole('button', { name: 'Publish post' }))
    expect(await screen.findByRole('heading', { name: /Comments/ })).toBeInTheDocument()
    expect((await postsService.getAll()).find((post) => post.content === 'Arts open studio this week.'))
      .toMatchObject({ authorId: 'association-1', associationId: 'association-1' })

    associationView.unmount()
    associationView.router.dispose()
    await renderPostsRoute('/posts/create', authUsers.director)
    await user.type(screen.getByRole('textbox', { name: 'Post content' }), 'Platform maintenance notice.')
    await user.click(screen.getByRole('button', { name: 'Publish post' }))
    expect((await postsService.getAll()).find((post) => post.content === 'Platform maintenance notice.'))
      .toMatchObject({ authorId: 'director-1', authorRole: 'Director' })
  })

  it('edits an authorized post and deletes it with its comments and reactions', async () => {
    const user = userEvent.setup()
    await renderPostsRoute('/posts/post-1/edit', authUsers.representative)
    const content = await screen.findByRole('textbox', { name: 'Post content' })
    await user.clear(content)
    await user.type(content, 'Updated class announcement.')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Updated class announcement.')).toBeInTheDocument()
    expect((await postsService.getById('post-1')).content).toBe('Updated class announcement.')

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete this post?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete post' }))
    await waitFor(async () => {
      expect(await postsService.getById('post-1')).toBeNull()
      expect(await commentsService.getAll({ postId: 'post-1' })).toHaveLength(0)
      expect(await reactionsService.getAll({ postId: 'post-1' })).toHaveLength(0)
    })
  })

  it('prevents an Association from editing another Association’s post at the service boundary', async () => {
    const associationPost = await postsService.create({ content: 'Owned by Arts.' }, 'association-1')
    await expect(postsService.update(associationPost.id, { content: 'Unauthorized change' }, 'association-2'))
      .rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(postsService.deletePost(associationPost.id, 'association-2'))
      .rejects.toMatchObject({ code: 'FORBIDDEN' })

    await renderPostsRoute(`/posts/${associationPost.id}/edit`, {
      id: 'association-2',
      name: 'Innovation Club',
      role: 'ASSOCIATION',
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission to edit this post.')
  })

  it('lists only the authenticated author’s posts for post management', async () => {
    await renderPostsRoute('/my-posts', authUsers.association)
    expect(await screen.findByRole('heading', { name: 'My posts' })).toBeInTheDocument()
    expect(await screen.findByText('Bureau des Arts')).toBeInTheDocument()
    expect(screen.queryByText('Omar Benali')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('does not render Hide or Restore moderation controls for a Director on the feed or post details', async () => {
    const feedView = await renderPostsRoute('/feed', authUsers.director)
    const post = await screen.findByText(/Rappel important : le cours de programmation distribuée/)
    const article = post.closest('article')
    expect(within(article).getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(within(article).queryByRole('button', { name: /^(Hide|Restore)$/ })).not.toBeInTheDocument()
    feedView.unmount()
    feedView.router.dispose()

    await renderPostsRoute('/posts/post-1', authUsers.director)
    await screen.findByText(/Rappel important : le cours de programmation distribuée/)
    expect(screen.queryByRole('button', { name: /^(Hide|Restore)$/ })).not.toBeInTheDocument()
    expect(postsService.setModerationStatus).toBeUndefined()
  })

  it('allows a Director to edit only their own posts while deleting any post, using canonical authorId', async () => {
    const user = userEvent.setup()
    const feedView = await renderPostsRoute('/feed', authUsers.director)

    const otherUserPost = (await screen.findByText(/Rappel important : le cours de programmation distribuée/))
      .closest('article')
    expect(within(otherUserPost).queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    expect(within(otherUserPost).getByRole('button', { name: 'Delete' })).toBeInTheDocument()

    const ownPost = (await screen.findByText(/IA responsable et métiers du numérique/))
      .closest('article')
    expect(within(ownPost).getByRole('link', { name: 'Edit' })).toHaveAttribute('href', '/posts/post-3/edit')
    expect(within(ownPost).getByRole('button', { name: 'Delete' })).toBeInTheDocument()

    feedView.unmount()
    feedView.router.dispose()

    // Service-level ownership check using canonical authorId (even if display name matches)
    await expect(postsService.update('post-1', { content: 'Unauthorized Director edit' }, authUsers.director.id))
      .rejects.toMatchObject({ code: 'FORBIDDEN' })

    await transact((database) => {
      database.posts.push({
        id: 'post-same-name',
        authorId: 'student-2',
        authorName: authUsers.director.name,
        authorRole: 'Student',
        publishedAt: '2026-11-26T10:00:00.000Z',
        content: 'Post with matching display name.',
        imageUrl: null,
        likeCount: 0,
        dislikeCount: 0,
        status: 'PUBLISHED',
      })
    })
    await expect(postsService.update('post-same-name', { content: 'Spoofed name edit' }, authUsers.director.id))
      .rejects.toMatchObject({ code: 'FORBIDDEN' })

    // Director cannot edit another user's post via edit route
    const forbiddenEditView = await renderPostsRoute('/posts/post-1/edit', authUsers.director)
    expect(await screen.findByRole('alert')).toHaveTextContent('You do not have permission to edit this post.')
    forbiddenEditView.unmount()
    forbiddenEditView.router.dispose()

    // Director can edit their own post via UI and service
    const ownEditView = await renderPostsRoute('/posts/post-3/edit', authUsers.director)
    const contentInput = await screen.findByRole('textbox', { name: 'Post content' })
    await user.clear(contentInput)
    await user.type(contentInput, 'Updated Director announcement.')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByText('Updated Director announcement.')).toBeInTheDocument()
    expect((await postsService.getById('post-3')).content).toBe('Updated Director announcement.')
    ownEditView.unmount()
    ownEditView.router.dispose()

    // Director can still delete another user's post via UI and service
    await renderPostsRoute('/posts/post-1', authUsers.director)
    const detailArticle = (await screen.findByText(/Rappel important : le cours de programmation distribuée/))
      .closest('article')
    expect(within(detailArticle).queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
    await user.click(within(detailArticle).getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete this post?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete post' }))
    await waitFor(async () => {
      expect(await postsService.getById('post-1')).toBeNull()
    })
  })

  it('shows post details, creates comments, links profiles, and deletes the author’s comment', async () => {
    const user = userEvent.setup()
    await renderPostsRoute('/posts/post-1')
    expect(await screen.findByRole('heading', { name: /Comments/ })).toBeInTheDocument()
    expect(screen.getByText('Merci pour le rappel, Omar !')).toBeInTheDocument()
    const representativePost = screen.getByText('Class Representative').closest('article')
    expect(within(representativePost).getByRole('link', { name: "View Omar Benali's profile" }))
      .toHaveAttribute('href', '/users/representative-1')
    expect(within(representativePost).getByRole('img', { name: 'Omar Benali profile' }))
      .toHaveAttribute('src', expect.stringContaining('photo-1506794778202'))
    expect(within(representativePost).getByText('Class/Group: GINF 2 — Génie Informatique (class-ginf-2)'))
      .toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Add a comment' }), 'I will review the slides.')
    await user.click(screen.getByRole('button', { name: 'Post comment' }))
    const created = await screen.findByText('I will review the slides.')
    expect(created).toBeInTheDocument()
    expect(created.closest('li').querySelector('a')).toHaveAttribute('href', '/users/student-1')
    expect((await commentsService.getAll({ postId: 'post-1' })).some((comment) => comment.content === 'I will review the slides.')).toBe(true)

    const commentRow = created.closest('li')
    await user.click(within(commentRow).getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete this comment?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete comment' }))
    await waitFor(() => expect(screen.queryByText('I will review the slides.')).not.toBeInTheDocument())
  })

  it('allows Associations to comment on Posts from every author type', async () => {
    const user = userEvent.setup()
    const cases = [
      ['post-4', 'Student'],
      ['post-1', 'Class Representative'],
      ['post-2', 'Student Association'],
      ['post-3', 'Director'],
    ]

    for (const [postId] of cases) {
      const view = await renderPostsRoute(`/posts/${postId}`, authUsers.association)
      const content = `Association reply to ${postId}`
      await user.type(screen.getByRole('textbox', { name: 'Add a comment' }), content)
      await user.click(screen.getByRole('button', { name: 'Post comment' }))
      const created = await screen.findByText(content)
      const row = created.closest('li')
      expect(within(row).getByRole('link', { name: 'Bureau des Arts' }))
        .toHaveAttribute('href', '/users/association-1')
      expect(within(row).getByRole('img', { name: 'Bureau des Arts profile' }))
        .toHaveAttribute('src', expect.stringContaining('photo-1529156069898'))
      expect(await commentsService.getAll({ postId })).toEqual(
        expect.arrayContaining([expect.objectContaining({
          content,
          authorId: authUsers.association.id,
          authorName: 'Bureau des Arts',
        })]),
      )
      view.unmount()
      view.router.dispose()
    }

    await expect(commentsService.add({
      postId: 'missing-post',
      content: 'A valid-looking comment.',
    }, authUsers.association.id)).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('preserves Director moderation rights for Post comments', async () => {
    const user = userEvent.setup()
    const view = await renderPostsRoute('/posts/post-1', authUsers.director)
    const existing = screen.getByText('Merci pour le rappel, Omar !').closest('li')
    await user.click(within(existing).getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('dialog', { name: 'Delete this comment?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete comment' }))
    await waitFor(async () => expect(await commentsService.getById('comment-1')).toBeNull())
    view.unmount()
    view.router.dispose()
  })

  it('opens Like and Dislike user lists with profile photos and profile links', async () => {
    const user = userEvent.setup()
    const likesView = await renderPostsRoute('/posts/post-1')
    await screen.findByText('Class Representative')
    await user.click(screen.getByRole('button', { name: /View users who liked this post/ }))
    const likesDialog = await screen.findByRole('dialog', { name: 'People who liked this post' })
    expect(within(likesDialog).getByText('Hamza Tya')).toBeInTheDocument()
    await user.click(within(likesDialog).getByRole('link', { name: /Hamza Tya/ }))
    expect(await screen.findByRole('heading', { name: 'Hamza Tya' })).toBeInTheDocument()
    likesView.unmount()
    likesView.router.dispose()

    await renderPostsRoute('/posts/post-2')
    await screen.findByText('Student Association')
    await user.click(within(screen.getByText('Student Association').closest('article')).getByRole('button', { name: /View users who disliked this post/ }))
    const dislikesDialog = await screen.findByRole('dialog', { name: 'People who disliked this post' })
    expect(within(dislikesDialog).getByText('Sara Amrani')).toBeInTheDocument()
    expect(within(dislikesDialog).getByRole('link', { name: /Sara Amrani/ })).toHaveAttribute('href', '/users/student-3')
  })

  it('uses distinct Lucide thumbs icons and reflects neutral, Like, and Dislike states', async () => {
    const user = userEvent.setup()
    await renderPostsRoute('/posts/post-1')
    const article = await screen.findByText('Class Representative').then((label) => label.closest('article'))
    const like = within(article).getByRole('button', { name: 'Like post by Omar Benali' })
    const dislike = within(article).getByRole('button', { name: 'Dislike post by Omar Benali' })
    const likeCount = within(article).getByRole('button', { name: /View users who liked this post/ })
    const dislikeCount = within(article).getByRole('button', { name: /View users who disliked this post/ })

    await waitFor(() => expect(like).toBeEnabled())
    expect(like.querySelector('svg')).toHaveClass('lucide-thumbs-up')
    expect(dislike.querySelector('svg')).toHaveClass('lucide-thumbs-down')
    expect(like).toHaveClass('text-slate-600')
    expect(dislike).toHaveClass('text-slate-600')

    await user.click(like)
    await waitFor(() => expect(like).toHaveAttribute('aria-pressed', 'true'))
    expect(like).toHaveClass('bg-indigo-50', 'text-indigo-600')
    await waitFor(() => expect(likeCount).toHaveTextContent('25'))

    await user.click(dislike)
    await waitFor(() => expect(dislike).toHaveAttribute('aria-pressed', 'true'))
    expect(dislike).toHaveClass('bg-red-50', 'text-red-600')
    expect(like).toHaveAttribute('aria-pressed', 'false')
    await waitFor(() => expect(likeCount).toHaveTextContent('24'))
    await waitFor(() => expect(dislikeCount).toHaveTextContent('2'))

    await user.click(dislike)
    await waitFor(() => expect(dislike).toHaveAttribute('aria-pressed', 'false'))
    expect(dislike).toHaveClass('text-slate-600')
    await waitFor(() => expect(dislikeCount).toHaveTextContent('1'))
  })

  it('persists reaction state between dashboard mounts', async () => {
    const user = userEvent.setup()
    const firstRender = await renderPostsRoute('/feed')
    const firstPost = await screen.findByText('Class Representative').then((label) => label.closest('article'))
    const likeButton = within(firstPost).getByRole('button', { name: 'Like post by Omar Benali' })
    await waitFor(() => expect(likeButton).toBeEnabled())
    await user.click(likeButton)
    await waitFor(() => expect(likeButton).toHaveAttribute('aria-pressed', 'true'))
    firstRender.unmount()
    firstRender.router.dispose()

    await renderPostsRoute('/feed')
    const reloadedPost = await screen.findByText('Class Representative').then((label) => label.closest('article'))
    expect(within(reloadedPost).getByRole('button', { name: 'Like post by Omar Benali' }))
      .toHaveAttribute('aria-pressed', 'true')
    expect((await postsService.getById('post-1')).likeCount).toBe(25)
  })
})
