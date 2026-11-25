import { USER_ROLES } from '../../constants/roles.js'
import { NOTIFICATION_TYPES } from '../../mocks/seedData.js'
import { getMockDatabaseSnapshot, MockDataError, transact } from '../../mocks/mockDatabase.js'
import { requireActor, requireRecord } from '../../mocks/serviceUtils.js'

export const NOTIFICATIONS_CHANGED_EVENT = 'student-platform:notifications-changed'

function formatDeletionMessage(itemType, itemTitle, directorName, deletedAt) {
  const itemName = itemType === 'EVENT' ? 'event' : 'class issue'
  const deletedDate = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(deletedAt))
  const deletedTime = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(deletedAt))
  return `The Director, ${directorName}, deleted the ${itemName} '${itemTitle}' on ${deletedDate} at ${deletedTime}.`
}

export function createModerationDeletionNotifications(database, createId, {
  itemType,
  itemId,
  itemTitle,
  directorName,
  deletedAt,
}) {
  const type = itemType === 'EVENT'
    ? NOTIFICATION_TYPES.EVENT_DELETED
    : NOTIFICATION_TYPES.ISSUE_DELETED
  const message = formatDeletionMessage(itemType, itemTitle, directorName, deletedAt)
  const notifications = database.users.map((user) => ({
    id: createId('notifications'),
    recipientId: user.id,
    type,
    itemType,
    itemId,
    itemTitle,
    directorName,
    message,
    deletedAt,
    createdAt: deletedAt,
    readAt: null,
  }))
  database.notifications.push(...notifications)
  return notifications
}

export function announceNotificationsChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new window.Event(NOTIFICATIONS_CHANGED_EVENT))
  }
}

export async function getAllForUser(userId) {
  const database = await getMockDatabaseSnapshot()
  requireActor(database, userId, Object.values(USER_ROLES))
  return database.notifications
    .filter((notification) => notification.recipientId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

export async function markAsRead(notificationId, userId) {
  const updated = await transact((database) => {
    requireActor(database, userId, Object.values(USER_ROLES))
    const notification = requireRecord(database, 'notifications', notificationId)
    if (notification.recipientId !== userId) {
      throw new MockDataError('FORBIDDEN', 'You can only read your own notifications.')
    }
    notification.readAt ||= new Date().toISOString()
    return notification
  })
  announceNotificationsChanged()
  return updated
}

export async function markAllAsRead(userId) {
  const updated = await transact((database) => {
    requireActor(database, userId, Object.values(USER_ROLES))
    const now = new Date().toISOString()
    return database.notifications
      .filter((notification) => notification.recipientId === userId)
      .map((notification) => {
        notification.readAt ||= now
        return notification
      })
  })
  announceNotificationsChanged()
  return updated
}
