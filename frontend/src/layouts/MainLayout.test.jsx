import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { AuthProvider } from '../context/AuthContext'
import { AuthSession } from '../../tests/auth-test-utils'
import { users } from '../../tests/auth-fixtures'
import MainLayout from './MainLayout'

beforeEach(() => {
  localStorage.clear()
})

async function renderLayout() {
  render(
    <MemoryRouter initialEntries={['/feed']}>
      <AuthProvider>
        <AuthSession user={users.student}>
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/feed" element={<h1>Dashboard content</h1>} />
            </Route>
          </Routes>
        </AuthSession>
      </AuthProvider>
    </MemoryRouter>,
  )

  await userEvent.setup().click(
    screen.getByRole('button', { name: 'Initialize authenticated fixture' }),
  )
}

describe('MainLayout', () => {
  it('keeps the desktop sidebar and topbar sticky in the shared shell', async () => {
    await renderLayout()

    const sidebar = screen.getByRole('complementary', { name: 'Main navigation' })
    expect(sidebar.className).toContain('sticky')
    expect(sidebar.className).toContain('xl:top-5')

    for (const topbar of screen.getAllByRole('banner')) {
      expect(topbar.parentElement.className).toContain('sticky')
    }

    expect(within(sidebar).getByRole('link', { name: 'NEXUS — go to home' })).toBeInTheDocument()
  })

  it('uses bottom navigation without a mobile sidebar drawer or hamburger', async () => {
    await renderLayout()

    expect(screen.queryByRole('button', { name: /open sidebar|close sidebar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: 'Main navigation' })).not.toBeInTheDocument()

    const mobileNavigation = screen.getByRole('navigation', { name: 'Mobile navigation' })
    expect(within(mobileNavigation).getByRole('link', { name: 'Events' })).toHaveAttribute('href', '/events')
  })
})
