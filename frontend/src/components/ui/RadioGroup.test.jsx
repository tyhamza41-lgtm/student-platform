import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Radio, { RadioGroup } from './Radio'

function RadioOptions(props) {
  return (
    <RadioGroup name="contact" label="Contact method" {...props}>
      <Radio value="email" label="Email" />
      <Radio value="phone" label="Phone" />
    </RadioGroup>
  )
}

describe('RadioGroup', () => {
  it('selects the default value and reports a user selection', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<RadioOptions defaultValue="email" onChange={onChange} />)

    const group = screen.getByRole('radiogroup', { name: 'Contact method' })
    const email = screen.getByRole('radio', { name: 'Email' })
    const phone = screen.getByRole('radio', { name: 'Phone' })

    expect(group).toBeInTheDocument()
    expect(email).toBeChecked()

    await user.click(phone)

    expect(phone).toBeChecked()
    expect(email).not.toBeChecked()
    expect(onChange).toHaveBeenCalledWith('phone')
  })

  it('keeps controlled selection until the parent changes the value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<RadioOptions value="email" onChange={onChange} />)

    const phone = screen.getByRole('radio', { name: 'Phone' })
    await user.click(phone)

    expect(onChange).toHaveBeenCalledWith('phone')
    expect(screen.getByRole('radio', { name: 'Email' })).toBeChecked()
    expect(phone).not.toBeChecked()
  })

  it('respects disabled group and option states', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    function DisabledOptions() {
      const [value, setValue] = useState('email')
      return (
        <RadioGroup
          name="contact"
          label="Contact method"
          value={value}
          onChange={(nextValue) => {
            onChange(nextValue)
            setValue(nextValue)
          }}
        >
          <Radio value="email" label="Email" disabled />
          <Radio value="phone" label="Phone" />
        </RadioGroup>
      )
    }

    render(<DisabledOptions />)
    const email = screen.getByRole('radio', { name: 'Email' })
    const phone = screen.getByRole('radio', { name: 'Phone' })

    expect(email).toBeDisabled()
    await user.click(email)
    expect(onChange).not.toHaveBeenCalled()

    await user.click(phone)
    expect(phone).toBeChecked()
    expect(onChange).toHaveBeenCalledWith('phone')
  })
})
