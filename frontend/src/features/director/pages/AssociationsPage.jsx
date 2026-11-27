import { useEffect, useState } from 'react'
import { Alert, Button, Card, ConfirmDialog, EmptyState, FormField, Input, Modal, Table, Textarea } from '../../../components/ui'
import { useAuth } from '../../../context/AuthContext'
import * as directorService from '../director.service'
import DirectorPageHeader from '../components/DirectorPageHeader'

const EMPTY_DRAFT = { name: '', institution: '', description: '' }

function AssociationsPage() {
  const { currentUser } = useAuth()
  const [associations, setAssociations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [success, setSuccess] = useState('')
  const [reload, setReload] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editingAssociation, setEditingAssociation] = useState(null)
  const [draft, setDraft] = useState(EMPTY_DRAFT)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    async function loadAssociations() {
      setLoading(true)
      setError('')
      try {
        const records = await directorService.getAssociations(currentUser.id)
        if (active) setAssociations(records.sort((a, b) => a.name.localeCompare(b.name)))
      } catch (loadError) {
        if (active) setError(loadError.message || 'Associations could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }

    loadAssociations()
    return () => { active = false }
  }, [currentUser.id, reload])

  function openCreateForm() {
    setEditingAssociation(null)
    setDraft(EMPTY_DRAFT)
    setActionError('')
    setFormOpen(true)
  }

  function openEditForm(association) {
    setEditingAssociation(association)
    setDraft({
      name: association.name || '',
      institution: association.institution || '',
      description: association.description || '',
    })
    setActionError('')
    setFormOpen(true)
  }

  async function handleSaveAssociation(event) {
    event.preventDefault()
    setBusy(true)
    setActionError('')
    setSuccess('')
    try {
      if (editingAssociation) {
        const updated = await directorService.updateAssociation(
          editingAssociation.id,
          draft,
          currentUser.id,
        )
        setAssociations((current) => current.map((item) => item.id === updated.id ? updated : item))
        setSuccess(`${updated.name} was updated.`)
      } else {
        const created = await directorService.createAssociation(draft, currentUser.id)
        setAssociations((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)))
        setSuccess(`${created.name} was added.`)
      }
      setFormOpen(false)
    } catch (saveError) {
      setActionError(saveError.message || 'The association could not be saved.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDeleteAssociation() {
    if (!deleteTarget) return
    setActionError('')
    setSuccess('')
    try {
      await directorService.deleteAssociation(deleteTarget.id, currentUser.id)
      setAssociations((current) => current.filter((item) => item.id !== deleteTarget.id))
      setSuccess(`${deleteTarget.name} was deleted.`)
    } catch (deleteError) {
      setActionError(deleteError.message || 'The association could not be deleted.')
    } finally {
      setDeleteTarget(null)
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <DirectorPageHeader
        title="Associations"
        description="Manage association profiles and institution details."
        action={<Button onClick={openCreateForm}>Add association</Button>}
      />

      {error && (
        <Alert
          variant="danger"
          title="Associations unavailable"
          action={<Button size="sm" variant="outline" onClick={() => setReload((count) => count + 1)}>Try again</Button>}
        >
          {error}
        </Alert>
      )}
      {actionError && !formOpen && <Alert variant="danger" onClose={() => setActionError('')}>{actionError}</Alert>}
      {success && <Alert variant="success" onClose={() => setSuccess('')}>{success}</Alert>}

      {loading ? (
        <Card role="status" className="text-sm text-slate-500">Loading associations…</Card>
      ) : !error && associations.length === 0 ? (
        <Card><EmptyState title="No associations" description="Add an association to begin managing it here." /></Card>
      ) : !error && (
        <Table aria-label="Association records">
          <Table.Header>
            <Table.Row>
              <Table.Head>Association</Table.Head>
              <Table.Head>Institution</Table.Head>
              <Table.Head align="right">Actions</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {associations.map((association) => (
              <Table.Row key={association.id}>
                <Table.Cell>
                  <p className="font-semibold text-slate-900">{association.name}</p>
                  <p className="max-w-md text-xs leading-5 text-slate-500">{association.description || 'No description'}</p>
                </Table.Cell>
                <Table.Cell>{association.institution || 'Not specified'}</Table.Cell>
                <Table.Cell align="right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditForm(association)}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => setDeleteTarget(association)}>Delete</Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => !busy && setFormOpen(false)}
        title={editingAssociation ? 'Edit association' : 'Add association'}
        description="Keep the association’s public profile information accurate."
      >
        <form className="space-y-4" onSubmit={handleSaveAssociation}>
          <FormField label="Association name" id="association-name" required>
            <Input
              id="association-name"
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              maxLength={160}
              required
            />
          </FormField>
          <FormField label="Institution" id="association-institution">
            <Input
              id="association-institution"
              value={draft.institution}
              onChange={(event) => setDraft((current) => ({ ...current, institution: event.target.value }))}
            />
          </FormField>
          <FormField label="Description" id="association-description">
            <Textarea
              id="association-description"
              value={draft.description}
              onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
              rows={4}
            />
          </FormField>
          {actionError && <p role="alert" className="text-sm text-red-700">{actionError}</p>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" disabled={busy} onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={busy}>
              {editingAssociation ? 'Save changes' : 'Create association'}
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteAssociation}
        title="Delete this association?"
        message={deleteTarget
          ? `Delete ${deleteTarget.name}? Associations referenced by users, posts, or events cannot be deleted.`
          : ''}
        confirmText="Delete association"
      />
    </div>
  )
}

export default AssociationsPage
