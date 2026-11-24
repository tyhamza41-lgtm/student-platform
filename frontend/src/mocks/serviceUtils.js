import { USER_ROLES } from '../constants/roles.js'
import { MockDataError } from './mockDatabase.js'

export function requireRecord(database, collection, id) {
  const record = database[collection].find((item) => item.id === id)
  if (!record) {
    throw new MockDataError('NOT_FOUND', `${collection} record "${id}" was not found.`)
  }
  return record
}

export function requireActor(database, actorId, roles, { active = true } = {}) {
  const actor = requireRecord(database, 'users', actorId)
  if (active && actor.isActive === false) {
    throw new MockDataError('FORBIDDEN', 'Inactive users cannot perform this operation.')
  }
  if (!roles.includes(actor.role)) {
    throw new MockDataError('FORBIDDEN', 'You do not have permission to perform this operation.')
  }
  return actor
}

export function requireDirector(database, actorId) {
  return requireActor(database, actorId, [USER_ROLES.DIRECTOR])
}

export function assertText(value, field, { maxLength = 5000 } = {}) {
  if (typeof value !== 'string' || !value.trim() || value.length > maxLength) {
    throw new MockDataError('VALIDATION_ERROR', `${field} must be a non-empty string of at most ${maxLength} characters.`)
  }
}

export function assertOnlyFields(data, allowedFields, operation) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new MockDataError('VALIDATION_ERROR', `${operation} data must be an object.`)
  }
  const unsupportedFields = Object.keys(data).filter((field) => !allowedFields.includes(field))
  if (unsupportedFields.length) {
    throw new MockDataError(
      'VALIDATION_ERROR',
      `${operation} does not accept these fields: ${unsupportedFields.join(', ')}.`,
    )
  }
  if (Object.keys(data).length === 0) {
    throw new MockDataError('VALIDATION_ERROR', `${operation} requires at least one field.`)
  }
}

export function assertEmailAvailable(database, email, excludedUserId = null) {
  if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new MockDataError('VALIDATION_ERROR', 'A valid email address is required.')
  }
  if (database.users.some((user) => user.email.toLowerCase() === email.toLowerCase() && user.id !== excludedUserId)) {
    throw new MockDataError('CONFLICT', `Email "${email}" is already in use.`)
  }
}

export function requireActiveRepresentative(database, userId, classId) {
  const representative = requireActor(database, userId, [USER_ROLES.STUDENT])
  const studentClass = requireRecord(database, 'classes', classId)
  if (
    !representative.isRepresentative ||
    representative.representativeStatus !== 'ACTIVE' ||
    representative.classId !== studentClass.id ||
    !studentClass.activeRepresentativeIds.includes(representative.id)
  ) {
    throw new MockDataError(
      'FORBIDDEN',
      'Only an active representative assigned to this class can perform this operation.',
    )
  }
  return { representative, studentClass }
}
