import { beforeEach, describe, expect, it } from 'vitest'
import { resetMockDatabase, transact } from '../../mocks/mockDatabase.js'
import * as commentsService from '../comments/comments.service.js'
import * as eventsService from '../events/events.service.js'
import * as issuesService from '../issues/issues.service.js'
import * as postsService from '../posts/posts.service.js'
import * as reactionsService from '../reactions/reactions.service.js'
import * as usersService from '../users/users.service.js'
import { ACTIVITY_CATEGORIES, getMyActivity } from './activity.service.js'

beforeEach(async () => {
  localStorage.clear()
  await resetMockDatabase()
})

const categoryIds = (result) => result.categories.map(({ id }) => id)

describe('My Activity service', () => {
  it('aggregates only the authenticated student’s comments, reactions, and registrations', async () => {
    const ownComment = await commentsService.add({
      postId: 'post-1',
      content: 'My student comment.',
    }, 'student-2')
    await commentsService.add({
      postId: 'post-1',
      content: 'Another student’s comment.',
    }, 'student-3')
    const result = await getMyActivity('student-2')

    expect(categoryIds(result)).toEqual([
      ACTIVITY_CATEGORIES.COMMENTS,
      ACTIVITY_CATEGORIES.REACTIONS,
      ACTIVITY_CATEGORIES.EVENTS,
    ])
    expect(result.activities.map(({ id }) => id)).toEqual(expect.arrayContaining([
      `comment:${ownComment.id}`,
      'reaction:reaction-1',
      'registration:registration-1',
    ]))
    expect(result.activities.map(({ id }) => id)).not.toContain('comment:comment-mock-2')
    expect(result.activities.every((activity) => (
      !['POSTS', 'CLASS_ISSUES'].includes(activity.category)
    ))).toBe(true)
    expect(result.activities[0]).toMatchObject({
      kind: 'comment',
      relatedType: 'post',
      href: '/posts/post-1',
    })
    expect(result.activities[0]).not.toHaveProperty('email')
    expect(result.activities[0]).not.toHaveProperty('phone')
  })

  it('includes the active Representative’s posts and assigned-class issues, not another student’s', async () => {
    const representative = await getMyActivity('representative-1')
    const student = await getMyActivity('student-1')

    expect(categoryIds(representative)).toEqual([
      ACTIVITY_CATEGORIES.POSTS,
      ACTIVITY_CATEGORIES.COMMENTS,
      ACTIVITY_CATEGORIES.REACTIONS,
      ACTIVITY_CATEGORIES.EVENTS,
      ACTIVITY_CATEGORIES.CLASS_ISSUES,
    ])
    expect(representative.activities.map(({ id }) => id)).toEqual(expect.arrayContaining([
      'post:post-1',
      'issue:issue-1',
      'issue:issue-2',
      'issue:issue-3',
    ]))
    expect(categoryIds(student)).not.toContain(ACTIVITY_CATEGORIES.CLASS_ISSUES)
    expect(student.activities.map(({ id }) => id)).not.toContain('post:post-1')
    expect(student.activities.map(({ id }) => id)).not.toContain('issue:issue-1')
    expect(student.activities.map(({ id }) => id)).toContain('registration:registration-2')

    await usersService.deactivateRepresentative('representative-1', 'director-1')
    const inactiveRepresentative = await getMyActivity('representative-1')
    expect(categoryIds(inactiveRepresentative)).not.toContain(ACTIVITY_CATEGORIES.CLASS_ISSUES)
    expect(inactiveRepresentative.activities.map(({ id }) => id))
      .not.toContain('issue:issue-1')
  })

  it('includes only Association events explicitly created by the authenticated account', async () => {
    const associationEvent = await eventsService.create({
      title: 'Arts workshop',
      description: 'An event for the arts community.',
      date: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      location: 'Studio A',
    }, 'association-1')
    const artsAssociation = await getMyActivity('association-1')
    const technologyAssociation = await getMyActivity('association-2')

    expect(categoryIds(artsAssociation)).toEqual([
      ACTIVITY_CATEGORIES.POSTS,
      ACTIVITY_CATEGORIES.COMMENTS,
      ACTIVITY_CATEGORIES.REACTIONS,
      ACTIVITY_CATEGORIES.EVENTS,
    ])
    expect(artsAssociation.activities.map(({ id }) => id)).toContain('post:post-2')
    expect(artsAssociation.activities.map(({ id }) => id)).toContain(`event:${associationEvent.id}`)
    expect(artsAssociation.activities.map(({ id }) => id)).not.toContain('event:event-2')
    expect(technologyAssociation.activities.map(({ id }) => id)).not.toContain('event:event-2')
    expect(technologyAssociation.activities.map(({ id }) => id)).not.toContain('post:post-2')
  })

  it('includes Director-authored activity but no event registrations or created issues', async () => {
    await commentsService.add({
      issueId: 'issue-1',
      content: 'Director comment.',
    }, 'director-1')
    await reactionsService.togglePostReaction('post-1', 'director-1', 'LIKE')
    const result = await getMyActivity('director-1')

    expect(categoryIds(result)).toEqual([
      ACTIVITY_CATEGORIES.POSTS,
      ACTIVITY_CATEGORIES.COMMENTS,
      ACTIVITY_CATEGORIES.REACTIONS,
    ])
    expect(result.activities.map(({ id }) => id)).toEqual(expect.arrayContaining([
      'post:post-3',
      'comment:comment-mock-1',
      'reaction:reaction-mock-1',
    ]))
    expect(result.activities.some(({ kind }) => ['registration', 'issue', 'event'].includes(kind)))
      .toBe(false)
  })

  it('removes stale activity when related Posts, Issues, or Events are deleted', async () => {
    await commentsService.add({ postId: 'post-1', content: 'Post comment.' }, 'representative-1')
    await commentsService.add({ issueId: 'issue-1', content: 'Issue comment.' }, 'representative-1')
    await reactionsService.togglePostReaction('post-1', 'representative-1', 'DISLIKE')

    await postsService.deletePost('post-1', 'representative-1')
    await issuesService.deleteIssue('issue-1', 'director-1')
    await eventsService.deleteEvent('event-2', 'director-1')

    const representative = await getMyActivity('representative-1')
    const student = await getMyActivity('student-1')

    expect(representative.activities.map(({ id }) => id)).not.toEqual(expect.arrayContaining([
      'post:post-1',
      'issue:issue-1',
      'reaction:reaction-mock-1',
    ]))
    expect(representative.activities.some((activity) => (
      activity.kind === 'comment' && activity.relatedTitle === 'Post unavailable'
    ))).toBe(false)
    expect(student.activities.map(({ id }) => id)).not.toContain('registration:registration-2')
  })

  it('returns role categories with no activity and rejects missing or inactive accounts', async () => {
    const emptyStudent = await transact((database, createId) => {
      const user = {
        id: createId('users'),
        name: 'No Activity',
        email: 'no-activity@studentplatform.test',
        role: 'STUDENT',
        isActive: true,
      }
      database.users.push(user)
      return user
    })
    const result = await getMyActivity(emptyStudent.id)

    expect(result.activities).toEqual([])
    expect(categoryIds(result)).toContain(ACTIVITY_CATEGORIES.EVENTS)
    await expect(getMyActivity('missing-user')).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await transact((database) => {
      database.users.find((user) => user.id === emptyStudent.id).isActive = false
    })
    await expect(getMyActivity(emptyStudent.id)).rejects.toMatchObject({ code: 'FORBIDDEN' })
  })
})
