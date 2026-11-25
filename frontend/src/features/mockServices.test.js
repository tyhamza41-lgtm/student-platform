import { beforeEach, describe, expect, it, vi } from 'vitest'
import { USER_ROLES } from '../constants/roles.js'
import { ISSUE_STATUS } from '../mocks/seedData.js'
import { getMockDatabaseSnapshot, MockDataError, resetMockDatabase, transact } from '../mocks/mockDatabase.js'
import * as associations from './associations/associations.service.js'
import * as comments from './comments/comments.service.js'
import * as director from './director/director.service.js'
import * as events from './events/events.service.js'
import * as issues from './issues/issues.service.js'
import * as notifications from './notifications/notifications.service.js'
import * as posts from './posts/posts.service.js'
import * as profiles from './profiles/profiles.service.js'
import * as reactions from './reactions/reactions.service.js'
import * as users from './users/users.service.js'

const directorId = 'director-1'
const representativeId = 'representative-1'
const associationId = 'association-1'

beforeEach(async () => {
  localStorage.clear()
  await resetMockDatabase()
})

async function expectServiceError(promise, code) {
  await expect(promise).rejects.toMatchObject({
    name: 'MockDataError',
    code,
  })
}

describe('mock domain services', () => {
  it('provides collection reads, nullable lookup, and student CRUD with director permissions', async () => {
    expect((await users.getAll({ role: USER_ROLES.STUDENT })).length).toBeGreaterThan(1)
    expect(await users.getById('unknown-user')).toBeNull()
    await expectServiceError(
      users.create({ name: 'New Student', email: 'new@studentplatform.ma', role: USER_ROLES.STUDENT }, 'student-1'),
      'FORBIDDEN',
    )

    const created = await users.create({
      name: 'New Student',
      email: 'new@studentplatform.ma',
      role: USER_ROLES.STUDENT,
      classId: 'class-ginf-2',
    }, directorId)
    expect(created.id).toMatch(/^user-mock-/)
    expect((await users.getAll({ classId: 'class-ginf-2' })).some(({ id }) => id === created.id)).toBe(true)

    const updated = await users.update(created.id, { name: 'Updated Student' }, directorId)
    expect(updated.name).toBe('Updated Student')
    await expectServiceError(users.update('missing-user', { name: 'No user' }, directorId), 'NOT_FOUND')
    await expectServiceError(users.update(created.id, { role: USER_ROLES.DIRECTOR }, directorId), 'VALIDATION_ERROR')

    expect((await users.deleteUser(created.id, directorId)).id).toBe(created.id)
    await expectServiceError(users.deleteUser('missing-user', directorId), 'NOT_FOUND')
    await expectServiceError(users.deleteUser('student-1', directorId), 'CONFLICT')
    await expectServiceError(
      users.create({ name: 'New Student', email: 'bad-email', role: USER_ROLES.STUDENT }, directorId),
      'VALIDATION_ERROR',
    )
  })

  it('updates only the current user profile and keeps association profile names in sync', async () => {
    expect((await profiles.getById('student-1')).name).toBe('Sam Student')
    await expectServiceError(profiles.update('student-1', { name: 'Someone else' }, 'student-2'), 'FORBIDDEN')
    await expectServiceError(profiles.update('student-1', { role: USER_ROLES.DIRECTOR }, 'student-1'), 'VALIDATION_ERROR')

    const updated = await profiles.update('student-1', { name: 'Sam Updated', bio: 'Computer science student' }, 'student-1')
    expect(updated).toMatchObject({ name: 'Sam Updated', bio: 'Computer science student' })
    const association = await profiles.update(associationId, { name: 'Arts Collective' }, associationId)
    expect(association.name).toBe('Arts Collective')
    expect((await associations.getById(associationId)).name).toBe('Arts Collective')
  })

  it('creates, updates, deactivates, and protects association records', async () => {
    const created = await associations.create({
      name: 'Robotics Club',
      description: 'Student robotics projects',
      institution: 'ENSA Marrakech',
    }, directorId)
    expect((await associations.getById(created.id)).name).toBe('Robotics Club')
    expect((await associations.update(created.id, { description: 'Updated club description' }, directorId)).description)
      .toBe('Updated club description')
    expect((await associations.setActive(created.id, false, directorId)).isActive).toBe(false)
    expect((await associations.deleteAssociation(created.id, directorId)).id).toBe(created.id)
    await expectServiceError(associations.update('missing-association', { name: 'Nope' }, directorId), 'NOT_FOUND')
    await expectServiceError(associations.deleteAssociation(associationId, directorId), 'CONFLICT')
    await expectServiceError(associations.create({ name: '' }, directorId), 'VALIDATION_ERROR')

    const managedAssociation = await associations.create({ name: 'Robotics Club' }, directorId)
    const account = await users.create({
      name: 'Robotics Club',
      email: 'robotics@studentplatform.ma',
      role: USER_ROLES.ASSOCIATION,
      associationId: managedAssociation.id,
    }, directorId)
    expect((await associations.getById(managedAssociation.id)).accountUserId).toBe(account.id)
    await expectServiceError(associations.deleteAssociation(managedAssociation.id, directorId), 'CONFLICT')

    await associations.setActive(associationId, false, directorId)
    await expectServiceError(posts.create({ content: 'Inactive association post' }, associationId), 'FORBIDDEN')
    await expectServiceError(events.create({
      title: 'Inactive association event',
      description: 'This must be rejected.',
      date: '2026-12-10T18:00:00',
      location: 'Main Hall',
    }, associationId), 'FORBIDDEN')
  })

  it('creates and manages representative and association posts with ownership enforcement', async () => {
    const representativePost = await posts.create({
      classId: 'class-ginf-2',
      content: 'Class meeting tomorrow',
    }, representativeId)
    expect(representativePost).toMatchObject({
      authorId: representativeId,
      authorRole: 'Class Representative',
      classId: 'class-ginf-2',
    })
    expect((await posts.update(representativePost.id, { content: 'Meeting moved to Friday' }, representativeId)).content)
      .toBe('Meeting moved to Friday')
    await expectServiceError(posts.update(representativePost.id, { content: 'Unauthorized' }, 'student-1'), 'FORBIDDEN')
    expect((await posts.deletePost(representativePost.id, representativeId)).id).toBe(representativePost.id)

    const associationPost = await posts.create({ content: 'Arts exhibition announcement' }, associationId)
    expect(associationPost.associationId).toBe(associationId)
    await expectServiceError(posts.deletePost(associationPost.id, 'student-1'), 'FORBIDDEN')
    expect((await director.moderatePost(associationPost.id, 'HIDDEN', directorId)).status).toBe('HIDDEN')

    const secondAssociationPost = await posts.create({ content: 'Green campus workshop' }, 'association-2')
    await expectServiceError(
      posts.update(secondAssociationPost.id, { content: 'Unauthorized edit' }, associationId),
      'FORBIDDEN',
    )
    await expectServiceError(events.update('event-2', { title: 'Unauthorized event edit' }, associationId), 'FORBIDDEN')

    await expectServiceError(posts.create({ content: 'Student post' }, 'student-1'), 'FORBIDDEN')
    await expectServiceError(posts.create({ classId: 'class-ginf-2', content: '' }, representativeId), 'VALIDATION_ERROR')
    await expectServiceError(posts.getById('missing-post').then((post) => {
      if (!post) throw new MockDataError('NOT_FOUND', 'Post not found')
    }), 'NOT_FOUND')
  })

  it('creates and deletes comments while retaining author snapshots', async () => {
    const comment = await comments.add({
      postId: 'post-1',
      content: 'Thanks for sharing this update.',
    }, 'student-1')
    expect(comment).toMatchObject({
      authorId: 'student-1',
      authorName: 'Sam Student',
      postId: 'post-1',
    })
    await expectServiceError(comments.deleteComment(comment.id, 'student-2'), 'FORBIDDEN')
    expect((await comments.deleteComment(comment.id, 'student-1')).id).toBe(comment.id)
    await expectServiceError(comments.add({ postId: 'missing-post', content: 'Hello' }, 'student-1'), 'NOT_FOUND')
    await expectServiceError(comments.deleteComment('missing-comment', 'student-1'), 'NOT_FOUND')
  })

  it('allows one reaction per user and post, including switching and removing it', async () => {
    const created = await reactions.togglePostReaction('post-1', 'student-1', reactions.REACTION_TYPES.LIKE)
    expect(created.type).toBe('LIKE')
    expect((await posts.getById('post-1')).likeCount).toBe(25)
    const switched = await reactions.togglePostReaction('post-1', 'student-1', reactions.REACTION_TYPES.DISLIKE)
    expect(switched).toMatchObject({ id: created.id, type: 'DISLIKE' })
    expect(await posts.getById('post-1')).toMatchObject({ likeCount: 24, dislikeCount: 2 })
    expect(await reactions.getAll({ postId: 'post-1', userId: 'student-1' })).toHaveLength(1)
    expect(await reactions.togglePostReaction('post-1', 'student-1', reactions.REACTION_TYPES.DISLIKE)).toBeNull()
    expect(await posts.getById('post-1')).toMatchObject({ likeCount: 24, dislikeCount: 1 })
    await expectServiceError(reactions.togglePostReaction('missing-post', 'student-1', 'LOVE'), 'VALIDATION_ERROR')
    await expectServiceError(reactions.togglePostReaction('missing-post', 'student-1', 'LIKE'), 'NOT_FOUND')
    await expectServiceError(reactions.removePostReaction('post-1', 'missing-user'), 'NOT_FOUND')
  })

  it('creates events, enforces association ownership, and registers/cancels participation', async () => {
    const event = await events.create({
      title: 'Arts showcase',
      description: 'An evening of student work.',
      date: '2026-12-10T18:00:00',
      location: 'Main Hall',
      imageUrl: 'data:image/png;base64,ZmFrZQ==',
    }, associationId)
    expect(event).toMatchObject({ ownerType: 'ASSOCIATION', ownerId: associationId })
    expect(event.imageUrl).toContain('data:image/png;base64')
    await expectServiceError(events.update(event.id, { title: 'Unauthorized' }, 'student-1'), 'FORBIDDEN')
    expect(await events.update(event.id, { title: 'Annual arts showcase', imageUrl: null }, associationId))
      .toMatchObject({ title: 'Annual arts showcase', imageUrl: null })
    await expectServiceError(events.update('event-1', { title: 'Director edit' }, directorId), 'FORBIDDEN')
    await expectServiceError(events.deleteEvent('event-1', associationId), 'FORBIDDEN')

    const registration = await events.register('event-1', 'student-1', {
      phone: '+212 6 55 44 33 22',
      message: 'I will arrive early.',
    })
    expect(registration).toMatchObject({ eventId: 'event-1', userId: 'student-1' })
    expect(await events.getMyRegistrations('student-1')).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: registration.id })]),
    )
    expect((await events.getById('event-1')).participantCount).toBe(49)
    await expectServiceError(events.register('event-1', 'student-1'), 'CONFLICT')
    await expectServiceError(events.register('event-1', 'student-3', { phone: '555' }), 'VALIDATION_ERROR')
    const representativeRegistration = await events.register('event-1', representativeId, {
      phone: '+212 6 55 44 33 22',
    })
    expect(representativeRegistration.userId).toBe(representativeId)
    await events.cancelRegistration('event-1', representativeId)
    expect((await events.cancelRegistration('event-1', 'student-1')).id).toBe(registration.id)
    expect((await events.getById('event-1')).participantCount).toBe(48)
    expect(await events.cancelRegistration('event-1', 'student-1')).toBeNull()
    expect(await events.getMyRegistrations('student-1')).toEqual(
      expect.arrayContaining([expect.objectContaining({ eventId: 'event-2', userId: 'student-1' })]),
    )
    await expectServiceError(events.getMyRegistrations(associationId), 'FORBIDDEN')
    await expectServiceError(events.register('event-1', associationId, { phone: '+212 6 55 44 33 22' }), 'FORBIDDEN')
    await expectServiceError(events.register('event-1', directorId, { phone: '+212 6 55 44 33 22' }), 'FORBIDDEN')
    await expectServiceError(events.cancelRegistration('event-1', directorId), 'FORBIDDEN')
    await expectServiceError(events.getRegistrations('event-1', 'student-1'), 'FORBIDDEN')
    await expectServiceError(events.deleteEvent('event-2', 'association-2'), 'CONFLICT')
    await expectServiceError(events.create({
      title: 'Director event',
      description: 'Not allowed.',
      date: '2026-12-10T18:00:00',
      location: 'Main Hall',
    }, directorId), 'FORBIDDEN')
    await expectServiceError(events.getRegistrations('event-2', directorId), 'FORBIDDEN')
    await expectServiceError(events.create({ title: 'Incomplete' }, associationId), 'VALIDATION_ERROR')
    await expectServiceError(events.create({
      title: 'Past event',
      description: 'This event has already passed.',
      date: new Date(Date.now() - 60_000).toISOString(),
      location: 'Main Hall',
    }, associationId), 'VALIDATION_ERROR')
    await transact((database) => {
      database.events.find((item) => item.id === 'event-1').date = new Date(Date.now() - 60_000).toISOString()
    })
    await expectServiceError(events.register('event-1', 'student-1', {
      phone: '+212 6 55 44 33 22',
    }), 'CONFLICT')
    await transact((database) => {
      database.events.find((item) => item.id === 'event-1').date = 'invalid-date'
    })
    await expectServiceError(events.register('event-1', 'student-1', {
      phone: '+212 6 55 44 33 22',
    }), 'CONFLICT')
  })

  it('lets the Director delete any event and atomically removes registrations and notifies every user', async () => {
    const eventTitle = (await events.getById('event-2')).title
    const usersBefore = await users.getAll()
    const deleted = await events.deleteEvent('event-2', directorId)
    const snapshot = await getMockDatabaseSnapshot()

    expect(deleted.title).toBe(eventTitle)
    expect(snapshot.events.some((event) => event.id === 'event-2')).toBe(false)
    expect(snapshot.registrations.some((registration) => registration.eventId === 'event-2')).toBe(false)
    const eventNotifications = snapshot.notifications.filter((notification) => notification.itemId === 'event-2')
    expect(eventNotifications).toHaveLength(usersBefore.length)
    expect(eventNotifications.map((notification) => notification.recipientId).sort())
      .toEqual(usersBefore.map((user) => user.id).sort())
    expect(eventNotifications.every((notification) => (
      notification.type === 'EVENT_DELETED' &&
      notification.itemType === 'EVENT' &&
      notification.itemTitle === eventTitle &&
      notification.directorName === 'Dr. Nadia Alaoui' &&
      notification.message.includes(eventTitle) &&
      notification.message.includes('Dr. Nadia Alaoui') &&
      !notification.readAt
    ))).toBe(true)
    expect(Number.isNaN(new Date(eventNotifications[0].deletedAt).getTime())).toBe(false)
    expect(eventNotifications[0].createdAt).toBe(eventNotifications[0].deletedAt)
    const deletedDate = new Date(eventNotifications[0].deletedAt)
    expect(eventNotifications[0].message).toContain(new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(deletedDate))
    expect(eventNotifications[0].message).toContain(new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(deletedDate))
  })

  it('integrates issue deletion notifications and creates none for failed moderation', async () => {
    await expectServiceError(events.deleteEvent('event-2', associationId), 'FORBIDDEN')
    await expectServiceError(events.deleteEvent('missing-event', directorId), 'NOT_FOUND')
    await expectServiceError(issues.deleteIssue('issue-1', 'student-1'), 'FORBIDDEN')
    expect((await getMockDatabaseSnapshot()).notifications).toEqual([])

    const deletedIssue = await issues.deleteIssue('issue-1', directorId)
    const snapshot = await getMockDatabaseSnapshot()
    const issueNotifications = snapshot.notifications.filter((notification) => notification.itemId === deletedIssue.id)

    expect(snapshot.issues.some((issue) => issue.id === deletedIssue.id)).toBe(false)
    expect(issueNotifications).toHaveLength(snapshot.users.length)
    expect(issueNotifications.every((notification) => (
      notification.type === 'ISSUE_DELETED' &&
      notification.itemType === 'CLASS_ISSUE' &&
      notification.itemTitle === deletedIssue.title &&
      notification.message.includes(deletedIssue.title) &&
      notification.message.includes('class issue')
    ))).toBe(true)
  })

  it('keeps notification reads private to each recipient and persists individual and bulk read state', async () => {
    await events.deleteEvent('event-1', directorId)
    await issues.deleteIssue('issue-1', directorId)
    const studentNotifications = await notifications.getAllForUser('student-1')
    const otherStudentNotifications = await notifications.getAllForUser('student-2')
    expect(studentNotifications).toHaveLength(2)
    expect(otherStudentNotifications).toHaveLength(2)
    expect(studentNotifications.every(({ recipientId }) => recipientId === 'student-1')).toBe(true)
    expect(otherStudentNotifications.every(({ recipientId }) => recipientId === 'student-2')).toBe(true)
    await expectServiceError(
      notifications.markAsRead(otherStudentNotifications[0].id, 'student-1'),
      'FORBIDDEN',
    )

    const marked = await notifications.markAsRead(studentNotifications[0].id, 'student-1')
    expect(marked.readAt).toBeTruthy()
    expect((await notifications.getAllForUser('student-1'))[0].readAt).toBe(marked.readAt)
    const markedAll = await notifications.markAllAsRead('student-1')
    expect(markedAll.every((notification) => notification.readAt)).toBe(true)
    expect((await notifications.getAllForUser('student-2'))[0].readAt).toBeNull()
  })

  it('allows only an active assigned representative to create an issue', async () => {
    await expectServiceError(issues.create({
      classId: 'class-ginf-2',
      title: 'Broken board',
      description: 'The classroom whiteboard is damaged.',
    }, 'student-1'), 'FORBIDDEN')
    const issue = await issues.create({
      classId: 'class-ginf-2',
      title: 'Broken board',
      description: 'The classroom whiteboard is damaged.',
    }, representativeId)
    expect(issue).toMatchObject({
      submittedById: representativeId,
      status: ISSUE_STATUS.PENDING,
    })

    const viewed = await issues.updateStatus(issue.id, ISSUE_STATUS.VIEWED, directorId)
    expect(viewed).toMatchObject({ status: ISSUE_STATUS.VIEWED, viewedById: directorId })
    expect(viewed.status).not.toBe(ISSUE_STATUS.RESOLVED)
    expect((await director.updateClassIssueStatus(issue.id, ISSUE_STATUS.RESOLVED, directorId)).resolvedById)
      .toBe(directorId)
    await expectServiceError(issues.updateStatus(issue.id, 'CLOSED', directorId), 'VALIDATION_ERROR')
    await expectServiceError(issues.updateStatus(issue.id, ISSUE_STATUS.PENDING, 'student-1'), 'FORBIDDEN')
    await expectServiceError(issues.getById('missing-issue').then((item) => {
      if (!item) throw new MockDataError('NOT_FOUND', 'Issue not found')
    }), 'NOT_FOUND')
  })

  it('assigns representatives only to active students and removes their class permissions on deactivation', async () => {
    const assigned = await director.assignRepresentative('student-2', 'class-ginf-2', directorId)
    expect(assigned).toMatchObject({
      role: USER_ROLES.STUDENT,
      isRepresentative: true,
      representativeStatus: 'ACTIVE',
    })
    expect((await getMockDatabaseSnapshot()).classes[0].activeRepresentativeIds).toContain('student-2')

    await director.deactivateRepresentative('student-2', directorId)
    expect((await users.getById('student-2')).representativeStatus).toBe('INACTIVE')
    await expectServiceError(issues.create({
      classId: 'class-ginf-2',
      title: 'Issue after deactivation',
      description: 'This should not be accepted.',
    }, 'student-2'), 'FORBIDDEN')

    await expectServiceError(director.assignRepresentative('director-1', 'class-ginf-2', directorId), 'VALIDATION_ERROR')
    await expectServiceError(director.assignRepresentative('missing-user', 'class-ginf-2', directorId), 'NOT_FOUND')
    await expectServiceError(director.assignRepresentative('student-1', 'missing-class', directorId), 'NOT_FOUND')
    await expectServiceError(director.assignRepresentative('student-1', 'class-ginf-2', 'student-1'), 'FORBIDDEN')
  })

  it('deactivates student accounts and rejects actions by inactive users', async () => {
    await director.setStudentActive('student-1', false, directorId)
    expect((await users.getById('student-1')).isActive).toBe(false)
    await expectServiceError(reactions.togglePostReaction('post-1', 'student-1', 'LIKE'), 'FORBIDDEN')
    await expectServiceError(director.setStudentActive('director-1', false, directorId), 'VALIDATION_ERROR')
    await expectServiceError(director.setStudentActive('student-1', 'false', directorId), 'VALIDATION_ERROR')
  })

  it('provides director-only management summaries and operations', async () => {
    const summary = await director.getOverview(directorId)
    expect(summary).toMatchObject({
      studentCount: 7,
      associationCount: 2,
      postCount: 4,
      eventCount: 2,
    })
    expect((await director.getStudents(directorId)).every((user) => user.role === USER_ROLES.STUDENT)).toBe(true)
    expect((await director.getAssociations(directorId)).length).toBe(2)
    expect((await director.getClassIssues(directorId)).length).toBe(3)
    await expectServiceError(director.getOverview('student-1'), 'FORBIDDEN')
  })

  it('persists service mutations across fresh reads and resetting restores the seed state', async () => {
    await comments.add({ postId: 'post-1', content: 'Saved between page loads.' }, 'student-1')
    vi.resetModules()
    const reloadedDatabase = await import('../mocks/mockDatabase.js')
    const afterReload = await reloadedDatabase.getCollection('comments')
    const postComments = afterReload.filter((comment) => comment.postId === 'post-1')
    expect(postComments.some(({ content }) => content === 'Saved between page loads.')).toBe(true)

    await resetMockDatabase()
    expect((await comments.getAll({ postId: 'post-1' })).some(({ content }) => content === 'Saved between page loads.'))
      .toBe(false)
  })
})
