import { useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, ConfirmDialog, EmptyState, Input, Select, Table } from '../../../components/ui'
import { getUserRoleLabel, isRepresentative } from '../../../constants/navigation'
import { USER_ROLES } from '../../../constants/roles'
import { useAuth } from '../../../context/AuthContext'
import * as directorService from '../director.service'
import DirectorPageHeader from '../components/DirectorPageHeader'

function getAffiliation(user, classesById) {
  if (user.role === USER_ROLES.ASSOCIATION) {
    return 'Association account'
  }
  return classesById.get(user.classId) || 'Unassigned'
}

function getRoleFilterValue(user) {
  if (user.role === USER_ROLES.ASSOCIATION) return 'ASSOCIATION'
  return isRepresentative(user) ? 'REPRESENTATIVE' : 'STUDENT'
}

function StudentsPage() {
  const { currentUser } = useAuth()
  const [users, setUsers] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [reload, setReload] = useState(0)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let active = true
    async function loadUsers() {
      setLoading(true)
      setError('')
      try {
        const [userRecords, classRecords] = await Promise.all([
          directorService.getUsers(currentUser.id),
          directorService.getClasses(currentUser.id),
        ])
        if (active) {
          setUsers(userRecords.sort((a, b) => a.name.localeCompare(b.name)))
          setClasses(classRecords)
        }
      } catch (loadError) {
        if (active) setError(loadError.message || 'User accounts could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadUsers()
    return () => { active = false }
  }, [currentUser.id, reload])

  const classesById = useMemo(
    () => new Map(classes.map((studentClass) => [studentClass.id, studentClass.name])),
    [classes],
  )
  const visibleUsers = users.filter((user) => {
    const matchesSearch = `${user.name} ${user.email}`.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === 'ALL' || getRoleFilterValue(user) === roleFilter
    return matchesSearch && matchesRole
  })

  async function handleDeleteUser() {
    if (!deleteTarget) return
    setDeleting(true)
    setActionError('')
    setSuccess('')
    try {
      await directorService.deleteUser(deleteTarget.id, currentUser.id)
      setUsers((current) => current.filter((user) => user.id !== deleteTarget.id))
      setSuccess(`${deleteTarget.name}'s account was deleted.`)
    } catch (deleteError) {
      setActionError(deleteError.message || 'The user account could not be deleted.')
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <DirectorPageHeader
        title="User Deletion"
        description="Search student, representative, and association accounts and delete eligible users."
      />

      {error && (
        <Alert
          variant="danger"
          title="Users unavailable"
          action={<Button size="sm" variant="outline" onClick={() => setReload((count) => count + 1)}>Try again</Button>}
        >
          {error}
        </Alert>
      )}
      {actionError && <Alert variant="danger" onClose={() => setActionError('')}>{actionError}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <Card className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Input
          label="Search users"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Name or email"
        />
        <Select
          label="User type"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          options={[
            { value: 'ALL', label: 'All users' },
            { value: 'STUDENT', label: 'Students' },
            { value: 'REPRESENTATIVE', label: 'Class Representatives' },
            { value: 'ASSOCIATION', label: 'Associations' },
          ]}
        />
      </Card>

      {loading ? (
        <Card role="status" className="text-sm text-slate-500">Loading users…</Card>
      ) : !error && visibleUsers.length === 0 ? (
        <Card><EmptyState title="No users found" description="Try a different search or user type filter." /></Card>
      ) : !error && (
        <Table aria-label="User accounts">
          <Table.Header>
            <Table.Row>
              <Table.Head>User</Table.Head>
              <Table.Head>Role</Table.Head>
              <Table.Head>Class / Affiliation</Table.Head>
              <Table.Head align="right">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {visibleUsers.map((user) => (
              <Table.Row key={user.id}>
                <Table.Cell>
                  <p className="font-semibold text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </Table.Cell>
                <Table.Cell>
                  <Badge variant={isRepresentative(user) ? 'primary' : 'outline'}>
                    {getUserRoleLabel(user)}
                  </Badge>
                </Table.Cell>
                <Table.Cell>{getAffiliation(user, classesById)}</Table.Cell>
                <Table.Cell align="right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(user)}>Delete</Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDeleteUser}
        title="Delete this user account?"
        message={deleteTarget
          ? `Delete ${deleteTarget.name}? Accounts referenced by platform records cannot be deleted.`
          : ''}
        confirmText="Delete user"
        isLoading={deleting}
      />
    </div>
  )
}

export default StudentsPage
