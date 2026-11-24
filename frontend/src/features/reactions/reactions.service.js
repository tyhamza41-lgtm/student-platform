import { REACTION_TYPES } from '../../mocks/seedData.js'
import { getCollection, getRecord, transact, MockDataError } from '../../mocks/mockDatabase.js'
import { requireActor, requireRecord } from '../../mocks/serviceUtils.js'

export { REACTION_TYPES }

export async function getAll(filters = {}) {
  const records = await getCollection('reactions')
  return records.filter((reaction) => (
    (!filters.postId || reaction.postId === filters.postId) &&
    (!filters.userId || reaction.userId === filters.userId)
  ))
}

export async function getById(id) {
  return getRecord('reactions', id)
}

export async function togglePostReaction(postId, userId, type) {
  if (!Object.values(REACTION_TYPES).includes(type)) {
    throw new MockDataError('VALIDATION_ERROR', `Unsupported reaction type "${type}".`)
  }
  return transact((database, createId) => {
    requireActor(database, userId, ['STUDENT', 'ASSOCIATION', 'DIRECTOR'])
    const post = requireRecord(database, 'posts', postId)
    const existing = database.reactions.find((item) => item.postId === postId && item.userId === userId)
    if (existing?.type === type) {
      adjustCount(post, type, -1)
      database.reactions = database.reactions.filter((item) => item.id !== existing.id)
      return null
    }
    if (existing) {
      adjustCount(post, existing.type, -1)
      adjustCount(post, type, 1)
      existing.type = type
      existing.updatedAt = new Date().toISOString()
      return existing
    }
    const reaction = {
      id: createId('reactions'),
      postId,
      userId,
      type,
      createdAt: new Date().toISOString(),
    }
    database.reactions.push(reaction)
    adjustCount(post, type, 1)
    return reaction
  })
}

export async function removePostReaction(postId, userId) {
  return transact((database) => {
    requireActor(database, userId, ['STUDENT', 'ASSOCIATION', 'DIRECTOR'])
    const post = requireRecord(database, 'posts', postId)
    const existing = database.reactions.find((item) => item.postId === postId && item.userId === userId)
    if (!existing) return null
    adjustCount(post, existing.type, -1)
    database.reactions = database.reactions.filter((item) => item.id !== existing.id)
    return existing
  })
}

function adjustCount(post, type, amount) {
  const field = type === REACTION_TYPES.LIKE ? 'likeCount' : 'dislikeCount'
  post[field] = Math.max(0, (post[field] || 0) + amount)
}
