import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Checkbox from './Checkbox'

describe('Checkbox', () => {
  it('toggles an uncontrolled checkbox and exposes its description', async () => {
    const user = userEvent.setup()

    render(
      <Checkbox
        label="Email updates"
        description="Receive course announcements."
        defaultChecked
      />,
    )

    const checkbox = screen.getByRole('checkbox', { name: 'Email updates' })
    expect(checkbox).toBeChecked()
    expect(checkbox).toHaveAttribute(
      'aria-describedby',
      'checkbox-email-updates-description',
    )

    await user.click(checkbox)

    expect(checkbox).not.toBeChecked()
  })

  it('reports the next checked state through the native change event', async () => {
    const user = userEvent.setup()
    let checkedDuringChange
    const onChange = vi.fn((event) => {
      checkedDuringChange = event.target.checked
    })

    render(<Checkbox label="Agree" checked={false} onChange={onChange} />)

    const checkbox = screen.getByRole('checkbox', { name: 'Agree' })
    await user.click(checkbox)

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(checkedDuringChange).toBe(true)
    expect(checkbox).not.toBeChecked()
  })

  it('exposes indeterminate, disabled, and error states', () => {
    render(
      <Checkbox
        label="Select all"
        indeterminate
        disabled
        error="Some items could not be selected."
      />,
    )

    const checkbox = screen.getByRole('checkbox', { name: 'Select all' })
    expect(checkbox).toBeDisabled()
    expect(checkbox).toHaveProperty('indeterminate', true)
    expect(checkbox).toHaveAttribute('aria-invalid', 'true')
    expect(checkbox).toHaveAttribute(
      'aria-describedby',
      'checkbox-select-all-error',
    )
  })
})
