
import {
  createContext,
  useEffect,
  useContext,
  useState,
} from 'react'
import {
  clearMockSession,
  persistMockSession,
  restoreMockSession,
} from '../features/auth/auth.service'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let active = true
    restoreMockSession()
      .then((user) => {
        if (active) setCurrentUser(user)
      })
      .catch((error) => {
        if (active) setAuthError(error.message || 'The saved mock session could not be restored.')
      })
      .finally(() => {
        if (active) setIsInitializing(false)
      })

    return () => { active = false }
  }, [])

  const isAuthenticated = currentUser !== null

  function login(user) {
    persistMockSession(user?.id)
    setAuthError('')
    setCurrentUser(user)
  }

  function logout() {
    clearMockSession()
    setAuthError('')
    setCurrentUser(null)
  }

  const value = {
    currentUser,
    isAuthenticated,
    isInitializing,
    authError,
    login,
    logout,
    setCurrentUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext)

  if (context === null) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    )
  }

  return context
}
