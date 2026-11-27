import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { resetMockDatabase } from '../../mocks/mockDatabase'
import * as profilesService from '../../features/profiles/profiles.service'
import UserSearch from './UserSearch'

beforeEach(async () => {
  localStorage.clear()
  await resetMockDatabase()
})

function CurrentPath() {
  const location = useLocation()
  return <p data-testid="current-path">{location.pathname}</p>
}

function renderSearch() {
  return render(
    <MemoryRouter initialEntries={['/feed']}>
      <UserSearch />
      <CurrentPath />
    </MemoryRouter>,
  )
}

describe('UserSearch', () => {
  it.each([
    ['student', 'Hamza', 'Student'],
    ['director', 'Nadia', 'Director'],
    ['association', 'Bureau', 'Student Association'],
    ['class representative', 'Omar', 'Class Representative'],
  ])('finds a %s by name', async (_type, name, role) => {
    const user = userEvent.setup()
    renderSearch()

    await user.type(screen.getByRole('combobox', { name: 'Search people' }), name)

    expect(await screen.findByRole('option', { name: new RegExp(`${name}.*${role}`) })).toBeInTheDocument()
  })

  it('uses the latest persisted profile picture in search results', async () => {
    const avatarUrl = 'data:image/jpeg;base64,latest-search-photo'
    await profilesService.update('student-2', { avatarUrl }, 'student-2')
    const user = userEvent.setup()
    renderSearch()

    await user.type(screen.getByRole('combobox', { name: 'Search people' }), 'Hamza')
    const result = await screen.findByRole('option', { name: /Hamza Tya.*Student/ })

    expect(result.querySelector('img')).toHaveAttribute('src', avatarUrl)
  })

  it('shows no irrelevant results for an empty query and a clear no-match state', async () => {
    const user = userEvent.setup()
    renderSearch()
    const search = screen.getByRole('combobox', { name: 'Search people' })

    await user.click(search)
    expect(screen.getByRole('status')).toHaveTextContent('Search for students')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()

    await user.type(search, 'nobody by this name')
    expect(screen.getByRole('status')).toHaveTextContent('No people found')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('navigates to a selected user profile and closes on outside click', async () => {
    const user = userEvent.setup()
    renderSearch()
    const search = screen.getByRole('combobox', { name: 'Search people' })

    await user.type(search, 'Hamza')
    await user.click(await screen.findByRole('option', { name: /Hamza Tya.*Student/ }))

    expect(screen.getByTestId('current-path')).toHaveTextContent('/users/student-2')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('supports arrow-key selection', async () => {
    const user = userEvent.setup()
    renderSearch()
    const search = screen.getByRole('combobox', { name: 'Search people' })

    await user.type(search, 'Omar')
    await user.keyboard('{ArrowDown}{Enter}')

    expect(screen.getByTestId('current-path')).toHaveTextContent('/users/representative-1')
  })

  it('closes the results when the pointer leaves the search area', async () => {
    const user = userEvent.setup()
    renderSearch()
    const search = screen.getByRole('combobox', { name: 'Search people' })

    await user.type(search, 'Hamza')
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    await user.click(document.body)

    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
