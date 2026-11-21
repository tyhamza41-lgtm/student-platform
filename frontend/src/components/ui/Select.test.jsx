import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Select from './Select'

describe('Select', () => {
  it('renders labeled options and changes a controlled value', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    function ControlledSelect() {
      const [value, setValue] = useState('')
      return (
        <Select
          label="Course"
          name="course"
          value={value}
          onChange={(event) => {
            onChange(event.target.value)
            setValue(event.target.value)
          }}
          placeholder="Choose a course"
          helperText="Select the course you are taking."
          options={[
            { value: 'math', label: 'Mathematics' },
            { value: 'science', label: 'Science' },
          ]}
        />
      )
    }

    render(<ControlledSelect />)
    const select = screen.getByRole('combobox', { name: 'Course' })

    expect(select).toHaveValue('')
    expect(select.id).not.toBe('')
    expect(screen.getByRole('option', { name: 'Choose a course' })).toBeDisabled()
    expect(select).toHaveAttribute('aria-describedby', `${select.id}-description`)
    expect(screen.getByText('Select the course you are taking.')).toHaveAttribute(
      'id',
      `${select.id}-description`,
    )

    await user.selectOptions(select, 'science')

    expect(select).toHaveValue('science')
    expect(onChange).toHaveBeenCalledWith('science')
  })

  it('supports string options and custom option children', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <Select id="status" label="Status" onChange={onChange} options={['Draft', 'Published']}>
        <option value="custom">Custom option</option>
      </Select>,
    )

    const select = screen.getByRole('combobox', { name: 'Status' })
    expect(screen.getByRole('option', { name: 'Custom option' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Draft' })).not.toBeInTheDocument()

    await user.selectOptions(select, 'custom')

    expect(onChange.mock.calls[0][0].target.value).toBe('custom')
  })

  it('associates a generated id with the label and error message', () => {
    render(
      <Select
        label="Status"
        error="Choose a status."
        options={['Draft', 'Published']}
      />,
    )

    const select = screen.getByRole('combobox', { name: 'Status' })
    expect(select.id).not.toBe('')
    expect(screen.getByLabelText('Status')).toBe(select)
    expect(select).toHaveAttribute('aria-describedby', `${select.id}-description`)
    expect(screen.getByText('Choose a status.')).toHaveAttribute(
      'id',
      `${select.id}-description`,
    )
  })

  it('generates unique label associations for multiple instances without ids', () => {
    render(
      <>
        <Select label="First course" options={['Math']} />
        <Select label="Second course" options={['Science']} />
      </>,
    )

    const firstSelect = screen.getByRole('combobox', { name: 'First course' })
    const secondSelect = screen.getByRole('combobox', { name: 'Second course' })

    expect(firstSelect.id).not.toBe('')
    expect(secondSelect.id).not.toBe(firstSelect.id)
    expect(screen.getByLabelText('First course')).toBe(firstSelect)
    expect(screen.getByLabelText('Second course')).toBe(secondSelect)
  })

  it('exposes required and error states and prevents disabled changes', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(
      <Select
        id="status"
        label="Status"
        required
        disabled
        error="Choose a status."
        options={['Draft', 'Published']}
        onChange={onChange}
      />,
    )

    const select = screen.getByRole('combobox', { name: 'Status' })
    expect(select).toBeRequired()
    expect(select).toBeDisabled()
    expect(select).toHaveAttribute('aria-invalid', 'true')
    expect(select).toHaveAttribute('aria-describedby', 'status-description')

    await user.selectOptions(select, 'Draft')

    expect(onChange).not.toHaveBeenCalled()
  })
})
