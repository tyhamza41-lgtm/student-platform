import { USER_ROLES, REPRESENTATIVE_STATUS } from '../../constants/roles.js'
import { getCollection, getRecord, transact, MockDataError } from '../../mocks/mockDatabase.js'
import {
  assertOnlyFields,
  assertText,
  requireActor,
  requireRecord,
} from '../../mocks/serviceUtils.js'

function assertCanManagePost(database, post, actorId) {
  const actor = requireRecord(database, 'users', actorId)
  if (actor.role === USER_ROLES.DIRECTOR && actor.isActive !== false) return actor
  if (post.authorId !== actor.id || actor.isActive === false) {
    throw new MockDataError('FORBIDDEN', 'You can only manage your own posts.')
  }
  if (
    actor.role === USER_ROLES.ASSOCIATION &&
    actor.associationId === post.associationId
  ) {
    const association = requireRecord(database, 'associations', actor.associationId)
    if (association.isActive) return actor
  }
  if (
    actor.role === USER_ROLES.STUDENT &&
    actor.representativeStatus === REPRESENTATIVE_STATUS.ACTIVE &&
    actor.isRepresentative &&
    actor.classId === post.classId
  ) return actor
  throw new MockDataError('FORBIDDEN', 'You do not have permission to manage this post.')
}

function toPostRecord(database, data, author, id) {
  const representative = author.role === USER_ROLES.STUDENT &&
    author.isRepresentative &&
    author.representativeStatus === REPRESENTATIVE_STATUS.ACTIVE
  const post = {
    id,
    authorId: author.id,
    authorName: author.name,
    authorRole: representative
      ? 'Class Representative'
      : author.role === USER_ROLES.ASSOCIATION
        ? 'Student Association'
        : author.role === USER_ROLES.DIRECTOR
          ? 'Director'
          : 'Student',
    authorAvatar: author.avatarUrl || null,
    publishedAt: new Date().toISOString(),
    content: data.content.trim(),
    imageUrl: data.imageUrl || null,
    likeCount: 0,
    dislikeCount: 0,
    status: 'PUBLISHED',
  }

  if (representative) {
    if (data.classId && data.classId !== author.classId) {
      throw new MockDataError('FORBIDDEN', 'Representatives can only publish to their assigned class.')
    }
    const studentClass = database.classes.find((item) => item.id === author.classId)
    if (!studentClass?.activeRepresentativeIds.includes(author.id)) {
      throw new MockDataError('FORBIDDEN', 'Only an active representative assigned to a class can publish class posts.')
    }
    post.classId = author.classId
  } else if (author.role === USER_ROLES.ASSOCIATION) {
    const association = database.associations.find((item) => item.id === author.associationId)
    if (!association?.isActive) {
      throw new MockDataError('FORBIDDEN', 'Inactive associations cannot publish posts.')
    }
    if (data.associationId && data.associationId !== author.associationId) {
      throw new MockDataError('FORBIDDEN', 'Associations can only publish to their own page.')
    }
    post.associationId = author.associationId
  }

  return post
}

export async function getAll(filters = {}) {
  const [records, classes] = await Promise.all([
    getCollection('posts'),
    getCollection('classes'),
  ])
  const classNames = new Map(classes.map((studentClass) => [studentClass.id, studentClass.name]))
  return records.filter((post) => (
    (!filters.authorId || post.authorId === filters.authorId) &&
    (!filters.classId || post.classId === filters.classId) &&
    (!filters.associationId || post.associationId === filters.associationId) &&
    (!filters.status || post.status === filters.status)
  )).map((post) => ({
    ...post,
    ...(post.classId ? { className: classNames.get(post.classId) || post.classId } : {}),
  }))
}

export async function getById(id) {
  const post = await getRecord('posts', id)
  if (!post || !post.classId) return post
  const studentClass = await getRecord('classes', post.classId)
  return {
    ...post,
    className: studentClass?.name || post.classId,
  }
}

export async function create(data, actorId) {
  assertOnlyFields(data, ['content', 'imageUrl', 'classId', 'associationId'], 'Post creation')
  assertText(data?.content, 'Post content')
  if (data.imageUrl !== undefined && data.imageUrl !== null && typeof data.imageUrl !== 'string') {
    throw new MockDataError('VALIDATION_ERROR', 'Post image URL must be text or null.')
  }
  return transact((database, createId) => {
    const author = requireActor(
      database,
      actorId,
      [USER_ROLES.STUDENT, USER_ROLES.ASSOCIATION, USER_ROLES.DIRECTOR],
    )
    if (
      author.role === USER_ROLES.STUDENT &&
      !(author.isRepresentative && author.representativeStatus === REPRESENTATIVE_STATUS.ACTIVE)
    ) {
      throw new MockDataError('FORBIDDEN', 'Only active class representatives can create class posts.')
    }
    const post = toPostRecord(database, data, author, createId('posts'))
    database.posts.push(post)
    return post
  })
}

export async function update(id, data, actorId) {
  assertOnlyFields(data, ['content', 'imageUrl'], 'Post update')
  if (Object.hasOwn(data, 'content')) assertText(data.content, 'Post content')
  if (Object.hasOwn(data, 'imageUrl') && data.imageUrl !== null && typeof data.imageUrl !== 'string') {
    throw new MockDataError('VALIDATION_ERROR', 'Post image URL must be text or null.')
  }
  return transact((database) => {
    const post = requireRecord(database, 'posts', id)
    assertCanManagePost(database, post, actorId)
    for (const field of ['content', 'imageUrl']) {
      if (Object.hasOwn(data, field)) post[field] = field === 'content' ? data[field].trim() : data[field] || null
    }
    post.updatedAt = new Date().toISOString()
    return post
  })
}

export async function deletePost(id, actorId) {
  return transact((database) => {
    const post = requireRecord(database, 'posts', id)
    assertCanManagePost(database, post, actorId)
    database.comments = database.comments.filter((comment) => comment.postId !== id)
    database.reactions = database.reactions.filter((reaction) => reaction.postId !== id)
    database.posts = database.posts.filter((item) => item.id !== id)
    return post
  })
}

export async function setModerationStatus(id, status, directorId) {
  if (!['PUBLISHED', 'HIDDEN', 'REMOVED'].includes(status)) {
    throw new MockDataError('VALIDATION_ERROR', `Unsupported post moderation status "${status}".`)
  }
  return transact((database) => {
    requireActor(database, directorId, [USER_ROLES.DIRECTOR])
    const post = requireRecord(database, 'posts', id)
    post.status = status
    post.moderatedById = directorId
    post.moderatedAt = new Date().toISOString()
    return post
  })
}
