import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router'
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  FormField,
  Textarea,
} from '../../../components/ui'
import { ROUTES } from '../../../constants/routes'
import { USER_ROLES } from '../../../constants/roles'
import { useAuth } from '../../../context/AuthContext'
import { formatDate } from '../../../utils/formatDate'
import { formatRelativeTime } from '../../../utils/formatRelativeTime'
import * as commentsService from '../../comments/comments.service'
import * as directorService from '../../director/director.service'
import * as issuesService from '../issues.service'

const STATUS_LABELS = {
  PENDING: 'Pending',
  VIEWED: 'Viewed',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
}

const STATUS_VARIANTS = {
  PENDING: 'warning',
  VIEWED: 'info',
  IN_PROGRESS: 'primary',
  RESOLVED: 'success',
}

function getClassGroupLabel(issue) {
  const name = issue.className || issue.classId
  const identifier = issue.classId && issue.classId !== name ? ` (${issue.classId})` : ''
  return `Class/Group: ${name}${identifier}`
}

function IssueDetailsPage({ directorMode = false }) {
  const { issueId } = useParams()
  const { currentUser } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [issue, setIssue] = useState(null)
  const [comments, setComments] = useState([])
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [submittingComment, setSubmittingComment] = useState(false)
  const [savingStatus, setSavingStatus] = useState(false)
  const [deletingIssue, setDeletingIssue] = useState(false)
  const [deletingComment, setDeletingComment] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [success, setSuccess] = useState(location.state?.successMessage || '')
  const [commentToDelete, setCommentToDelete] = useState(null)
  const [confirmIssueDelete, setConfirmIssueDelete] = useState(false)
  const [reload, setReload] = useState(0)
  const autoViewedRef = useRef(new Set())
  const isDirector = currentUser?.role === USER_ROLES.DIRECTOR && currentUser.isActive !== false
  const canManageIssue = directorMode || isDirector

  useEffect(() => {
    let active = true

    async function loadIssue() {
      setLoading(true)
      setError('')
      try {
        const issueRecords = canManageIssue
          ? await directorService.getClassIssues(currentUser.id)
          : await issuesService.getAll()
        let record = issueRecords.find((item) => item.id === issueId)
        if (!record) {
          if (active) {
            setIssue(null)
            setComments([])
            setError('This class issue is unavailable.')
          }
          return
        }
        if (
          canManageIssue &&
          record.status === issuesService.ISSUE_STATUS.PENDING &&
          !autoViewedRef.current.has(record.id)
        ) {
          autoViewedRef.current.add(record.id)
          const viewedRecord = await directorService.updateClassIssueStatus(
            record.id,
            issuesService.ISSUE_STATUS.VIEWED,
            currentUser.id,
          )
          record = { ...record, ...viewedRecord }
        }
        const commentRecords = await commentsService.getAll({ issueId })
        if (active) {
          setIssue(record)
          setComments(commentRecords.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)))
        }
      } catch (loadError) {
        if (active) {
          setIssue(null)
          setError(loadError.message || 'Class issue details could not be loaded.')
        }
      } finally {
        if (active) setLoading(false)
      }
    }

    loadIssue()
    return () => { active = false }
  }, [canManageIssue, currentUser?.id, issueId, reload])

  async function handleSubmitComment(event) {
    event.preventDefault()
    setSubmittingComment(true)
    setActionError('')
    try {
      const created = await commentsService.add({ issueId, content }, currentUser.id)
      setComments((current) => [...current, created])
      setContent('')
      setSuccess('Your comment has been added.')
    } catch (submitError) {
      setActionError(submitError.message || 'Your comment could not be added.')
    } finally {
      setSubmittingComment(false)
    }
  }

  async function handleDeleteComment() {
    if (!commentToDelete) return
    setDeletingComment(true)
    setActionError('')
    try {
      await commentsService.deleteComment(commentToDelete.id, currentUser.id)
      setComments((current) => current.filter((comment) => comment.id !== commentToDelete.id))
      setCommentToDelete(null)
    } catch (deleteError) {
      setActionError(deleteError.message || 'The comment could not be deleted.')
      setCommentToDelete(null)
    } finally {
      setDeletingComment(false)
    }
  }

  async function updateIssueStatus(nextStatus) {
    if (!canManageIssue || !issue || !nextStatus || nextStatus === issue.status) return
    setSavingStatus(true)
    setActionError('')
    try {
      const updated = await directorService.updateClassIssueStatus(issue.id, nextStatus, currentUser.id)
      setIssue({ ...issue, ...updated })
      setSuccess(`Issue status updated to ${STATUS_LABELS[updated.status] || updated.status}.`)
    } catch (statusError) {
      setActionError(statusError.message || 'The issue status could not be updated.')
    } finally {
      setSavingStatus(false)
    }
  }

  async function handleDeleteIssue() {
    if (!canManageIssue || !issue) return
    setDeletingIssue(true)
    setActionError('')
    try {
      await issuesService.deleteIssue(issue.id, currentUser.id)
      navigate(directorMode ? ROUTES.DIRECTOR.ISSUES : ROUTES.ISSUES, {
        replace: true,
        state: { successMessage: 'Issue deleted. Platform users have been notified.' },
      })
    } catch (deleteError) {
      setActionError(deleteError.message || 'The issue could not be deleted.')
      setConfirmIssueDelete(false)
    } finally {
      setDeletingIssue(false)
    }
  }

  function retryLoading() {
    setLoading(true)
    setError('')
    setReload((count) => count + 1)
  }

  const backRoute = directorMode ? ROUTES.DIRECTOR.ISSUES : ROUTES.ISSUES
  const canComment = Boolean(currentUser) &&
    currentUser.isActive !== false

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <Link
        to={backRoute}
        className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        ← All class issues
      </Link>

      {loading && <Card role="status" className="text-sm text-slate-500">Loading class issue…</Card>}
      {!loading && error && !issue && (
        <Alert
          variant="danger"
          title="Class issue unavailable"
          action={<Button size="sm" variant="outline" onClick={retryLoading}>Try again</Button>}
        >
          {error}
        </Alert>
      )}

      {!loading && issue && (
        <>
          {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}
          {actionError && <Alert variant="danger">{actionError}</Alert>}

          <Card className="space-y-6 sm:p-8">
            <header>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_VARIANTS[issue.status] || 'default'} dot>
                  {STATUS_LABELS[issue.status] || issue.status}
                </Badge>
                <span className="text-xs text-slate-500">{getClassGroupLabel(issue)}</span>
              </div>
              <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{issue.title}</h1>
              <div className="mt-4 flex items-center gap-3">
                <Link
                  to={ROUTES.USER_PROFILE(issue.submittedById)}
                  aria-label={`View ${issue.submittedByName}'s profile`}
                >
                  <Avatar
                    src={issue.submittedByAvatar}
                    name={issue.submittedByName}
                    alt={`${issue.submittedByName} profile`}
                    size="sm"
                  />
                </Link>
                <Link
                  to={ROUTES.USER_PROFILE(issue.submittedById)}
                  className="text-sm font-semibold text-slate-800 hover:text-violet-700"
                >
                  {issue.submittedByName}
                </Link>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                Submitted <time dateTime={issue.submittedAt}>{formatRelativeTime(issue.submittedAt)}</time>
              </p>
            </header>

            <section aria-labelledby="issue-description-heading">
              <h2 id="issue-description-heading" className="text-sm font-bold text-slate-900">Issue description</h2>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600">
                {issue.description}
              </p>
            </section>

            <dl className="grid gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
              {issue.statusUpdatedAt && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Last status update</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-700">
                    <time dateTime={issue.statusUpdatedAt}>
                      {formatDate(issue.statusUpdatedAt, { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </dd>
                </div>
              )}
              {issue.viewedAt && (
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">First viewed</dt>
                  <dd className="mt-1 text-sm font-medium text-slate-700">
                    <time dateTime={issue.viewedAt}>
                      {formatDate(issue.viewedAt, { hour: '2-digit', minute: '2-digit' })}
                    </time>
                    {issue.viewedById && (
                      <>
                        {' by '}
                        <Link
                          to={ROUTES.USER_PROFILE(issue.viewedById)}
                          className="text-violet-700 hover:text-violet-900"
                        >
                          Director
                        </Link>
                      </>
                    )}
                  </dd>
                </div>
              )}
            </dl>

            {canManageIssue && (
              <section
                aria-labelledby="issue-management-heading"
                className="space-y-4 border-t border-slate-100 pt-5"
              >
                <div>
                  <h2 id="issue-management-heading" className="text-sm font-bold text-slate-900">
                    Manage issue
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Opening a pending issue marks it as Viewed automatically. Update progress to In progress or Resolved as needed.
                  </p>
                </div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant={issue.status === issuesService.ISSUE_STATUS.IN_PROGRESS ? 'primary' : 'outline'}
                      disabled={savingStatus || deletingIssue || issue.status === issuesService.ISSUE_STATUS.IN_PROGRESS}
                      onClick={() => updateIssueStatus(issuesService.ISSUE_STATUS.IN_PROGRESS)}
                    >
                      Mark as In progress
                    </Button>
                    <Button
                      size="sm"
                      variant={issue.status === issuesService.ISSUE_STATUS.RESOLVED ? 'primary' : 'outline'}
                      disabled={savingStatus || deletingIssue || issue.status === issuesService.ISSUE_STATUS.RESOLVED}
                      onClick={() => updateIssueStatus(issuesService.ISSUE_STATUS.RESOLVED)}
                    >
                      Mark as Resolved
                    </Button>
                  </div>
                  <Button
                    variant="danger"
                    onClick={() => setConfirmIssueDelete(true)}
                    disabled={savingStatus || deletingIssue}
                  >
                    Delete issue
                  </Button>
                </div>
              </section>
            )}
          </Card>

          <Card padding="lg" className="space-y-5">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Comments <span className="text-slate-400">({comments.length})</span>
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {canComment
                  ? 'Share a helpful update about this issue.'
                  : 'Updates shared about this issue.'}
              </p>
            </div>

            {comments.length === 0 ? (
              <EmptyState
                title="No comments yet"
                description={canComment ? 'Be the first to add an update.' : 'There are no updates to view yet.'}
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {comments.map((comment) => (
                  <li key={comment.id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
                    <Link
                      to={ROUTES.USER_PROFILE(comment.authorId)}
                      aria-label={`View ${comment.authorName}'s profile`}
                    >
                      <Avatar
                        src={comment.authorAvatar}
                        name={comment.authorName}
                        alt={`${comment.authorName} profile`}
                        size="sm"
                      />
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <Link
                          to={ROUTES.USER_PROFILE(comment.authorId)}
                          className="text-sm font-semibold text-slate-900 hover:text-violet-700"
                        >
                          {comment.authorName}
                        </Link>
                        <time dateTime={comment.createdAt} className="text-xs text-slate-400">
                          {formatRelativeTime(comment.createdAt)}
                        </time>
                        {canComment && (
                          comment.authorId === currentUser.id ||
                          currentUser.role === USER_ROLES.DIRECTOR
                        ) && (
                          <button
                            type="button"
                            onClick={() => setCommentToDelete(comment)}
                            className="ml-auto rounded-md px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6 text-slate-600">
                        {comment.content}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            {canComment && (
              <form onSubmit={handleSubmitComment} className="space-y-3 border-t border-slate-100 pt-5">
                <FormField label="Add a comment" id="issue-comment" required>
                  <Textarea
                    id="issue-comment"
                    value={content}
                    onChange={(event) => setContent(event.target.value)}
                    rows={3}
                    maxLength={2000}
                    placeholder="Share an update"
                    required
                  />
                </FormField>
                <div className="flex justify-end">
                  <Button type="submit" isLoading={submittingComment}>Post comment</Button>
                </div>
              </form>
            )}
          </Card>
        </>
      )}

      <ConfirmDialog
        isOpen={Boolean(commentToDelete)}
        onClose={() => setCommentToDelete(null)}
        onConfirm={handleDeleteComment}
        title="Delete this comment?"
        message="This comment will be permanently removed."
        confirmText="Delete comment"
        isLoading={deletingComment}
      />
      <ConfirmDialog
        isOpen={confirmIssueDelete}
        onClose={() => setConfirmIssueDelete(false)}
        onConfirm={handleDeleteIssue}
        title="Delete this class issue?"
        message={issue
          ? `Delete “${issue.title}”? Associated comments will be removed and platform users will be notified.`
          : ''}
        confirmText="Delete issue"
        isLoading={deletingIssue}
      />
    </div>
  )
}

export default IssueDetailsPage
