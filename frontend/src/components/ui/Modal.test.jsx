import { useRef, useState } from 'react'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Modal from './Modal'

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getClientRects').mockReturnValue([{}])
})

function ModalHarness({ onClose = () => {} }) {
  const [isOpen, setIsOpen] = useState(false)
  const initialFocusRef = useRef(null)

  return (
    <>
      <button type="button" onClick={() => setIsOpen(true)}>
        Open dialog
      </button>
      <Modal
        isOpen={isOpen}
        onClose={() => {
          onClose()
          setIsOpen(false)
        }}
        title="Confirm changes"
        description="Review before saving."
        initialFocusRef={initialFocusRef}
      >
        <button ref={initialFocusRef} type="button">Save changes</button>
        <button type="button">Cancel</button>
      </Modal>
    </>
  )
}

describe('Modal', () => {
  it('opens with dialog semantics and focuses the requested control', async () => {
    const user = userEvent.setup()

    render(<ModalHarness />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open dialog' }))

    const dialog = screen.getByRole('dialog', { name: 'Confirm changes' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleDescription('Review before saving.')
    expect(within(dialog).getByRole('button', { name: 'Save changes' })).toHaveFocus()
  })

  it('wraps keyboard focus and closes on Escape, restoring trigger focus', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<ModalHarness onClose={onClose} />)
    const trigger = screen.getByRole('button', { name: 'Open dialog' })
    await user.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Confirm changes' })
    const closeButton = within(dialog).getByRole('button', { name: 'Close modal' })
    const cancelButton = within(dialog).getByRole('button', { name: 'Cancel' })

    cancelButton.focus()
    await user.tab()
    expect(closeButton).toHaveFocus()

    await user.tab({ shift: true })
    expect(cancelButton).toHaveFocus()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(trigger).toHaveFocus()
  })

  it('closes on a backdrop click but not on an inside click', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(<ModalHarness onClose={onClose} />)
    const trigger = screen.getByRole('button', { name: 'Open dialog' })
    await user.click(trigger)

    const dialog = screen.getByRole('dialog', { name: 'Confirm changes' })
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    await user.click(dialog.parentElement)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(trigger).toHaveFocus()
  })
})
