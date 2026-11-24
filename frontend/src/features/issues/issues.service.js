import { USER_ROLES } from '../../constants/roles.js'
import { ISSUE_STATUS } from '../../mocks/seedData.js'
import { getCollection, getRecord, transact, MockDataError } from '../../mocks/mockDatabase.js'
import {
  assertText,
  assertOnlyFields,
  requireActor,
  requireActiveRepresentative,
  requireDirector,
  requireRecord,
} from '../../mocks/serviceUtils.js'

export { ISSUE_STATUS }

export async function getAll(filters = {}) {
  const records = await getCollection('issues')
  return records.filter((issue) => (
    (!filters.classId || issue.classId === filters.classId) &&
    (!filters.status || issue.status === filters.status) &&
    (!filters.submittedById || issue.submittedById === filters.submittedById)
  ))
}

export async function getById(id) {
  return getRecord('issues', id)
}

export async function create(data, representativeId) {
  assertOnlyFields(data, ['classId', 'title', 'description'], 'Issue creation')
  assertText(data?.title, 'Issue title', { maxLength: 180 })
  assertText(data?.description, 'Issue description')
  return transact((database, createId) => {
    const { representative } = requireActiveRepresentative(
      database,
      representativeId,
      data.classId,
    )
    const issue = {
      id: createId('issues'),
      classId: data.classId,
      submittedById: representative.id,
      title: data.title.trim(),
      description: data.description.trim(),
      submittedAt: new Date().toISOString(),
      status: ISSUE_STATUS.PENDING,
    }
    database.issues.push(issue)
    return issue
  })
}

export async function update(id, data, actorId) {
  assertOnlyFields(data, ['title', 'description'], 'Issue update')
  if (Object.hasOwn(data, 'title')) assertText(data.title, 'Issue title', { maxLength: 180 })
  if (Object.hasOwn(data, 'description')) assertText(data.description, 'Issue description')
  return transact((database) => {
    const actor = requireActor(
      database,
      actorId,
      [USER_ROLES.STUDENT, USER_ROLES.DIRECTOR],
    )
    const issue = requireRecord(database, 'issues', id)
    if (
      actor.role !== USER_ROLES.DIRECTOR &&
      !(actor.isRepresentative && actor.representativeStatus === 'ACTIVE' && issue.submittedById === actor.id && issue.status === ISSUE_STATUS.PENDING)
    ) {
      throw new MockDataError('FORBIDDEN', 'Only the Director or the submitting representative may edit a pending issue.')
    }
    for (const field of ['title', 'description']) {
      if (Object.hasOwn(data, field)) issue[field] = data[field].trim()
    }
    return issue
  })
}

export async function updateStatus(id, status, directorId) {
  if (!Object.values(ISSUE_STATUS).includes(status)) {
    throw new MockDataError('VALIDATION_ERROR', `Unsupported class issue status "${status}".`)
  }
  return transact((database) => {
    requireDirector(database, directorId)
    const issue = requireRecord(database, 'issues', id)
    issue.status = status
    issue.statusUpdatedAt = new Date().toISOString()
    if (status === ISSUE_STATUS.VIEWED) issue.viewedById = directorId
    if (status === ISSUE_STATUS.RESOLVED) issue.resolvedById = directorId
    return issue
  })
}

export async function deleteIssue(id, directorId) {
  return transact((database) => {
    requireDirector(database, directorId)
    const issue = requireRecord(database, 'issues', id)
    database.issues = database.issues.filter((item) => item.id !== id)
    return issue
  })
}
