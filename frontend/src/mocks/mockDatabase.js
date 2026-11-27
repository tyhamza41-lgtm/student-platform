import {
  EVENT_STATUS,
  ISSUE_STATUS,
  NOTIFICATION_TYPES,
  REACTION_TYPES,
  seedData,
} from './seedData.js'
import { USER_ROLES, REPRESENTATIVE_STATUS } from '../constants/roles.js'

export const MOCK_STORAGE_KEY = 'student-platform.mock-database.v1'
const MOCK_DATABASE_VERSION = 3
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
  'notifications',
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
  notifications: 'notification',
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
    if (activeIds.length > 3) {
      fail('INVALID_DATABASE', `Class "${studentClass.id}" cannot have more than 3 active representatives.`)
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
    const hasPostId = typeof comment.postId === 'string' && Boolean(comment.postId.trim())
    const hasIssueId = typeof comment.issueId === 'string' && Boolean(comment.issueId.trim())
    if (
      hasPostId === hasIssueId ||
      (Object.hasOwn(comment, 'postId') && !hasPostId) ||
      (Object.hasOwn(comment, 'issueId') && !hasIssueId)
    ) {
      fail('INVALID_DATABASE', `Comment "${comment.id}" must reference exactly one Post or Class Issue.`)
    }
    if (hasPostId) requireReference('posts', comment.postId, `Comment "${comment.id}"`)
    if (hasIssueId) requireReference('issues', comment.issueId, `Comment "${comment.id}"`)
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
    if (!Array.isArray(event.participantAvatarIds)) {
      fail('INVALID_DATABASE', `Event "${event.id}" has invalid participant avatars.`)
    }
    const eventRegistrations = database.registrations.filter((registration) => registration.eventId === event.id)
    const registeredUserIds = new Set(eventRegistrations.map((registration) => registration.userId))
    const participantAvatarIds = new Set(event.participantAvatarIds)
    if (
      !Number.isInteger(event.participantCount) ||
      event.participantCount !== eventRegistrations.length ||
      participantAvatarIds.size !== event.participantAvatarIds.length ||
      participantAvatarIds.size !== registeredUserIds.size ||
      [...registeredUserIds].some((userId) => !participantAvatarIds.has(userId))
    ) {
      fail('INVALID_DATABASE', `Event "${event.id}" participation must match its registrations.`)
    }
    for (const participantId of event.participantAvatarIds) {
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

  for (const notification of database.notifications) {
    requireReference('users', notification.recipientId, `Notification "${notification.id}"`)
    if (!Object.values(NOTIFICATION_TYPES).includes(notification.type)) {
      fail('INVALID_DATABASE', `Notification "${notification.id}" has an invalid type.`)
    }
    const creationItemTypes = {
      [NOTIFICATION_TYPES.POST_CREATED]: 'POST',
      [NOTIFICATION_TYPES.EVENT_CREATED]: 'EVENT',
      [NOTIFICATION_TYPES.CLASS_ISSUE_CREATED]: 'CLASS_ISSUE',
    }
    if (creationItemTypes[notification.type]) {
      if (
        notification.itemType !== creationItemTypes[notification.type] ||
        typeof notification.itemId !== 'string' ||
        typeof notification.itemTitle !== 'string' ||
        typeof notification.itemSummary !== 'string' ||
        typeof notification.creatorId !== 'string' ||
        typeof notification.creatorName !== 'string' ||
        typeof notification.creatorRole !== 'string' ||
        typeof notification.message !== 'string' ||
        typeof notification.href !== 'string' ||
        !notification.itemSnapshot ||
        typeof notification.itemSnapshot.title !== 'string' ||
        typeof notification.createdAt !== 'string' ||
        Number.isNaN(new Date(notification.createdAt).getTime()) ||
        (notification.readAt !== null && Number.isNaN(new Date(notification.readAt).getTime()))
      ) {
        fail('INVALID_DATABASE', `Notification "${notification.id}" is missing creation details.`)
      }
      requireReference('users', notification.creatorId, `Notification "${notification.id}" creator`)
    } else if (
      !['EVENT', 'CLASS_ISSUE'].includes(notification.itemType) ||
      typeof notification.itemId !== 'string' ||
      typeof notification.itemTitle !== 'string' ||
      typeof notification.message !== 'string' ||
      (notification.readAt !== null && Number.isNaN(new Date(notification.readAt).getTime()))
    ) {
      fail('INVALID_DATABASE', `Notification "${notification.id}" is missing moderation details.`)
    }
    if (notification.type === NOTIFICATION_TYPES.EVENT_UPDATED) {
      if (
        typeof notification.associationName !== 'string' ||
        typeof notification.actionAt !== 'string' ||
        Number.isNaN(new Date(notification.actionAt).getTime()) ||
        !notification.eventSnapshot ||
        typeof notification.eventSnapshot.title !== 'string'
      ) {
        fail('INVALID_DATABASE', `Notification "${notification.id}" is missing Event update details.`)
      }
    } else if (notification.type === NOTIFICATION_TYPES.EVENT_DELETED && notification.associationName) {
      if (
        typeof notification.actionAt !== 'string' ||
        Number.isNaN(new Date(notification.actionAt).getTime()) ||
        !notification.eventSnapshot ||
        typeof notification.eventSnapshot.title !== 'string'
      ) {
        fail('INVALID_DATABASE', `Notification "${notification.id}" is missing Association deletion details.`)
      }
    } else if (!creationItemTypes[notification.type] && (
      typeof notification.directorName !== 'string' ||
      typeof notification.deletedAt !== 'string' ||
      Number.isNaN(new Date(notification.deletedAt).getTime())
    )) {
      fail('INVALID_DATABASE', `Notification "${notification.id}" is missing Director moderation details.`)
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
  if (!envelope?.database) {
    fail('CORRUPT_STORAGE', 'Stored mock data has an unsupported version. Reset the mock database to recover.')
  }
  if (envelope.version === 1 || envelope.version === 2) {
    const migratedDatabase = clone(envelope.database)
    if (envelope.version === 1) migratedDatabase.notifications ||= []
    for (const event of migratedDatabase.events) {
      const eventRegistrations = migratedDatabase.registrations.filter(
        (registration) => registration.eventId === event.id,
      )
      event.participantCount = eventRegistrations.length
      event.participantAvatarIds = [...new Set(eventRegistrations.map((registration) => registration.userId))]
    }
    assertDatabaseIntegrity(migratedDatabase)
    writeEnvelope(storage, migratedDatabase)
    return migratedDatabase
  }
  if (envelope.version !== MOCK_DATABASE_VERSION) {
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
