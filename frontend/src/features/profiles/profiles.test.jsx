import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { users as authUsers } from '../../../tests/auth-fixtures'
import { AuthSession } from '../../../tests/auth-test-utils'
import { AuthProvider } from '../../context/AuthContext'
import { resetMockDatabase } from '../../mocks/mockDatabase'
import ProfilePage from './pages/ProfilePage'
import PublicProfilePage from './pages/PublicProfilePage'
import * as profilesService from './profiles.service'

beforeEach(async () => {
  localStorage.clear()
  await resetMockDatabase()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function mockPhotoProcessing({ readFails = false, imageFails = false } = {}) {
  const fileReads = vi.fn()
  class MockFileReader {
    readAsDataURL(file) {
      fileReads(file)
      if (readFails) {
        this.onerror?.()
        return
      }
      this.result = `data:${file.type};base64,source`
      this.onload?.()
    }
  }
  class MockImage {
    naturalWidth = 800
    naturalHeight = 400

    set src(value) {
      this.source = value
      if (imageFails) this.onerror?.()
      else this.onload?.()
    }
  }
  const context = {
    fillStyle: '',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  }
  vi.stubGlobal('FileReader', MockFileReader)
  vi.stubGlobal('Image', MockImage)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context)
  const toDataURL = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL')
    .mockReturnValue('data:image/jpeg;base64,processed')
  return { fileReads, context, toDataURL }
}

async function renderProfileRoute(path, user = authUsers.student) {
  const router = createMemoryRouter([
    { path: '/profile', element: <ProfilePage /> },
    { path: '/users/:userId', element: <PublicProfilePage /> },
  ], { initialEntries: [path] })

  const view = render(
    <AuthProvider>
      <AuthSession user={user}>
        <RouterProvider router={router} />
      </AuthSession>
    </AuthProvider>,
  )

  await userEvent.setup().click(
    screen.getByRole('button', { name: 'Initialize authenticated fixture' }),
  )
  return { ...view, router }
}

describe('user profiles', () => {
  it.each([
    ['student', '/users/student-1', 'Sam Student', 'Student', 'Class/Group: GINF 2 — Génie Informatique (class-ginf-2)'],
    ['representative', '/users/representative-1', 'Omar Benali', 'Class Representative', 'Class/Group: GINF 2 — Génie Informatique (class-ginf-2)'],
    ['Director', '/users/director-1', 'Dr. Nadia Alaoui', 'Director', null],
    ['Association', '/users/association-1', 'Bureau des Arts', 'Association', 'Association: Bureau des Arts (association-1)'],
  ])('shows the correct public fields for a %s profile', async (_role, path, name, roleLabel, details) => {
    await renderProfileRoute(path)

    expect(await screen.findByRole('heading', { name })).toBeInTheDocument()
    expect(screen.getByText(roleLabel)).toBeInTheDocument()
    if (details) expect(screen.getByText(details)).toBeInTheDocument()
    expect(screen.queryByText(/@studentplatform\.ma/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Phone number')).not.toBeInTheDocument()
  })

  it('loads the requested public profile rather than the signed-in user and handles unknown IDs', async () => {
    const profileView = await renderProfileRoute('/users/association-2')

    expect(await screen.findByRole('heading', { name: 'Club Innovation & Technologies' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Sam Student' })).not.toBeInTheDocument()
    expect(screen.getByText(/Association: Club Innovation & Technologies/)).toBeInTheDocument()
    profileView.unmount()
    profileView.router.dispose()

    await renderProfileRoute('/users/missing-user')
    expect(await screen.findByRole('alert')).toHaveTextContent('This profile could not be found.')
  })

  it('shows the latest saved picture on a public profile after consecutive updates', async () => {
    await profilesService.update(
      'representative-1',
      { avatarUrl: 'data:image/jpeg;base64,first-photo' },
      'representative-1',
    )
    const latestPhoto = 'data:image/jpeg;base64,second-photo'
    await profilesService.update(
      'representative-1',
      { avatarUrl: latestPhoto },
      'representative-1',
    )
    await renderProfileRoute('/users/representative-1')

    expect(await screen.findByRole('img', { name: 'Omar Benali profile' }))
      .toHaveAttribute('src', latestPhoto)
  })

  it.each([
    ['student', authUsers.student],
    ['representative', authUsers.representative],
    ['Director', authUsers.director],
    ['Association', authUsers.association],
  ])('offers only the shared permitted editable fields for a %s', async (_role, user) => {
    await renderProfileRoute('/profile', user)

    expect(await screen.findByRole('heading', { name: 'My Profile' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change profile picture' })).toBeInTheDocument()
    expect(screen.getByLabelText('Choose profile picture')).toHaveAttribute(
      'accept',
      '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp',
    )
    expect(screen.queryByText('Profile photo URL')).not.toBeInTheDocument()
    expect(screen.queryByText('Use an image URL or a supported local image URL.')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'About' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /role|class|association/i })).not.toBeInTheDocument()
  })

  it('validates, saves, and reloads permitted profile edits from the centralized database', async () => {
    const user = userEvent.setup()
    const view = await renderProfileRoute('/profile')
    mockPhotoProcessing()

    await screen.findByRole('heading', { name: 'My Profile' })
    await user.clear(screen.getByRole('textbox', { name: 'Name' }))
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(await screen.findByText('Enter your name.')).toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Sam Updated')
    await user.upload(
      screen.getByLabelText('Choose profile picture'),
      new File(['image'], 'sam.png', { type: 'image/png' }),
    )
    await user.type(screen.getByRole('textbox', { name: 'About' }), 'Computer science student')
    await user.type(screen.getByRole('textbox', { name: 'Phone number' }), '+212 600 000 000')
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByText('Your profile has been updated.')).toBeInTheDocument()
    expect(await profilesService.getOwnProfile('student-1', 'student-1')).toMatchObject({
      name: 'Sam Updated',
      avatarUrl: 'data:image/jpeg;base64,processed',
      bio: 'Computer science student',
      phone: '+212 600 000 000',
    })

    view.unmount()
    view.router.dispose()
    await renderProfileRoute('/profile')
    expect(await screen.findByRole('textbox', { name: 'Name' })).toHaveValue('Sam Updated')
    expect(screen.getByRole('textbox', { name: 'Phone number' })).toHaveValue('+212 600 000 000')
    expect(screen.getByRole('button', { name: 'Change profile picture' }).querySelector('img'))
      .toHaveAttribute('src', 'data:image/jpeg;base64,processed')
  })

  it('lets the user save a second profile picture after the first one', async () => {
    const user = userEvent.setup()
    const { toDataURL } = mockPhotoProcessing()
    const firstPhoto = 'data:image/jpeg;base64,first-saved-photo'
    const secondPhoto = 'data:image/jpeg;base64,second-saved-photo'
    toDataURL.mockReturnValueOnce(firstPhoto).mockReturnValueOnce(secondPhoto)
    await renderProfileRoute('/profile')
    const input = screen.getByLabelText('Choose profile picture')

    await user.upload(input, new File(['first'], 'first.png', { type: 'image/png' }))
    await user.click(screen.getByRole('button', { name: 'Save profile' }))
    expect(await screen.findByText('Your profile has been updated.')).toBeInTheDocument()
    expect((await profilesService.getById('student-1')).avatarUrl).toBe(firstPhoto)

    await user.upload(input, new File(['second'], 'second.webp', { type: 'image/webp' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Change profile picture' }).querySelector('img'))
        .toHaveAttribute('src', secondPhoto)
    })
    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByText('Your profile has been updated.')).toBeInTheDocument()
    expect((await profilesService.getById('student-1')).avatarUrl).toBe(secondPhoto)
  })

  it('validates the image, previews the cropped JPEG, and allows selecting the same file again', async () => {
    const user = userEvent.setup({ applyAccept: false })
    const { fileReads, context, toDataURL } = mockPhotoProcessing()
    await renderProfileRoute('/profile')

    const input = screen.getByLabelText('Choose profile picture')
    const invalidFile = new File(['not an image'], 'photo.gif', { type: 'image/gif' })
    await user.upload(input, invalidFile)
    expect(await screen.findByRole('alert')).toHaveTextContent('Choose a JPG, PNG, or WEBP image.')
    expect(input).toHaveValue('')
    expect(fileReads).not.toHaveBeenCalled()

    const file = new File(['image'], 'photo.png', { type: 'image/png' })
    await user.upload(input, file)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Change profile picture' }).querySelector('img'))
        .toHaveAttribute('src', 'data:image/jpeg;base64,processed')
    })
    expect(input).toHaveValue('')
    expect(context.fillStyle).toBe('#fff')
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 400, 400)
    expect(context.drawImage.mock.calls[0].slice(1)).toEqual([-200, 0, 800, 400])
    expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8)

    await user.upload(input, file)
    await waitFor(() => expect(fileReads).toHaveBeenCalledTimes(2))
    expect(input).toHaveValue('')
  })

  it('rejects images over 2 MB and shows an error when the image cannot be read', async () => {
    const user = userEvent.setup()
    const { fileReads } = mockPhotoProcessing({ readFails: true })
    await renderProfileRoute('/profile')
    const input = screen.getByLabelText('Choose profile picture')
    const oversizedImage = new File(
      [new Uint8Array(2 * 1024 * 1024 + 1)],
      'large.png',
      { type: 'image/png' },
    )

    await user.upload(input, oversizedImage)
    expect(await screen.findByRole('alert')).toHaveTextContent('The image must be 2 MB or smaller.')
    expect(fileReads).not.toHaveBeenCalled()
    expect(input).toHaveValue('')

    await user.upload(input, new File(['broken'], 'broken.webp', { type: 'image/webp' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The selected image could not be read.')
    expect(input).toHaveValue('')
  })

  it('reports a clear error when the selected image cannot be decoded', async () => {
    const user = userEvent.setup()
    mockPhotoProcessing({ imageFails: true })
    await renderProfileRoute('/profile')
    const input = screen.getByLabelText('Choose profile picture')

    await user.upload(input, new File(['broken image'], 'broken.jpg', { type: 'image/jpeg' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('The selected image could not be read.')
    expect(input).toHaveValue('')
  })

  it('does not report success when the localStorage write fails', async () => {
    const user = userEvent.setup()
    const originalPhoto = (await profilesService.getById('student-1')).avatarUrl
    mockPhotoProcessing()
    await renderProfileRoute('/profile')
    await user.upload(
      screen.getByLabelText('Choose profile picture'),
      new File(['image'], 'photo.png', { type: 'image/png' }),
    )
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Change profile picture' }).querySelector('img'))
        .toHaveAttribute('src', 'data:image/jpeg;base64,processed')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Storage full', 'QuotaExceededError')
    })

    await user.click(screen.getByRole('button', { name: 'Save profile' }))

    expect(await screen.findByText('Could not persist mock data to localStorage.')).toBeInTheDocument()
    expect(screen.queryByText('Your profile has been updated.')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Change profile picture' }).querySelector('img'))
      .toHaveAttribute('src', originalPhoto)
    expect((await profilesService.getById('student-1')).avatarUrl).toBe(originalPhoto)
  })
})
