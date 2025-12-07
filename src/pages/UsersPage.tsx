import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { UserDialog } from '@/components/UserDialog'
import { useApp } from '@/contexts/AppContext'
import { filterUsers } from '@/lib/filter-utils'
import { User } from '@/lib/types'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Pencil, Trash, ShieldCheck, MagnifyingGlass } from '@phosphor-icons/react'

export function UsersPage() {
  const {
    users,
    roles,
    currentUserId,
    createUser,
    updateUser,
    deleteUser,
    syncUsersToSupabase,
    cleanDuplicateUsers
  } = useApp()

  const [userDialogOpen, setUserDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<User | undefined>()
  const [deleteUserDialogOpen, setDeleteUserDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [userSearch, setUserSearch] = useState('')
  const [userFilters, setUserFilters] = useState<{ isActive?: boolean; roleId?: string }>({})

  const filteredUsers = filterUsers(users, userSearch, userFilters)

  const handleSaveUser = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<boolean> => {
    try {
      if (editingUser) {
        await updateUser(editingUser.id, userData)
      } else {
        await createUser(userData)
      }
      setEditingUser(undefined)
      return true
    } catch (error) {
      return false
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setUserDialogOpen(true)
  }

  const handleDeleteUser = (id: string) => {
    if (id === currentUserId) {
      toast.error('No puede eliminar su propio usuario')
      return
    }
    setUserToDelete(id)
    setDeleteUserDialogOpen(true)
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete) return

    try {
      await deleteUser(userToDelete)
      toast.success('Usuario eliminado exitosamente')
      setDeleteUserDialogOpen(false)
      setUserToDelete(null)
    } catch (error) {
      toast.error('Error al eliminar usuario')
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">Gestión de Usuarios</h2>
          <p className="text-muted-foreground text-sm">Administrar usuarios del sistema (Híbrido: Supabase + Local)</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={syncUsersToSupabase}
            variant="outline"
            className="w-full sm:w-auto"
            title="Sincronizar usuarios locales con Supabase"
          >
            <ShieldCheck className="mr-2" />
            Sincronizar
          </Button>
          <Button
            onClick={cleanDuplicateUsers}
            variant="outline"
            className="w-full sm:w-auto"
            title="Limpiar usuarios duplicados en Supabase"
          >
            <Trash className="mr-2" />
            Limpiar Duplicados
          </Button>
          <Button onClick={() => setUserDialogOpen(true)} className="w-full sm:w-auto">
            <Plus className="mr-2" />
            Nuevo Usuario
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select
                value={userFilters.isActive === undefined ? 'all' : userFilters.isActive.toString()}
                onValueChange={(value) =>
                  setUserFilters((f) => ({
                    ...f,
                    isActive: value === 'all' ? undefined : value === 'true',
                  }))
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Activos</SelectItem>
                  <SelectItem value="false">Inactivos</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={userFilters.roleId || 'all'}
                onValueChange={(value) =>
                  setUserFilters((f) => ({ ...f, roleId: value === 'all' ? undefined : value }))
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los roles</SelectItem>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <ScrollArea className="h-[400px] md:h-[600px]">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Nombre</TableHead>
                  <TableHead className="whitespace-nowrap">Email</TableHead>
                  <TableHead className="whitespace-nowrap">Roles</TableHead>
                  <TableHead className="whitespace-nowrap">Estado</TableHead>
                  <TableHead className="whitespace-nowrap">Fecha Creación</TableHead>
                  <TableHead className="whitespace-nowrap">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const userRoles = roles.filter((r) => user.roleIds.includes(r.id))
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium whitespace-nowrap text-xs md:text-sm">{user.name}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs md:text-sm">{user.email}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {userRoles.map((role) => (
                            <Badge key={role.id} variant="secondary" className="text-xs">
                              {role.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={user.isActive ? 'default' : 'secondary'} className="text-xs">
                          {user.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs md:text-sm">
                        {format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditUser(user)}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={user.id === currentUserId}
                          >
                            <Trash />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </ScrollArea>
      </Card>

      <UserDialog
        open={userDialogOpen}
        onOpenChange={(open) => {
          setUserDialogOpen(open)
          if (!open) setEditingUser(undefined)
        }}
        user={editingUser}
        roles={roles}
        onSave={handleSaveUser}
      />

      <Dialog open={deleteUserDialogOpen} onOpenChange={setDeleteUserDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash className="h-5 w-5 text-destructive" />
              Eliminar Usuario
            </DialogTitle>
            <DialogDescription className="pt-2">
              ¿Está seguro de que desea eliminar este usuario? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteUserDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteUser}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
