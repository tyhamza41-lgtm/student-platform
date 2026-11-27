import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  vi.useFakeTimers({ shouldAdvanceTime: true })
  vi.setSystemTime(new Date('2026-11-25T12:00:00.000Z'))
  localStorage.clear()
  await resetMockDatabase()
})

afterEach(() => {
  vi.useRealTimers()
})

async function expectServiceError(promise, code) {
  await expect(promise).rejects.toMatchObject({
    name: 'MockDataError',
    code,
  })
}

describe('mock domain services', () => {
  it('provides collection reads, nullable lookup, and safeguarded user deletion with director permissions', async () => {
    expect((await users.getAll({ role: USER_ROLES.STUDENT })).length).toBeGreaterThan(1)
    expect(await users.getById('unknown-user')).toBeNull()
    expect(users.create).toBeUndefined()
    expect(users.update).toBeUndefined()
    expect(users.setActive).toBeUndefined()

    const unreferencedUser = await transact((database, createId) => {
      const created = {
        id: createId('users'),
        name: 'New Student',
        email: 'new@studentplatform.ma',
        role: USER_ROLES.STUDENT,
        classId: 'class-ginf-2',
        isActive: true,
      }
      database.users.push(created)
      database.classes[0].studentIds.push(created.id)
      return created
    })
    expect((await users.getAll({ classId: 'class-ginf-2' })).some(({ id }) => id === unreferencedUser.id)).toBe(true)

    await posts.create({ content: 'Trigger recipient notifications before deletion.' }, associationId)
    await expectServiceError(users.deleteUser(unreferencedUser.id, 'student-1'), 'FORBIDDEN')
    await expectServiceError(users.deleteUser('director-1', directorId), 'FORBIDDEN')
    expect((await users.deleteUser(unreferencedUser.id, directorId)).id).toBe(unreferencedUser.id)
    expect((await getMockDatabaseSnapshot()).notifications.some((n) => n.recipientId === unreferencedUser.id)).toBe(false)
    await expectServiceError(users.deleteUser('missing-user', directorId), 'NOT_FOUND')
    await expectServiceError(users.deleteUser('student-1', directorId), 'CONFLICT')
  })

  it('updates only the current user profile and keeps Association profile details in sync', async () => {
    expect((await profiles.getById('student-1')).name).toBe('Sam Student')
    await expectServiceError(profiles.update('student-1', { name: 'Someone else' }, 'student-2'), 'FORBIDDEN')
    await expectServiceError(profiles.update('student-1', { role: USER_ROLES.DIRECTOR }, 'student-1'), 'VALIDATION_ERROR')

    const updated = await profiles.update('student-1', { name: 'Sam Updated', bio: 'Computer science student' }, 'student-1')
    expect(updated).toMatchObject({ name: 'Sam Updated', bio: 'Computer science student' })
    expect(await profiles.getOwnProfile('student-1', 'student-1'))
      .toMatchObject({ name: 'Sam Updated', bio: 'Computer science student' })
    const associationAvatar = 'data:image/jpeg;base64,association-profile-photo'
    const associationEvent = await events.create({
      title: 'Arts profile sync event',
      description: 'Association profile attribution check.',
      date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      location: 'Studio A',
    }, associationId)
    const associationPost = await posts.create({ content: 'Arts profile sync post.' }, associationId)
    await comments.add({
      postId: associationPost.id,
      content: 'Arts profile sync comment.',
    }, associationId)
    const association = await profiles.update(
      associationId,
      { name: 'Arts Collective', avatarUrl: associationAvatar },
      associationId,
    )
    expect(association.name).toBe('Arts Collective')
    expect((await associations.getById(associationId)).name).toBe('Arts Collective')
    expect((await associations.getById(associationId)).avatarUrl).toBe(associationAvatar)
    expect((await posts.getById(associationPost.id)).authorName).toBe('Arts Collective')
    expect((await comments.getAll({ postId: associationPost.id }))[0].authorName).toBe('Arts Collective')
    expect((await events.getById(associationEvent.id)).organizer).toBe('Arts Collective')
    expect((await events.getAll({ ownerId: associationId }))[0].organizer).toBe('Arts Collective')
  })

  it('resolves updated profile photos for existing post and comment author references', async () => {
    const post = await posts.create({
      classId: 'class-ginf-2',
      content: 'Representative announcement',
    }, representativeId)
    await comments.add({
      postId: post.id,
      content: 'A comment from the same representative.',
    }, representativeId)
    const avatarUrl = 'data:image/jpeg;base64,updated-profile-photo'
    await profiles.update(representativeId, { avatarUrl }, representativeId)

    expect((await posts.getById(post.id)).authorAvatar).toBe(avatarUrl)
    expect((await posts.getAll({ authorId: representativeId }))
      .find(({ id }) => id === post.id).authorAvatar).toBe(avatarUrl)
    expect((await comments.getAll({ postId: post.id }))[0].authorAvatar).toBe(avatarUrl)
  })

  it('returns only public profile fields and rejects private reads and protected-field updates', async () => {
    const studentProfile = await profiles.getById('student-1')
    expect(studentProfile).toMatchObject({
      id: 'student-1',
      name: 'Sam Student',
      role: USER_ROLES.STUDENT,
      classGroup: { id: 'class-ginf-2', name: 'GINF 2 — Génie Informatique' },
    })
    expect(studentProfile).not.toHaveProperty('email')
    expect(studentProfile).not.toHaveProperty('phone')
    expect(studentProfile.classGroup).not.toHaveProperty('studentIds')

    const associationProfile = await profiles.getById(associationId)
    expect(associationProfile.association).toMatchObject({
      id: associationId,
      name: 'Bureau des Arts',
      institution: 'ENSA Marrakech',
    })
    expect(associationProfile).not.toHaveProperty('email')
    expect(associationProfile).not.toHaveProperty('phone')
    expect(await profiles.getById('missing-user')).toBeNull()
    await expectServiceError(profiles.getOwnProfile('student-2', 'student-1'), 'FORBIDDEN')

    for (const [field, value] of [
      ['role', USER_ROLES.DIRECTOR],
      ['classId', 'class-ginf-3'],
      ['isRepresentative', true],
      ['representativeStatus', 'ACTIVE'],
      ['designation', 'REPRESENTATIVE'],
      ['associationId', 'association-2'],
      ['email', 'private@example.test'],
    ]) {
      await expectServiceError(
        profiles.update('student-1', { [field]: value }, 'student-1'),
        'VALIDATION_ERROR',
      )
    }
  })

  it('creates, updates, and protects association records without status-toggle actions', async () => {
    const created = await associations.create({
      name: 'Robotics Club',
      description: 'Student robotics projects',
      institution: 'ENSA Marrakech',
    }, directorId)
    expect((await associations.getById(created.id)).name).toBe('Robotics Club')
    expect((await associations.update(created.id, { description: 'Updated club description' }, directorId)).description)
      .toBe('Updated club description')
    expect(associations.setActive).toBeUndefined()
    await expectServiceError(associations.update(created.id, { isActive: false }, directorId), 'VALIDATION_ERROR')
    expect((await associations.deleteAssociation(created.id, directorId)).id).toBe(created.id)
    await expectServiceError(associations.update('missing-association', { name: 'Nope' }, directorId), 'NOT_FOUND')
    await expectServiceError(associations.deleteAssociation(associationId, directorId), 'CONFLICT')
    await expectServiceError(associations.create({ name: '' }, directorId), 'VALIDATION_ERROR')

    const managedAssociation = await associations.create({ name: 'Robotics Club' }, directorId)
    const account = await transact((database, createId) => {
      const user = {
        id: createId('users'),
        name: 'Robotics Club',
        email: 'robotics@studentplatform.ma',
        role: USER_ROLES.ASSOCIATION,
        associationId: managedAssociation.id,
        isActive: true,
      }
      database.users.push(user)
      database.associations.find((item) => item.id === managedAssociation.id).accountUserId = user.id
      return user
    })
    expect((await associations.getById(managedAssociation.id)).accountUserId).toBe(account.id)
    await expectServiceError(associations.deleteAssociation(managedAssociation.id, directorId), 'CONFLICT')

    await transact((database) => {
      database.associations.find((item) => item.id === associationId).isActive = false
    })
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
    expect(posts.setModerationStatus).toBeUndefined()

    const secondAssociationPost = await posts.create({ content: 'Green campus workshop' }, 'association-2')
    await expectServiceError(
      posts.update(secondAssociationPost.id, { content: 'Unauthorized edit' }, associationId),
      'FORBIDDEN',
    )
    await expectServiceError(
      posts.update(associationPost.id, { content: 'Unauthorized edit' }, 'association-2'),
      'FORBIDDEN',
    )
    await expectServiceError(posts.deletePost(associationPost.id, 'association-2'), 'FORBIDDEN')
    await expectServiceError(posts.deletePost(secondAssociationPost.id, associationId), 'FORBIDDEN')
    await expectServiceError(events.update('event-2', { title: 'Unauthorized event edit' }, associationId), 'FORBIDDEN')
    const associationOneEvent = await events.create({
      title: 'Cross-association permission check',
      description: 'Only its owning Association may manage it.',
      date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      location: 'Studio A',
    }, associationId)
    await expectServiceError(
      events.update(associationOneEvent.id, { title: 'Unauthorized' }, 'association-2'),
      'FORBIDDEN',
    )
    await expectServiceError(events.deleteEvent(associationOneEvent.id, 'association-2'), 'FORBIDDEN')
    await expectServiceError(events.getRegistrations('event-2', associationId), 'FORBIDDEN')
    await expectServiceError(events.getRegistrations('event-1', 'association-2'), 'FORBIDDEN')

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

  it('allows cross-Association comments but retains cross-Association content ownership', async () => {
    const artsPost = await posts.create({ content: 'Arts post isolation check.' }, 'association-1')
    const technologyPost = await posts.create({ content: 'Technology post isolation check.' }, 'association-2')
    const artsComment = await comments.add({
      postId: artsPost.id,
      content: 'Arts reply.',
    }, 'association-1')
    const technologyComment = await comments.add({
      postId: technologyPost.id,
      content: 'Technology reply.',
    }, 'association-2')

    expect(await comments.add({
      postId: artsPost.id,
      content: 'Cross-Association reply.',
    }, 'association-2')).toMatchObject({
      postId: artsPost.id,
      authorId: 'association-2',
      authorName: 'Club Innovation & Technologies',
    })
    expect(await comments.add({
      postId: technologyPost.id,
      content: 'Cross-Association reply.',
    }, 'association-1')).toMatchObject({
      postId: technologyPost.id,
      authorId: 'association-1',
      authorName: 'Bureau des Arts',
    })
    await expectServiceError(
      posts.update(artsPost.id, { content: 'Unauthorized content edit' }, 'association-2'),
      'FORBIDDEN',
    )
    await expectServiceError(
      posts.deletePost(technologyPost.id, 'association-1'),
      'FORBIDDEN',
    )
    await expectServiceError(comments.deleteComment(artsComment.id, 'association-2'), 'FORBIDDEN')
    await expectServiceError(comments.deleteComment(technologyComment.id, 'association-1'), 'FORBIDDEN')
  })

  it('lets students and Associations comment on any class issue while retaining validation', async () => {
    const comment = await comments.add({
      issueId: 'issue-1',
      content: 'The room is still too warm.',
    }, 'student-1')
    expect(comment).toMatchObject({
      issueId: 'issue-1',
      authorId: 'student-1',
      authorName: 'Sam Student',
      authorAvatar: expect.any(String),
      content: 'The room is still too warm.',
    })
    expect(comment).not.toHaveProperty('postId')
    expect(await comments.getAll({ issueId: 'issue-1' })).toContainEqual(comment)

    const associationComment = await comments.add({
      issueId: 'issue-1',
      content: 'The Association is following up.',
    }, associationId)
    expect(associationComment).toMatchObject({
      issueId: 'issue-1',
      authorId: associationId,
      authorName: 'Bureau des Arts',
      authorAvatar: expect.any(String),
    })
    expect(await comments.getAll({ issueId: 'issue-1' })).toContainEqual(associationComment)

    await expectServiceError(
      comments.add({ issueId: 'missing-issue', content: 'Hello' }, 'student-1'),
      'NOT_FOUND',
    )
    await expectServiceError(
      comments.add({ issueId: 'issue-1', content: '' }, 'student-1'),
      'VALIDATION_ERROR',
    )
    await expectServiceError(
      comments.add({ issueId: 'issue-1', content: '   ' }, 'student-1'),
      'VALIDATION_ERROR',
    )
    await transact((database) => {
      const issueClass = database.classes.find((studentClass) => studentClass.id === 'class-ginf-2')
      issueClass.studentIds = issueClass.studentIds.filter((studentId) => studentId !== 'student-2')
      database.classes.push({
        id: 'class-other',
        name: 'Other Class',
        institution: 'ENSA Marrakech',
        studentIds: ['student-2'],
        representativeId: null,
        activeRepresentativeIds: [],
      })
      database.users.find((user) => user.id === 'student-2').classId = 'class-other'
    })
    const crossClassComment = await comments.add({
      issueId: 'issue-1',
      content: 'I belong to another class.',
    }, 'student-2')
    expect(crossClassComment).toMatchObject({
      authorId: 'student-2',
      issueId: 'issue-1',
      authorName: 'Hamza Tya',
    })
    await expectServiceError(
      comments.add({ postId: 'post-1', issueId: 'issue-1', content: 'Ambiguous' }, 'student-1'),
      'VALIDATION_ERROR',
    )
  })

  it('allows issue-comment authors and the Director to delete, but denies other users', async () => {
    const ownComment = await comments.add({
      issueId: 'issue-1',
      content: 'I submitted this report.',
    }, 'student-1')
    expect((await comments.deleteComment(ownComment.id, 'student-1')).id).toBe(ownComment.id)

    const anotherComment = await comments.add({
      issueId: 'issue-1',
      content: 'A separate observation.',
    }, 'student-1')
    await expectServiceError(comments.deleteComment(anotherComment.id, 'student-2'), 'FORBIDDEN')
    expect(await comments.getById(anotherComment.id)).toEqual(anotherComment)
    expect((await comments.deleteComment(anotherComment.id, directorId)).id).toBe(anotherComment.id)

    const associationComment = await comments.add({
      issueId: 'issue-1',
      content: 'Association-owned comment.',
    }, associationId)
    await expectServiceError(comments.deleteComment(associationComment.id, 'association-2'), 'FORBIDDEN')
    expect((await comments.deleteComment(associationComment.id, associationId)).id).toBe(associationComment.id)
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
    expect((await events.getById('event-1')).participantCount).toBe(2)
    await expectServiceError(events.register('event-1', 'student-1'), 'CONFLICT')
    await expectServiceError(events.register('event-1', 'student-3', { phone: '555' }), 'VALIDATION_ERROR')
    const representativeRegistration = await events.register('event-1', representativeId, {
      phone: '+212 6 55 44 33 22',
    })
    expect(representativeRegistration.userId).toBe(representativeId)
    await events.cancelRegistration('event-1', representativeId)
    expect((await events.cancelRegistration('event-1', 'student-1')).id).toBe(registration.id)
    expect((await events.getById('event-1')).participantCount).toBe(1)
    expect(await events.cancelRegistration('event-1', 'student-1')).toBeNull()
    expect(await events.getMyRegistrations('student-1')).toEqual(
      expect.arrayContaining([expect.objectContaining({ eventId: 'event-2', userId: 'student-1' })]),
    )
    await expectServiceError(events.getMyRegistrations(associationId), 'FORBIDDEN')
    await expectServiceError(events.register('event-1', associationId, { phone: '+212 6 55 44 33 22' }), 'FORBIDDEN')
    await expectServiceError(events.register('event-1', directorId, { phone: '+212 6 55 44 33 22' }), 'FORBIDDEN')
    await expectServiceError(events.cancelRegistration('event-1', directorId), 'FORBIDDEN')
    await expectServiceError(events.getRegistrations('event-1', 'student-1'), 'FORBIDDEN')
    const associationEvent = await events.create({
      title: 'Innovation forum',
      description: 'A forum for innovation projects.',
      date: '2026-12-11T18:00:00',
      location: 'Innovation Lab',
    }, 'association-2')
    await events.register(associationEvent.id, 'student-1', { phone: '+212 600 000 000' })
    const associationDeleted = await events.deleteEvent(associationEvent.id, 'association-2')
    const associationSnapshot = await getMockDatabaseSnapshot()
    expect(associationDeleted.title).toBe(associationEvent.title)
    expect(associationSnapshot.events.some((item) => item.id === associationEvent.id)).toBe(false)
    expect(associationSnapshot.registrations.some((item) => item.eventId === associationEvent.id)).toBe(false)
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

  it('creates exactly one private notification per account for each required creation action', async () => {
    const allUsers = await users.getAll()
    const notificationsBefore = (await getMockDatabaseSnapshot()).notifications
    await expectServiceError(posts.create({ content: '   ' }, associationId), 'VALIDATION_ERROR')
    await expectServiceError(posts.create({ content: 'Student post attempt' }, 'student-1'), 'FORBIDDEN')
    await expectServiceError(events.create({
      title: 'Invalid event',
      description: 'Missing a valid date.',
      date: 'invalid',
      location: 'Hall',
    }, associationId), 'VALIDATION_ERROR')
    await expectServiceError(issues.create({
      classId: 'class-ginf-2',
      title: 'Association issue attempt',
      description: 'Associations cannot create issues.',
    }, associationId), 'FORBIDDEN')
    expect((await getMockDatabaseSnapshot()).notifications).toEqual(notificationsBefore)

    const associationPost = await posts.create({ content: 'Association created post.' }, associationId)
    const directorPost = await posts.create({ content: 'Director announcement.' }, directorId)
    const representativePost = await posts.create({ content: 'Representative update.' }, representativeId)
    const event = await events.create({
      title: 'Association-created event',
      description: 'A community gathering.',
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
      location: 'Main Hall',
    }, associationId)
    const issue = await issues.create({
      classId: 'class-ginf-2',
      title: 'Representative-created issue',
      description: 'The classroom projector needs repair.',
    }, representativeId)

    const snapshot = await getMockDatabaseSnapshot()
    const expected = [
      [associationPost, 'POST_CREATED', 'POST', associationId, 'Association'],
      [directorPost, 'POST_CREATED', 'POST', directorId, 'Director'],
      [representativePost, 'POST_CREATED', 'POST', representativeId, 'Class Representative'],
      [event, 'EVENT_CREATED', 'EVENT', associationId, 'Association'],
      [issue, 'CLASS_ISSUE_CREATED', 'CLASS_ISSUE', representativeId, 'Class Representative'],
    ]
    for (const [item, type, itemType, creatorId, creatorRole] of expected) {
      const records = snapshot.notifications.filter((notification) => (
        notification.type === type && notification.itemId === item.id
      ))
      expect(records).toHaveLength(allUsers.length)
      expect(records.map((notification) => notification.recipientId).sort())
        .toEqual(allUsers.map((user) => user.id).sort())
      expect(records.every((notification) => (
        notification.itemType === itemType &&
        notification.creatorId === creatorId &&
        notification.creatorRole === creatorRole &&
        notification.itemTitle === (item.title || item.content.slice(0, 120)) &&
        notification.itemSummary &&
        notification.itemSnapshot.title === notification.itemTitle &&
        notification.href &&
        notification.createdAt === (item.publishedAt || item.createdAt || item.submittedAt) &&
        !Object.hasOwn(notification, 'email') &&
        !Object.hasOwn(notification, 'phone') &&
        notification.readAt === null
      ))).toBe(true)
    }
    expect(snapshot.notifications.filter((notification) => notification.itemId === event.id)
      .every((notification) => notification.context.associationName === 'Bureau des Arts')).toBe(true)
    expect(snapshot.notifications.filter((notification) => notification.itemId === issue.id)
      .every((notification) => notification.context.className === 'GINF 2 — Génie Informatique')).toBe(true)

    const originalNotificationCount = snapshot.notifications.length
    await transact((database, createId) => {
      expect(notifications.createCreationNotifications(database, createId, {
        itemType: 'POST',
        item: associationPost,
        actor: { id: associationId, name: 'Bureau des Arts', role: 'ASSOCIATION' },
        itemTitle: associationPost.content,
        itemSummary: associationPost.content,
      })).toEqual([])
    })
    expect((await getMockDatabaseSnapshot()).notifications).toHaveLength(originalNotificationCount)

    const recipientRecord = (await notifications.getAllForUser('student-1'))
      .find((notification) => notification.type === 'POST_CREATED')
    await notifications.markAsRead(recipientRecord.id, 'student-1')
    const refreshedRecipientRecords = await notifications.getAllForUser('student-1')
    expect(refreshedRecipientRecords.find((notification) => notification.id === recipientRecord.id).readAt).toBeTruthy()
    expect((await notifications.getAllForUser('association-2'))
      .find((notification) => notification.id === recipientRecord.id)).toBeUndefined()
    expect((await notifications.getAllForUser('association-2'))
      .filter((notification) => notification.type === 'POST_CREATED' && notification.itemId === associationPost.id)[0].readAt)
      .toBeNull()
  })

  it('notifies every account after successful Association event edits and deletions', async () => {
    const ownEvent = await events.create({
      title: 'Association notification test',
      description: 'Original description.',
      date: '2026-12-12T18:00:00',
      location: 'Studio A',
    }, associationId)
    await events.register(ownEvent.id, 'student-1', { phone: '+212 600 000 001' })
    const usersBefore = await users.getAll()

    await events.update(ownEvent.id, {
      title: 'Updated Association notification test',
      date: '2026-12-13T18:30:00',
      location: 'Studio B',
      description: 'Updated description.',
    }, associationId)
    const snapshotAfterUpdate = await getMockDatabaseSnapshot()
    const updateNotifications = snapshotAfterUpdate.notifications.filter((item) => (
      item.itemId === ownEvent.id && item.type === 'EVENT_UPDATED'
    ))
    expect(updateNotifications).toHaveLength(usersBefore.length)
    expect(updateNotifications.map((item) => item.recipientId).sort())
      .toEqual(usersBefore.map((item) => item.id).sort())
    expect(updateNotifications.every((item) => (
      item.associationName === 'Bureau des Arts' &&
      item.itemTitle === 'Updated Association notification test' &&
      item.eventSnapshot.title === 'Updated Association notification test' &&
      item.message.includes('updated') &&
      item.message.includes('Bureau des Arts') &&
      item.message.includes('Studio B') &&
      !item.message.toLowerCase().includes('deleted') &&
      !item.readAt
    ))).toBe(true)

    await events.deleteEvent(ownEvent.id, associationId)
    const snapshotAfterDelete = await getMockDatabaseSnapshot()
    expect(snapshotAfterDelete.events.some((item) => item.id === ownEvent.id)).toBe(false)
    expect(snapshotAfterDelete.registrations.some((item) => item.eventId === ownEvent.id)).toBe(false)
    const deleteNotifications = snapshotAfterDelete.notifications.filter((item) => (
      item.itemId === ownEvent.id && item.type === 'EVENT_DELETED'
    ))
    expect(deleteNotifications).toHaveLength(usersBefore.length)
    expect(deleteNotifications.every((item) => (
      item.associationName === 'Bureau des Arts' &&
      item.itemTitle === 'Updated Association notification test' &&
      item.eventSnapshot.title === 'Updated Association notification test' &&
      item.message.includes('deleted') &&
      item.message.includes('Bureau des Arts')
    ))).toBe(true)

    await expectServiceError(events.update(ownEvent.id, { title: 'No notification' }, associationId), 'NOT_FOUND')
    expect((await getMockDatabaseSnapshot()).notifications.filter((item) => (
      item.itemId === ownEvent.id
    ))).toHaveLength(usersBefore.length * 3)
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
    const issueComment = await comments.add({
      issueId: 'issue-1',
      content: 'Please keep us updated.',
    }, 'student-1')
    await expectServiceError(events.deleteEvent('event-2', associationId), 'FORBIDDEN')
    await expectServiceError(events.deleteEvent('missing-event', directorId), 'NOT_FOUND')
    await expectServiceError(issues.deleteIssue('issue-1', 'student-1'), 'FORBIDDEN')
    expect((await getMockDatabaseSnapshot()).notifications).toEqual([])
    expect(await comments.getById(issueComment.id)).toEqual(issueComment)

    const deletedIssue = await issues.deleteIssue('issue-1', directorId)
    const snapshot = await getMockDatabaseSnapshot()
    const issueNotifications = snapshot.notifications.filter((notification) => notification.itemId === deletedIssue.id)

    expect(snapshot.issues.some((issue) => issue.id === deletedIssue.id)).toBe(false)
    expect(snapshot.comments.some((comment) => comment.issueId === deletedIssue.id)).toBe(false)
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
    const associationNotifications = await notifications.getAllForUser('association-1')
    const otherAssociationNotifications = await notifications.getAllForUser('association-2')
    expect(studentNotifications).toHaveLength(2)
    expect(otherStudentNotifications).toHaveLength(2)
    expect(studentNotifications.every(({ recipientId }) => recipientId === 'student-1')).toBe(true)
    expect(otherStudentNotifications.every(({ recipientId }) => recipientId === 'student-2')).toBe(true)
    expect(associationNotifications).toHaveLength(2)
    expect(otherAssociationNotifications).toHaveLength(2)
    expect(associationNotifications.every(({ recipientId }) => recipientId === 'association-1')).toBe(true)
    expect(otherAssociationNotifications.every(({ recipientId }) => recipientId === 'association-2')).toBe(true)
    await expectServiceError(
      notifications.markAsRead(otherStudentNotifications[0].id, 'student-1'),
      'FORBIDDEN',
    )
    await expectServiceError(
      notifications.markAsRead(otherAssociationNotifications[0].id, 'association-1'),
      'FORBIDDEN',
    )

    const marked = await notifications.markAsRead(studentNotifications[0].id, 'student-1')
    expect(marked.readAt).toBeTruthy()
    expect((await notifications.getAllForUser('student-1'))[0].readAt).toBe(marked.readAt)
    const markedAll = await notifications.markAllAsRead('student-1')
    expect(markedAll.every((notification) => notification.readAt)).toBe(true)
    expect((await notifications.getAllForUser('student-2'))[0].readAt).toBeNull()
    const associationMarkedAll = await notifications.markAllAsRead('association-1')
    expect(associationMarkedAll.every((notification) => notification.readAt)).toBe(true)
    expect((await notifications.getAllForUser('association-2'))[0].readAt).toBeNull()
  })

  it('allows only an active assigned representative to create an issue', async () => {
    await expectServiceError(issues.create({
      classId: 'class-ginf-2',
      title: 'Broken board',
      description: 'The classroom whiteboard is damaged.',
    }, 'student-1'), 'FORBIDDEN')
    await expectServiceError(issues.create({
      classId: 'class-ginf-2',
      title: 'Association issue attempt',
      description: 'Association accounts cannot submit Class Issues.',
    }, associationId), 'FORBIDDEN')
    const issue = await issues.create({
      classId: 'class-ginf-2',
      title: 'Broken board',
      description: 'The classroom whiteboard is damaged.',
    }, representativeId)
    expect(issue).toMatchObject({
      submittedById: representativeId,
      status: ISSUE_STATUS.PENDING,
    })

    await transact((database) => {
      const originalClass = database.classes.find((studentClass) => studentClass.id === 'class-ginf-2')
      originalClass.studentIds = originalClass.studentIds.filter((studentId) => studentId !== 'student-2')
      database.classes.push({
        id: 'class-ginf-3',
        name: 'GINF 3',
        institution: 'ENSA Marrakech',
        studentIds: ['student-2'],
        representativeId: null,
        activeRepresentativeIds: [],
      })
      database.users.find((user) => user.id === 'student-2').classId = 'class-ginf-3'
    })
    await expectServiceError(issues.create({
      classId: 'class-ginf-3',
      title: 'Cross-class issue',
      description: 'The current representative must not create this issue.',
    }, representativeId), 'FORBIDDEN')

    await expectServiceError(issues.getById('missing-issue').then((item) => {
      if (!item) throw new MockDataError('NOT_FOUND', 'Issue not found')
    }), 'NOT_FOUND')
  })

  it('records and preserves VIEWED metadata while restricting status changes to Directors', async () => {
    vi.useFakeTimers()
    try {
      vi.setSystemTime(new Date('2026-11-25T12:00:00.000Z'))
      const viewed = await issues.updateStatus('issue-1', ISSUE_STATUS.VIEWED, directorId)
      const firstViewedAt = viewed.viewedAt
      const firstViewedById = viewed.viewedById
      expect(viewed).toMatchObject({
        status: ISSUE_STATUS.VIEWED,
        viewedAt: '2026-11-25T12:00:00.000Z',
        viewedById: directorId,
        statusUpdatedAt: '2026-11-25T12:00:00.000Z',
      })
      expect(Number.isNaN(new Date(viewed.viewedAt).getTime())).toBe(false)

      vi.setSystemTime(new Date('2026-11-25T12:01:00.000Z'))
      const inProgress = await issues.updateStatus('issue-1', ISSUE_STATUS.IN_PROGRESS, directorId)
      expect(inProgress).toMatchObject({
        status: ISSUE_STATUS.IN_PROGRESS,
        viewedAt: firstViewedAt,
        viewedById: firstViewedById,
        statusUpdatedAt: '2026-11-25T12:01:00.000Z',
      })

      vi.setSystemTime(new Date('2026-11-25T12:02:00.000Z'))
      const viewedAgain = await issues.updateStatus('issue-1', ISSUE_STATUS.VIEWED, directorId)
      expect(viewedAgain).toMatchObject({
        status: ISSUE_STATUS.VIEWED,
        viewedAt: firstViewedAt,
        viewedById: firstViewedById,
        statusUpdatedAt: '2026-11-25T12:02:00.000Z',
      })

      await expectServiceError(
        issues.updateStatus('issue-1', ISSUE_STATUS.PENDING, 'student-1'),
        'FORBIDDEN',
      )
      await expectServiceError(
        issues.updateStatus('issue-1', ISSUE_STATUS.PENDING, associationId),
        'FORBIDDEN',
      )
      await expectServiceError(
        issues.updateStatus('issue-1', 'CLOSED', directorId),
        'VALIDATION_ERROR',
      )

      vi.setSystemTime(new Date('2026-11-25T12:03:00.000Z'))
      const resolved = await director.updateClassIssueStatus('issue-1', ISSUE_STATUS.RESOLVED, directorId)
      expect(resolved).toMatchObject({
        resolvedById: directorId,
        viewedAt: firstViewedAt,
        viewedById: firstViewedById,
        statusUpdatedAt: '2026-11-25T12:03:00.000Z',
      })
    } finally {
      vi.useRealTimers()
    }
  })

  it('enforces a strict maximum of 3 active representatives per class, prevents duplicates, and frees slots on deactivation', async () => {
    const assigned = await director.assignRepresentative('student-2', 'class-ginf-2', directorId)
    expect(assigned).toMatchObject({
      role: USER_ROLES.STUDENT,
      isRepresentative: true,
      representativeStatus: 'ACTIVE',
    })
    expect((await getMockDatabaseSnapshot()).classes[0].activeRepresentativeIds).toContain('student-2')
    await expectServiceError(director.assignRepresentative('student-2', 'class-ginf-2', directorId), 'CONFLICT')

    await director.assignRepresentative('student-3', 'class-ginf-2', directorId)
    expect((await getMockDatabaseSnapshot()).classes[0].activeRepresentativeIds).toHaveLength(3)

    await expectServiceError(director.assignRepresentative('student-4', 'class-ginf-2', directorId), 'CONFLICT')

    await director.deactivateRepresentative('student-2', directorId)
    expect((await users.getById('student-2')).representativeStatus).toBe('INACTIVE')
    expect((await getMockDatabaseSnapshot()).classes[0].activeRepresentativeIds).toHaveLength(2)
    await expectServiceError(issues.create({
      classId: 'class-ginf-2',
      title: 'Issue after deactivation',
      description: 'This should not be accepted.',
    }, 'student-2'), 'FORBIDDEN')

    const replacement = await director.assignRepresentative('student-4', 'class-ginf-2', directorId)
    expect(replacement).toMatchObject({ isRepresentative: true, representativeStatus: 'ACTIVE' })
    expect((await getMockDatabaseSnapshot()).classes[0].activeRepresentativeIds).toHaveLength(3)

    await expectServiceError(director.assignRepresentative('director-1', 'class-ginf-2', directorId), 'VALIDATION_ERROR')
    await expectServiceError(director.assignRepresentative('missing-user', 'class-ginf-2', directorId), 'NOT_FOUND')
    await expectServiceError(director.assignRepresentative('student-1', 'missing-class', directorId), 'NOT_FOUND')
    await expectServiceError(director.assignRepresentative('student-1', 'class-ginf-2', 'student-1'), 'FORBIDDEN')
  })

  it('still rejects actions by inactive user accounts', async () => {
    await transact((database) => {
      database.users.find((user) => user.id === 'student-1').isActive = false
    })
    expect((await users.getById('student-1')).isActive).toBe(false)
    await expectServiceError(reactions.togglePostReaction('post-1', 'student-1', 'LIKE'), 'FORBIDDEN')
  })

  it('provides director-only management summaries and operations without removed user-status or moderation actions', async () => {
    const summary = await director.getOverview(directorId)
    expect(summary).toMatchObject({
      studentCount: 7,
      associationCount: 2,
      postCount: 4,
      eventCount: 2,
    })
    expect((await director.getUsers(directorId)).every((user) => user.role !== USER_ROLES.DIRECTOR)).toBe(true)
    expect((await director.getStudents(directorId)).every((user) => user.role === USER_ROLES.STUDENT)).toBe(true)
    expect((await director.getAssociations(directorId)).length).toBe(2)
    expect((await director.getClasses(directorId)).length).toBe(1)
    expect((await director.getClassIssues(directorId)).length).toBe(3)
    expect(director.createStudent).toBeUndefined()
    expect(director.updateStudent).toBeUndefined()
    expect(director.setStudentActive).toBeUndefined()
    expect(director.setAssociationActive).toBeUndefined()
    expect(director.moderatePost).toBeUndefined()
    expect(director.getModerationPosts).toBeUndefined()

    for (const actorId of ['student-1', associationId]) {
      await expectServiceError(director.getOverview(actorId), 'FORBIDDEN')
      await expectServiceError(director.getUsers(actorId), 'FORBIDDEN')
      await expectServiceError(director.deleteUser('student-1', actorId), 'FORBIDDEN')
      await expectServiceError(director.getStudents(actorId), 'FORBIDDEN')
      await expectServiceError(director.getRepresentatives(actorId), 'FORBIDDEN')
      await expectServiceError(director.getClasses(actorId), 'FORBIDDEN')
      await expectServiceError(director.assignRepresentative('student-2', 'class-ginf-2', actorId), 'FORBIDDEN')
      await expectServiceError(director.deactivateRepresentative('representative-1', actorId), 'FORBIDDEN')
      await expectServiceError(director.getAssociations(actorId), 'FORBIDDEN')
      await expectServiceError(director.createAssociation({ name: 'Unauthorized association' }, actorId), 'FORBIDDEN')
      await expectServiceError(director.updateAssociation('association-1', { name: 'Unauthorized' }, actorId), 'FORBIDDEN')
      await expectServiceError(director.deleteAssociation('association-1', actorId), 'FORBIDDEN')
      await expectServiceError(director.getClassIssues(actorId), 'FORBIDDEN')
      await expectServiceError(
        director.updateClassIssueStatus('issue-1', ISSUE_STATUS.RESOLVED, actorId),
        'FORBIDDEN',
      )
    }
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
