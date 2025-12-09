import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Toaster } from '@/components/ui/sonner'
import { useApp } from '@/contexts/AppContext'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Vault,
  ChartLine,
  Calendar,
  Target,
  Trophy,
  ListBullets,
  Users,
  ShieldCheck,
  Key,
  Buildings,
  SignOut
} from '@phosphor-icons/react'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: Vault, permission: 'dashboard' },
  { path: '/reports', label: 'Reportes', icon: ChartLine, permission: 'reports' },
  { path: '/lotteries', label: 'Sorteos', icon: Calendar, permission: 'lotteries' },
  { path: '/draws', label: 'Resultados', icon: Target, permission: 'draws.read' },
  { path: '/winners', label: 'Ganadores', icon: Trophy, permission: 'winners' },
  { path: '/history', label: 'Historial', icon: ListBullets, permission: 'history' },
  { path: '/users', label: 'Usuarios', icon: Users, permission: 'users' },
  { path: '/roles', label: 'Roles', icon: ShieldCheck, permission: 'roles' },
  { path: '/api-keys', label: 'API Keys', icon: Key, permission: 'api-keys' },
  { path: '/comercializadoras', label: 'Comercializadoras', icon: Buildings, permission: 'comercializadoras' },
]

export function MainLayout() {
  const { currentUser, logout, canViewModule } = useApp()
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    setLogoutDialogOpen(true)
  }

  const confirmLogout = async () => {
    await logout()
    setLogoutDialogOpen(false)
    toast.success('Sesión cerrada exitosamente')
    navigate('/login')
  }

  const visibleNavItems = navItems.filter(item => canViewModule(item.permission))

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" />

      {/* Header Principal - Fijo */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-lg">
        <div className="container mx-auto px-4 py-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <Vault className="h-5 w-5 text-white" weight="bold" />
              </div>
              <h1 className="text-base md:text-lg font-bold tracking-tight">
                Gestión de Loterías
              </h1>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium truncate max-w-[150px] md:max-w-none">
                  {currentUser?.name}
                </p>
                <p className="text-xs text-slate-400 truncate max-w-[150px] md:max-w-none">
                  {currentUser?.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                className="text-slate-300 hover:text-white hover:bg-white/10 h-8 w-8"
              >
                <SignOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Subheader con Navegación */}
      <div className="sticky top-[48px] z-40 bg-background border-b shadow-sm">
        <div
          className="overflow-x-auto"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <nav className="flex min-w-max">
            {visibleNavItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'flex-1 inline-flex items-center justify-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-all border-b-2',
                      isActive
                        ? 'bg-primary/5 text-primary border-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border-transparent'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Page Content */}
      <main className="container mx-auto px-2 sm:px-4 py-4 md:py-6">
        <Outlet />
      </main>

      {/* Logout Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SignOut className="h-5 w-5 text-destructive" />
              Cerrar Sesión
            </DialogTitle>
            <DialogDescription className="pt-2">
              ¿Está seguro de que desea cerrar sesión? Será redirigido a la pantalla de inicio de sesión.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmLogout} className="gap-2">
              <SignOut className="h-4 w-4" />
              Cerrar Sesión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
