import { beforeEach, describe, expect, it } from 'vitest'
import { ISSUE_STATUS, REACTION_TYPES, seedData } from './seedData.js'
import {
  getCollection,
  getMockDatabaseSnapshot,
  MOCK_STORAGE_KEY,
  resetMockDatabase,
  transact,
} from './mockDatabase.js'
import { users } from './data/users.js'
import { classes } from './data/classes.js'
import { associations } from './data/associations.js'
import { posts } from './data/posts.js'
import { comments } from './data/comments.js'
import { reactions } from './data/reactions.js'
import { events } from './data/events.js'
import { registrations } from './data/registrations.js'
import { issues } from './data/issues.js'

beforeEach(() => {
  localStorage.clear()
})

describe('mock database', () => {
  it('provides one internally consistent seed dataset through legacy imports', async () => {
    const snapshot = await getMockDatabaseSnapshot()
    const collections = {
      users,
      classes,
      associations,
      posts,
      comments,
      reactions,
      events,
      registrations,
      issues,
    }
    expect(snapshot.notifications).toEqual([])

    for (const [name, records] of Object.entries(collections)) {
      expect(snapshot[name]).toEqual(records)
      expect(records.length).toBeGreaterThan(0)
      expect(new Set(records.map(({ id }) => id)).size).toBe(records.length)
    }

    const userIds = new Set(snapshot.users.map(({ id }) => id))
    const classIds = new Set(snapshot.classes.map(({ id }) => id))
    const associationIds = new Set(snapshot.associations.map(({ id }) => id))
    const postIds = new Set(snapshot.posts.map(({ id }) => id))
    const eventIds = new Set(snapshot.events.map(({ id }) => id))

    for (const studentClass of snapshot.classes) {
      expect(studentClass.studentIds.every((id) => userIds.has(id))).toBe(true)
      expect(studentClass.activeRepresentativeIds.every((id) => {
        const representative = snapshot.users.find((user) => user.id === id)
        return representative?.role === 'STUDENT' &&
          representative.representativeStatus === 'ACTIVE' &&
          representative.classId === studentClass.id
      })).toBe(true)
      expect(studentClass.representativeId).toBe(studentClass.activeRepresentativeIds[0])
    }
    expect(snapshot.users.find((user) => user.id === 'representative-1')).toMatchObject({
      role: 'STUDENT',
      isRepresentative: true,
      representativeStatus: 'ACTIVE',
      classId: 'class-ginf-2',
    })
    expect(snapshot.users.filter((user) => user.role === 'ASSOCIATION')).toHaveLength(2)
    expect(snapshot.associations.find((association) => association.id === 'association-1').accountUserId)
      .toBe('association-1')
    expect(snapshot.posts.every((post) => userIds.has(post.authorId))).toBe(true)
    expect(snapshot.posts.every((post) => !post.classId || classIds.has(post.classId))).toBe(true)
    expect(snapshot.posts.every((post) => !post.associationId || associationIds.has(post.associationId))).toBe(true)
    expect(snapshot.comments.every((comment) => (
      postIds.has(comment.postId) &&
      userIds.has(comment.authorId) &&
      snapshot.users.find((user) => user.id === comment.authorId).name === comment.authorName
    ))).toBe(true)
    expect(snapshot.reactions.every((reaction) => postIds.has(reaction.postId) && userIds.has(reaction.userId))).toBe(true)
    expect(new Set(snapshot.reactions.map(({ postId, userId }) => `${postId}:${userId}`)).size)
      .toBe(snapshot.reactions.length)
    expect(snapshot.events.every((event) => (
      event.ownerType === 'DIRECTOR'
        ? userIds.has(event.ownerId)
        : associationIds.has(event.ownerId)
    ))).toBe(true)
    expect(snapshot.events.every((event) => {
      const registrations = snapshot.registrations.filter(({ eventId }) => eventId === event.id)
      return event.participantCount === registrations.length &&
        event.participantAvatarIds.length === registrations.length &&
        event.participantAvatarIds.every((id) => (
          userIds.has(id) && registrations.some((registration) => registration.userId === id)
        ))
    })).toBe(true)
    expect(snapshot.registrations.every((registration) => (
      eventIds.has(registration.eventId) && userIds.has(registration.userId)
    ))).toBe(true)
    expect(snapshot.issues.every((issue) => (
      classIds.has(issue.classId) &&
      userIds.has(issue.submittedById) &&
      Object.values(ISSUE_STATUS).includes(issue.status)
    ))).toBe(true)
    const viewedIssue = snapshot.issues.find((issue) => issue.status === ISSUE_STATUS.VIEWED)
    expect(viewedIssue).toMatchObject({ viewedById: 'director-1' })
    expect(Number.isNaN(new Date(viewedIssue.viewedAt).getTime())).toBe(false)
    expect(Object.values(REACTION_TYPES)).toEqual(['LIKE', 'DISLIKE'])
  })

  it('returns defensive copies instead of mutable shared records', async () => {
    const record = (await getCollection('posts'))[0]
    record.content = 'local mutation'

    expect((await getCollection('posts'))[0].content).not.toBe('local mutation')
    expect(Object.isFrozen(seedData.posts[0])).toBe(true)
  })

  it('requires every comment to reference exactly one existing Post or Class Issue', async () => {
    await transact((database) => {
      database.comments.push({
        id: 'post-comment-integrity',
        postId: 'post-1',
        authorId: 'student-1',
      })
    })
    await transact((database) => {
      database.comments.push({
        id: 'issue-comment-integrity',
        issueId: 'issue-1',
        authorId: 'student-1',
      })
    })
    const validComments = await getCollection('comments')

    await expect(transact((database) => {
      database.comments.push({ id: 'orphan-comment', authorId: 'student-1' })
    })).rejects.toMatchObject({ code: 'INVALID_DATABASE' })
    await expect(transact((database) => {
      database.comments.push({
        id: 'missing-post-comment',
        postId: 'missing-post',
        authorId: 'student-1',
      })
    })).rejects.toMatchObject({ code: 'INVALID_DATABASE' })
    await expect(transact((database) => {
      database.comments.push({
        id: 'missing-issue-comment',
        issueId: 'missing-issue',
        authorId: 'student-1',
      })
    })).rejects.toMatchObject({ code: 'INVALID_DATABASE' })
    await expect(transact((database) => {
      database.comments.push({
        id: 'ambiguous-comment',
        postId: 'post-1',
        issueId: 'issue-1',
        authorId: 'student-1',
      })
    })).rejects.toMatchObject({ code: 'INVALID_DATABASE' })

    expect(await getCollection('comments')).toEqual(validComments)
  })

  it('persists mutations in localStorage and reset restores the exact seed', async () => {
    await getMockDatabaseSnapshot()
    const stored = JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY))
    expect(stored.version).toBe(3)
    stored.database.posts[0].content = 'Persisted edit'
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(stored))

    expect((await getCollection('posts'))[0].content).toBe('Persisted edit')

    const resetData = await resetMockDatabase()
    expect(resetData).toEqual(seedData)
    expect(await getMockDatabaseSnapshot()).toEqual(seedData)
  })

  it('migrates version 1 storage without losing existing records', async () => {
    const legacyDatabase = JSON.parse(JSON.stringify(seedData))
    delete legacyDatabase.notifications
    legacyDatabase.posts[0].content = 'Keep this legacy post'
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify({
      version: 1,
      database: legacyDatabase,
    }))

    const migrated = await getMockDatabaseSnapshot()

    expect(migrated.posts[0].content).toBe('Keep this legacy post')
    expect(migrated.notifications).toEqual([])
    expect(JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY)).version).toBe(3)
  })

  it('migrates version 2 storage while preserving user data and reconciling event participation', async () => {
    const legacyDatabase = JSON.parse(JSON.stringify(seedData))
    legacyDatabase.users[0].bio = 'Persisted profile detail'
    legacyDatabase.events[0].participantCount = 48
    legacyDatabase.events[0].participantAvatarIds = ['student-2', 'representative-1']
    legacyDatabase.events[1].participantCount = 32
    legacyDatabase.events[1].participantAvatarIds = ['representative-1', 'student-2', 'student-1']
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify({
      version: 2,
      database: legacyDatabase,
    }))

    const migrated = await getMockDatabaseSnapshot()

    expect(migrated.users[0].bio).toBe('Persisted profile detail')
    expect(migrated.events.map(({ participantCount, participantAvatarIds }) => ({
      participantCount,
      participantAvatarIds,
    }))).toEqual([
      { participantCount: 1, participantAvatarIds: ['student-2'] },
      { participantCount: 1, participantAvatarIds: ['student-1'] },
    ])
    expect(JSON.parse(localStorage.getItem(MOCK_STORAGE_KEY)).version).toBe(3)
  })

  it('rejects event participation counts or avatars that disagree with registrations', async () => {
    await expect(transact((database) => {
      database.events[0].participantCount += 1
    })).rejects.toMatchObject({ code: 'INVALID_DATABASE' })
    await expect(transact((database) => {
      database.events[0].participantAvatarIds = []
    })).rejects.toMatchObject({ code: 'INVALID_DATABASE' })

    expect((await getCollection('events')).find(({ id }) => id === 'event-1')).toMatchObject({
      participantCount: 1,
      participantAvatarIds: ['student-2'],
    })
  })

  it('reports corrupt persisted data and allows an explicit reset', async () => {
    localStorage.setItem(MOCK_STORAGE_KEY, '{not-json')

    await expect(getMockDatabaseSnapshot()).rejects.toMatchObject({
      name: 'MockDataError',
      code: 'CORRUPT_STORAGE',
    })
    await resetMockDatabase()
    expect(await getMockDatabaseSnapshot()).toEqual(seedData)
  })

  it('rejects unknown collections consistently', async () => {
    await expect(getCollection('not-a-collection')).rejects.toMatchObject({
      code: 'INVALID_COLLECTION',
    })
  })
})
