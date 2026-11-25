import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider } from '../../context/AuthContext'
import { resetMockDatabase } from '../../mocks/mockDatabase'
import { AuthSession } from '../../../tests/auth-test-utils'
import { users } from '../../../tests/auth-fixtures'
import * as eventsService from '../events/events.service'
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
})
