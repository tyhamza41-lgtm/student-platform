import { createBrowserRouter, Link, Navigate } from 'react-router'

import MainLayout from '../layouts/MainLayout'
import PublicLayout from '../layouts/PublicLayout'
import PlaceholderPage from '../components/common/PlaceholderPage'
import StudentDashboard from '../features/students/pages/StudentDashboard'
import EventsListPage from '../features/events/pages/EventsListPage'
import EventDetailsPage from '../features/events/pages/EventDetailsPage'
import EventFormPage from '../features/events/pages/EventFormPage'
import AssociationEventsPage from '../features/events/pages/AssociationEventsPage'
import PostDetailsPage from '../features/posts/pages/PostDetailsPage'
import PostFormPage from '../features/posts/pages/PostFormPage'
import MyPostsPage from '../features/posts/pages/MyPostsPage'
import PublicProfilePage from '../features/profiles/pages/PublicProfilePage'
import MockLoginPage from '../features/auth/pages/MockLoginPage'
import { ROUTES } from '../constants/routes'
import { USER_ROLES } from '../constants/roles'
import {
  PublicOnlyRoute,
  RequireAuth,
  RequireRepresentative,
  RequireRole,
} from './RouteGuards'

const router = createBrowserRouter([
  {
    element: <PublicOnlyRoute />,
    children: [
      {
        element: <PublicLayout />,
        children: [
          {
            path: ROUTES.AUTH.LOGIN,
            element: <MockLoginPage />,
          },
          {
            path: ROUTES.AUTH.REGISTER,
            element: (
              <PlaceholderPage
                title="Create account"
                description="Registration page — coming soon."
              />
            ),
          },
        ],
      },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            path: ROUTES.HOME,
            element: <Navigate to={ROUTES.FEED} replace />,
          },
          {
            path: ROUTES.FEED,
            element: <StudentDashboard />,
          },
          {
            path: ROUTES.POSTS.DETAIL(':postId'),
            element: <PostDetailsPage />,
          },
          {
            path: ROUTES.POSTS.EDIT(':postId'),
            element: <PostFormPage />,
          },
          {
            path: ROUTES.EVENTS,
            element: <EventsListPage />,
          },
          {
            path: ROUTES.EVENT_DETAILS(':eventId'),
            element: <EventDetailsPage />,
          },
          {
            path: ROUTES.ISSUES,
            element: <PlaceholderPage title="Class Issues" description="View and track class issues." />,
          },
          {
            path: ROUTES.PROFILE,
            element: <PlaceholderPage title="My Profile" description="Manage your profile." />,
          },
          {
            path: ROUTES.USER_PROFILE(':userId'),
            element: <PublicProfilePage />,
          },
          {
            path: ROUTES.STUDENT.MY_ACTIVITY,
            element: (
              <RequireRole roles={[USER_ROLES.STUDENT]}>
                <PlaceholderPage title="My Activity" description="Your posts and engagement." />
              </RequireRole>
            ),
          },
          {
            path: ROUTES.REPRESENTATIVE.CREATE_POST,
            element: (
              <RequireRepresentative>
                <PostFormPage />
              </RequireRepresentative>
            ),
          },
          {
            path: ROUTES.REPRESENTATIVE.CREATE_ISSUE,
            element: (
              <RequireRepresentative>
                <PlaceholderPage title="Create Class Issue" description="Submit a new class issue." />
              </RequireRepresentative>
            ),
          },
          {
            path: ROUTES.REPRESENTATIVE.MY_POSTS,
            element: (
              <RequireRepresentative>
                <MyPostsPage />
              </RequireRepresentative>
            ),
          },
          {
            path: ROUTES.ASSOCIATION.MY_POSTS,
            element: (
              <RequireRole roles={[USER_ROLES.ASSOCIATION]}>
                <MyPostsPage />
              </RequireRole>
            ),
          },
          {
            path: ROUTES.ASSOCIATION.MY_EVENTS,
            element: (
              <RequireRole roles={[USER_ROLES.ASSOCIATION]}>
                <AssociationEventsPage />
              </RequireRole>
            ),
          },
          {
            path: ROUTES.ASSOCIATION.CREATE_POST,
            element: (
              <RequireRole roles={[USER_ROLES.ASSOCIATION]}>
                <PostFormPage />
              </RequireRole>
            ),
          },
          {
            path: ROUTES.ASSOCIATION.CREATE_EVENT,
            element: (
              <RequireRole roles={[USER_ROLES.ASSOCIATION]}>
                <EventFormPage />
              </RequireRole>
            ),
          },
          {
            path: ROUTES.ASSOCIATION.EDIT_EVENT(':eventId'),
            element: (
              <RequireRole roles={[USER_ROLES.ASSOCIATION]}>
                <EventFormPage />
              </RequireRole>
            ),
          },
          {
            path: ROUTES.DIRECTOR.DASHBOARD,
            element: (
              <RequireRole roles={[USER_ROLES.DIRECTOR]}>
                <PlaceholderPage title="Dashboard" description="Platform overview." />
              </RequireRole>
            ),
          },
          {
            path: ROUTES.DIRECTOR.CREATE_POST,
            element: (
              <RequireRole roles={[USER_ROLES.DIRECTOR]}>
                <PostFormPage />
              </RequireRole>
            ),
          },
          {
            path: ROUTES.DIRECTOR.STUDENTS,
            element: (
              <RequireRole roles={[USER_ROLES.DIRECTOR]}>
                <PlaceholderPage title="Students" description="Manage student accounts." />
              </RequireRole>
            ),
          },
          {
            path: ROUTES.DIRECTOR.ASSOCIATIONS,
            element: (
              <RequireRole roles={[USER_ROLES.DIRECTOR]}>
                <PlaceholderPage title="Associations" description="Manage associations." />
              </RequireRole>
            ),
          },
          {
            path: ROUTES.DIRECTOR.REPRESENTATIVES,
            element: (
              <RequireRole roles={[USER_ROLES.DIRECTOR]}>
                <PlaceholderPage title="Representatives" description="Manage class representatives." />
              </RequireRole>
            ),
          },
          {
            path: ROUTES.DIRECTOR.MODERATION,
            element: (
              <RequireRole roles={[USER_ROLES.DIRECTOR]}>
                <PlaceholderPage title="Moderation" description="Content moderation queue." />
              </RequireRole>
            ),
          },
          {
            path: ROUTES.DIRECTOR.ISSUES,
            element: (
              <RequireRole roles={[USER_ROLES.DIRECTOR]}>
                <PlaceholderPage title="Class Issues (Director)" description="All class issues." />
              </RequireRole>
            ),
          },
        ],
      },
    ],
  },
  {
    path: '*',
    element: (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 p-8 text-center">
        <p className="text-6xl font-bold text-slate-200">404</p>
        <h1 className="text-xl font-semibold text-slate-800">Page not found</h1>
        <p className="text-sm text-slate-500">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          to={ROUTES.HOME}
          className="mt-2 inline-flex items-center rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          Go home
        </Link>
      </div>
    ),
  },
])

export default router
