import { getCollection, getRecord, transact, MockDataError } from '../../mocks/mockDatabase.js'
import {
  assertOnlyFields,
  assertText,
  requireDirector,
  requireRecord,
} from '../../mocks/serviceUtils.js'

export async function getAll(filters = {}) {
  const records = await getCollection('associations')
  return records.filter((association) => (
    filters.isActive === undefined || association.isActive === filters.isActive
  ))
}

export async function getById(id) {
  return getRecord('associations', id)
}

export async function create(data, directorId) {
  assertOnlyFields(data, ['name', 'description', 'institution', 'avatarUrl'], 'Association creation')
  assertText(data?.name, 'Association name', { maxLength: 160 })
  return transact((database, createId) => {
    requireDirector(database, directorId)
    const association = {
      id: createId('associations'),
      accountUserId: null,
      name: data.name.trim(),
      description: data.description?.trim() || '',
      institution: data.institution?.trim() || '',
      avatarUrl: data.avatarUrl || null,
      isActive: true,
    }
    database.associations.push(association)
    return association
  })
}

export async function update(id, data, directorId) {
  assertOnlyFields(data, ['name', 'description', 'institution', 'avatarUrl', 'isActive'], 'Association update')
  if (Object.hasOwn(data, 'name')) assertText(data.name, 'Association name', { maxLength: 160 })
  if (Object.hasOwn(data, 'isActive') && typeof data.isActive !== 'boolean') {
    throw new MockDataError('VALIDATION_ERROR', 'Association active status must be a boolean.')
  }
  for (const field of ['description', 'institution', 'avatarUrl']) {
    if (Object.hasOwn(data, field) && typeof data[field] !== 'string') {
      throw new MockDataError('VALIDATION_ERROR', `Association ${field} must be text.`)
    }
  }
  return transact((database) => {
    requireDirector(database, directorId)
    const association = requireRecord(database, 'associations', id)
    for (const field of ['name', 'description', 'institution', 'avatarUrl', 'isActive']) {
      if (Object.hasOwn(data, field)) {
        association[field] = typeof data[field] === 'string' && field !== 'avatarUrl'
          ? data[field].trim()
          : data[field]
      }
    }
    if (association.accountUserId && Object.hasOwn(data, 'name')) {
      const account = requireRecord(database, 'users', association.accountUserId)
      account.name = association.name
    }
    return association
  })
}

export async function deleteAssociation(id, directorId) {
  return transact((database) => {
    requireDirector(database, directorId)
    const association = requireRecord(database, 'associations', id)
    const isReferenced =
      database.users.some((user) => user.associationId === id) ||
      database.posts.some((post) => post.associationId === id) ||
      database.events.some((event) => event.ownerType === 'ASSOCIATION' && event.ownerId === id)
    if (isReferenced) {
      throw new MockDataError('CONFLICT', 'This association is referenced by platform records and cannot be deleted.')
    }
    database.associations = database.associations.filter((item) => item.id !== id)
    return association
  })
}

export async function setActive(id, isActive, directorId) {
  if (typeof isActive !== 'boolean') {
    throw new MockDataError('VALIDATION_ERROR', 'Association active status must be a boolean.')
  }
  return update(id, { isActive }, directorId)
}
