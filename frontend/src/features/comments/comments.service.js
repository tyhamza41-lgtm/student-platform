import { USER_ROLES } from '../../constants/roles.js'
import { getCollection, getRecord, transact, MockDataError } from '../../mocks/mockDatabase.js'
import { assertOnlyFields, assertText, requireActor, requireRecord } from '../../mocks/serviceUtils.js'

export async function getAll(filters = {}) {
  const [records, users] = await Promise.all([
    getCollection('comments'),
    getCollection('users'),
  ])
  const usersById = new Map(users.map((user) => [user.id, user]))
  return records
    .filter((comment) => (
      (!filters.postId || comment.postId === filters.postId) &&
      (!filters.issueId || comment.issueId === filters.issueId)
    ))
    .map((comment) => {
      const author = usersById.get(comment.authorId)
      return {
        ...comment,
        authorName: author?.name || comment.authorName || 'Platform user',
        authorAvatar: author?.avatarUrl || comment.authorAvatar || null,
      }
    })
}

export async function getById(id) {
  return getRecord('comments', id)
}

export async function add(data, actorId) {
  assertOnlyFields(data, ['postId', 'issueId', 'content'], 'Comment creation')
  assertText(data?.content, 'Comment', { maxLength: 2000 })
  const hasPostId = Object.hasOwn(data, 'postId')
  const hasIssueId = Object.hasOwn(data, 'issueId')
  if (hasPostId === hasIssueId) {
    throw new MockDataError('VALIDATION_ERROR', 'A comment must belong to exactly one Post or Class Issue.')
  }
  const targetId = hasPostId ? data.postId : data.issueId
  assertText(targetId, hasPostId ? 'Post ID' : 'Class Issue ID')

  return transact((database, createId) => {
    const author = requireActor(
      database,
      actorId,
      hasIssueId
        ? [USER_ROLES.STUDENT, USER_ROLES.ASSOCIATION, USER_ROLES.DIRECTOR]
        : [USER_ROLES.STUDENT, USER_ROLES.ASSOCIATION, USER_ROLES.DIRECTOR],
    )

    if (hasPostId) {
      requireRecord(database, 'posts', targetId)
    } else {
      requireRecord(database, 'issues', targetId)
    }

    const comment = {
      id: createId('comments'),
      authorId: author.id,
      authorName: author.name,
      authorAvatar: author.avatarUrl || null,
      content: data.content.trim(),
      createdAt: new Date().toISOString(),
    }
    comment[hasPostId ? 'postId' : 'issueId'] = targetId
    database.comments.push(comment)
    return comment
  })
}

export async function deleteComment(id, actorId) {
  return transact((database) => {
    const comment = requireRecord(database, 'comments', id)
    const actor = requireActor(
      database,
      actorId,
      comment.issueId
        ? [USER_ROLES.STUDENT, USER_ROLES.ASSOCIATION, USER_ROLES.DIRECTOR]
        : [USER_ROLES.STUDENT, USER_ROLES.ASSOCIATION, USER_ROLES.DIRECTOR],
    )
    if (comment.authorId !== actor.id && actor.role !== USER_ROLES.DIRECTOR) {
      throw new MockDataError('FORBIDDEN', 'You can only delete your own comments.')
    }
    database.comments = database.comments.filter((item) => item.id !== id)
    return comment
  })
}
