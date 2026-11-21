
import {
  createContext,
  useContext,
  useState,
} from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null)

  const isAuthenticated = currentUser !== null

  function login(user) {
    setCurrentUser(user)
  }

  function logout() {
    setCurrentUser(null)
  }

  const value = {
    currentUser,
    isAuthenticated,
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
