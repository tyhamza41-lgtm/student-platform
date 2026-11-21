import { useState } from 'react'
import { useAuth } from '../src/context/AuthContext'

export function AuthSession({ user, children }) {
  const { login } = useAuth()
  const [isInitialized, setIsInitialized] = useState(!user)

  if (!isInitialized) {
    return (
      <button
        type="button"
        onClick={() => {
          login(user)
          setIsInitialized(true)
        }}
      >
        Initialize authenticated fixture
      </button>
    )
  }

  return children
}
