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
    .filter((comment) => !filters.postId || comment.postId === filters.postId)
    .map((comment) => {
      const author = usersById.get(comment.authorId)
      return {
        ...comment,
        authorName: comment.authorName || author?.name || 'Platform user',
        authorAvatar: comment.authorAvatar || author?.avatarUrl || null,
      }
    })
}

export async function getById(id) {
  return getRecord('comments', id)
}

export async function add(data, actorId) {
  assertOnlyFields(data, ['postId', 'content'], 'Comment creation')
  assertText(data?.content, 'Comment', { maxLength: 2000 })
  return transact((database, createId) => {
    const author = requireActor(
      database,
      actorId,
      [USER_ROLES.STUDENT, USER_ROLES.ASSOCIATION, USER_ROLES.DIRECTOR],
    )
    const post = requireRecord(database, 'posts', data.postId)
    if (author.role === USER_ROLES.ASSOCIATION && post.associationId !== author.associationId) {
      throw new MockDataError('FORBIDDEN', 'Associations can only comment on their own posts.')
    }
    const comment = {
      id: createId('comments'),
      postId: data.postId,
      authorId: author.id,
      authorName: author.name,
      authorAvatar: author.avatarUrl || null,
      content: data.content.trim(),
      createdAt: new Date().toISOString(),
    }
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
      [USER_ROLES.STUDENT, USER_ROLES.ASSOCIATION, USER_ROLES.DIRECTOR],
    )
    if (comment.authorId !== actor.id && actor.role !== USER_ROLES.DIRECTOR) {
      throw new MockDataError('FORBIDDEN', 'You can only delete your own comments.')
    }
    database.comments = database.comments.filter((item) => item.id !== id)
    return comment
  })
}
