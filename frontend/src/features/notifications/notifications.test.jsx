import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AuthProvider } from '../../context/AuthContext'
import { getMockDatabaseSnapshot, resetMockDatabase, transact } from '../../mocks/mockDatabase'
import { AuthSession } from '../../../tests/auth-test-utils'
import { users } from '../../../tests/auth-fixtures'
import * as eventsService from '../events/events.service'
import * as postsService from '../posts/posts.service'
import * as notificationsService from './notifications.service'
import NotificationsPopover from './components/NotificationsPopover'

beforeEach(async () => {
  localStorage.clear()
  await resetMockDatabase()
})

async function renderNotifications() {
  const view = render(
    <AuthProvider>
      <AuthSession user={users.student}>
        <NotificationsPopover />
      </AuthSession>
    </AuthProvider>,
  )
  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Initialize authenticated fixture' }))
  return { ...view, user }
}

describe('NotificationsPopover', () => {
  it('shows the creator identity and navigates to a created item', async () => {
    const post = await postsService.create({ content: 'Notification navigation post.' }, 'association-1')
    const router = createMemoryRouter([
      { path: '/feed', element: <NotificationsPopover /> },
      { path: '/posts/:postId', element: <h1>Created post destination</h1> },
    ], { initialEntries: ['/feed'] })
    const view = render(
      <AuthProvider>
        <AuthSession user={users.student}>
          <RouterProvider router={router} />
        </AuthSession>
      </AuthProvider>,
    )
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Initialize authenticated fixture' }))
    await user.click(await screen.findByRole('button', { name: 'Notifications, 1 unread' }))

    expect(await screen.findByText(/Association Bureau des Arts created a post/)).toBeInTheDocument()
    expect(screen.getByText('Association', { exact: true })).toBeInTheDocument()
    await user.click(screen.getByRole('link', {
      name: `Open POST: ${post.content}`,
    }))
    expect(await screen.findByRole('heading', { name: 'Created post destination' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(`/posts/${post.id}`)
    view.unmount()
    router.dispose()
  })

  it('shows persistent moderation notifications and updates unread state immediately', async () => {
    const { user, unmount } = await renderNotifications()
    await eventsService.deleteEvent('event-1', 'director-1')

    const trigger = await screen.findByRole('button', { name: 'Notifications, 1 unread' })
    await user.click(trigger)
    const panel = screen.getByRole('dialog')
    expect(await screen.findByText(/Dr\. Nadia Alaoui, deleted the event 'Conférence IA responsable'/))
      .toBeInTheDocument()
    await user.click(within(panel).getByRole('button', { name: 'Mark as read' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Notifications' })).toBeInTheDocument()
    })
    unmount()

    const { user: refreshedUser } = await renderNotifications()
    await refreshedUser.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(await screen.findByText(/Conférence IA responsable/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark as read' })).not.toBeInTheDocument()
    expect(screen.getByText('You’re all caught up')).toBeInTheDocument()
  })

  it('sends persistent Director event-deletion notices privately to every account', async () => {
    await transact((database) => {
      const registration = database.registrations.find((item) => item.eventId === 'event-2')
      registration.phone = '+212600000000'
      registration.message = 'Private event registration note.'
    })
    await eventsService.deleteEvent('event-2', 'director-1')
    const database = await getMockDatabaseSnapshot()
    const deletionNotices = database.notifications.filter((notification) => (
      notification.itemId === 'event-2' && notification.type === 'EVENT_DELETED'
    ))

    expect(deletionNotices).toHaveLength(database.users.length)
    expect(deletionNotices.map((notification) => notification.recipientId).sort())
      .toEqual(database.users.map((user) => user.id).sort())
    expect(deletionNotices.every((notification) => (
      !Object.hasOwn(notification, 'phone') &&
      !Object.hasOwn(notification, 'registration') &&
      !notification.message.includes('+212600000000') &&
      !notification.message.includes('Private event registration note.')
    ))).toBe(true)

    for (const account of database.users) {
      const personalNotifications = await notificationsService.getAllForUser(account.id)
      expect(personalNotifications.every((notification) => notification.recipientId === account.id)).toBe(true)
      expect(personalNotifications.filter((notification) => notification.itemId === 'event-2'))
        .toContainEqual(expect.objectContaining({ recipientId: account.id, type: 'EVENT_DELETED' }))
    }
  })
})
