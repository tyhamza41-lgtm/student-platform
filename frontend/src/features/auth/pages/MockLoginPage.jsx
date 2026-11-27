import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Alert, Badge, Button, Card } from '../../../components/ui'
import Avatar from '../../../components/ui/Avatar'
import { useAuth } from '../../../context/AuthContext'
import { USER_ROLES } from '../../../constants/roles'
import { getUserRoleLabel, isRepresentative } from '../../../constants/navigation'
import { ROUTES } from '../../../constants/routes'
import PlaceholderPage from '../../../components/common/PlaceholderPage'
import * as usersService from '../../users/users.service'

function MockLoginPage() {
  const { authError, login } = useAuth()
  const navigate = useNavigate()
  const [accounts, setAccounts] = useState([])
  const [accountsLoading, setAccountsLoading] = useState(true)
  const [accountsError, setAccountsError] = useState('')
  const [signInError, setSignInError] = useState('')
  const [signingIn, setSigningIn] = useState(false)

  useEffect(() => {
    if (!import.meta.env.DEV) return undefined
    let active = true
    usersService.getAll({ isActive: true })
      .then((records) => {
        if (active) {
          setAccounts(records.filter((user) => Object.values(USER_ROLES).includes(user.role)))
        }
      })
      .catch((error) => {
        if (active) setAccountsError(error.message || 'Mock accounts could not be loaded.')
      })
      .finally(() => {
        if (active) setAccountsLoading(false)
      })
    return () => { active = false }
  }, [])

  if (!import.meta.env.DEV) {
    return (
      <PlaceholderPage
        title="Sign in"
        description="Mock authentication is unavailable outside development."
      />
    )
  }

  async function signInAs(user) {
    setSignInError('')
    setSigningIn(true)
    try {
      const currentUser = await usersService.getById(user.id)
      if (!currentUser) throw new Error('This mock account could not be found.')
      login(currentUser)
      navigate(
        currentUser.role === USER_ROLES.DIRECTOR
          ? ROUTES.DIRECTOR.DASHBOARD
          : ROUTES.FEED,
        { replace: true },
      )
    } catch (error) {
      setSignInError(error.message || 'The selected mock account could not be loaded.')
    } finally {
      setSigningIn(false)
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-1px)] items-center justify-center px-4 py-8">
      <Card padding="lg" className="w-full max-w-md">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-600">Preview access</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Sign in</h1>
          </div>
          <Badge variant="warning" size="sm">Development only</Badge>
        </div>

        <p className="mb-5 text-sm leading-6 text-slate-600">
          Choose a seeded mock account to preview its role-specific experience. Mock access is for development only and uses no real credentials.
        </p>

        <div className="space-y-3">
          {accountsError && <Alert variant="danger">{accountsError}</Alert>}
          {authError && <Alert variant="danger">{authError}</Alert>}
          {signInError && <Alert variant="danger">{signInError}</Alert>}
          {accountsLoading && (
            <p role="status" className="text-sm text-slate-500">Loading mock accounts…</p>
          )}
          {accounts.map((user) => {
            const representative = isRepresentative(user)
            const roleLabel = representative
              ? 'Active Representative (Student)'
              : getUserRoleLabel(user)

            return (
              <button
                key={user.id}
                type="button"
                disabled={signingIn}
                onClick={() => signInAs(user)}
                className="flex w-full min-w-0 items-center gap-3 rounded-xl border border-slate-200 p-3 text-left transition-colors hover:border-violet-300 hover:bg-violet-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
              >
                <Avatar
                  src={user.avatarUrl}
                  name={user.name}
                  alt={`${user.name} mock profile`}
                  size="md"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-slate-900">{user.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-500">{user.email}</span>
                </span>
                <Badge
                  variant={representative ? 'primary' : user.role === USER_ROLES.DIRECTOR ? 'warning' : 'outline'}
                  size="xs"
                >
                  {roleLabel}
                </Badge>
              </button>
            )
          })}
        </div>

        <p className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          Development preview — the selected account ID is saved locally so this mock session survives refresh.
        </p>

        <Button
          variant="ghost"
          size="sm"
          className="mt-4 w-full"
          onClick={() => navigate(ROUTES.AUTH.REGISTER)}
        >
          Create account preview
        </Button>
      </Card>
    </div>
  )
}

export default MockLoginPage
