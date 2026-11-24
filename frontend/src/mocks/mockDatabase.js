import {
  EVENT_STATUS,
  ISSUE_STATUS,
  REACTION_TYPES,
  seedData,
} from './seedData.js'
import { USER_ROLES, REPRESENTATIVE_STATUS } from '../constants/roles.js'

export const MOCK_STORAGE_KEY = 'student-platform.mock-database.v1'
const MOCK_DATABASE_VERSION = 1
const COLLECTIONS = [
  'users',
  'classes',
  'associations',
  'posts',
  'comments',
  'reactions',
  'events',
  'registrations',
  'issues',
]
const ID_PREFIXES = {
  users: 'user',
  classes: 'class',
  associations: 'association',
  posts: 'post',
  comments: 'comment',
  reactions: 'reaction',
  events: 'event',
  registrations: 'registration',
  issues: 'issue',
}

export class MockDataError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'MockDataError'
    this.code = code
  }
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value))
}

function fail(code, message) {
  throw new MockDataError(code, message)
}

function getStorage() {
  try {
    if (!globalThis.localStorage) {
      fail('STORAGE_UNAVAILABLE', 'Mock data persistence requires localStorage.')
    }
    return globalThis.localStorage
  } catch (error) {
    if (error instanceof MockDataError) throw error
    throw new MockDataError('STORAGE_UNAVAILABLE', 'Could not access localStorage.')
  }
}

function assertUniqueIds(collection, name) {
  const ids = new Set()
  for (const record of collection) {
    if (!record || typeof record.id !== 'string' || !record.id.trim()) {
      fail('INVALID_DATABASE', `Every ${name} record must have a non-empty id.`)
    }
    if (ids.has(record.id)) {
      fail('INVALID_DATABASE', `Duplicate ${name} id "${record.id}".`)
    }
    ids.add(record.id)
  }
}

