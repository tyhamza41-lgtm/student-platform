import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Pagination from './Pagination'

describe('Pagination', () => {
  it('announces the current page and reports previous, next, and page selections', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()

    render(
      <Pagination
        currentPage={2}
        totalPages={4}
        onPageChange={onPageChange}
      />,
    )

    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('button', { name: 'Go to previous page' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: 'Go to previous page' }))
    await user.click(screen.getByRole('button', { name: 'Page 4' }))
    await user.click(screen.getByRole('button', { name: 'Go to next page' }))

    expect(onPageChange.mock.calls.map(([page]) => page)).toEqual([1, 4, 3])
  })

  it('renders first and last controls with an abbreviated page range', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()

    render(
      <Pagination
        currentPage={6}
        totalPages={10}
        showFirstLast
        onPageChange={onPageChange}
      />,
    )

    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 5' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 7' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Page 10' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    expect(screen.getAllByText('…')).toHaveLength(2)

    await user.click(screen.getByRole('button', { name: 'Go to first page' }))
    await user.click(screen.getByRole('button', { name: 'Go to last page' }))

    expect(onPageChange.mock.calls.map(([page]) => page)).toEqual([1, 10])
  })

  it('disables page changes when disabled and omits trivial ranges', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()

    const { rerender } = render(
      <Pagination
        currentPage={2}
        totalPages={3}
        disabled
        onPageChange={onPageChange}
      />,
    )

    const pageButton = screen.getByRole('button', { name: 'Page 3' })
    expect(pageButton).toBeDisabled()
    await user.click(pageButton)
    expect(onPageChange).not.toHaveBeenCalled()

    rerender(<Pagination currentPage={1} totalPages={1} onPageChange={onPageChange} />)
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
  })
})
