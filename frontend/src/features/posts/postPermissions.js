import { isRepresentative } from '../../constants/navigation.js'
import { USER_ROLES } from '../../constants/roles.js'

export function canCreatePost(user) {
  return user?.role === USER_ROLES.ASSOCIATION ||
    user?.role === USER_ROLES.DIRECTOR ||
    (user?.role === USER_ROLES.STUDENT && isRepresentative(user))
}

export function canEditPost(post, user) {
  if (!post || !user || user.isActive === false) return false
  if (post.authorId !== user.id) return false
  if (user.role === USER_ROLES.DIRECTOR || user.role === USER_ROLES.ASSOCIATION) return true
  return user.role === USER_ROLES.STUDENT &&
    isRepresentative(user) &&
    (!user.classId || !post.classId || user.classId === post.classId)
}

export function canDeletePost(post, user) {
  if (!post || !user || user.isActive === false) return false
  if (user.role === USER_ROLES.DIRECTOR) return true
  return canEditPost(post, user)
}
