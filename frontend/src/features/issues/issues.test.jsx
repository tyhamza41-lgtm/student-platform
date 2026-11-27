import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '../../context/AuthContext'
import { users as authUsers } from '../../../tests/auth-fixtures'
import { AuthSession } from '../../../tests/auth-test-utils'
import {
  getMockDatabaseSnapshot,
  resetMockDatabase,
  transact,
} from '../../mocks/mockDatabase'
import * as commentsService from '../comments/comments.service'
import * as profilesService from '../profiles/profiles.service'
import * as issuesService from './issues.service'
import IssueDetailsPage from './pages/IssueDetailsPage'
import IssueFormPage from './pages/IssueFormPage'
import IssuesListPage from './pages/IssuesListPage'
import PublicProfilePage from '../profiles/pages/PublicProfilePage'

const student = {
  ...authUsers.student,
  classId: 'class-ginf-2',
  isActive: true,
}

const representative = {
  ...authUsers.representative,
  classId: 'class-ginf-2',
  isActive: true,
  isRepresentative: true,
}

const director = {
  ...authUsers.director,
  isActive: true,
}

beforeEach(async () => {
  localStorage.clear()
  await resetMockDatabase()
})

async function renderIssuesRoute(path, user = student) {
  const router = createMemoryRouter([
    { path: '/issues', element: <IssuesListPage /> },
    { path: '/issues/create', element: <IssueFormPage /> },
    { path: '/issues/:issueId', element: <IssueDetailsPage /> },
    { path: '/director/issues', element: <IssuesListPage directorMode /> },
    { path: '/director/issues/:issueId', element: <IssueDetailsPage directorMode /> },
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

async function addOtherClassIssue() {
  await transact((database) => {
    const originalClass = database.classes.find((studentClass) => studentClass.id === 'class-ginf-2')
    originalClass.studentIds = originalClass.studentIds.filter((studentId) => studentId !== 'student-2')
    database.classes.push({
      id: 'class-ginf-3',
      name: 'GINF-3 — Génie Informatique',
      institution: 'ENSA Marrakech',
      studentIds: ['student-2'],
      representativeId: null,
      activeRepresentativeIds: [],
    })
    database.users.find((user) => user.id === 'student-2').classId = 'class-ginf-3'
    database.issues.push({
      id: 'issue-other-class',
      classId: 'class-ginf-3',
      submittedById: 'student-2',
      title: 'Library lab availability',
      description: 'The lab schedule needs clarification.',
      submittedAt: '2026-11-24T11:00:00.000Z',
      status: 'PENDING',
    })
  })
}

describe('Class Issues experience', () => {
  it('opens a Class Issue commenter profile without changing the signed-in user', async () => {
    const user = userEvent.setup()
    await commentsService.add({
      issueId: 'issue-1',
      content: 'I noticed the same problem yesterday.',
    }, authUsers.student.id)
    const view = await renderIssuesRoute('/issues/issue-1')

    await user.click(await screen.findByRole('link', { name: 'Sam Student' }))

    expect(await screen.findByRole('heading', { name: 'Sam Student' })).toBeInTheDocument()
    expect(view.router.state.location.pathname).toBe('/users/student-1')
  })

  it('uses current profile photos for issue submitters and commenters', async () => {
    const avatarUrl = 'data:image/jpeg;base64,current-issue-author-photo'
    await commentsService.add({
      issueId: 'issue-1',
      content: 'Representative issue comment.',
    }, 'representative-1')
    await profilesService.update('representative-1', { avatarUrl }, 'representative-1')

    const listView = await renderIssuesRoute('/issues')
    const issueCard = (await screen.findByRole('heading', {
      name: 'Climatiseur en panne dans la salle B12',
    })).closest('article')
    expect(within(issueCard).getByRole('img', { name: 'Omar Benali profile' }))
      .toHaveAttribute('src', avatarUrl)
    listView.unmount()
    listView.router.dispose()

    await renderIssuesRoute('/issues/issue-1')
    const representativeAvatars = await screen.findAllByRole('img', { name: 'Omar Benali profile' })
    expect(representativeAvatars).toHaveLength(2)
    expect(representativeAvatars.every((avatar) => avatar.getAttribute('src') === avatarUrl)).toBe(true)
  })

  it('lists issues globally with their class/group identity and shows creation only to representatives', async () => {
    await addOtherClassIssue()
    const studentView = await renderIssuesRoute('/issues')
    expect(await screen.findByRole('heading', { name: 'Class Issues' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Climatiseur en panne dans la salle B12' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Library lab availability' })).toBeInTheDocument()
    const representativeIssue = screen.getByRole('heading', { name: 'Climatiseur en panne dans la salle B12' })
      .closest('article')
    expect(within(representativeIssue).getByRole('link', { name: "View Omar Benali's profile" }))
      .toHaveAttribute('href', '/users/representative-1')
    expect(within(representativeIssue).getByRole('img', { name: 'Omar Benali profile' }))
      .toHaveAttribute('src', expect.stringContaining('photo-1506794778202'))
    expect(within(representativeIssue).getByText('Class/Group: GINF 2 — Génie Informatique (class-ginf-2)'))
      .toBeInTheDocument()
    expect(screen.getByText('Class/Group: GINF-3 — Génie Informatique (class-ginf-3)')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View issue: Climatiseur en panne dans la salle B12' }))
      .toHaveAttribute('href', '/issues/issue-1')
    expect(screen.queryByRole('link', { name: 'Create class issue' })).not.toBeInTheDocument()
    studentView.unmount()
    studentView.router.dispose()

    await renderIssuesRoute('/issues', representative)
    expect(await screen.findByRole('link', { name: 'Create class issue' }))
      .toHaveAttribute('href', '/issues/create')
  })

  it('shows Director issue management and recoverable empty and error states', async () => {
    const directorView = await renderIssuesRoute('/director/issues', director)
    expect(await screen.findByRole('heading', { name: 'Class Issues Management' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View issue: Climatiseur en panne dans la salle B12' }))
      .toHaveAttribute('href', '/director/issues/issue-1')
    directorView.unmount()
    directorView.router.dispose()

    await transact((database) => {
      database.issues = []
    })
    const emptyView = await renderIssuesRoute('/issues')
    expect(await screen.findByText('No class issues yet')).toBeInTheDocument()
    emptyView.unmount()
    emptyView.router.dispose()

    localStorage.setItem('student-platform.mock-database.v1', '{invalid')
    await renderIssuesRoute('/issues')
    expect(await screen.findByRole('alert')).toHaveTextContent('Stored mock data is not valid JSON')

    localStorage.clear()
    await resetMockDatabase()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByRole('heading', { name: 'Climatiseur en panne dans la salle B12' })).toBeInTheDocument()
  })

  it('lets an Association view global issues without issue-management permissions', async () => {
    await addOtherClassIssue()
    const user = userEvent.setup()
    const view = await renderIssuesRoute('/issues', authUsers.association)
    expect(await screen.findByRole('heading', { name: 'Library lab availability' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Climatiseur en panne dans la salle B12' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Create class issue' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('link', { name: 'View issue: Library lab availability' }))
    expect(await screen.findByRole('heading', { name: 'Library lab availability' })).toBeInTheDocument()
    expect(screen.getByText('Class/Group: GINF-3 — Génie Informatique (class-ginf-3)')).toBeInTheDocument()
    const commentInput = screen.getByRole('textbox', { name: 'Add a comment' })
    await user.type(commentInput, 'Association response to this issue.')
    await user.click(screen.getByRole('button', { name: 'Post comment' }))

    const commentText = await screen.findByText('Association response to this issue.')
    const commentItem = commentText.closest('li')
    expect(within(commentItem).getByRole('link', { name: 'Bureau des Arts' }))
      .toHaveAttribute('href', `/users/${authUsers.association.id}`)
    expect(within(commentItem).getByRole('img', { name: 'Bureau des Arts profile' }))
      .toHaveAttribute('src', expect.stringContaining('photo-1529156069898-49953e39b3ac'))
    expect(within(commentItem).getByRole('button', { name: 'Delete' })).toBeInTheDocument()

    const savedComment = (await commentsService.getAll({ issueId: 'issue-other-class' }))
      .find((comment) => comment.content === 'Association response to this issue.')
    expect(savedComment).toMatchObject({
      issueId: 'issue-other-class',
      authorId: authUsers.association.id,
      authorName: 'Bureau des Arts',
      authorAvatar: expect.stringContaining('photo-1529156069898-49953e39b3ac'),
    })
    view.unmount()
    view.router.dispose()

    const refreshedView = await renderIssuesRoute('/issues/issue-other-class', authUsers.association)
    expect(await screen.findByText('Association response to this issue.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Bureau des Arts' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Create class issue' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /edit issue|assign issue/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete issue' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Issue status')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark as In progress' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark as Resolved' })).not.toBeInTheDocument()

    expect(await issuesService.getById('issue-other-class')).toMatchObject({
      title: 'Library lab availability',
      classId: 'class-ginf-3',
    })
    await expect(issuesService.create({
      classId: 'class-ginf-2',
      title: 'Unauthorized Association issue',
      description: 'Associations cannot create Class Issues.',
    }, authUsers.association.id)).rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(issuesService.update('issue-other-class', { title: 'Unauthorized' }, authUsers.association.id))
      .rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(issuesService.update(
      'issue-other-class',
      { assignedToId: 'director-1' },
      authUsers.association.id,
    )).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
    await expect(issuesService.updateStatus('issue-other-class', 'IN_PROGRESS', authUsers.association.id))
      .rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(issuesService.deleteIssue('issue-other-class', authUsers.association.id))
      .rejects.toMatchObject({ code: 'FORBIDDEN' })
    await expect(commentsService.deleteComment(savedComment.id, 'association-2'))
      .rejects.toMatchObject({ code: 'FORBIDDEN' })
    expect(await commentsService.deleteComment(savedComment.id, authUsers.association.id))
      .toMatchObject({ id: savedComment.id })
    refreshedView.unmount()
    refreshedView.router.dispose()
  })

  it('lets a student list, open, and comment on an issue from another class', async () => {
    await addOtherClassIssue()
    const user = userEvent.setup()
    const { router } = await renderIssuesRoute('/issues')
    await user.click(screen.getByRole('link', { name: 'View issue: Library lab availability' }))

    expect(await screen.findByRole('heading', { name: 'Library lab availability' })).toBeInTheDocument()
    expect(screen.getByText('Class/Group: GINF-3 — Génie Informatique (class-ginf-3)')).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Add a comment' }), 'I am from another class but can comment.')
    await user.click(screen.getByRole('button', { name: 'Post comment' }))

    expect(await screen.findByText('I am from another class but can comment.')).toBeInTheDocument()
    expect(await commentsService.getAll({ issueId: 'issue-other-class' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          authorId: student.id,
          issueId: 'issue-other-class',
        }),
      ]),
    )
    expect(router.state.location.pathname).toBe('/issues/issue-other-class')
  })

  it('creates a class issue through the representative service and opens its details', async () => {
    const user = userEvent.setup()
    const { router } = await renderIssuesRoute('/issues/create', representative)
    expect(await screen.findByRole('heading', { name: 'Create Class Issue' })).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Issue title' }), 'Broken classroom lights')
    await user.type(
      screen.getByRole('textbox', { name: 'Description' }),
      'Several lights are not working in room B12.',
    )
    await user.click(screen.getByRole('button', { name: 'Submit issue' }))

    expect(await screen.findByRole('heading', { name: 'Broken classroom lights' })).toBeInTheDocument()
    expect(router.state.location.pathname).toMatch(/^\/issues\/issue-mock-/)
    expect(await issuesService.getAll({ classId: 'class-ginf-2' })).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Broken classroom lights',
          submittedById: representative.id,
          classId: 'class-ginf-2',
          status: 'PENDING',
        }),
      ]),
    )
  })

  it('shows issue details and comment snapshots, submits a comment, and lets its author delete it', async () => {
    const user = userEvent.setup()
    await commentsService.add({
      issueId: 'issue-1',
      content: 'I noticed the same problem yesterday.',
    }, 'student-3')
    await renderIssuesRoute('/issues/issue-1')

    expect(await screen.findByRole('heading', { name: 'Climatiseur en panne dans la salle B12' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: "View Omar Benali's profile" }))
      .toHaveAttribute('href', '/users/representative-1')
    expect(screen.getByRole('img', { name: 'Omar Benali profile' }))
      .toHaveAttribute('src', expect.stringContaining('photo-1506794778202'))
    expect(screen.getByText('Class/Group: GINF 2 — Génie Informatique (class-ginf-2)'))
      .toBeInTheDocument()
    const existingComment = screen.getByText('I noticed the same problem yesterday.').closest('li')
    expect(within(existingComment).getByRole('link', { name: 'Sara Amrani' })).toHaveAttribute('href', '/users/student-3')
    expect(within(existingComment).getByRole('img', { name: 'Sara Amrani profile' }))
      .toHaveAttribute('src', expect.stringContaining('photo-1494790108377'))
    expect(screen.queryByRole('button', { name: 'Delete issue' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Issue status')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark as In progress' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark as Resolved' })).not.toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Add a comment' }), 'The class has reported it too.')
    await user.click(screen.getByRole('button', { name: 'Post comment' }))
    const created = await screen.findByText('The class has reported it too.')
    const createdComment = created.closest('li')
    expect(within(createdComment).getByRole('link', { name: 'Sam Student' })).toHaveAttribute('href', '/users/student-1')

    await user.click(within(createdComment).getByRole('button', { name: 'Delete' }))
    const confirmation = await screen.findByRole('dialog', { name: 'Delete this comment?' })
    expect(await commentsService.getAll({ issueId: 'issue-1' })).toHaveLength(2)
    await user.click(within(confirmation).getByRole('button', { name: 'Delete comment' }))
    await waitFor(async () => expect(await commentsService.getAll({ issueId: 'issue-1' })).toHaveLength(1))
    expect(screen.queryByText('The class has reported it too.')).not.toBeInTheDocument()
  })

  it('gives the Director status buttons without a status select and confirmed deletion with comment and notification cleanup', async () => {
    const user = userEvent.setup()
    const directorComment = await commentsService.add({
      issueId: 'issue-1',
      content: 'Director review comment.',
    }, 'student-3')
    await commentsService.add({
      issueId: 'issue-1',
      content: 'Keep this comment until issue deletion.',
    }, 'student-4')
    const { router } = await renderIssuesRoute('/director/issues/issue-1', director)

    const inProgressButton = await screen.findByRole('button', { name: 'Mark as In progress' })
    const resolvedButton = screen.getByRole('button', { name: 'Mark as Resolved' })
    expect(screen.queryByLabelText('Issue status')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /viewed/i })).not.toBeInTheDocument()
    expect(inProgressButton).toBeDisabled()
    expect(resolvedButton).toBeEnabled()

    const directorCommentRow = screen.getByText('Director review comment.').closest('li')
    await user.click(within(directorCommentRow).getByRole('button', { name: 'Delete' }))
    const commentConfirmation = await screen.findByRole('dialog', { name: 'Delete this comment?' })
    await user.click(within(commentConfirmation).getByRole('button', { name: 'Delete comment' }))
    await waitFor(async () => expect(await commentsService.getById(directorComment.id)).toBeNull())

    await user.click(resolvedButton)
    expect(await screen.findByText('Issue status updated to Resolved.')).toBeInTheDocument()
    expect(await issuesService.getById('issue-1')).toMatchObject({
      status: 'RESOLVED',
      resolvedById: director.id,
    })
    expect(resolvedButton).toBeDisabled()
    expect(inProgressButton).toBeEnabled()

    await user.click(inProgressButton)
    expect(await screen.findByText('Issue status updated to In progress.')).toBeInTheDocument()
    expect(await issuesService.getById('issue-1')).toMatchObject({ status: 'IN_PROGRESS' })
    expect(inProgressButton).toBeDisabled()
    expect(resolvedButton).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Delete issue' }))
    const issueConfirmation = await screen.findByRole('dialog', { name: 'Delete this class issue?' })
    expect(issueConfirmation).toHaveTextContent('Associated comments will be removed')
    await user.click(within(issueConfirmation).getByRole('button', { name: 'Cancel' }))
    expect(await issuesService.getById('issue-1')).toBeTruthy()
    expect(await commentsService.getAll({ issueId: 'issue-1' })).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Delete issue' }))
    const finalConfirmation = await screen.findByRole('dialog', { name: 'Delete this class issue?' })
    await user.click(within(finalConfirmation).getByRole('button', { name: 'Delete issue' }))

    expect(await screen.findByRole('heading', { name: 'Class Issues Management' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('Issue deleted. Platform users have been notified.')
    expect(await issuesService.getById('issue-1')).toBeNull()
    expect(await commentsService.getAll({ issueId: 'issue-1' })).toHaveLength(0)
    const database = await getMockDatabaseSnapshot()
    const deletionNotices = database.notifications.filter((notification) => (
      notification.itemId === 'issue-1' && notification.type === 'ISSUE_DELETED'
    ))
    expect(deletionNotices).toHaveLength(database.users.length)
    expect(deletionNotices.map((notification) => notification.recipientId).sort())
      .toEqual(database.users.map((account) => account.id).sort())
    expect(router.state.location.pathname).toBe('/director/issues')
  })

  it('automatically transitions a PENDING issue to VIEWED once when opened by a Director and supports In progress and Resolved actions', async () => {
    await transact((database) => {
      database.issues.push({
        id: 'issue-pending',
        classId: 'class-ginf-2',
        submittedById: 'representative-1',
        title: 'Broken projector cable',
        description: 'HDMI cable in room A3 needs replacement.',
        submittedAt: '2026-11-26T09:00:00.000Z',
        status: 'PENDING',
      })
    })
    const updateSpy = vi.spyOn(issuesService, 'updateStatus')
    const user = userEvent.setup()

    const firstOpen = await renderIssuesRoute('/director/issues/issue-pending', director)
    expect(await screen.findByRole('heading', { name: 'Broken projector cable' })).toBeInTheDocument()
    await waitFor(async () => {
      expect(await issuesService.getById('issue-pending')).toMatchObject({
        status: 'VIEWED',
        viewedById: director.id,
      })
    })
    expect(updateSpy).toHaveBeenCalledTimes(1)
    expect(within(screen.getByRole('heading', { name: 'Broken projector cable' }).closest('header')).getByText('Viewed'))
      .toBeInTheDocument()
    expect(screen.queryByLabelText('Issue status')).not.toBeInTheDocument()
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /viewed/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark as In progress' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Mark as Resolved' })).toBeEnabled()
    firstOpen.unmount()
    firstOpen.router.dispose()

    updateSpy.mockClear()
    const secondOpen = await renderIssuesRoute('/director/issues/issue-pending', director)
    expect(await screen.findByRole('heading', { name: 'Broken projector cable' })).toBeInTheDocument()
    expect(updateSpy).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Mark as In progress' }))
    expect(await screen.findByText('Issue status updated to In progress.')).toBeInTheDocument()
    expect(await issuesService.getById('issue-pending')).toMatchObject({ status: 'IN_PROGRESS' })
    expect(screen.getByRole('button', { name: 'Mark as In progress' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Mark as Resolved' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Mark as Resolved' }))
    expect(await screen.findByText('Issue status updated to Resolved.')).toBeInTheDocument()
    expect(await issuesService.getById('issue-pending')).toMatchObject({
      status: 'RESOLVED',
      resolvedById: director.id,
    })
    expect(screen.getByRole('button', { name: 'Mark as Resolved' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Mark as In progress' })).toBeEnabled()

    secondOpen.unmount()
    secondOpen.router.dispose()
    updateSpy.mockClear()

    await renderIssuesRoute('/director/issues/issue-pending', director)
    expect(await screen.findByRole('heading', { name: 'Broken projector cable' })).toBeInTheDocument()
    expect(updateSpy).not.toHaveBeenCalled()
    expect((await getMockDatabaseSnapshot()).notifications).toEqual([])
  })
})
