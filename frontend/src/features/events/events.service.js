import { USER_ROLES } from '../../constants/roles.js'
import {
  getMockDatabaseSnapshot,
  transact,
  MockDataError,
} from '../../mocks/mockDatabase.js'
import { EVENT_STATUS } from '../../mocks/seedData.js'
import {
  announceNotificationsChanged,
  createCreationNotifications,
  createModerationDeletionNotifications,
  createAssociationEventNotifications,
} from '../notifications/notifications.service.js'
import {
  assertOnlyFields,
  assertText,
  requireActor,
  requireRecord,
} from '../../mocks/serviceUtils.js'

function assertCanManageEvent(database, event, actorId) {
  const actor = requireRecord(database, 'users', actorId)
  if (actor.isActive === false) {
    throw new MockDataError('FORBIDDEN', 'Inactive users cannot manage events.')
  }
  if (
    actor.role === USER_ROLES.ASSOCIATION &&
    event.ownerType === USER_ROLES.ASSOCIATION &&
    event.ownerId === actor.associationId
  ) {
    const association = requireRecord(database, 'associations', actor.associationId)
    if (association.isActive) return actor
  }
  throw new MockDataError('FORBIDDEN', 'Associations can only manage their own events.')
}

function toEventView(event, associations) {
  if (event.ownerType !== USER_ROLES.ASSOCIATION) return event
  const association = associations.find((item) => item.id === event.ownerId)
  return { ...event, organizer: association?.name || event.organizer }
}

function validateEventDate(value) {
  const timestamp = new Date(value).getTime()
  if (!value || Number.isNaN(timestamp) || timestamp <= Date.now()) {
    throw new MockDataError('VALIDATION_ERROR', 'Event date and time must be in the future.')
  }
}

function assertEventImageUrl(value) {
  if (value !== undefined && value !== null && (typeof value !== 'string' || value.length > 4_000_000)) {
    throw new MockDataError('VALIDATION_ERROR', 'Event image must be text of at most 4 MB.')
  }
}

export async function getAll(filters = {}) {
  const database = await getMockDatabaseSnapshot()
  return database.events.filter((event) => (
    (!filters.ownerId || event.ownerId === filters.ownerId) &&
    (!filters.ownerType || event.ownerType === filters.ownerType) &&
    (!filters.status || event.status === filters.status)
  )).map((event) => toEventView(event, database.associations))
}

export async function getById(id) {
  const database = await getMockDatabaseSnapshot()
  const event = database.events.find((record) => record.id === id)
  return event ? toEventView(event, database.associations) : null
}

export async function getMyRegistrations(userId) {
  const database = await getMockDatabaseSnapshot()
  requireActor(database, userId, [USER_ROLES.STUDENT])
  return database.registrations.filter((registration) => registration.userId === userId)
}

export async function create(data, actorId) {
  assertOnlyFields(data, ['title', 'description', 'date', 'location', 'imageUrl'], 'Event creation')
  assertText(data?.title, 'Event title', { maxLength: 180 })
  assertText(data?.description, 'Event description')
  assertText(data?.location, 'Event location', { maxLength: 240 })
  validateEventDate(data?.date)
  assertEventImageUrl(data.imageUrl)
  const createdEvent = await transact((database, createId) => {
    const actor = requireActor(
      database,
      actorId,
      [USER_ROLES.ASSOCIATION],
    )
    const association = requireRecord(database, 'associations', actor.associationId)
    if (!association.isActive) throw new MockDataError('FORBIDDEN', 'Inactive associations cannot publish events.')
    const event = {
      id: createId('events'),
      title: data.title.trim(),
      organizer: actor.name,
      ownerType: USER_ROLES.ASSOCIATION,
      ownerId: association.id,
      date: data.date,
      location: data.location.trim(),
      description: data.description.trim(),
      imageUrl: data.imageUrl || null,
      participantCount: 0,
      participantAvatarIds: [],
      status: 'PUBLISHED',
      createdById: actor.id,
      createdAt: new Date().toISOString(),
    }
    database.events.push(event)
    createCreationNotifications(database, createId, {
      itemType: 'EVENT',
      item: event,
      actor: { ...actor, name: association.name },
      itemTitle: event.title,
      itemSummary: event.description,
      context: {
        associationId: association.id,
        associationName: association.name,
        date: event.date,
        location: event.location,
      },
    })
    return event
  })
  announceNotificationsChanged()
  return createdEvent
}