function assertDatabaseIntegrity(database) {
  if (!database || typeof database !== 'object') {
    fail('INVALID_DATABASE', 'Mock database must be an object.')
  }

  for (const collection of COLLECTIONS) {
    if (!Array.isArray(database[collection])) {
      fail('INVALID_DATABASE', `Mock database collection "${collection}" is missing or invalid.`)
    }
    assertUniqueIds(database[collection], collection)
  }

  const find = (collection, id) => database[collection].find((record) => record.id === id)
  const requireReference = (collection, id, relation) => {
    if (!id || !find(collection, id)) {
      fail('INVALID_DATABASE', `${relation} references missing ${collection} record "${id}".`)
    }
  }

  const emails = new Set()
  for (const user of database.users) {
    if (!Object.values(USER_ROLES).includes(user.role)) {
      fail('INVALID_DATABASE', `User "${user.id}" has an invalid role.`)
    }
    if (typeof user.email !== 'string' || emails.has(user.email.toLowerCase())) {
      fail('INVALID_DATABASE', `User "${user.id}" has a missing or duplicate email address.`)
    }
    emails.add(user.email.toLowerCase())
    if (user.classId) requireReference('classes', user.classId, `User "${user.id}"`)
    if (user.associationId) requireReference('associations', user.associationId, `User "${user.id}"`)
    if (user.role === USER_ROLES.ASSOCIATION) {
      const association = find('associations', user.associationId)
      if (!association || association.accountUserId !== user.id) {
        fail('INVALID_DATABASE', `Association account "${user.id}" must reference its association record.`)
      }
    }
    if (user.role === USER_ROLES.STUDENT && user.isRepresentative &&
        ![REPRESENTATIVE_STATUS.ACTIVE, REPRESENTATIVE_STATUS.INACTIVE].includes(user.representativeStatus)) {
      fail('INVALID_DATABASE', `Representative "${user.id}" has an invalid status.`)
    }
  }

  for (const association of database.associations) {
    if (association.accountUserId) {
      const account = find('users', association.accountUserId)
      if (!account || account.role !== USER_ROLES.ASSOCIATION || account.associationId !== association.id) {
        fail('INVALID_DATABASE', `Association "${association.id}" has an invalid account user.`)
      }
    }
  }

  for (const studentClass of database.classes) {
    const activeIds = studentClass.activeRepresentativeIds || []
    if (new Set(studentClass.studentIds || []).size !== (studentClass.studentIds || []).length) {
      fail('INVALID_DATABASE', `Class "${studentClass.id}" contains duplicate students.`)
    }
    if (new Set(activeIds).size !== activeIds.length) {
      fail('INVALID_DATABASE', `Class "${studentClass.id}" contains duplicate representatives.`)
    }
    for (const studentId of studentClass.studentIds || []) {
      const student = find('users', studentId)
      if (!student || student.role !== USER_ROLES.STUDENT || student.classId !== studentClass.id) {
        fail('INVALID_DATABASE', `Class "${studentClass.id}" has an invalid student "${studentId}".`)
      }
    }
    for (const representativeId of activeIds) {
      const representative = find('users', representativeId)
      if (
        !representative ||
        representative.role !== USER_ROLES.STUDENT ||
        !representative.isRepresentative ||
        representative.classId !== studentClass.id ||
        representative.isActive === false ||
        representative.representativeStatus !== REPRESENTATIVE_STATUS.ACTIVE
      ) {
        fail('INVALID_DATABASE', `Class "${studentClass.id}" has an invalid active representative "${representativeId}".`)
      }
    }
    if (studentClass.representativeId && !activeIds.includes(studentClass.representativeId)) {
      fail('INVALID_DATABASE', `Class "${studentClass.id}" primary representative is not active in that class.`)
    }
  }

  for (const post of database.posts) {
    requireReference('users', post.authorId, `Post "${post.id}"`)
    if (!['PUBLISHED', 'HIDDEN', 'REMOVED'].includes(post.status)) {
      fail('INVALID_DATABASE', `Post "${post.id}" has an invalid moderation status.`)
    }
    if (post.classId) requireReference('classes', post.classId, `Post "${post.id}"`)
    if (post.associationId) requireReference('associations', post.associationId, `Post "${post.id}"`)
  }

  for (const comment of database.comments) {
    requireReference('posts', comment.postId, `Comment "${comment.id}"`)
    requireReference('users', comment.authorId, `Comment "${comment.id}"`)
  }

  const reactionPairs = new Set()
  for (const reaction of database.reactions) {
    requireReference('posts', reaction.postId, `Reaction "${reaction.id}"`)
    requireReference('users', reaction.userId, `Reaction "${reaction.id}"`)
    if (!Object.values(REACTION_TYPES).includes(reaction.type)) {
      fail('INVALID_DATABASE', `Reaction "${reaction.id}" has an invalid type.`)
    }
    const pair = `${reaction.postId}:${reaction.userId}`
    if (reactionPairs.has(pair)) {
      fail('INVALID_DATABASE', `User "${reaction.userId}" has more than one reaction on post "${reaction.postId}".`)
    }
    reactionPairs.add(pair)
  }

  for (const event of database.events) {
    if (!Object.values(EVENT_STATUS).includes(event.status)) {
      fail('INVALID_DATABASE', `Event "${event.id}" has an invalid status.`)
    }
    if (event.ownerType === USER_ROLES.ASSOCIATION) {
      const association = find('associations', event.ownerId)
      if (!association) {
        fail('INVALID_DATABASE', `Event "${event.id}" has an invalid association owner.`)
      }
    } else if (event.ownerType === USER_ROLES.DIRECTOR) {
      const director = find('users', event.ownerId)
      if (!director || director.role !== USER_ROLES.DIRECTOR) {
        fail('INVALID_DATABASE', `Event "${event.id}" has an invalid director owner.`)
      }
    } else {
      fail('INVALID_DATABASE', `Event "${event.id}" has an invalid owner type.`)
    }
    for (const participantId of event.participantAvatarIds || []) {
      requireReference('users', participantId, `Event "${event.id}" participant avatars`)
    }
  }

  const registrationPairs = new Set()
  for (const registration of database.registrations) {
    requireReference('events', registration.eventId, `Registration "${registration.id}"`)
    requireReference('users', registration.userId, `Registration "${registration.id}"`)
    const pair = `${registration.eventId}:${registration.userId}`
    if (registrationPairs.has(pair)) {
      fail('INVALID_DATABASE', `User "${registration.userId}" has duplicate registrations for event "${registration.eventId}".`)
    }
    registrationPairs.add(pair)
  }

  for (const issue of database.issues) {
    requireReference('classes', issue.classId, `Issue "${issue.id}"`)
    requireReference('users', issue.submittedById, `Issue "${issue.id}"`)
    if (!Object.values(ISSUE_STATUS).includes(issue.status)) {
      fail('INVALID_DATABASE', `Issue "${issue.id}" has an invalid status.`)
    }
  }

  if (!database.idCounters || typeof database.idCounters !== 'object') {
    fail('INVALID_DATABASE', 'Mock database id counters are missing.')
  }
}

