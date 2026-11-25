import { beforeEach, describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '../../context/AuthContext'
import { AuthSession } from '../../../tests/auth-test-utils'
import { users as authUsers } from '../../../tests/auth-fixtures'
import { resetMockDatabase, transact } from '../../mocks/mockDatabase'
import * as eventsService from './events.service'
import EventsListPage from './pages/EventsListPage'
import EventDetailsPage from './pages/EventDetailsPage'
import EventFormPage from './pages/EventFormPage'
import AssociationEventsPage from './pages/AssociationEventsPage'
import StudentDashboard from '../students/pages/StudentDashboard'

beforeEach(async () => {
  localStorage.clear()
  await resetMockDatabase()
})

async function renderEventsRoute(path, user = authUsers.student, { postsData = [] } = {}) {
  const router = createMemoryRouter([
    { path: '/events', element: <EventsListPage /> },
    { path: '/events/:eventId', element: <EventDetailsPage /> },
    { path: '/association/events', element: <AssociationEventsPage /> },
    { path: '/association/events/create', element: <EventFormPage /> },
    { path: '/association/events/:eventId/edit', element: <EventFormPage /> },
    { path: '/feed', element: <StudentDashboard postsData={postsData} /> },
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

function futureDateTime(days = 3) {
  const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset())
  return date.toISOString().slice(0, 16)
}

describe('Events experience', () => {
  it.each([
    ['student', authUsers.student],
    ['representative', authUsers.representative],
    ['association', authUsers.association],
    ['director', authUsers.director],
  ])('allows an authenticated %s to browse events', async (_role, user) => {
    await renderEventsRoute('/events', user)

    expect(await screen.findByRole('heading', { name: 'Events' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Conférence IA responsable' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Hackathon Green Campus' })).toBeInTheDocument()
    if (user.role === 'ASSOCIATION') {
      expect(screen.getByRole('link', { name: 'Create event' })).toBeInTheDocument()
    } else {
      expect(screen.queryByRole('link', { name: 'Create event' })).not.toBeInTheDocument()
    }
  })

  it('lists published upcoming and past events with links to their details', async () => {
    await transact((database) => {
      database.events[0].date = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    })
    await renderEventsRoute('/events')

    expect(await screen.findByRole('heading', { name: 'Events' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Upcoming events' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Past events' })).toBeInTheDocument()
    const pastCard = screen.getByRole('heading', { name: 'Conférence IA responsable' }).closest('article')
    expect(within(pastCard).getByText('Past event')).toBeInTheDocument()
    expect(within(pastCard).getByRole('link', { name: 'Event details' })).toHaveAttribute('href', '/events/event-1')
    expect(screen.getByRole('heading', { name: 'Hackathon Green Campus' })).toBeInTheDocument()
  })

  it.each([
    ['student', authUsers.student, true],
    ['representative student', authUsers.representative, true],
    ['association', authUsers.association, false],
    ['Director', authUsers.director, false],
  ])('keeps event registration controls consistent for %s across list, details, and Dashboard', async (_role, user, canRegister) => {
    const list = await renderEventsRoute('/events', user)
    const listCard = (await screen.findByRole('heading', { name: 'Conférence IA responsable' })).closest('article')
    if (canRegister) {
      expect(within(listCard).getByRole('button', { name: 'Register' })).toBeInTheDocument()
    } else {
      expect(within(listCard).queryByRole('button', { name: 'Register' })).not.toBeInTheDocument()
    }
    list.unmount()

    const details = await renderEventsRoute('/events/event-1', user)
    if (canRegister) {
      expect(await screen.findByRole('button', { name: 'Register for this event' })).toBeInTheDocument()
    } else {
      await screen.findByRole('heading', { name: 'Conférence IA responsable' })
      expect(screen.queryByRole('button', { name: 'Register for this event' })).not.toBeInTheDocument()
    }
    details.unmount()

    await renderEventsRoute('/feed', user)
    const dashboardCard = (await screen.findByRole('heading', { name: 'Conférence IA responsable' })).closest('article')
    if (canRegister) {
      expect(within(dashboardCard).getByRole('button', { name: 'Participate' })).toBeInTheDocument()
    } else {
      expect(within(dashboardCard).queryByRole('button', { name: 'Participate' })).not.toBeInTheDocument()
    }
  })

  it('shows an empty state and a recoverable error when events cannot be loaded', async () => {
    await transact((database) => {
      database.events = []
      database.registrations = []
    })
    const emptyView = await renderEventsRoute('/events')
    expect(await screen.findByText('No events yet')).toBeInTheDocument()
    emptyView.unmount()

    localStorage.setItem('student-platform.mock-database.v1', '{invalid')
    await renderEventsRoute('/events')
    expect(await screen.findByRole('alert')).toHaveTextContent(/Stored mock data is not valid JSON/)
  })

  it('registers and cancels participation from event details while keeping counts synchronized', async () => {
    const user = userEvent.setup()
    await renderEventsRoute('/events/event-1')

    expect(await screen.findByRole('heading', { name: 'Conférence IA responsable' })).toBeInTheDocument()
    expect(screen.getByText('48', { exact: true })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Register for this event' }))

    const registrationDialog = await screen.findByRole('dialog', { name: 'Register for Conférence IA responsable' })
    await user.type(within(registrationDialog).getByRole('textbox', { name: 'Phone number' }), '+212 6 55 44 33 22')
    await user.type(within(registrationDialog).getByRole('textbox', { name: 'Message (optional)' }), 'I will arrive early.')
    await user.click(within(registrationDialog).getByRole('button', { name: 'Confirm registration' }))

    expect(await screen.findByText('The event now has 49 participants.')).toBeInTheDocument()
    expect(screen.getByText('49', { exact: true })).toBeInTheDocument()
    expect(await eventsService.getMyRegistrations(authUsers.student.id)).toEqual(
      expect.arrayContaining([expect.objectContaining({ eventId: 'event-1', phone: '+212 6 55 44 33 22' })]),
    )
    await user.click(within(registrationDialog).getByRole('button', { name: 'Done' }))

    await user.click(screen.getByRole('button', { name: 'Cancel participation' }))
    const cancelDialog = await screen.findByRole('dialog', { name: 'Cancel event registration?' })
    await user.click(within(cancelDialog).getByRole('button', { name: 'Cancel registration' }))
    await waitFor(() => expect(screen.getByText('48', { exact: true })).toBeInTheDocument())
    expect(await eventsService.getMyRegistrations(authUsers.student.id)).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ eventId: 'event-1' })]),
    )
  })

  it('validates and creates an Association event with an optional image', async () => {
    const user = userEvent.setup()
    const { router } = await renderEventsRoute('/association/events/create', authUsers.association)

    await user.click(screen.getByRole('button', { name: 'Publish event' }))
    expect(await screen.findByText(/Complete the title, description, date and time, and location/)).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Event title' }), 'Arts showcase')
    await user.type(screen.getByRole('textbox', { name: 'Description' }), 'An evening of student work.')
    await user.type(screen.getByRole('textbox', { name: 'Location' }), 'Main Hall')
    const dateInput = document.querySelector('input[name="date"]')
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000)
    pastDate.setMinutes(pastDate.getMinutes() - pastDate.getTimezoneOffset())
    fireEvent.change(dateInput, { target: { value: pastDate.toISOString().slice(0, 16) } })
    await user.click(screen.getByRole('button', { name: 'Publish event' }))
    expect(await screen.findByText('Choose a valid date and time in the future.')).toBeInTheDocument()
    fireEvent.change(dateInput, { target: { value: futureDateTime() } })

    const image = new File([new Uint8Array([137, 80, 78, 71])], 'showcase.png', { type: 'image/png' })
    await user.upload(document.querySelector('input[type="file"]'), image)
    expect(await screen.findByAltText('Preview of the event')).toHaveAttribute('src', expect.stringContaining('data:image/png;base64'))

    await user.click(screen.getByRole('button', { name: 'Publish event' }))
    expect(await screen.findByRole('heading', { name: 'Arts showcase' })).toBeInTheDocument()
    expect(router.state.location.pathname).toMatch(/^\/events\/event-mock-/)
    const created = (await eventsService.getAll()).find((event) => event.title === 'Arts showcase')
    expect(created).toMatchObject({
      ownerType: 'ASSOCIATION',
      ownerId: 'association-1',
      location: 'Main Hall',
    })
    expect(created.imageUrl).toContain('data:image/png;base64')
  })

  it('prevents editing another Association’s event and allows its owner to edit and delete an unregistered event', async () => {
    const user = userEvent.setup()
    const unauthorized = await renderEventsRoute('/association/events/event-2/edit', authUsers.association)
    expect(await screen.findByRole('alert')).toHaveTextContent('You can only edit events published by your association.')
    expect(screen.queryByRole('textbox', { name: 'Event title' })).not.toBeInTheDocument()
    await expect(eventsService.update('event-2', { title: 'Unauthorized' }, authUsers.association.id))
      .rejects.toMatchObject({ code: 'FORBIDDEN' })
    unauthorized.unmount()

    const ownEvent = await eventsService.create({
      title: 'Arts showcase',
      description: 'An evening of student work.',
      date: futureDateTime(5),
      location: 'Main Hall',
    }, authUsers.association.id)
    await renderEventsRoute(`/association/events/${ownEvent.id}/edit`, authUsers.association)
    const title = await screen.findByRole('textbox', { name: 'Event title' })
    await user.clear(title)
    await user.type(title, 'Annual arts showcase')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(await screen.findByRole('heading', { name: 'Annual arts showcase' })).toBeInTheDocument()
    expect((await eventsService.getById(ownEvent.id)).title).toBe('Annual arts showcase')
  })

  it('requires confirmation before an Association deletes its unregistered event', async () => {
    const user = userEvent.setup()
    const ownEvent = await eventsService.create({
      title: 'One-time workshop',
      description: 'A practical workshop.',
      date: futureDateTime(),
      location: 'Lab 1',
    }, authUsers.association.id)
    await renderEventsRoute('/association/events', authUsers.association)

    const eventCard = (await screen.findByRole('heading', { name: 'One-time workshop' })).closest('article')
    await user.click(within(eventCard).getByRole('button', { name: 'Delete' }))
    const confirmation = await screen.findByRole('dialog', { name: 'Delete this event?' })
    expect(await eventsService.getById(ownEvent.id)).toBeTruthy()
    await user.click(within(confirmation).getByRole('button', { name: 'Delete event' }))

    await waitFor(() => expect(eventsService.getById(ownEvent.id)).resolves.toBeNull())
    expect(screen.queryByRole('heading', { name: 'One-time workshop' })).not.toBeInTheDocument()
  })

  it('lets the Director confirm deletion of another owner’s event from the feed', async () => {
    const user = userEvent.setup()
    await renderEventsRoute('/events', authUsers.director)

    const eventCard = (await screen.findByRole('heading', { name: 'Hackathon Green Campus' })).closest('article')
    await user.click(within(eventCard).getByRole('button', { name: 'Delete' }))
    const confirmation = await screen.findByRole('dialog', { name: 'Delete this event?' })
    expect(await eventsService.getById('event-2')).toBeTruthy()
    expect(confirmation).toHaveTextContent('removes its registrations and sends a notice')
    await user.click(within(confirmation).getByRole('button', { name: 'Delete event' }))

    await waitFor(async () => expect(await eventsService.getById('event-2')).toBeNull())
    expect(screen.queryByRole('heading', { name: 'Hackathon Green Campus' })).not.toBeInTheDocument()
    expect((await eventsService.getMyRegistrations('student-1')).some(({ eventId }) => eventId === 'event-2'))
      .toBe(false)
  })

  it('keeps cancelled events available for Director moderation', async () => {
    const user = userEvent.setup()
    await transact((database) => {
      database.events.find((event) => event.id === 'event-2').status = 'CANCELLED'
    })
    await renderEventsRoute('/events', authUsers.director)

    const eventCard = (await screen.findByRole('heading', { name: 'Hackathon Green Campus' })).closest('article')
    expect(screen.getByRole('heading', { name: 'Cancelled events' })).toBeInTheDocument()
    expect(within(eventCard).getByText('Cancelled')).toBeInTheDocument()
    await user.click(within(eventCard).getByRole('button', { name: 'Delete' }))
    const confirmation = await screen.findByRole('dialog', { name: 'Delete this event?' })
    await user.click(within(confirmation).getByRole('button', { name: 'Delete event' }))

    await waitFor(async () => expect(await eventsService.getById('event-2')).toBeNull())
  })

  it('shows registered participants only to the Association that owns an event', async () => {
    const associationTwo = {
      ...authUsers.association,
      id: 'association-2',
      associationId: 'association-2',
      name: 'Club Innovation & Technologies',
    }
    const { unmount } = await renderEventsRoute('/association/events', associationTwo)
    const eventCard = screen.getByRole('heading', { name: 'Hackathon Green Campus' }).closest('article')
    await userEvent.setup().click(within(eventCard).getByRole('button', { name: 'View participants' }))

    const dialog = await screen.findByRole('dialog', { name: /Participants — Hackathon Green Campus/ })
    expect(await within(dialog).findByRole('link', { name: 'Sam Student' })).toHaveAttribute('href', '/users/student-1')
    unmount()

    const associationOne = await renderEventsRoute('/association/events', authUsers.association)
    expect(await screen.findByText('No events published yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'View participants' })).not.toBeInTheDocument()
    await expect(eventsService.getRegistrations('event-2', authUsers.association.id))
      .rejects.toMatchObject({ code: 'FORBIDDEN' })
    associationOne.unmount()
  })

  it('uses persistent event registrations in the Student Dashboard after remounting', async () => {
    const user = userEvent.setup()
    const firstDashboard = await renderEventsRoute('/feed')
    const eventHeading = await screen.findByRole('heading', { name: 'Conférence IA responsable' })
    const eventCard = eventHeading.closest('article')
    await user.click(within(eventCard).getByRole('button', { name: 'Participate' }))
    const dialog = await screen.findByRole('dialog', { name: 'Register for Conférence IA responsable' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Phone number' }), '+212 6 55 44 33 22')
    await user.click(within(dialog).getByRole('button', { name: 'Confirm registration' }))
    expect(await within(eventCard).findByText('49 participants')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: 'Done' }))
    firstDashboard.unmount()

    await renderEventsRoute('/feed')
    const refreshedCard = (await screen.findByRole('heading', { name: 'Conférence IA responsable' })).closest('article')
    expect(await within(refreshedCard).findByText('You’re registered')).toBeInTheDocument()
    expect(within(refreshedCard).getByText('49 participants')).toBeInTheDocument()
    expect(within(refreshedCard).queryByRole('button', { name: 'Participate' })).not.toBeInTheDocument()
  })
})