export async function update(id, data, actorId) {
  assertOnlyFields(data, ['title', 'description', 'location', 'date', 'status', 'imageUrl'], 'Event update')
  if (Object.hasOwn(data, 'title')) assertText(data.title, 'Event title', { maxLength: 180 })
  if (Object.hasOwn(data, 'description')) assertText(data.description, 'Event description')
  if (Object.hasOwn(data, 'location')) assertText(data.location, 'Event location', { maxLength: 240 })
  if (Object.hasOwn(data, 'date')) validateEventDate(data.date)
  if (Object.hasOwn(data, 'imageUrl')) assertEventImageUrl(data.imageUrl)
  if (Object.hasOwn(data, 'status') && !Object.values(EVENT_STATUS).includes(data.status)) {
    throw new MockDataError('VALIDATION_ERROR', `Unsupported event status "${data.status}".`)
  }
  const updatedEvent = await transact((database, createId) => {
    const event = requireRecord(database, 'events', id)
    assertCanManageEvent(database, event, actorId)
    const previous = {
      title: event.title,
      description: event.description,
      location: event.location,
      date: event.date,
      status: event.status,
      imageUrl: event.imageUrl || null,
    }
    for (const field of ['title', 'description', 'location', 'date', 'status', 'imageUrl']) {
      if (Object.hasOwn(data, field)) event[field] = field === 'status'
        ? data[field]
        : field === 'imageUrl' ? data[field] || null
          : typeof data[field] === 'string' ? data[field].trim() : data[field]
    }
    const updatedAt = new Date().toISOString()
    event.updatedAt = updatedAt
    const actor = requireRecord(database, 'users', actorId)
    const association = requireRecord(database, 'associations', actor.associationId)
    const changes = []
    if (previous.title !== event.title) changes.push(`title: '${event.title}'`)
    if (previous.date !== event.date) changes.push(`date: '${event.date}'`)
    if (previous.location !== event.location) changes.push(`location: '${event.location}'`)
    if (previous.description !== event.description) changes.push('description updated')
    if (previous.imageUrl !== (event.imageUrl || null)) changes.push('image updated')
    createAssociationEventNotifications(database, createId, {
      action: 'updated',
      event,
      associationName: association.name,
      actionAt: updatedAt,
      changes,
    })
    return event
  })
  announceNotificationsChanged()
  return updatedEvent
}

export async function deleteEvent(id, actorId) {
  const { event: deletedEvent, notificationCreated } = await transact((database, createId) => {
    const event = requireRecord(database, 'events', id)
    const actor = requireActor(
      database,
      actorId,
      [USER_ROLES.ASSOCIATION, USER_ROLES.DIRECTOR],
    )
    if (actor.role === USER_ROLES.DIRECTOR) {
      createModerationDeletionNotifications(database, createId, {
        itemType: 'EVENT',
        itemId: event.id,
        itemTitle: event.title,
        directorName: actor.name,
        deletedAt: new Date().toISOString(),
      })
      database.registrations = database.registrations.filter((registration) => registration.eventId !== id)
    } else {
      assertCanManageEvent(database, event, actorId)
      const deletedAt = new Date().toISOString()
      const association = requireRecord(database, 'associations', actor.associationId)
      createAssociationEventNotifications(database, createId, {
        action: 'deleted',
        event,
        associationName: association.name,
        actionAt: deletedAt,
      })
      database.registrations = database.registrations.filter((registration) => registration.eventId !== id)
    }
    database.events = database.events.filter((item) => item.id !== id)
    return { event, notificationCreated: true }
  })
  if (notificationCreated) announceNotificationsChanged()
  return deletedEvent
}

