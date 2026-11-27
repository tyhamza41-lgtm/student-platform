import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '../../context/AuthContext'
import { getMockDatabaseSnapshot, resetMockDatabase, transact } from '../../mocks/mockDatabase'
import { USER_ROLES } from '../../constants/roles'
import { users } from '../../../tests/auth-fixtures'
import { AuthSession } from '../../../tests/auth-test-utils'
import * as directorService from './director.service'
import DirectorDashboard from './pages/DirectorDashboard'
import StudentsPage from './pages/StudentsPage'
import AssociationsPage from './pages/AssociationsPage'
import RepresentativesPage from './pages/RepresentativesPage'

const director = { ...users.director, isActive: true }

beforeEach(async () => {
  localStorage.clear()
  await resetMockDatabase()
})

async function renderDirectorRoute(path) {
  const router = createMemoryRouter([
    { path: '/director/dashboard', element: <DirectorDashboard /> },
    { path: '/director/students', element: <StudentsPage /> },
    { path: '/director/associations', element: <AssociationsPage /> },
    { path: '/director/representatives', element: <RepresentativesPage /> },
  ], { initialEntries: [path] })

  const view = render(
    <AuthProvider>
      <AuthSession user={director}>
        <RouterProvider router={router} />
      </AuthSession>
    </AuthProvider>,
  )

  await userEvent.setup().click(
    screen.getByRole('button', { name: 'Initialize authenticated fixture' }),
  )
  return { ...view, router }
}

