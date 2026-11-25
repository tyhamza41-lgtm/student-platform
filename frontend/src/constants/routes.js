
export const ROUTES = {
  HOME: '/',
  
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
  },

  FEED: '/feed',
  POSTS: {
    DETAIL: (postId) => `/posts/${postId}`,
    EDIT: (postId) => `/posts/${postId}/edit`,
  },
  EVENTS: '/events',
  EVENT_DETAILS: (eventId) => `/events/${eventId}`,
  ISSUES: '/issues',

  PROFILE: '/profile',
  USER_PROFILE: (userId) => `/users/${userId}`,

  STUDENT: {
    MY_ACTIVITY: '/my-activity',
  },

  REPRESENTATIVE: {
    CREATE_POST: '/posts/create',
    CREATE_ISSUE: '/issues/create',
    MY_POSTS: '/my-posts',
  },

  ASSOCIATION: {
    MY_POSTS: '/association/posts',
    MY_EVENTS: '/association/events',
    EDIT_EVENT: (eventId) => `/association/events/${eventId}/edit`,
    CREATE_POST: '/association/posts/create',
    CREATE_EVENT: '/association/events/create',
  },

  DIRECTOR: {
    DASHBOARD: '/director/dashboard',
    CREATE_POST: '/director/posts/create',
    STUDENTS: '/director/students',
    ASSOCIATIONS: '/director/associations',
    REPRESENTATIVES: '/director/representatives',
    MODERATION: '/director/moderation',
    ISSUES: '/director/issues',
  },
}
