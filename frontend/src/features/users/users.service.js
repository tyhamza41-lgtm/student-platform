import { REPRESENTATIVE_STATUS, USER_ROLES } from '../../constants/roles.js'
import { getCollection, getRecord, transact, MockDataError } from '../../mocks/mockDatabase.js'
import {
  assertEmailAvailable,
  assertOnlyFields,
  assertText,
  requireDirector,
  requireRecord,
} from '../../mocks/serviceUtils.js'

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

export async function create(data, directorId) {
  assertOnlyFields(data, ['name', 'email', 'role', 'classId', 'associationId', 'avatarUrl', 'isActive', 'bio', 'phone'], 'User creation')
  assertText(data?.name, 'User name', { maxLength: 120 })
  assertEmailAvailable({ users: await getCollection('users') }, data?.email)
  return transact((database, createId) => {
    requireDirector(database, directorId)
    if (!Object.values(USER_ROLES).includes(data.role)) {
      throw new MockDataError('VALIDATION_ERROR', `Unsupported user role "${data.role}".`)
    }
    const user = {
      ...data,
      id: createId('users'),
      name: data.name.trim(),
      email: data.email.trim(),
      isActive: data.isActive ?? true,
    }
    delete user.isRepresentative
    delete user.representativeStatus
    delete user.designation
    if (user.role === USER_ROLES.STUDENT) {
      user.classId = data.classId || null
      if (user.classId) {
        const studentClass = requireRecord(database, 'classes', user.classId)
        studentClass.studentIds.push(user.id)
      }
    } else if (user.role === USER_ROLES.ASSOCIATION) {
      const association = requireRecord(database, 'associations', data.associationId)
      if (!association.isActive) {
        throw new MockDataError('VALIDATION_ERROR', 'Association accounts can only be created for active associations.')
      }
      if (association.accountUserId) {
        throw new MockDataError('CONFLICT', 'This association already has an account.')
      }
      user.associationId = association.id
      association.accountUserId = user.id
      association.name = user.name
    } else {
      delete user.classId
      delete user.associationId
    }
    database.users.push(user)
    return user
  })
}

export async function update(id, data, directorId) {
  assertOnlyFields(data, ['name', 'email', 'avatarUrl', 'bio', 'phone'], 'User update')
  if (Object.hasOwn(data, 'name')) assertText(data.name, 'User name', { maxLength: 120 })
  if (Object.hasOwn(data, 'email')) {
    const users = await getCollection('users')
    assertEmailAvailable({ users }, data.email, id)
  }
  return transact((database) => {
    requireDirector(database, directorId)
    const user = requireRecord(database, 'users', id)
    for (const field of ['name', 'email', 'avatarUrl', 'bio', 'phone']) {
      if (Object.hasOwn(data, field)) user[field] = field === 'name' || field === 'email'
        ? data[field].trim()
        : data[field]
    }
    if (user.role === USER_ROLES.ASSOCIATION) {
      const association = requireRecord(database, 'associations', user.associationId)
      association.name = user.name
    }
    return user
  })
}

export async function deleteUser(id, directorId) {
  return transact((database) => {
    requireDirector(database, directorId)
    const user = requireRecord(database, 'users', id)
    const isReferenced =
      database.posts.some((post) => post.authorId === id) ||
      database.comments.some((comment) => comment.authorId === id) ||
      database.reactions.some((reaction) => reaction.userId === id) ||
      database.registrations.some((registration) => registration.userId === id) ||
      database.issues.some((issue) => issue.submittedById === id) ||
      database.events.some((event) => event.ownerId === id) ||
      database.associations.some((association) => association.accountUserId === id)
    if (isReferenced) {
      throw new MockDataError('CONFLICT', 'This user is referenced by platform records; deactivate the account instead.')
    }
    for (const studentClass of database.classes) {
      studentClass.studentIds = studentClass.studentIds.filter((studentId) => studentId !== id)
      studentClass.activeRepresentativeIds = studentClass.activeRepresentativeIds
        .filter((representativeId) => representativeId !== id)
      if (studentClass.representativeId === id) {
        studentClass.representativeId = studentClass.activeRepresentativeIds[0] || null
      }
    }
    database.users = database.users.filter((item) => item.id !== id)
    return user
  })
}

export async function setActive(id, isActive, directorId) {
  if (typeof isActive !== 'boolean') {
    throw new MockDataError('VALIDATION_ERROR', 'Active status must be a boolean.')
  }
  return transact((database) => {
    requireDirector(database, directorId)
    const user = requireRecord(database, 'users', id)
    if (user.role !== USER_ROLES.STUDENT) {
      throw new MockDataError('VALIDATION_ERROR', 'Only student accounts use student activation controls.')
    }
    if (!isActive && user.isRepresentative) deactivateRepresentativeRecord(database, user)
    user.isActive = isActive
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
