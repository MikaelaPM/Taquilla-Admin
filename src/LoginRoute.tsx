import { Navigate } from 'react-router-dom'
import { LoginScreen } from '@/components/LoginScreen'
import { useApp } from '@/contexts/AppContext'

export default function LoginRoute() {
  const { currentUser, isLoading, login } = useApp()

  // Mostrar loading mientras se verifica la sesión
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si ya hay usuario, redirigir al dashboard
  if (currentUser) {
    return <Navigate to="/dashboard" replace />
  }

  return <LoginScreen onLogin={login} />
}
