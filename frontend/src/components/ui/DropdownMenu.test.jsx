import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import DropdownMenu from './DropdownMenu'

function Menu({ onSelect = () => {}, closeOnClick = true }) {
  return (
    <DropdownMenu trigger="Actions" closeOnClick={closeOnClick}>
      <DropdownMenu.Item onClick={onSelect}>Edit</DropdownMenu.Item>
      <DropdownMenu.Item disabled onClick={onSelect}>Delete</DropdownMenu.Item>
      <DropdownMenu.Item>Archive</DropdownMenu.Item>
    </DropdownMenu>
  )
}

describe('DropdownMenu', () => {
  it('opens accessibly and closes after an enabled item is selected', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(<Menu onSelect={onSelect} />)

    const trigger = screen.getByRole('button', { name: 'Actions' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')

    await user.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('menu')).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Delete' })).toBeDisabled()

    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })

  it('supports arrow-key navigation and Escape focus restoration', async () => {
    const user = userEvent.setup()

    render(<Menu />)
    const trigger = screen.getByRole('button', { name: 'Actions' })
    trigger.focus()

    await user.keyboard('{ArrowDown}')

    const edit = screen.getByRole('menuitem', { name: 'Edit' })
    const archive = screen.getByRole('menuitem', { name: 'Archive' })
    await waitFor(() => expect(edit).toHaveFocus())

    await user.keyboard('{ArrowDown}')
    expect(archive).toHaveFocus()

    await user.keyboard('{Escape}')

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })

  it('keeps the menu open when closeOnClick is false and closes on outside click', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()

    render(
      <>
        <Menu closeOnClick={false} onSelect={onSelect} />
        <button type="button">Outside</button>
      </>,
    )

    await user.click(screen.getByRole('button', { name: 'Actions' }))
    await user.click(screen.getByRole('menuitem', { name: 'Edit' }))

    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Outside' }))

    expect(screen.queryByRole('menu')).not.toBeInTheDocument()
  })
})
