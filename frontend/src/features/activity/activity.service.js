import { isRepresentative } from '../../constants/navigation.js'
import { ROUTES } from '../../constants/routes.js'
import { USER_ROLES } from '../../constants/roles.js'
import { getMockDatabaseSnapshot } from '../../mocks/mockDatabase.js'
import { requireActor } from '../../mocks/serviceUtils.js'

export const ACTIVITY_CATEGORIES = Object.freeze({
  POSTS: 'POSTS',
  COMMENTS: 'COMMENTS',
  REACTIONS: 'REACTIONS',
  EVENTS: 'EVENTS',
  CLASS_ISSUES: 'CLASS_ISSUES',
})

const CATEGORY_LABELS = Object.freeze({
  [ACTIVITY_CATEGORIES.POSTS]: 'Posts',
  [ACTIVITY_CATEGORIES.COMMENTS]: 'Comments',
  [ACTIVITY_CATEGORIES.REACTIONS]: 'Reactions',
  [ACTIVITY_CATEGORIES.EVENTS]: 'Events',
  [ACTIVITY_CATEGORIES.CLASS_ISSUES]: 'Class Issues',
})

function getAllowedCategories(user) {
  const categories = []

  if (
    user.role === USER_ROLES.DIRECTOR ||
    user.role === USER_ROLES.ASSOCIATION ||
    isRepresentative(user)
  ) {
    categories.push(ACTIVITY_CATEGORIES.POSTS)
  }
  categories.push(ACTIVITY_CATEGORIES.COMMENTS, ACTIVITY_CATEGORIES.REACTIONS)
  if (user.role === USER_ROLES.STUDENT) categories.push(ACTIVITY_CATEGORIES.EVENTS)
  if (user.role === USER_ROLES.ASSOCIATION) categories.push(ACTIVITY_CATEGORIES.EVENTS)
  if (isRepresentative(user)) categories.push(ACTIVITY_CATEGORIES.CLASS_ISSUES)

  return categories.map((id) => ({ id, label: CATEGORY_LABELS[id] }))
}

function makeActivity(kind, category, record, {
  title,
  summary = '',
  relatedTitle = '',
  relatedType = '',
  href = null,
} = {}) {
  return {
    id: `${kind}:${record.id}`,
    kind,
    category,
    occurredAt: record.occurredAt ||
      record.createdAt ||
      record.registeredAt ||
      record.publishedAt ||
      record.submittedAt ||
      null,
    title,
    summary,
    relatedTitle,
    relatedType,
    href,
  }
}

function dateValue(value) {
  const timestamp = new Date(value || '').getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

export async function getMyActivity(actorId) {
  const database = await getMockDatabaseSnapshot()
  const user = requireActor(database, actorId, Object.values(USER_ROLES))
  const categories = getAllowedCategories(user)
  const allowedCategoryIds = new Set(categories.map(({ id }) => id))
  const activities = []
  const postsById = new Map(database.posts.map((post) => [post.id, post]))
  const issuesById = new Map(database.issues.map((issue) => [issue.id, issue]))
  const eventsById = new Map(database.events.map((event) => [event.id, event]))

  if (allowedCategoryIds.has(ACTIVITY_CATEGORIES.POSTS)) {
    for (const post of database.posts.filter((item) => (
      item.authorId === user.id &&
      (user.role !== USER_ROLES.ASSOCIATION || item.associationId === user.associationId)
    ))) {
      const canOpenPost = post.status === 'PUBLISHED' || user.role === USER_ROLES.DIRECTOR
      activities.push(makeActivity('post', ACTIVITY_CATEGORIES.POSTS, {
        ...post,
        occurredAt: post.publishedAt,
      }, {
        title: 'Published a post',
        summary: post.content,
        relatedType: 'post',
        href: canOpenPost ? ROUTES.POSTS.DETAIL(post.id) : null,
      }))
    }
  }

  for (const comment of database.comments.filter((item) => item.authorId === user.id)) {
    const post = comment.postId ? postsById.get(comment.postId) : null
    const issue = comment.issueId ? issuesById.get(comment.issueId) : null
    const relatedTitle = comment.postId
      ? post?.content || 'Post unavailable'
      : issue?.title || 'Class Issue unavailable'
    const href = post
      ? (post.status === 'PUBLISHED' || user.role === USER_ROLES.DIRECTOR
        ? ROUTES.POSTS.DETAIL(post.id)
        : null)
      : issue
        ? ROUTES.ISSUE_DETAILS(issue.id)
        : null
    activities.push(makeActivity('comment', ACTIVITY_CATEGORIES.COMMENTS, comment, {
      title: comment.postId ? 'Commented on a post' : 'Commented on a Class Issue',
      summary: comment.content,
      relatedTitle,
      relatedType: comment.postId ? 'post' : 'issue',
      href,
    }))
  }

  for (const reaction of database.reactions.filter((item) => item.userId === user.id)) {
    const post = postsById.get(reaction.postId)
    const canOpenPost = post && (post.status === 'PUBLISHED' || user.role === USER_ROLES.DIRECTOR)
    activities.push(makeActivity('reaction', ACTIVITY_CATEGORIES.REACTIONS, reaction, {
      title: reaction.type === 'LIKE' ? 'Liked a post' : 'Disliked a post',
      relatedTitle: post?.content || 'Post unavailable',
      relatedType: 'post',
      href: canOpenPost ? ROUTES.POSTS.DETAIL(post.id) : null,
    }))
  }

  if (user.role === USER_ROLES.STUDENT) {
    for (const registration of database.registrations.filter((item) => item.userId === user.id)) {
      const event = eventsById.get(registration.eventId)
      activities.push(makeActivity('registration', ACTIVITY_CATEGORIES.EVENTS, registration, {
        title: 'Registered for an event',
        relatedTitle: event?.title || 'Event unavailable',
        summary: event?.location ? `Location: ${event.location}` : '',
        relatedType: 'event',
        href: event ? ROUTES.EVENT_DETAILS(event.id) : null,
      }))
    }
  }

  if (user.role === USER_ROLES.ASSOCIATION) {
    for (const event of database.events.filter((item) => (
      item.ownerType === USER_ROLES.ASSOCIATION &&
      item.ownerId === user.associationId &&
      item.createdById === user.id
    ))) {
      activities.push(makeActivity('event', ACTIVITY_CATEGORIES.EVENTS, {
        ...event,
        occurredAt: event.createdAt,
      }, {
        title: 'Created an event',
        relatedTitle: event.title,
        summary: [event.description, event.location].filter(Boolean).join(' · '),
        relatedType: 'event',
        href: ROUTES.EVENT_DETAILS(event.id),
      }))
    }
  }

  if (isRepresentative(user)) {
    for (const issue of database.issues.filter((item) => (
      item.submittedById === user.id &&
      item.classId === user.classId
    ))) {
      activities.push(makeActivity('issue', ACTIVITY_CATEGORIES.CLASS_ISSUES, {
        ...issue,
        occurredAt: issue.submittedAt,
      }, {
        title: 'Submitted a Class Issue',
        relatedTitle: issue.title,
        summary: issue.description,
        relatedType: 'issue',
        href: ROUTES.ISSUE_DETAILS(issue.id),
      }))
    }
  }

  activities.sort((first, second) => dateValue(second.occurredAt) - dateValue(first.occurredAt))
  return { activities, categories }
}
