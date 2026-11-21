
import {
  createContext,
  useContext,
  useState,
  useCallback,
} from 'react'

const UIContext = createContext(null)

export function UIProvider({ children }) {
  const [activeModal, setActiveModal] = useState(null)
  const [toast, setToast] = useState(null)

  const openModal = useCallback((modal) => {
    setActiveModal(modal)
  }, [])

  const closeModal = useCallback(() => {
    setActiveModal(null)
  }, [])

  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type })
  }, [])

  const clearToast = useCallback(() => {
    setToast(null)
  }, [])

  const value = {
    activeModal,
    toast,

    openModal,
    closeModal,

    showToast,
    clearToast,
  }

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useUI() {
  const context = useContext(UIContext)

  if (context === null) {
    throw new Error('useUI must be used within a UIProvider')
  }

  return context
}
