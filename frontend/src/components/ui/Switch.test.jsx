import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Switch from './Switch'

describe('Switch', () => {
  it('toggles its uncontrolled state and reports the new value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <Switch
        label="Notifications"
        defaultChecked
        onChange={onChange}
      />,
    )

    const toggle = screen.getByRole('switch', { name: 'Notifications' })
    expect(toggle).toHaveAttribute('aria-checked', 'true')

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(onChange).toHaveBeenCalledWith(
      false,
      expect.objectContaining({ type: 'click' }),
    )
  })

  it('supports controlled keyboard interaction', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    function ControlledSwitch() {
      const [checked, setChecked] = useState(false)
      return (
        <Switch
          label="Dark mode"
          checked={checked}
          onChange={(nextChecked) => {
            onChange(nextChecked)
            setChecked(nextChecked)
          }}
        />
      )
    }

    render(<ControlledSwitch />)
    const toggle = screen.getByRole('switch', { name: 'Dark mode' })
    toggle.focus()
    await user.keyboard(' ')

    expect(toggle).toHaveAttribute('aria-checked', 'true')
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it('does not toggle while disabled', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<Switch label="Unavailable" disabled onChange={onChange} />)

    const toggle = screen.getByRole('switch', { name: 'Unavailable' })
    expect(toggle).toBeDisabled()

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-checked', 'false')
    expect(onChange).not.toHaveBeenCalled()
  })
})