function readEnvelope(storage) {
  let serialized
  try {
    serialized = storage.getItem(MOCK_STORAGE_KEY)
  } catch {
    fail('STORAGE_UNAVAILABLE', 'Could not read mock data from localStorage.')
  }

  if (serialized === null) {
    const initialData = clone(seedData)
    assertDatabaseIntegrity(initialData)
    writeEnvelope(storage, initialData)
    return initialData
  }

  let envelope
  try {
    envelope = JSON.parse(serialized)
  } catch {
    fail('CORRUPT_STORAGE', 'Stored mock data is not valid JSON. Reset the mock database to recover.')
  }
  if (envelope?.version !== MOCK_DATABASE_VERSION || !envelope.database) {
    fail('CORRUPT_STORAGE', 'Stored mock data has an unsupported version. Reset the mock database to recover.')
  }
  assertDatabaseIntegrity(envelope.database)
  return envelope.database
}

function writeEnvelope(storage, database) {
  try {
    storage.setItem(MOCK_STORAGE_KEY, JSON.stringify({
      version: MOCK_DATABASE_VERSION,
      database,
    }))
  } catch {
    fail('STORAGE_UNAVAILABLE', 'Could not persist mock data to localStorage.')
  }
}

function makeId(database, collection) {
  const prefix = ID_PREFIXES[collection]
  if (!prefix) fail('INVALID_COLLECTION', `Cannot create an id for "${collection}".`)
  const next = (database.idCounters[prefix] || 0) + 1
  database.idCounters[prefix] = next
  return `${prefix}-mock-${next}`
}

export async function getCollection(collection) {
  if (!COLLECTIONS.includes(collection)) {
    fail('INVALID_COLLECTION', `Unknown mock data collection "${collection}".`)
  }
  return clone(readEnvelope(getStorage())[collection])
}

export async function getRecord(collection, id) {
  if (!COLLECTIONS.includes(collection)) {
    fail('INVALID_COLLECTION', `Unknown mock data collection "${collection}".`)
  }
  const record = readEnvelope(getStorage())[collection].find((item) => item.id === id)
  return clone(record || null)
}

export async function transact(mutator) {
  if (typeof mutator !== 'function') {
    fail('INVALID_OPERATION', 'A mock database transaction requires a mutator function.')
  }
  const storage = getStorage()
  const draft = clone(readEnvelope(storage))
  const result = mutator(draft, (collection) => makeId(draft, collection))
  assertDatabaseIntegrity(draft)
  writeEnvelope(storage, draft)
  return clone(result)
}

export async function resetMockDatabase() {
  const storage = getStorage()
  const initialData = clone(seedData)
  assertDatabaseIntegrity(initialData)
  writeEnvelope(storage, initialData)
  return clone(initialData)
}

export async function getMockDatabaseSnapshot() {
  return clone(readEnvelope(getStorage()))
}
