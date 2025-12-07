import { Navigate, useLocation } from 'react-router-dom'
import { useSupabaseAuth } from '@/hooks/use-supabase-auth'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredPermission?: string
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { currentUser, currentUserId, isLoading, hasPermission } = useSupabaseAuth()
  const location = useLocation()

  // Mostrar loading mientras se verifica la autenticación
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

  // Si no hay usuario autenticado, redirigir a login
  if (!currentUserId || !currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // Helper para verificar si el usuario puede ver un módulo
  const canViewModule = (module: string): boolean => {
    if (!currentUser) return false

    // Para Admins: usar el sistema de permisos
    if (currentUser.userType === 'admin' || !currentUser.userType) {
      return hasPermission(module)
    }

    // Para Comercializadores: solo pueden ver Agencias
    if (currentUser.userType === 'comercializadora') {
      return module === 'agencias'
    }

    // Para Agencias: SOLO pueden ver Taquillas
    if (currentUser.userType === 'agencia') {
      return ['taquillas'].includes(module)
    }

    // Para Taquillas: solo ven su propio módulo
    if (currentUser.userType === 'taquilla') {
      return ['taquillas'].includes(module)
    }

    return false
  }

  // Si se requiere un permiso específico, verificarlo
  if (requiredPermission && !canViewModule(requiredPermission)) {
    // Redirigir a la primera ruta permitida
    const allowedRoutes = [
      { path: '/dashboard', permission: 'dashboard' },
      { path: '/reports', permission: 'reports' },
      { path: '/lotteries', permission: 'lotteries' },
      { path: '/draws', permission: 'draws.read' },
      { path: '/winners', permission: 'winners' },
      { path: '/history', permission: 'history' },
      { path: '/users', permission: 'users' },
      { path: '/roles', permission: 'roles' },
      { path: '/api-keys', permission: 'api-keys' },
      { path: '/taquillas', permission: 'taquillas' },
      { path: '/agencias', permission: 'agencias' },
      { path: '/comercializadoras', permission: 'comercializadoras' },
    ]

    const firstAllowed = allowedRoutes.find(route => canViewModule(route.permission))
    if (firstAllowed) {
      return <Navigate to={firstAllowed.path} replace />
    }

    // Si no tiene acceso a ninguna ruta, mostrar mensaje de error
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-foreground">No tienes permisos para acceder a esta sección</p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
