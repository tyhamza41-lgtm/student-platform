import { useEffect, useMemo, useState } from 'react'
import { Alert, Badge, Button, Card, EmptyState, FormField, Select, Table } from '../../../components/ui'
import { useAuth } from '../../../context/AuthContext'
import * as directorService from '../director.service'
import DirectorPageHeader from '../components/DirectorPageHeader'

function isActiveRepresentative(student) {
  return student.isRepresentative === true && student.representativeStatus === 'ACTIVE'
}

function RepresentativesPage() {
  const { currentUser } = useAuth()
  const [students, setStudents] = useState([])
  const [representatives, setRepresentatives] = useState([])
  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [studentId, setStudentId] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [success, setSuccess] = useState('')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let active = true
    async function loadRepresentatives() {
      setLoading(true)
      setError('')
      try {
        const [studentRecords, representativeRecords, classRecords] = await Promise.all([
          directorService.getStudents(currentUser.id),
          directorService.getRepresentatives(currentUser.id),
          directorService.getClasses(currentUser.id),
        ])
        if (active) {
          setStudents(studentRecords)
          setRepresentatives(representativeRecords.sort((a, b) => a.name.localeCompare(b.name)))
          setClasses(classRecords)
          setClassId((current) => current || classRecords[0]?.id || '')
        }
      } catch (loadError) {
        if (active) setError(loadError.message || 'Representative information could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadRepresentatives()
    return () => { active = false }
  }, [currentUser.id, reload])

  const classesById = useMemo(
    () => new Map(classes.map((studentClass) => [studentClass.id, studentClass])),
    [classes],
  )
  const selectedClass = classesById.get(classId) || null
  const activeCountByClassId = useMemo(() => {
    const counts = new Map()
    for (const studentClass of classes) {
      counts.set(studentClass.id, (studentClass.activeRepresentativeIds || []).length)
    }
    return counts
  }, [classes])
  const selectedClassActiveCount = selectedClass ? (activeCountByClassId.get(selectedClass.id) ?? 0) : 0
  const maxRepresentatives = directorService.MAX_ACTIVE_REPRESENTATIVES_PER_CLASS
  const isClassFull = Boolean(selectedClass) && selectedClassActiveCount >= maxRepresentatives
  const activeRepresentatives = useMemo(
    () => representatives.filter((student) => isActiveRepresentative(student)),
    [representatives],
  )
  const eligibleStudents = students.filter((student) => (
    student.isActive !== false &&
    !isActiveRepresentative(student)
  )).sort((a, b) => a.name.localeCompare(b.name))

  async function handleAssign(event) {
    event.preventDefault()
    setBusy(true)
    setActionError('')
    setSuccess('')
    try {
      const assigned = await directorService.assignRepresentative(studentId, classId, currentUser.id)
      setSuccess(`${assigned.name} is now an active representative for ${classesById.get(classId)?.name || 'the selected class'}.`)
      setStudentId('')
      setReload((count) => count + 1)
    } catch (assignError) {
      setActionError(assignError.message || 'The representative could not be assigned.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeactivate(student) {
    setActionError('')
    setSuccess('')
    try {
      const updated = await directorService.deactivateRepresentative(student.id, currentUser.id)
      setRepresentatives((current) => current.filter((item) => item.id !== updated.id))
      setSuccess(`${updated.name} is no longer an active representative.`)
      setReload((count) => count + 1)
    } catch (deactivateError) {
      setActionError(deactivateError.message || 'The representative could not be deactivated.')
    }
  }

  return (
    <div className="mx-auto max-w-7xl min-w-0 space-y-5">
      <DirectorPageHeader
        title="Representatives"
        description="Assign active students to classes and manage their representative permissions."
      />

      {error && (
        <Alert
          variant="danger"
          title="Representatives unavailable"
          action={<Button size="sm" variant="outline" onClick={() => setReload((count) => count + 1)}>Try again</Button>}
        >
          {error}
        </Alert>
      )}
      {actionError && <Alert variant="danger" onClose={() => setActionError('')}>{actionError}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

      <Card className="min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-slate-900">Assign a representative</h2>
          {selectedClass && (
            <Badge variant={isClassFull ? 'warning' : 'primary'}>
              {selectedClassActiveCount}/{maxRepresentatives} active
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-slate-500">
          Each class can have up to {maxRepresentatives} active representatives. Deactivate an existing representative before transferring them to another class or freeing a slot.
        </p>
        {isClassFull && (
          <Alert variant="warning" className="mt-3">
            {selectedClass.name} has reached the maximum of {maxRepresentatives} active representatives ({selectedClassActiveCount}/{maxRepresentatives}). Deactivate an existing representative below to free a slot before assigning another student.
          </Alert>
        )}
        <form
          className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end"
          onSubmit={handleAssign}
        >
          <div className="min-w-0">
            <FormField label="Class" id="representative-class" required>
              <Select
                id="representative-class"
                value={classId}
                onChange={(event) => {
                  setClassId(event.target.value)
                  setStudentId('')
                }}
                placeholder="Choose a class"
                options={classes.map((studentClass) => ({
                  value: studentClass.id,
                  label: `${studentClass.name} (${activeCountByClassId.get(studentClass.id) ?? 0}/${maxRepresentatives})`,
                }))}
                required
                disabled={classes.length === 0}
              />
            </FormField>
          </div>
          <div className="min-w-0">
            <FormField label="Student" id="representative-student" required>
              <Select
                id="representative-student"
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                placeholder="Choose an active student"
                options={eligibleStudents.map((student) => ({
                  value: student.id,
                  label: `${student.name}${student.classId ? ` — ${classesById.get(student.classId)?.name || student.classId}` : ''}`,
                }))}
                required
                disabled={!classId || eligibleStudents.length === 0 || isClassFull}
              />
            </FormField>
          </div>
          <Button
            type="submit"
            isLoading={busy}
            disabled={!classId || !studentId || busy || isClassFull}
            className="w-full md:col-span-2 lg:col-span-1 lg:w-auto"
          >
            Assign representative
          </Button>
        </form>
      </Card>

      {loading ? (
        <Card role="status" className="text-sm text-slate-500">Loading representatives…</Card>
      ) : !error && activeRepresentatives.length === 0 ? (
        <Card><EmptyState title="No active representatives" description="Assign an active student to begin managing class representatives." /></Card>
      ) : !error && (
        <>
          <ul aria-label="Active class representatives" className="space-y-3 md:hidden">
            {activeRepresentatives.map((student) => {
              const assignedClass = classesById.get(student.classId)
              return (
                <li key={student.id}>
                  <Card className="space-y-3">
                    <div className="min-w-0">
                      <p className="break-words font-semibold text-slate-900">{student.name}</p>
                      <p className="break-all text-xs text-slate-500">{student.email}</p>
                    </div>
                    <div className="text-sm text-slate-600">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Assigned class: </span>
                      <span className="font-medium text-slate-800">{assignedClass?.name || 'Unassigned'}</span>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeactivate(student)}
                      className="w-full"
                    >
                      Deactivate
                    </Button>
                  </Card>
                </li>
              )
            })}
          </ul>

          <div className="hidden md:block">
            <Table aria-label="Class representatives">
              <Table.Header>
                <Table.Row>
                  <Table.Head>Representative</Table.Head>
                  <Table.Head>Assigned class</Table.Head>
                  <Table.Head align="right">Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {activeRepresentatives.map((student) => {
                  const assignedClass = classesById.get(student.classId)
                  return (
                    <Table.Row key={student.id}>
                      <Table.Cell>
                        <p className="font-semibold text-slate-900">{student.name}</p>
                        <p className="text-xs text-slate-500">{student.email}</p>
                      </Table.Cell>
                      <Table.Cell>{assignedClass?.name || 'Unassigned'}</Table.Cell>
                      <Table.Cell align="right">
                        <Button size="sm" variant="outline" onClick={() => handleDeactivate(student)}>
                          Deactivate
                        </Button>
                      </Table.Cell>
                    </Table.Row>
                  )
                })}
              </Table.Body>
            </Table>
          </div>
        </>
      )}
    </div>
  )
}

export default RepresentativesPage
