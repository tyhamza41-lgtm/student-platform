import { MockDataError } from '../../mocks/mockDatabase.js'
import * as usersService from '../users/users.service.js'

export const MOCK_AUTH_SESSION_KEY = 'student-platform.mock-auth-session.v1'

function getStorage() {
  try {
    if (!globalThis.localStorage) {
      throw new MockDataError('STORAGE_UNAVAILABLE', 'Mock authentication requires localStorage.')
    }
    return globalThis.localStorage
  } catch (error) {
    if (error instanceof MockDataError) throw error
    throw new MockDataError('STORAGE_UNAVAILABLE', 'Could not access the mock authentication session.')
  }
}

export function persistMockSession(userId) {
  if (!import.meta.env.DEV) return
  if (typeof userId !== 'string' || !userId.trim()) {
    throw new MockDataError('VALIDATION_ERROR', 'A valid mock account is required to sign in.')
  }

  try {
    getStorage().setItem(MOCK_AUTH_SESSION_KEY, userId)
  } catch (error) {
    if (error instanceof MockDataError) throw error
    throw new MockDataError('STORAGE_WRITE_FAILED', 'Could not save the mock authentication session.')
  }
}

export function clearMockSession() {
  try {
    getStorage().removeItem(MOCK_AUTH_SESSION_KEY)
  } catch (error) {
    if (error instanceof MockDataError) throw error
    throw new MockDataError('STORAGE_WRITE_FAILED', 'Could not clear the mock authentication session.')
  }
}

export async function restoreMockSession() {
  if (!import.meta.env.DEV) return null

  const userId = getStorage().getItem(MOCK_AUTH_SESSION_KEY)
  if (!userId) return null

  const user = await usersService.getById(userId)
  if (!user || user.isActive === false) {
    clearMockSession()
    return null
  }

  return user
}
