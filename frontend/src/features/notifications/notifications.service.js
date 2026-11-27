import { USER_ROLES } from '../../constants/roles.js'
import { isRepresentative } from '../../constants/navigation.js'
import { ROUTES } from '../../constants/routes.js'
import { NOTIFICATION_TYPES } from '../../mocks/seedData.js'
import { getMockDatabaseSnapshot, MockDataError, transact } from '../../mocks/mockDatabase.js'
import { requireActor, requireRecord } from '../../mocks/serviceUtils.js'

export const NOTIFICATIONS_CHANGED_EVENT = 'student-platform:notifications-changed'

function getActorRole(actor) {
  if (actor.role === USER_ROLES.DIRECTOR) return 'Director'
  if (actor.role === USER_ROLES.ASSOCIATION) return 'Association'
  return isRepresentative(actor) ? 'Class Representative' : 'Student'
}

function getItemRoute(itemType, itemId) {
  if (itemType === 'POST') return ROUTES.POSTS.DETAIL(itemId)
  if (itemType === 'EVENT') return ROUTES.EVENT_DETAILS(itemId)
  if (itemType === 'CLASS_ISSUE') return ROUTES.ISSUE_DETAILS(itemId)
  return null
}

export function createCreationNotifications(database, createId, {
  itemType,
  item,
  actor,
  itemTitle,
  itemSummary,
  context = null,
}) {
  const typeByItem = {
    POST: NOTIFICATION_TYPES.POST_CREATED,
    EVENT: NOTIFICATION_TYPES.EVENT_CREATED,
    CLASS_ISSUE: NOTIFICATION_TYPES.CLASS_ISSUE_CREATED,
  }
  const type = typeByItem[itemType]
  if (!type) throw new MockDataError('VALIDATION_ERROR', `Unsupported creation notification item "${itemType}".`)
  const duplicate = database.notifications.some((notification) => (
    notification.type === type && notification.itemId === item.id
  ))
  if (duplicate) return []

  const actorRole = getActorRole(actor)
  const actorName = itemType === 'EVENT' && context?.associationName
    ? context.associationName
    : actor.name
  const summary = itemSummary || item.description || item.content || item.title
  const message = `${actorRole} ${actorName} created ${itemType === 'CLASS_ISSUE' ? 'a Class Issue' : `a ${itemType.toLowerCase()}`}: '${itemTitle}'.${context?.className ? ` Class: ${context.className}.` : ''}${context?.associationName && itemType !== 'EVENT' ? ` Association: ${context.associationName}.` : ''}`
  const notifications = database.users.map((user) => ({
    id: createId('notifications'),
    recipientId: user.id,
    type,
    itemType,
    itemId: item.id,
    itemTitle,
    itemSummary: summary,
    creatorId: actor.id,
    creatorName: actorName,
    creatorRole: actorRole,
    creatorAvatar: actor.avatarUrl || null,
    context,
    itemSnapshot: {
      id: item.id,
      title: itemTitle,
      summary,
      ...(itemType === 'POST' ? { imageUrl: item.imageUrl || null } : {}),
      ...(itemType === 'EVENT' ? {
        date: item.date,
        location: item.location,
        imageUrl: item.imageUrl || null,
      } : {}),
      ...(itemType === 'CLASS_ISSUE' ? { classId: item.classId } : {}),
    },
    href: getItemRoute(itemType, item.id),
    message,
    createdAt: item.publishedAt || item.createdAt || item.submittedAt,
    readAt: null,
  }))
  database.notifications.push(...notifications)
  return notifications
}

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

function formatEventActionMessage(action, itemTitle, associationName, actionAt, changes = []) {
  const date = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(actionAt))
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(actionAt))
  const actionText = action === 'updated'
    ? `updated the event '${itemTitle}'`
    : `deleted the event '${itemTitle}'`
  const changeSummary = changes.length ? ` Relevant changes: ${changes.join(', ')}.` : ''
  return `The Association '${associationName}' ${actionText} on ${date} at ${time}.${changeSummary}`
}

export function createAssociationEventNotifications(database, createId, {
  action,
  event,
  associationName,
  actionAt,
  changes = [],
}) {
  const type = action === 'updated'
    ? NOTIFICATION_TYPES.EVENT_UPDATED
    : NOTIFICATION_TYPES.EVENT_DELETED
  const message = formatEventActionMessage(action, event.title, associationName, actionAt, changes)
  const notifications = database.users.map((user) => ({
    id: createId('notifications'),
    recipientId: user.id,
    type,
    itemType: 'EVENT',
    itemId: event.id,
    itemTitle: event.title,
    associationName,
    associationId: event.ownerId,
    eventSnapshot: {
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      location: event.location,
      imageUrl: event.imageUrl || null,
      status: event.status,
    },
    changes,
    message,
    actionAt,
    createdAt: actionAt,
    updatedAt: action === 'updated' ? actionAt : null,
    deletedAt: action === 'deleted' ? actionAt : null,
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
