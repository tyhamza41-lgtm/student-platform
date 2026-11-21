import { useNavigate } from 'react-router'
import { Badge, Button, Card } from '../../../components/ui'
import Avatar from '../../../components/ui/Avatar'
import { useAuth } from '../../../context/AuthContext'
import { ROUTES } from '../../../constants/routes'
import { users } from '../../../mocks/data/users'
import PlaceholderPage from '../../../components/common/PlaceholderPage'

const studentFixtures = users.filter((user) => (
  user.role === 'STUDENT'
))

function MockLoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()

  if (!import.meta.env.DEV) {
    return (
      <PlaceholderPage
        title="Sign in"
        description="Mock authentication is unavailable outside development."
      />
    )
  }

  function signInAs(user) {
    login(user)
    navigate(ROUTES.FEED, { replace: true })
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
          Choose a mock account to preview the student experience. This is in-memory only and cannot be used for real authentication.
        </p>

        <div className="space-y-3">
          {studentFixtures.map((user) => (
            <button
              key={user.id}
              type="button"
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
              <Badge variant={user.representativeStatus === 'ACTIVE' ? 'primary' : 'outline'} size="xs">
                {user.representativeStatus === 'ACTIVE' ? 'Representative' : 'Student'}
              </Badge>
            </button>
          ))}
        </div>

        <p className="mt-5 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          Development preview — no real credentials or session persistence.
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
