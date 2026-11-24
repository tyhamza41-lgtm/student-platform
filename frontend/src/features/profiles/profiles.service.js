import { getRecord, transact, MockDataError } from '../../mocks/mockDatabase.js'
import { assertOnlyFields, assertText, requireRecord } from '../../mocks/serviceUtils.js'

const PROFILE_FIELDS = ['name', 'avatarUrl', 'bio', 'phone']

export async function getById(id) {
  return getRecord('users', id)
}

export async function update(id, data, actorId) {
  assertOnlyFields(data, PROFILE_FIELDS, 'Profile update')
  if (Object.hasOwn(data, 'name')) assertText(data.name, 'Profile name', { maxLength: 120 })
  for (const field of ['avatarUrl', 'bio', 'phone']) {
    if (Object.hasOwn(data, field) && typeof data[field] !== 'string') {
      throw new MockDataError('VALIDATION_ERROR', `Profile ${field} must be text.`)
    }
  }
  return transact((database) => {
    const user = requireRecord(database, 'users', id)
    if (actorId !== id) {
      throw new MockDataError('FORBIDDEN', 'Users can only update their own profile.')
    }
    if (user.isActive === false) {
      throw new MockDataError('FORBIDDEN', 'Inactive users cannot update their profile.')
    }
    for (const field of PROFILE_FIELDS) {
      if (Object.hasOwn(data, field)) user[field] = data[field].trim()
    }
    if (user.role === 'ASSOCIATION' && Object.hasOwn(data, 'name')) {
      const association = requireRecord(database, 'associations', user.associationId)
      association.name = user.name
    }
    return user
  })
}
