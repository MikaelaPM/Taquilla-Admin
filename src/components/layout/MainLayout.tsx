import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
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
  Storefront,
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
  { path: '/taquillas', label: 'Taquillas', icon: Storefront, permission: 'taquillas' },
  { path: '/agencias', label: 'Agencias', icon: Buildings, permission: 'agencias' },
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

      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-3 md:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl lg:text-3xl font-semibold tracking-tight truncate">
                Sistema Administrativo
              </h1>
              <p className="text-muted-foreground mt-0.5 md:mt-1 text-xs md:text-sm">
                Lotería de Animalitos
              </p>
            </div>
            <div className="flex items-center gap-2 md:gap-4 shrink-0">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium truncate max-w-[150px] md:max-w-none">
                  {currentUser?.name}
                </p>
                <p className="text-xs text-muted-foreground truncate max-w-[150px] md:max-w-none">
                  {currentUser?.email}
                </p>
              </div>
              <Button variant="outline" size="icon" onClick={handleLogout}>
                <SignOut />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="container mx-auto px-2 sm:px-4 py-4 md:py-6">
        <ScrollArea className="w-full mb-4 md:mb-6">
          <nav className="inline-flex w-auto min-w-full h-auto flex-wrap gap-1 p-1 bg-muted rounded-lg">
            {visibleNavItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    cn(
                      'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 flex-shrink-0',
                      isActive
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    )
                  }
                >
                  <Icon className="md:mr-2" />
                  <span className="hidden md:inline">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </ScrollArea>

        {/* Page Content */}
        <Outlet />
      </div>

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
