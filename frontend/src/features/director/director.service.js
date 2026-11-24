import { USER_ROLES } from '../../constants/roles.js'
import { getCollection, getRecord, MockDataError } from '../../mocks/mockDatabase.js'
import * as associationsService from '../associations/associations.service.js'
import * as issuesService from '../issues/issues.service.js'
import * as postsService from '../posts/posts.service.js'
import * as usersService from '../users/users.service.js'

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

export async function getStudents(directorId, filters = {}) {
  await assertDirector(directorId)
  return usersService.getAll({ ...filters, role: USER_ROLES.STUDENT })
}

export async function createStudent(data, directorId) {
  await assertDirector(directorId)
  return usersService.create({ ...data, role: USER_ROLES.STUDENT }, directorId)
}

export async function updateStudent(studentId, data, directorId) {
  await assertDirector(directorId)
  const student = await usersService.getById(studentId)
  if (!student || student.role !== USER_ROLES.STUDENT) {
    throw new MockDataError('NOT_FOUND', `Student "${studentId}" was not found.`)
  }
  return usersService.update(studentId, data, directorId)
}

export async function deleteStudent(studentId, directorId) {
  await assertDirector(directorId)
  const student = await usersService.getById(studentId)
  if (!student || student.role !== USER_ROLES.STUDENT) {
    throw new MockDataError('NOT_FOUND', `Student "${studentId}" was not found.`)
  }
  return usersService.deleteUser(studentId, directorId)
}

export async function setStudentActive(studentId, isActive, directorId) {
  await assertDirector(directorId)
  return usersService.setActive(studentId, isActive, directorId)
}

export async function getRepresentatives(directorId, filters = {}) {
  await assertDirector(directorId)
  return usersService.getRepresentatives(filters)
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

export async function setAssociationActive(id, isActive, directorId) {
  await assertDirector(directorId)
  return associationsService.setActive(id, isActive, directorId)
}

export async function deleteAssociation(id, directorId) {
  await assertDirector(directorId)
  return associationsService.deleteAssociation(id, directorId)
}

export async function moderatePost(postId, status, directorId) {
  await assertDirector(directorId)
  return postsService.setModerationStatus(postId, status, directorId)
}

export async function getClassIssues(directorId, filters = {}) {
  await assertDirector(directorId)
  return issuesService.getAll(filters)
}

export async function updateClassIssueStatus(issueId, status, directorId) {
  await assertDirector(directorId)
  return issuesService.updateStatus(issueId, status, directorId)
}
