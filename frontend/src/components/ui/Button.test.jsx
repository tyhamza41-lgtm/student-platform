import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Button from './Button'

describe('Button', () => {
  it('renders as a primary button by default and handles clicks', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(<Button onClick={onClick}>Save</Button>)

    const button = screen.getByRole('button', { name: 'Save' })
    expect(button).toHaveAttribute('type', 'button')
    expect(button).toHaveClass('bg-violet-600')

    await user.click(button)

    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('supports an explicit variant and size', () => {
    render(
      <Button variant="danger" size="lg">
        Delete
      </Button>,
    )

    const button = screen.getByRole('button', { name: 'Delete' })
    expect(button).toHaveClass('bg-red-600', 'h-12')
  })

  it('prevents interaction when disabled or loading', async () => {
    const user = userEvent.setup()
    const onClick = vi.fn()

    render(
      <>
        <Button disabled onClick={onClick}>Disabled</Button>
        <Button isLoading onClick={onClick}>Saving</Button>
      </>,
    )

    const disabledButton = screen.getByRole('button', { name: 'Disabled' })
    const loadingButton = screen.getByRole('button', { name: /Saving/ })

    expect(disabledButton).toBeDisabled()
    expect(loadingButton).toBeDisabled()
    expect(loadingButton).toHaveAttribute('aria-busy', 'true')

    await user.click(disabledButton)
    await user.click(loadingButton)

    expect(onClick).not.toHaveBeenCalled()
  })
})
