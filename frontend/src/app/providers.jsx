
import { RouterProvider } from 'react-router'
import router from './router'
import { AuthProvider } from '../context/AuthContext'
import { UIProvider } from '../context/UIContext'

function AppProviders() {
  return (
    <AuthProvider>
      <UIProvider>
        <RouterProvider router={router} />
      </UIProvider>
    </AuthProvider>
  )
}

export default AppProviders
