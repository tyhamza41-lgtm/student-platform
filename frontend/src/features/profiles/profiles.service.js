import { getRecord, transact, MockDataError } from '../../mocks/mockDatabase.js'
import { assertOnlyFields, assertText, requireRecord } from '../../mocks/serviceUtils.js'

export const PROFILE_EDITABLE_FIELDS = Object.freeze(['name', 'avatarUrl', 'bio', 'phone'])

async function toProfileView(user, { includePhone = false } = {}) {
  const profile = {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl || null,
    bio: user.bio || '',
    role: user.role,
  }

  if (user.role === 'STUDENT') {
    profile.classId = user.classId || null
    const studentClass = user.classId
      ? await getRecord('classes', user.classId)
      : null
    profile.classGroup = studentClass
      ? {
          id: studentClass.id,
          name: studentClass.name,
          institution: studentClass.institution || '',
        }
      : null
    profile.isRepresentative = user.isRepresentative === true
    profile.representativeStatus = user.representativeStatus || null
  }

  if (user.role === 'ASSOCIATION') {
    const association = user.associationId
      ? await getRecord('associations', user.associationId)
      : null
    profile.association = association
      ? {
          id: association.id,
          name: association.name,
          description: association.description || '',
          institution: association.institution || '',
          avatarUrl: association.avatarUrl || null,
        }
      : null
  }

  if (includePhone) profile.phone = user.phone || ''
  return profile
}

export async function getById(id) {
  const user = await getRecord('users', id)
  return user ? toProfileView(user) : null
}

export async function getOwnProfile(id, actorId) {
  if (actorId !== id) {
    throw new MockDataError('FORBIDDEN', 'Users can only view their own private profile.')
  }
  const user = await getRecord('users', id)
  return user ? toProfileView(user, { includePhone: true }) : null
}

export async function update(id, data, actorId) {
  assertOnlyFields(data, PROFILE_EDITABLE_FIELDS, 'Profile update')
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
    for (const field of PROFILE_EDITABLE_FIELDS) {
      if (Object.hasOwn(data, field)) user[field] = data[field].trim()
    }
    if (
      user.role === 'ASSOCIATION' &&
      (Object.hasOwn(data, 'name') || Object.hasOwn(data, 'avatarUrl'))
    ) {
      const association = requireRecord(database, 'associations', user.associationId)
      if (Object.hasOwn(data, 'name')) association.name = user.name
      if (Object.hasOwn(data, 'avatarUrl')) association.avatarUrl = user.avatarUrl
    }
    return user
  })
}