export async function register(eventId, userId, data = {}) {
  return transact((database, createId) => {
    const user = requireActor(
      database,
      userId,
      [USER_ROLES.STUDENT],
    )
    const event = requireRecord(database, 'events', eventId)
    if (event.status !== 'PUBLISHED') {
      throw new MockDataError('CONFLICT', 'This event is not open for registration.')
    }
    const eventTimestamp = new Date(event.date).getTime()
    if (Number.isNaN(eventTimestamp) || eventTimestamp <= Date.now()) {
      throw new MockDataError('CONFLICT', 'Registration is closed for invalid or past events.')
    }
    if (database.registrations.some((item) => item.eventId === eventId && item.userId === userId)) {
      throw new MockDataError('CONFLICT', 'This user is already registered for the event.')
    }
    if (typeof data.phone !== 'string' || !isValidPhoneNumber(data.phone)) {
      throw new MockDataError('VALIDATION_ERROR', 'A valid registration phone number with 7 to 15 digits is required.')
    }
    if (data.message !== undefined && (typeof data.message !== 'string' || data.message.length > 280)) {
      throw new MockDataError('VALIDATION_ERROR', 'Registration message must be text of at most 280 characters.')
    }
    const registration = {
      id: createId('registrations'),
      eventId,
      userId,
      phone: data.phone?.trim() || '',
      message: data.message?.trim() || '',
      registeredAt: new Date().toISOString(),
    }
    database.registrations.push(registration)
    event.participantCount += 1
    event.participantAvatarIds ||= []
    if (!event.participantAvatarIds.includes(user.id)) event.participantAvatarIds.push(user.id)
    return registration
  })
}

export async function cancelRegistration(eventId, userId) {
  return transact((database) => {
    requireActor(
      database,
      userId,
      [USER_ROLES.STUDENT],
    )
    const event = requireRecord(database, 'events', eventId)
    const registration = database.registrations.find((item) => item.eventId === eventId && item.userId === userId)
    if (!registration) return null
    database.registrations = database.registrations.filter((item) => item.id !== registration.id)
    event.participantCount = Math.max(0, event.participantCount - 1)
    event.participantAvatarIds = event.participantAvatarIds.filter((id) => id !== userId)
    return registration
  })
}

export async function getRegistrations(eventId, actorId) {
  const database = await getMockDatabaseSnapshot()
  const event = requireRecord(database, 'events', eventId)
  const actor = requireActor(
    database,
    actorId,
    [USER_ROLES.ASSOCIATION],
  )
  if (
    actor.associationId !== event.ownerId ||
    event.ownerType !== USER_ROLES.ASSOCIATION ||
    !database.associations.find((item) => item.id === actor.associationId)?.isActive
  ) {
    throw new MockDataError('FORBIDDEN', 'Only the owning Association can view event registrations.')
  }
  return database.registrations
    .filter((registration) => registration.eventId === eventId)
    .map((registration) => {
      const student = requireRecord(database, 'users', registration.userId)
      const studentClass = student.classId
        ? database.classes.find((item) => item.id === student.classId)
        : null
      return {
        ...registration,
        participant: {
          id: student.id,
          name: student.name,
          avatarUrl: student.avatarUrl || null,
          bio: student.bio || '',
          classGroup: studentClass
            ? {
                id: studentClass.id,
                name: studentClass.name,
                institution: studentClass.institution || '',
              }
            : null,
        },
      }
    })
}

function isValidPhoneNumber(value) {
  const phone = value.trim()
  const digits = phone.replace(/\D/g, '')
  return /^\+?[\d\s().-]+$/.test(phone) && digits.length >= 7 && digits.length <= 15
}
