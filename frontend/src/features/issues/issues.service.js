import { USER_ROLES } from '../../constants/roles.js'
import { ISSUE_STATUS } from '../../mocks/seedData.js'
import { getCollection, getRecord, transact, MockDataError } from '../../mocks/mockDatabase.js'
import {
  announceNotificationsChanged,
  createCreationNotifications,
  createModerationDeletionNotifications,
} from '../notifications/notifications.service.js'
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
  const [records, classes, users] = await Promise.all([
    getCollection('issues'),
    getCollection('classes'),
    getCollection('users'),
  ])
  const classNames = new Map(classes.map((studentClass) => [studentClass.id, studentClass.name]))
  const usersById = new Map(users.map((user) => [user.id, user]))
  return records.filter((issue) => (
    (!filters.classId || issue.classId === filters.classId) &&
    (!filters.status || issue.status === filters.status) &&
    (!filters.submittedById || issue.submittedById === filters.submittedById)
  )).map((issue) => {
    const submitter = usersById.get(issue.submittedById)
    return {
      ...issue,
      className: classNames.get(issue.classId) || issue.classId,
      submittedByName: submitter?.name || null,
      submittedByAvatar: submitter?.avatarUrl || null,
    }
  })
}

export async function getById(id) {
  const issue = await getRecord('issues', id)
  if (!issue) return null
  const [studentClass, submitter] = await Promise.all([
    getRecord('classes', issue.classId),
    getRecord('users', issue.submittedById),
  ])
  return {
    ...issue,
    className: studentClass?.name || issue.classId,
    submittedByName: submitter?.name || null,
    submittedByAvatar: submitter?.avatarUrl || null,
  }
}

export async function create(data, representativeId) {
  assertOnlyFields(data, ['classId', 'title', 'description'], 'Issue creation')
  assertText(data?.title, 'Issue title', { maxLength: 180 })
  assertText(data?.description, 'Issue description')
  const createdIssue = await transact((database, createId) => {
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
    const studentClass = requireRecord(database, 'classes', issue.classId)
    createCreationNotifications(database, createId, {
      itemType: 'CLASS_ISSUE',
      item: issue,
      actor: representative,
      itemTitle: issue.title,
      itemSummary: issue.description,
      context: {
        classId: studentClass.id,
        className: studentClass.name,
      },
    })
    return issue
  })
  announceNotificationsChanged()
  return createdIssue
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
    if (issue.status === status) return issue
    const transitionedAt = new Date().toISOString()
    const hasValidFirstViewMetadata = (
      typeof issue.viewedAt === 'string' &&
      !Number.isNaN(new Date(issue.viewedAt).getTime()) &&
      typeof issue.viewedById === 'string' &&
      Boolean(issue.viewedById.trim())
    )
    issue.status = status
    issue.statusUpdatedAt = transitionedAt
    if (status === ISSUE_STATUS.VIEWED && !hasValidFirstViewMetadata) {
      issue.viewedAt = transitionedAt
      issue.viewedById = directorId
    }
    if (status === ISSUE_STATUS.RESOLVED) issue.resolvedById = directorId
    return issue
  })
}

export async function deleteIssue(id, directorId) {
  const deletedIssue = await transact((database, createId) => {
    const director = requireDirector(database, directorId)
    const issue = requireRecord(database, 'issues', id)
    createModerationDeletionNotifications(database, createId, {
      itemType: 'CLASS_ISSUE',
      itemId: issue.id,
      itemTitle: issue.title,
      directorName: director.name,
      deletedAt: new Date().toISOString(),
    })
    database.comments = database.comments.filter((comment) => comment.issueId !== id)
    database.issues = database.issues.filter((item) => item.id !== id)
    return issue
  })
  announceNotificationsChanged()
  return deletedIssue
}
