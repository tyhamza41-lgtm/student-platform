import { USER_ROLES } from '../../constants/roles.js'
import {
  getCollection,
  getMockDatabaseSnapshot,
  getRecord,
  transact,
  MockDataError,
} from '../../mocks/mockDatabase.js'
import { EVENT_STATUS } from '../../mocks/seedData.js'
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
  if (actor.role === USER_ROLES.DIRECTOR) return actor
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

function validateEventDate(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) {
    throw new MockDataError('VALIDATION_ERROR', 'A valid event date is required.')
  }
}

export async function getAll(filters = {}) {
  const records = await getCollection('events')
  return records.filter((event) => (
    (!filters.ownerId || event.ownerId === filters.ownerId) &&
    (!filters.ownerType || event.ownerType === filters.ownerType) &&
    (!filters.status || event.status === filters.status)
  ))
}

export async function getById(id) {
  return getRecord('events', id)
}

export async function create(data, actorId) {
  assertOnlyFields(data, ['title', 'description', 'date', 'location'], 'Event creation')
  assertText(data?.title, 'Event title', { maxLength: 180 })
  assertText(data?.description, 'Event description')
  assertText(data?.location, 'Event location', { maxLength: 240 })
  validateEventDate(data?.date)
  return transact((database, createId) => {
    const actor = requireActor(
      database,
      actorId,
      [USER_ROLES.ASSOCIATION, USER_ROLES.DIRECTOR],
    )
    let ownerType
    let ownerId
    if (actor.role === USER_ROLES.ASSOCIATION) {
      const association = requireRecord(database, 'associations', actor.associationId)
      if (!association.isActive) throw new MockDataError('FORBIDDEN', 'Inactive associations cannot publish events.')
      ownerType = USER_ROLES.ASSOCIATION
      ownerId = association.id
    } else {
      ownerType = USER_ROLES.DIRECTOR
      ownerId = actor.id
    }
    const event = {
      id: createId('events'),
      title: data.title.trim(),
      organizer: actor.name,
      ownerType,
      ownerId,
      date: data.date,
      location: data.location.trim(),
      description: data.description.trim(),
      initiallyParticipating: false,
      participantCount: 0,
      participantAvatarIds: [],
      status: 'PUBLISHED',
      createdById: actor.id,
      createdAt: new Date().toISOString(),
    }
    database.events.push(event)
    return event
  })
}

export async function update(id, data, actorId) {
  assertOnlyFields(data, ['title', 'description', 'location', 'date', 'status'], 'Event update')
  if (Object.hasOwn(data, 'title')) assertText(data.title, 'Event title', { maxLength: 180 })
  if (Object.hasOwn(data, 'description')) assertText(data.description, 'Event description')
  if (Object.hasOwn(data, 'location')) assertText(data.location, 'Event location', { maxLength: 240 })
  if (Object.hasOwn(data, 'date')) validateEventDate(data.date)
  if (Object.hasOwn(data, 'status') && !Object.values(EVENT_STATUS).includes(data.status)) {
    throw new MockDataError('VALIDATION_ERROR', `Unsupported event status "${data.status}".`)
  }
  return transact((database) => {
    const event = requireRecord(database, 'events', id)
    assertCanManageEvent(database, event, actorId)
    for (const field of ['title', 'description', 'location', 'date', 'status']) {
      if (Object.hasOwn(data, field)) event[field] = field === 'status'
        ? data[field]
        : typeof data[field] === 'string' ? data[field].trim() : data[field]
    }
    event.updatedAt = new Date().toISOString()
    return event
  })
}

export async function deleteEvent(id, actorId) {
  return transact((database) => {
    const event = requireRecord(database, 'events', id)
    assertCanManageEvent(database, event, actorId)
    if (database.registrations.some((registration) => registration.eventId === id)) {
      throw new MockDataError('CONFLICT', 'Events with registrations cannot be deleted.')
    }
    database.events = database.events.filter((item) => item.id !== id)
    return event
  })
}

export async function register(eventId, userId, data = {}) {
  return transact((database, createId) => {
    const user = requireActor(
      database,
      userId,
      [USER_ROLES.STUDENT, USER_ROLES.ASSOCIATION, USER_ROLES.DIRECTOR],
    )
    const event = requireRecord(database, 'events', eventId)
    if (event.status !== 'PUBLISHED') {
      throw new MockDataError('CONFLICT', 'This event is not open for registration.')
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
      [USER_ROLES.STUDENT, USER_ROLES.ASSOCIATION, USER_ROLES.DIRECTOR],
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
    [USER_ROLES.DIRECTOR, USER_ROLES.ASSOCIATION],
  )
  const association = actor.role === USER_ROLES.ASSOCIATION
    ? database.associations.find((item) => item.id === actor.associationId)
    : null
  if (
    actor.role !== USER_ROLES.DIRECTOR &&
    (
      actor.associationId !== event.ownerId ||
      event.ownerType !== USER_ROLES.ASSOCIATION ||
      !association?.isActive
    )
  ) {
    throw new MockDataError('FORBIDDEN', 'Only the event owner or a director can view its registrations.')
  }
  return database.registrations.filter((registration) => registration.eventId === eventId)
}

function isValidPhoneNumber(value) {
  const phone = value.trim()
  const digits = phone.replace(/\D/g, '')
  return /^\+?[\d\s().-]+$/.test(phone) && digits.length >= 7 && digits.length <= 15
}
