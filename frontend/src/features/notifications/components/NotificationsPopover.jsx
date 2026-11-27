import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Alert, Avatar, Button, EmptyState, Popover } from '../../../components/ui'
import NavigationIcon from '../../../components/navigation/NavigationIcon'
import { useAuth } from '../../../context/AuthContext'
import { formatDate } from '../../../utils/formatDate'
import * as notificationsService from '../notifications.service'

function NotificationsPopover() {
  const { currentUser } = useAuth()
  const [notificationState, setNotificationState] = useState({ userId: null, notifications: [] })
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const userId = currentUser?.id

  const loadNotifications = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    setError('')
    try {
      setNotificationState({
        userId,
        notifications: await notificationsService.getAllForUser(userId),
      })
    } catch (loadError) {
      setError(loadError.message || 'Notifications could not be loaded.')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) return undefined
    const initialLoad = window.setTimeout(loadNotifications, 0)
    window.addEventListener(notificationsService.NOTIFICATIONS_CHANGED_EVENT, loadNotifications)
    return () => {
      window.clearTimeout(initialLoad)
      window.removeEventListener(notificationsService.NOTIFICATIONS_CHANGED_EVENT, loadNotifications)
    }
  }, [loadNotifications, userId])

  const notifications = notificationState.userId === userId
    ? notificationState.notifications
    : []
  const unreadCount = notifications.filter((notification) => !notification.readAt).length

  function handleOpenChange(open) {
    setIsOpen(open)
    if (open) loadNotifications()
  }

  async function markAsRead(notificationId) {
    try {
      const updated = await notificationsService.markAsRead(notificationId, userId)
      setNotificationState((current) => current.userId === userId
        ? {
          ...current,
          notifications: current.notifications.map((notification) => (
            notification.id === updated.id ? updated : notification
          )),
        }
        : current)
      setError('')
    } catch (markError) {
      setError(markError.message || 'This notification could not be marked as read.')
    }
  }

  async function markAllAsRead() {
    try {
      setNotificationState({
        userId,
        notifications: await notificationsService.markAllAsRead(userId),
      })
      setError('')
    } catch (markError) {
      setError(markError.message || 'Notifications could not be marked as read.')
    }
  }

  return (
    <Popover
      trigger={(
        <button
          type="button"
          aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : 'Notifications'}
          className="relative inline-flex size-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <NavigationIcon name="bell" />
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-0.5 -top-0.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white ring-2 ring-white"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}
      side="bottom"
      align="right"
      isOpen={isOpen}
      onOpenChange={handleOpenChange}
      className="w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden p-0"
    >
      <section aria-label="Notifications">
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Notifications</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {unreadCount ? `${unreadCount} unread` : 'You’re all caught up'}
            </p>
          </div>
          {unreadCount > 0 && (
            <Button size="xs" variant="ghost" onClick={markAllAsRead}>
              Mark all read
            </Button>
          )}
        </header>

        {error && (
          <Alert
            variant="danger"
            className="m-3"
            action={<Button size="xs" variant="outline" onClick={loadNotifications}>Retry</Button>}
          >
            {error}
          </Alert>
        )}
        {loading ? (
          <p role="status" className="px-4 py-6 text-center text-sm text-slate-500">
            Loading notifications…
          </p>
        ) : notifications.length === 0 ? (
          <div className="px-4 py-5">
            <EmptyState title="No notifications" description="Important updates will appear here." />
          </div>
        ) : (
          <ul className="max-h-[min(65vh,28rem)] divide-y divide-slate-100 overflow-y-auto">
            {notifications.map((notification) => (
              <li
                key={notification.id}
                className={`flex gap-3 px-4 py-3 ${notification.readAt ? '' : 'bg-indigo-50/60'}`}
              >
                <Avatar
                  src={notification.creatorAvatar}
                  name={notification.creatorName || notification.associationName || notification.directorName}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  {notification.href ? (
                    <Link
                      to={notification.href}
                      className="block text-sm leading-5 text-slate-700 hover:text-violet-700"
                      aria-label={`Open ${notification.itemType === 'CLASS_ISSUE' ? 'Class Issue' : notification.itemType}: ${notification.itemTitle}`}
                    >
                      {notification.message}
                    </Link>
                  ) : (
                    <p className="text-sm leading-5 text-slate-700">{notification.message}</p>
                  )}
                  {notification.creatorRole && (
                    <p className="mt-1 text-xs text-slate-500">{notification.creatorRole}</p>
                  )}
                  <time
                    dateTime={notification.createdAt}
                    className="mt-1 block text-xs text-slate-500"
                  >
                    {formatDate(notification.createdAt, {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </time>
                  {!notification.readAt && (
                    <Button
                      size="xs"
                      variant="ghost"
                      className="mt-1 -ml-2 min-h-8"
                      onClick={() => markAsRead(notification.id)}
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
                {!notification.readAt && (
                  <span aria-label="Unread" className="mt-1.5 size-2 shrink-0 rounded-full bg-indigo-600" />
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </Popover>
  )
}

export default NotificationsPopover
