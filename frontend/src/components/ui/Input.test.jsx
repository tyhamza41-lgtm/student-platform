import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import Input from './Input'

describe('Input', () => {
  it('associates its label, required state, and helper text', () => {
    render(
      <Input
        id="email"
        label="Email"
        type="email"
        required
        helperText="Use your school email."
      />,
    )

    const input = screen.getByRole('textbox', { name: 'Email' })
    expect(input).toHaveAttribute('type', 'email')
    expect(input).toBeRequired()
    expect(input).toHaveAttribute('aria-describedby', 'email-description')
    expect(screen.getByText('Use your school email.')).toHaveAttribute(
      'id',
      'email-description',
    )
  })

  it('updates a controlled value from user input', async () => {
    const user = userEvent.setup()

    function ControlledInput() {
      const [value, setValue] = useState('')
      return (
        <Input
          id="name"
          label="Name"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      )
    }

    render(<ControlledInput />)
    const input = screen.getByRole('textbox', { name: 'Name' })

    await user.type(input, 'Ada Lovelace')

    expect(input).toHaveValue('Ada Lovelace')
  })

  it('associates a generated id with the label and helper text', () => {
    render(<Input label="Search" helperText="Search by name." />)

    const input = screen.getByRole('textbox', { name: 'Search' })
    expect(input.id).not.toBe('')
    expect(screen.getByLabelText('Search')).toBe(input)
    expect(input).toHaveAttribute('aria-describedby', `${input.id}-description`)
    expect(screen.getByText('Search by name.')).toHaveAttribute(
      'id',
      `${input.id}-description`,
    )
  })

  it('generates unique label associations for multiple instances without ids', () => {
    render(
      <>
        <Input label="First name" />
        <Input label="Last name" />
      </>,
    )

    const firstInput = screen.getByRole('textbox', { name: 'First name' })
    const lastInput = screen.getByRole('textbox', { name: 'Last name' })

    expect(firstInput.id).not.toBe('')
    expect(lastInput.id).not.toBe(firstInput.id)
    expect(screen.getByLabelText('First name')).toBe(firstInput)
    expect(screen.getByLabelText('Last name')).toBe(lastInput)
  })

  it('exposes an error as invalid and disables the field when requested', () => {
    render(
      <Input
        id="username"
        label="Username"
        error="Username is required."
        disabled
      />,
    )

    const input = screen.getByRole('textbox', { name: 'Username' })
    expect(input).toBeDisabled()
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAttribute('aria-describedby', 'username-description')
    expect(screen.getByText('Username is required.')).toBeInTheDocument()
  })
})