describe('Director management pages', () => {
  it('loads the authorized platform overview and management destinations without moderation', async () => {
    await renderDirectorRoute('/director/dashboard')

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Platform overview' })).toHaveTextContent('7')
    expect(screen.getByRole('region', { name: 'Platform overview' })).toHaveTextContent('2')
    expect(screen.getByRole('link', { name: /User Deletion.*Search student, representative, and association accounts/ })).toHaveAttribute('href', '/director/students')
    expect(screen.getByRole('link', { name: /Associations.*Manage registered associations/ })).toHaveAttribute('href', '/director/associations')
    expect(screen.getByRole('link', { name: /Representatives.*Assign up to 3 active students/ })).toHaveAttribute('href', '/director/representatives')
    expect(screen.getByRole('link', { name: /Class Issues Management.*Review reports/ })).toHaveAttribute('href', '/director/issues')
    expect(screen.getByRole('link', { name: /Events.*Browse campus events/ })).toHaveAttribute('href', '/events')
    expect(screen.queryByRole('link', { name: /Post moderation/i })).not.toBeInTheDocument()
  })

  it('finds and deletes eligible students, representatives, and associations without add/edit/status controls', async () => {
    await transact((database) => {
      database.associations.push({
        id: 'association-temp',
        accountUserId: 'association-user-temp',
        name: 'Temp Cultural Club',
        description: 'Temporary association for deletion check.',
        institution: 'ENSA Marrakech',
        isActive: true,
      })
      database.users.push({
        id: 'student-temp',
        name: 'Temp Unreferenced Student',
        email: 'temp.student@studentplatform.ma',
        role: USER_ROLES.STUDENT,
        classId: 'class-ginf-2',
        isActive: true,
      })
      database.users.push({
        id: 'association-user-temp',
        name: 'Temp Cultural Club',
        email: 'temp.club@studentplatform.ma',
        role: USER_ROLES.ASSOCIATION,
        associationId: 'association-temp',
        isActive: true,
      })
      database.classes[0].studentIds.push('student-temp')
    })

    const user = userEvent.setup()
    await renderDirectorRoute('/director/students')
    expect(await screen.findByRole('heading', { name: 'User Deletion' })).toBeInTheDocument()
    expect(await screen.findByRole('table', { name: 'User accounts' })).toBeInTheDocument()

    expect(screen.queryByRole('button', { name: /Add student|Edit|Activate|Deactivate/i })).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Account status/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Dr. Nadia Alaoui')).not.toBeInTheDocument()

    expect(screen.getByRole('row', { name: /Sam Student/ })).toHaveTextContent('Student')
    expect(screen.getByRole('row', { name: /Omar Benali/ })).toHaveTextContent('Class Representative')
    expect(screen.getByRole('row', { name: /Bureau des Arts/ })).toHaveTextContent('Association')

    await user.selectOptions(screen.getByLabelText('User type'), 'REPRESENTATIVE')
    expect(screen.getByRole('row', { name: /Omar Benali/ })).toBeInTheDocument()
    expect(screen.queryByRole('row', { name: /Sam Student/ })).not.toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('User type'), 'ALL')
    const referencedRow = screen.getByRole('row', { name: /Sam Student/ })
    await user.click(within(referencedRow).getByRole('button', { name: 'Delete' }))
    const referencedDialog = screen.getByRole('dialog', { name: 'Delete this user account?' })
    await user.click(within(referencedDialog).getByRole('button', { name: 'Delete user' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('referenced by platform records')
    expect(screen.getByRole('row', { name: /Sam Student/ })).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Search users' }), 'Temp')
    let tempStudentRow = screen.getByRole('row', { name: /Temp Unreferenced Student/ })
    await user.click(within(tempStudentRow).getByRole('button', { name: 'Delete' }))
    let confirmation = screen.getByRole('dialog', { name: 'Delete this user account?' })
    await user.click(within(confirmation).getByRole('button', { name: 'Delete user' }))
    await waitFor(() => {
      expect(screen.queryByRole('row', { name: /Temp Unreferenced Student/ })).not.toBeInTheDocument()
    })

    const tempAssociationRow = screen.getByRole('row', { name: /Temp Cultural Club/ })
    await user.click(within(tempAssociationRow).getByRole('button', { name: 'Delete' }))
    confirmation = screen.getByRole('dialog', { name: 'Delete this user account?' })
    await user.click(within(confirmation).getByRole('button', { name: 'Delete user' }))
    await waitFor(() => {
      expect(screen.queryByRole('row', { name: /Temp Cultural Club/ })).not.toBeInTheDocument()
    })
    const snapshot = await getMockDatabaseSnapshot()
    expect(snapshot.users.some((item) => item.id === 'student-temp' || item.id === 'association-user-temp')).toBe(false)
    expect(snapshot.associations.find((item) => item.id === 'association-temp').accountUserId).toBeNull()
  })

  it('creates, updates, and deletes an Association record without active/inactive status controls', async () => {
    const user = userEvent.setup()
    await renderDirectorRoute('/director/associations')
    await screen.findByRole('table', { name: 'Association records' })

    expect(screen.queryByRole('button', { name: /^(Activate|Deactivate)$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Status' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Add association' }))
    await user.type(screen.getByRole('textbox', { name: 'Association name' }), 'Director QA Association')
    await user.type(screen.getByRole('textbox', { name: 'Institution' }), 'Campus Test')
    await user.click(screen.getByRole('button', { name: 'Create association' }))

    let row = screen.getByRole('row', { name: /Director QA Association/ })
    expect(row).toHaveTextContent('Campus Test')
    await user.click(within(row).getByRole('button', { name: 'Edit' }))
    const nameField = screen.getByRole('textbox', { name: 'Association name' })
    await user.clear(nameField)
    await user.type(nameField, 'Director QA Association Updated')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    row = screen.getByRole('row', { name: /Director QA Association Updated/ })
    await user.click(within(row).getByRole('button', { name: 'Delete' }))
    const confirmation = screen.getByRole('dialog', { name: 'Delete this association?' })
    await user.click(within(confirmation).getByRole('button', { name: 'Delete association' }))
    expect(screen.queryByRole('row', { name: /Director QA Association Updated/ })).not.toBeInTheDocument()
  })

  it('shows only active representatives without a status column, enforces the 3-per-class limit, and hides deactivated representatives while freeing a slot', async () => {
    await transact((database) => {
      const inactiveRep = database.users.find((candidate) => candidate.id === 'student-5')
      inactiveRep.isRepresentative = false
      inactiveRep.representativeStatus = 'INACTIVE'
    })
    const user = userEvent.setup()
    await renderDirectorRoute('/director/representatives')
    const table = await screen.findByRole('table', { name: 'Class representatives' })
    const mobileList = screen.getByRole('list', { name: 'Active class representatives' })

    expect(within(table).getAllByRole('columnheader').map((header) => header.textContent)).toEqual([
      'Representative',
      'Assigned class',
      'Actions',
    ])
    expect(within(table).queryByRole('columnheader', { name: /status/i })).not.toBeInTheDocument()
    expect(within(table).queryByText('Inactive')).not.toBeInTheDocument()
    expect(within(table).queryByRole('row', { name: /Lina Bennis/ })).not.toBeInTheDocument()
    expect(within(mobileList).queryByText('Lina Bennis')).not.toBeInTheDocument()
    expect(within(mobileList).getByText('Omar Benali')).toBeInTheDocument()

    const assignForm = screen.getByRole('button', { name: 'Assign representative' }).closest('form')
    expect(assignForm.className).toContain('grid-cols-1')
    expect(assignForm.className).toContain('md:grid-cols-2')
    expect(assignForm.className).toContain('lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]')

    expect(screen.getByText('1/3 active')).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: /Student/ }), 'student-2')
    await user.click(screen.getByRole('button', { name: 'Assign representative' }))
    let row = await within(table).findByRole('row', { name: /Hamza Tya/ })
    expect(row).toHaveTextContent('GINF 2 — Génie Informatique')
    expect(await screen.findByText('2/3 active')).toBeInTheDocument()

    await user.selectOptions(screen.getByRole('combobox', { name: /Student/ }), 'student-3')
    await user.click(screen.getByRole('button', { name: 'Assign representative' }))
    expect(await within(table).findByRole('row', { name: /Sara Amrani/ })).toBeInTheDocument()
    expect(await screen.findByText('3/3 active')).toBeInTheDocument()

    expect(screen.getByText(/has reached the maximum of 3 active representatives \(3\/3\)/)).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: /Student/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Assign representative' })).toBeDisabled()

    await expect(directorService.assignRepresentative('student-4', 'class-ginf-2', director.id))
      .rejects.toMatchObject({ code: 'CONFLICT' })

    row = within(table).getByRole('row', { name: /Hamza Tya/ })
    await user.click(within(row).getByRole('button', { name: 'Deactivate' }))
    expect(await screen.findByText('Hamza Tya is no longer an active representative.')).toBeInTheDocument()
    expect(await screen.findByText('2/3 active')).toBeInTheDocument()
    expect(within(table).queryByRole('row', { name: /Hamza Tya/ })).not.toBeInTheDocument()
    expect(within(mobileList).queryByText('Hamza Tya')).not.toBeInTheDocument()

    expect(screen.getByRole('combobox', { name: /Student/ })).toBeEnabled()
    await user.selectOptions(screen.getByRole('combobox', { name: /Student/ }), 'student-4')
    await user.click(screen.getByRole('button', { name: 'Assign representative' }))
    expect(await within(table).findByRole('row', { name: /Youssef El Fassi/ })).toBeInTheDocument()
    expect(await screen.findByText('3/3 active')).toBeInTheDocument()
  })
})
