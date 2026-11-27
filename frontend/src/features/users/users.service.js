import { REPRESENTATIVE_STATUS, USER_ROLES } from '../../constants/roles.js'
import { getCollection, getRecord, transact, MockDataError } from '../../mocks/mockDatabase.js'
import {
  requireDirector,
  requireRecord,
} from '../../mocks/serviceUtils.js'

export const MAX_ACTIVE_REPRESENTATIVES_PER_CLASS = 3

function updateClassMembership(database, userId, previousClassId, nextClassId) {
  if (previousClassId === nextClassId) return
  if (previousClassId) {
    const previousClass = requireRecord(database, 'classes', previousClassId)
    previousClass.studentIds = previousClass.studentIds.filter((id) => id !== userId)
  }
  if (nextClassId) {
    const nextClass = requireRecord(database, 'classes', nextClassId)
    if (!nextClass.studentIds.includes(userId)) nextClass.studentIds.push(userId)
  }
}

function deactivateRepresentativeRecord(database, user) {
  const studentClass = user.classId
    ? database.classes.find((item) => item.id === user.classId)
    : null
  if (studentClass) {
    studentClass.activeRepresentativeIds = studentClass.activeRepresentativeIds
      .filter((id) => id !== user.id)
    if (studentClass.representativeId === user.id) {
      studentClass.representativeId = studentClass.activeRepresentativeIds[0] || null
    }
  }
  user.isRepresentative = false
  user.representativeStatus = REPRESENTATIVE_STATUS.INACTIVE
  user.designation = null
}

export async function getAll(filters = {}) {
  const records = await getCollection('users')
  return records.filter((user) => (
    (!filters.role || user.role === filters.role) &&
    (!filters.classId || user.classId === filters.classId) &&
    (filters.isActive === undefined || user.isActive === filters.isActive) &&
    (!filters.associationId || user.associationId === filters.associationId)
  ))
}

export async function getRepresentatives({ classId, isActive } = {}) {
  const students = await getAll({ role: USER_ROLES.STUDENT, classId, isActive })
  return students.filter((user) => (
    user.isRepresentative ||
    user.representativeStatus === REPRESENTATIVE_STATUS.ACTIVE ||
    user.representativeStatus === REPRESENTATIVE_STATUS.INACTIVE
  ))
}

export async function getById(id) {
  return getRecord('users', id)
}

export async function deleteUser(id, directorId) {
  return transact((database) => {
    requireDirector(database, directorId)
    const user = requireRecord(database, 'users', id)
    if (user.role === USER_ROLES.DIRECTOR) {
      throw new MockDataError('FORBIDDEN', 'Director accounts cannot be deleted.')
    }
    const isReferenced =
      database.posts.some((post) => (
        post.authorId === id ||
        (user.associationId && post.associationId === user.associationId)
      )) ||
      database.comments.some((comment) => comment.authorId === id) ||
      database.reactions.some((reaction) => reaction.userId === id) ||
      database.registrations.some((registration) => registration.userId === id) ||
      database.issues.some((issue) => issue.submittedById === id) ||
      database.events.some((event) => (
        event.ownerId === id ||
        (event.ownerType === USER_ROLES.ASSOCIATION && user.associationId && event.ownerId === user.associationId)
      )) ||
      database.notifications.some((notification) => notification.creatorId === id)
    if (isReferenced) {
      throw new MockDataError('CONFLICT', 'This user is referenced by platform records and cannot be deleted.')
    }
    for (const association of database.associations) {
      if (association.accountUserId === id) {
        association.accountUserId = null
      }
    }
    for (const studentClass of database.classes) {
      studentClass.studentIds = studentClass.studentIds.filter((studentId) => studentId !== id)
      studentClass.activeRepresentativeIds = studentClass.activeRepresentativeIds
        .filter((representativeId) => representativeId !== id)
      if (studentClass.representativeId === id) {
        studentClass.representativeId = studentClass.activeRepresentativeIds[0] || null
      }
    }
    database.notifications = database.notifications.filter((notification) => notification.recipientId !== id)
    database.users = database.users.filter((item) => item.id !== id)
    return user
  })
}

export async function assignRepresentative(userId, classId, directorId) {
  return transact((database) => {
    requireDirector(database, directorId)
    const user = requireRecord(database, 'users', userId)
    const studentClass = requireRecord(database, 'classes', classId)
    if (user.role !== USER_ROLES.STUDENT || user.isActive === false) {
      throw new MockDataError('VALIDATION_ERROR', 'Only active student accounts can be representatives.')
    }
    if (user.classId && user.classId !== classId && user.representativeStatus === REPRESENTATIVE_STATUS.ACTIVE) {
      throw new MockDataError('CONFLICT', 'Deactivate the current representative assignment before transferring this user.')
    }
    if (
      user.classId === classId &&
      user.isRepresentative === true &&
      user.representativeStatus === REPRESENTATIVE_STATUS.ACTIVE
    ) {
      throw new MockDataError('CONFLICT', `${user.name} is already an active representative for this class.`)
    }
    const activeClassRepresentativeIds = new Set([
      ...(studentClass.activeRepresentativeIds || []),
      ...database.users
        .filter((candidate) => (
          candidate.role === USER_ROLES.STUDENT &&
          candidate.classId === classId &&
          candidate.isActive !== false &&
          candidate.isRepresentative === true &&
          candidate.representativeStatus === REPRESENTATIVE_STATUS.ACTIVE
        ))
        .map((candidate) => candidate.id),
    ])
    if (activeClassRepresentativeIds.size >= MAX_ACTIVE_REPRESENTATIVES_PER_CLASS) {
      throw new MockDataError(
        'CONFLICT',
        `${studentClass.name} already has the maximum of ${MAX_ACTIVE_REPRESENTATIVES_PER_CLASS} active representatives. Deactivate an existing representative before assigning another.`,
      )
    }
    updateClassMembership(database, user.id, user.classId, classId)
    user.classId = classId
    user.isRepresentative = true
    user.representativeStatus = REPRESENTATIVE_STATUS.ACTIVE
    user.designation = 'REPRESENTATIVE'
    if (!studentClass.activeRepresentativeIds.includes(user.id)) {
      studentClass.activeRepresentativeIds.push(user.id)
    }
    if (!studentClass.representativeId) studentClass.representativeId = user.id
    return user
  })
}

export async function deactivateRepresentative(userId, directorId) {
  return transact((database) => {
    requireDirector(database, directorId)
    const user = requireRecord(database, 'users', userId)
    if (user.role !== USER_ROLES.STUDENT || !user.isRepresentative) {
      throw new MockDataError('VALIDATION_ERROR', 'The selected user is not a class representative.')
    }
    deactivateRepresentativeRecord(database, user)
    return user
  })
}
