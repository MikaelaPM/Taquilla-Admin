import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RoleDialog } from '@/components/RoleDialog'
import { useApp } from '@/contexts/AppContext'
import { filterRoles } from '@/lib/filter-utils'
import { Role } from '@/lib/types'
import { toast } from 'sonner'
import { Plus, Pencil, Trash, MagnifyingGlass, ShieldCheck } from '@phosphor-icons/react'

export function RolesPage() {
  const { roles, createRole, updateRole, deleteRole } = useApp()

  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | undefined>()
  const [deleteRoleDialogOpen, setDeleteRoleDialogOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<string | null>(null)
  const [roleSearch, setRoleSearch] = useState('')

  const filteredRoles = filterRoles(roles, roleSearch)

  const handleSaveRole = async (roleData: Omit<Role, 'id' | 'createdAt'>): Promise<boolean> => {
    try {
      let success = false

      if (editingRole) {
        success = await updateRole(editingRole.id, roleData)
      } else {
        success = await createRole(roleData)
      }

      if (success) {
        setEditingRole(undefined)
      }

      return success
    } catch (error) {
      return false
    }
  }

  const handleEditRole = (role: Role) => {
    setEditingRole(role)
    setRoleDialogOpen(true)
  }

  const handleDeleteRole = (id: string) => {
    const role = roles.find((r) => r.id === id)
    if (role?.isSystem) {
      toast.error('No se pueden eliminar roles del sistema')
      return
    }
    setRoleToDelete(id)
    setDeleteRoleDialogOpen(true)
  }

  const confirmDeleteRole = async () => {
    if (!roleToDelete) return

    const success = await deleteRole(roleToDelete)
    if (success) {
      setDeleteRoleDialogOpen(false)
      setRoleToDelete(null)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">Gestión de Roles</h2>
          <p className="text-muted-foreground text-sm">Definir roles y permisos de acceso</p>
        </div>
        <Button onClick={() => setRoleDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2" />
          Nuevo Rol
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre..."
              value={roleSearch}
              onChange={(e) => setRoleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {filteredRoles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShieldCheck className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">
              {roles.length === 0 ? 'No hay roles creados' : 'No se encontraron roles'}
            </p>
            <p className="text-muted-foreground mb-4">
              {roles.length === 0
                ? 'Cree su primer rol para empezar'
                : 'Intente con otros criterios de búsqueda'}
            </p>
            {roles.length === 0 && (
              <Button onClick={() => setRoleDialogOpen(true)}>
                <Plus className="mr-2" />
                Crear Primer Rol
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[500px] md:h-[600px]">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRoles.map((role) => (
              <Card key={role.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        {role.name}
                        {role.isSystem && (
                          <Badge variant="secondary" className="text-xs">
                            Sistema
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>{role.description}</CardDescription>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditRole(role)}
                        disabled={role.isSystem}
                      >
                        <Pencil />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRole(role.id)}
                        disabled={role.isSystem}
                      >
                        <Trash />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Permisos:</p>
                    <div className="flex flex-wrap gap-1">
                      {role.permissions.slice(0, 5).map((permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission}
                        </Badge>
                      ))}
                      {role.permissions.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{role.permissions.length - 5} más
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      <RoleDialog
        open={roleDialogOpen}
        onOpenChange={(open) => {
          setRoleDialogOpen(open)
          if (!open) setEditingRole(undefined)
        }}
        role={editingRole}
        onSave={handleSaveRole}
      />

      <Dialog open={deleteRoleDialogOpen} onOpenChange={setDeleteRoleDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash className="h-5 w-5 text-destructive" />
              Eliminar Rol
            </DialogTitle>
            <DialogDescription className="pt-2">
              ¿Está seguro de que desea eliminar este rol? Los usuarios que tengan este rol perderán los permisos asociados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteRoleDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteRole}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
