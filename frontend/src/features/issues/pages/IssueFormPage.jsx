import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Alert, Button, Card, FormField, Input, Textarea } from '../../../components/ui'
import { ROUTES } from '../../../constants/routes'
import { useAuth } from '../../../context/AuthContext'
import * as issuesService from '../issues.service'

function IssueFormPage() {
  const { currentUser } = useAuth()
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const issue = await issuesService.create({
        classId: currentUser.classId,
        title,
        description,
      }, currentUser.id)
      navigate(ROUTES.ISSUE_DETAILS(issue.id), {
        state: { successMessage: 'Your class issue has been submitted.' },
      })
    } catch (submitError) {
      setError(submitError.message || 'Your class issue could not be submitted.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        to={ROUTES.ISSUES}
        className="inline-flex min-h-10 items-center rounded-lg px-3 text-sm font-semibold text-violet-700 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
      >
        ← All class issues
      </Link>

      <Card className="space-y-6 sm:p-8">
        <header>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-violet-600">Class representative</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Create Class Issue</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            Describe a problem affecting your class. The Director will review your report.
          </p>
        </header>

        {error && <Alert variant="danger" title="Issue could not be submitted">{error}</Alert>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <FormField label="Issue title" id="issue-title" required>
            <Input
              id="issue-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={180}
              placeholder="Summarize the problem"
              autoComplete="off"
              required
            />
          </FormField>
          <FormField label="Description" id="issue-description" required>
            <Textarea
              id="issue-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={6}
              maxLength={5000}
              placeholder="Add details that will help the Director understand the issue"
              required
            />
          </FormField>
          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <Link
              to={ROUTES.ISSUES}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            >
              Cancel
            </Link>
            <Button type="submit" isLoading={submitting}>Submit issue</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}

export default IssueFormPage
