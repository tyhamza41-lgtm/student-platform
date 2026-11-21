import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import Tabs from './Tabs'

const items = [
  { id: 'overview', label: 'Overview', content: 'Overview content' },
  { id: 'activity', label: 'Activity', content: 'Activity content' },
  { id: 'settings', label: 'Settings', content: 'Settings content' },
]

describe('Tabs', () => {
  it('selects the first item by default and changes panels on click', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()

    render(<Tabs items={items} onChange={onChange} />)

    const overview = screen.getByRole('tab', { name: 'Overview' })
    const activity = screen.getByRole('tab', { name: 'Activity' })

    expect(overview).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Overview content')
    expect(screen.queryByText('Activity content')).not.toBeInTheDocument()

    await user.click(activity)

    expect(activity).toHaveAttribute('aria-selected', 'true')
    expect(onChange).toHaveBeenCalledWith('activity')
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Activity content')
  })

  it('keeps a controlled selection until the parent changes it', async () => {
    const user = userEvent.setup()
    const onValueChange = vi.fn()

    render(<Tabs items={items} value="overview" onValueChange={onValueChange} />)
    await user.click(screen.getByRole('tab', { name: 'Settings' }))

    expect(onValueChange).toHaveBeenCalledWith('settings')
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Overview content')
  })

  it('moves and activates tabs with arrow keys while skipping disabled tabs', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const keyboardItems = [
      items[0],
      { id: 'disabled', label: 'Unavailable', content: 'Hidden', disabled: true },
      items[1],
    ]

    render(<Tabs items={keyboardItems} onChange={onChange} variant="pills" />)

    const overview = screen.getByRole('tab', { name: 'Overview' })
    const activity = screen.getByRole('tab', { name: 'Activity' })
    overview.focus()
    await user.keyboard('{ArrowRight}')

    expect(activity).toHaveFocus()
    expect(activity).toHaveAttribute('aria-selected', 'true')
    expect(onChange).toHaveBeenCalledWith('activity')
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument()
  })
})
