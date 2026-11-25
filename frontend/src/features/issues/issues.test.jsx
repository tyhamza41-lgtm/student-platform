import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
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

  it('gives the Director status controls and confirmed deletion with comment and notification cleanup', async () => {
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

    const statusSelect = await screen.findByLabelText('Issue status')
    expect(within(statusSelect).getAllByRole('option').map((option) => option.value)).toEqual([
      'PENDING',
      'VIEWED',
      'IN_PROGRESS',
      'RESOLVED',
    ])
    const directorCommentRow = screen.getByText('Director review comment.').closest('li')
    await user.click(within(directorCommentRow).getByRole('button', { name: 'Delete' }))
    const commentConfirmation = await screen.findByRole('dialog', { name: 'Delete this comment?' })
    await user.click(within(commentConfirmation).getByRole('button', { name: 'Delete comment' }))
    await waitFor(async () => expect(await commentsService.getById(directorComment.id)).toBeNull())

    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-11-25T12:00:00.000Z'))
      await act(async () => {
        fireEvent.change(statusSelect, { target: { value: 'VIEWED' } })
        await Promise.resolve()
      })
      const firstView = await issuesService.getById('issue-1')
      expect(firstView).toMatchObject({
        status: 'VIEWED',
        viewedAt: '2026-11-25T12:00:00.000Z',
        viewedById: director.id,
      })

      vi.setSystemTime(new Date('2026-11-25T12:01:00.000Z'))
      await act(async () => {
        fireEvent.change(statusSelect, { target: { value: 'IN_PROGRESS' } })
        await Promise.resolve()
      })
      vi.setSystemTime(new Date('2026-11-25T12:02:00.000Z'))
      await act(async () => {
        fireEvent.change(statusSelect, { target: { value: 'VIEWED' } })
        await Promise.resolve()
      })
      expect(await issuesService.getById('issue-1')).toMatchObject({
        status: 'VIEWED',
        viewedAt: firstView.viewedAt,
        viewedById: firstView.viewedById,
        statusUpdatedAt: '2026-11-25T12:02:00.000Z',
      })
    } finally {
      vi.useRealTimers()
    }

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
    expect((await getMockDatabaseSnapshot()).notifications).toHaveLength(
      (await getMockDatabaseSnapshot()).users.length,
    )
    expect(router.state.location.pathname).toBe('/director/issues')
  })
})
