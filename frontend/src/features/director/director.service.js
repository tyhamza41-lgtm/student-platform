import { USER_ROLES } from '../../constants/roles.js'
import { getCollection, getRecord, MockDataError } from '../../mocks/mockDatabase.js'
import * as associationsService from '../associations/associations.service.js'
import * as issuesService from '../issues/issues.service.js'
import * as usersService from '../users/users.service.js'

export { MAX_ACTIVE_REPRESENTATIVES_PER_CLASS } from '../users/users.service.js'

async function assertDirector(directorId) {
  const director = await getRecord('users', directorId)
  if (!director) throw new MockDataError('NOT_FOUND', `users record "${directorId}" was not found.`)
  if (director.role !== USER_ROLES.DIRECTOR || director.isActive === false) {
    throw new MockDataError('FORBIDDEN', 'Only an active Director can perform this operation.')
  }
  return director
}

export async function getOverview(directorId) {
  await assertDirector(directorId)
  const [users, associations, posts, events, issues] = await Promise.all([
    getCollection('users'),
    getCollection('associations'),
    getCollection('posts'),
    getCollection('events'),
    getCollection('issues'),
  ])
  return {
    studentCount: users.filter((user) => user.role === USER_ROLES.STUDENT).length,
    activeStudentCount: users.filter((user) => user.role === USER_ROLES.STUDENT && user.isActive !== false).length,
    associationCount: associations.length,
    activeAssociationCount: associations.filter((association) => association.isActive).length,
    postCount: posts.length,
    pendingIssueCount: issues.filter((issue) => issue.status === 'PENDING').length,
    eventCount: events.length,
  }
}

export async function getUsers(directorId, filters = {}) {
  await assertDirector(directorId)
  const users = await usersService.getAll(filters)
  return users.filter((user) => user.role !== USER_ROLES.DIRECTOR)
}

export async function deleteUser(userId, directorId) {
  await assertDirector(directorId)
  return usersService.deleteUser(userId, directorId)
}

export async function getStudents(directorId, filters = {}) {
  await assertDirector(directorId)
  return usersService.getAll({ ...filters, role: USER_ROLES.STUDENT })
}

export async function getRepresentatives(directorId, filters = {}) {
  await assertDirector(directorId)
  return usersService.getRepresentatives(filters)
}

export async function getClasses(directorId) {
  await assertDirector(directorId)
  return getCollection('classes')
}

export async function assignRepresentative(studentId, classId, directorId) {
  await assertDirector(directorId)
  return usersService.assignRepresentative(studentId, classId, directorId)
}

export async function deactivateRepresentative(studentId, directorId) {
  await assertDirector(directorId)
  return usersService.deactivateRepresentative(studentId, directorId)
}

export async function getAssociations(directorId, filters = {}) {
  await assertDirector(directorId)
  return associationsService.getAll(filters)
}

export async function createAssociation(data, directorId) {
  await assertDirector(directorId)
  return associationsService.create(data, directorId)
}

export async function updateAssociation(id, data, directorId) {
  await assertDirector(directorId)
  return associationsService.update(id, data, directorId)
}

export async function deleteAssociation(id, directorId) {
  await assertDirector(directorId)
  return associationsService.deleteAssociation(id, directorId)
}

export async function getClassIssues(directorId, filters = {}) {
  await assertDirector(directorId)
  return issuesService.getAll(filters)
}

export async function updateClassIssueStatus(issueId, status, directorId) {
  await assertDirector(directorId)
  return issuesService.updateStatus(issueId, status, directorId)
}
