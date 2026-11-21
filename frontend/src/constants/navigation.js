import { ROUTES } from './routes'
import { USER_ROLES, REPRESENTATIVE_STATUS } from './roles'

/**
 * Checks whether a given user is designated as an active Class Representative.
 * A representative is a student with an active representative designation,
 * not a distinct user role.
 *
 * @param {Object|null} user
 * @returns {boolean}
 */
export function isRepresentative(user) {
  if (!user || user.role !== USER_ROLES.STUDENT) {
    return false
  }

  const statuses = [
    user.representativeStatus,
    user.representative?.status,
  ].filter((status) => typeof status === 'string')
    .map((status) => status.trim().toUpperCase())

  if (statuses.includes(REPRESENTATIVE_STATUS.INACTIVE)) {
    return false
  }

  return user.isRepresentative === true ||
    user.isClassRepresentative === true ||
    (typeof user.designation === 'string' &&
      user.designation.trim().toUpperCase() === 'REPRESENTATIVE') ||
    statuses.includes(REPRESENTATIVE_STATUS.ACTIVE)
}

/**
 * Returns a human-friendly role / designation label for display.
 *
 * @param {Object|null} user
 * @returns {string}
 */
export function getUserRoleLabel(user) {
  if (!user) {
    return 'Guest'
  }

  if (user.role === USER_ROLES.DIRECTOR) {
    return 'Director'
  }

  if (user.role === USER_ROLES.ASSOCIATION) {
    return 'Association'
  }

  if (user.role === USER_ROLES.STUDENT) {
    return isRepresentative(user) ? 'Class Representative' : 'Student'
  }

  return user.role || 'Student'
}

/**
 * Centralized navigation configuration for all platform roles and student designations.
 */
const STUDENT_NAVIGATION = [
  {
    label: 'Dashboard',
    path: ROUTES.FEED,
    icon: 'house',
    mobilePrimary: true,
  },
  {
    label: 'Events',
    path: ROUTES.EVENTS,
    icon: 'calendar-days',
    mobilePrimary: true,
  },
  {
    label: 'Class Issues',
    path: ROUTES.ISSUES,
    icon: 'message-square-warning',
    mobilePrimary: true,
    end: true,
  },
  {
    label: 'My Activity',
    path: ROUTES.STUDENT.MY_ACTIVITY,
    icon: 'activity',
    mobilePrimary: true,
  },
  {
    label: 'Profile',
    path: ROUTES.PROFILE,
    icon: 'user-round',
    mobilePrimary: false,
  },
]

const REPRESENTATIVE_NAVIGATION = [
  {
    label: 'Create Post',
    path: ROUTES.REPRESENTATIVE.CREATE_POST,
    icon: 'square-pen',
    mobilePrimary: false,
  },
  {
    label: 'Create Class Issue',
    path: ROUTES.REPRESENTATIVE.CREATE_ISSUE,
    icon: 'clipboard-plus',
    mobilePrimary: false,
  },
  {
    label: 'My Posts',
    path: ROUTES.REPRESENTATIVE.MY_POSTS,
    icon: 'file-text',
    mobilePrimary: false,
  },
]

export const NAVIGATION_CONFIG = {
  STUDENT: STUDENT_NAVIGATION,

  REPRESENTATIVE: [
    ...STUDENT_NAVIGATION.slice(0, -1),
    ...REPRESENTATIVE_NAVIGATION,
    STUDENT_NAVIGATION[STUDENT_NAVIGATION.length - 1],
  ],

  ASSOCIATION: [
    {
      label: 'Home',
      path: ROUTES.FEED,
      icon: 'house',
      mobilePrimary: true,
    },
    {
      label: 'Events',
      path: ROUTES.EVENTS,
      icon: 'calendar-days',
      mobilePrimary: true,
    },
    {
      label: 'My Posts',
      path: ROUTES.ASSOCIATION.MY_POSTS,
      icon: 'file-text',
      mobilePrimary: true,
    },
    {
      label: 'My Events',
      path: ROUTES.ASSOCIATION.MY_EVENTS,
      icon: 'calendar-check',
      mobilePrimary: true,
    },
    {
      label: 'Profile',
      path: ROUTES.PROFILE,
      icon: 'user-round',
      mobilePrimary: false,
    },
  ],

  DIRECTOR: [
    {
      label: 'Dashboard',
      path: ROUTES.DIRECTOR.DASHBOARD,
      icon: 'layout-dashboard',
      mobilePrimary: true,
    },
    {
      label: 'Feed / Posts',
      path: ROUTES.FEED,
      icon: 'house',
      mobilePrimary: true,
    },
    {
      label: 'Events',
      path: ROUTES.EVENTS,
      icon: 'calendar-days',
      mobilePrimary: true,
    },
    {
      label: 'Class Issues Management',
      path: ROUTES.DIRECTOR.ISSUES,
      icon: 'message-square-warning',
      mobilePrimary: true,
      end: true,
    },
    {
      label: 'Moderation',
      path: ROUTES.DIRECTOR.MODERATION,
      icon: 'shield-check',
      mobilePrimary: false,
    },
    {
      label: 'Students Management',
      path: ROUTES.DIRECTOR.STUDENTS,
      icon: 'users',
      mobilePrimary: false,
    },
    {
      label: 'Associations Management',
      path: ROUTES.DIRECTOR.ASSOCIATIONS,
      icon: 'building-2',
      mobilePrimary: false,
    },
    {
      label: 'Representatives Management',
      path: ROUTES.DIRECTOR.REPRESENTATIVES,
      icon: 'user-check',
      mobilePrimary: false,
    },
    {
      label: 'Profile',
      path: ROUTES.PROFILE,
      icon: 'user-round',
      mobilePrimary: false,
    },
  ],
}

/**
 * Resolves the navigation items list for a given user.
 *
 * @param {Object|null} user
 * @returns {Array<Object>}
 */
export function getNavigationItems(user) {
  if (!user) {
    return NAVIGATION_CONFIG.STUDENT
  }

  if (user.role === USER_ROLES.DIRECTOR) {
    return NAVIGATION_CONFIG.DIRECTOR
  }

  if (user.role === USER_ROLES.ASSOCIATION) {
    return NAVIGATION_CONFIG.ASSOCIATION
  }

  if (user.role === USER_ROLES.STUDENT) {
    return isRepresentative(user)
      ? NAVIGATION_CONFIG.REPRESENTATIVE
      : NAVIGATION_CONFIG.STUDENT
  }

  return NAVIGATION_CONFIG.STUDENT
}

/**
 * Returns the primary navigation items for mobile bottom bar (up to 4 items).
 *
 * @param {Object|null} user
 * @returns {Array<Object>}
 */
export function getMobileNavigationItems(user) {
  const items = getNavigationItems(user)
  const primaries = items.filter((item) => item.mobilePrimary)
  return primaries.length > 0 ? primaries.slice(0, 4) : items.slice(0, 4)
}

// Alias for backwards compatibility
export const NAVIGATION = NAVIGATION_CONFIG
