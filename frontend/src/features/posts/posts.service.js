import { USER_ROLES, REPRESENTATIVE_STATUS } from '../../constants/roles.js'
import { getCollection, getRecord, transact, MockDataError } from '../../mocks/mockDatabase.js'
import {
  assertOnlyFields,
  assertText,
  requireActor,
  requireRecord,
} from '../../mocks/serviceUtils.js'
import {
  announceNotificationsChanged,
  createCreationNotifications,
} from '../notifications/notifications.service.js'

function assertCanManagePost(database, post, actorId, { allowDirectorOverride = false } = {}) {
  const actor = requireRecord(database, 'users', actorId)
  if (actor.isActive === false) {
    throw new MockDataError('FORBIDDEN', 'Inactive accounts cannot manage posts.')
  }
  if (allowDirectorOverride && actor.role === USER_ROLES.DIRECTOR) return actor
  if (post.authorId !== actor.id) {
    throw new MockDataError('FORBIDDEN', 'You can only manage your own posts.')
  }
  if (actor.role === USER_ROLES.DIRECTOR) return actor
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
  const [records, classes, users] = await Promise.all([
    getCollection('posts'),
    getCollection('classes'),
    getCollection('users'),
  ])
  const classNames = new Map(classes.map((studentClass) => [studentClass.id, studentClass.name]))
  const usersById = new Map(users.map((user) => [user.id, user]))
  return records.filter((post) => (
    (!filters.authorId || post.authorId === filters.authorId) &&
    (!filters.classId || post.classId === filters.classId) &&
    (!filters.associationId || post.associationId === filters.associationId) &&
    (!filters.status || post.status === filters.status)
  )).map((post) => ({
    ...post,
    authorName: usersById.get(post.authorId)?.name || post.authorName,
    authorAvatar: usersById.get(post.authorId)?.avatarUrl || post.authorAvatar || null,
    ...(post.classId ? { className: classNames.get(post.classId) || post.classId } : {}),
  }))
}

export async function getById(id) {
  const post = await getRecord('posts', id)
  if (!post) return post
  const [studentClass, author] = await Promise.all([
    post.classId ? getRecord('classes', post.classId) : null,
    getRecord('users', post.authorId),
  ])
  return {
    ...post,
    authorName: author?.name || post.authorName,
    authorAvatar: author?.avatarUrl || post.authorAvatar || null,
    ...(post.classId ? { className: studentClass?.name || post.classId } : {}),
  }
}

export async function create(data, actorId) {
  assertOnlyFields(data, ['content', 'imageUrl', 'classId', 'associationId'], 'Post creation')
  assertText(data?.content, 'Post content')
  if (data.imageUrl !== undefined && data.imageUrl !== null && typeof data.imageUrl !== 'string') {
    throw new MockDataError('VALIDATION_ERROR', 'Post image URL must be text or null.')
  }
  const post = await transact((database, createId) => {
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
    const associationName = author.role === USER_ROLES.ASSOCIATION
      ? database.associations.find((item) => item.id === author.associationId)?.name
      : null
    createCreationNotifications(database, createId, {
      itemType: 'POST',
      item: post,
      actor: author,
      itemTitle: post.content.slice(0, 120),
      itemSummary: post.content,
      context: associationName ? { associationName } : null,
    })
    return post
  })
  announceNotificationsChanged()
  return post
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
    assertCanManagePost(database, post, actorId, { allowDirectorOverride: true })
    database.comments = database.comments.filter((comment) => comment.postId !== id)
    database.reactions = database.reactions.filter((reaction) => reaction.postId !== id)
    database.posts = database.posts.filter((item) => item.id !== id)
    return post
  })
}
