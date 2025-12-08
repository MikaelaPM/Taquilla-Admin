import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RoleDialog } from '@/components/RoleDialog'
import { useApp } from '@/contexts/AppContext'
import { Role } from '@/lib/types'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Pencil, Trash, MagnifyingGlass, ShieldCheck, Warning } from '@phosphor-icons/react'

export function RolesPage() {
  const { roles, createRole, updateRole, deleteRole } = useApp()

  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [editingRole, setEditingRole] = useState<Role | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [roleToDelete, setRoleToDelete] = useState<Role | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | 'system' | 'custom'>('all')

  const filteredRoles = useMemo(() => {
    return roles.filter(role => {
      const matchesSearch = search === '' ||
        role.name.toLowerCase().includes(search.toLowerCase()) ||
        role.description.toLowerCase().includes(search.toLowerCase())

      const matchesType = typeFilter === 'all' ||
        (typeFilter === 'system' && role.isSystem) ||
        (typeFilter === 'custom' && !role.isSystem)

      return matchesSearch && matchesType
    })
  }, [roles, search, typeFilter])

  const handleSaveRole = async (roleData: Omit<Role, 'id' | 'createdAt'>): Promise<boolean> => {
    try {
      let success = false

      if (editingRole) {
        success = await updateRole(editingRole.id, roleData)
        if (success) toast.success('Rol actualizado exitosamente')
      } else {
        success = await createRole(roleData)
        if (success) toast.success('Rol creado exitosamente')
      }

      if (success) {
        setEditingRole(undefined)
      }

      return success
    } catch (error) {
      toast.error('Error al guardar rol')
      return false
    }
  }

  const handleEditRole = (role: Role) => {
    setEditingRole(role)
    setRoleDialogOpen(true)
  }

  const handleDeleteClick = (role: Role) => {
    if (role.isSystem) {
      toast.error('No se pueden eliminar roles del sistema')
      return
    }
    setRoleToDelete(role)
    setDeleteDialogOpen(true)
  }

  const confirmDelete = async () => {
    if (!roleToDelete) return

    setIsDeleting(true)
    try {
      const success = await deleteRole(roleToDelete.id)
      if (success) {
        toast.success('Rol eliminado exitosamente')
        setDeleteDialogOpen(false)
        setRoleToDelete(null)
      }
    } catch (error) {
      toast.error('Error al eliminar rol')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Roles</CardTitle>
              <CardDescription>
                Gestiona los roles y permisos del sistema
              </CardDescription>
            </div>
            <Button onClick={() => { setEditingRole(undefined); setRoleDialogOpen(true) }}>
              <Plus className="mr-2" weight="bold" />
              Nuevo Rol
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Barra de búsqueda */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre o descripción..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Filtros */}
            <div className="flex gap-2">
              <Button
                variant={typeFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('all')}
                className="h-8"
              >
                Total: {roles.length}
              </Button>
              <Button
                variant={typeFilter === 'system' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('system')}
                className={`h-8 ${typeFilter === 'system' ? 'bg-blue-600 hover:bg-blue-700' : 'text-blue-600 border-blue-600 hover:bg-blue-50'}`}
              >
                Sistema: {roles.filter(r => r.isSystem).length}
              </Button>
              <Button
                variant={typeFilter === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTypeFilter('custom')}
                className={`h-8 ${typeFilter === 'custom' ? 'bg-purple-600 hover:bg-purple-700' : 'text-purple-600 border-purple-600 hover:bg-purple-50'}`}
              >
                Personalizados: {roles.filter(r => !r.isSystem).length}
              </Button>
            </div>

            {/* Tabla */}
            {filteredRoles.length === 0 ? (
              <div className="text-center py-8">
                <ShieldCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {search || typeFilter !== 'all' ? 'No se encontraron roles' : 'No hay roles registrados'}
                </p>
                {!search && typeFilter === 'all' && (
                  <Button onClick={() => setRoleDialogOpen(true)} variant="outline" className="mt-4">
                    <Plus className="mr-2" weight="bold" />
                    Crear Primer Rol
                  </Button>
                )}
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Permisos</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Creado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRoles.map((role) => (
                      <TableRow key={role.id}>
                        <TableCell>
                          <span className="font-medium">{role.name}</span>
                        </TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">
                          {role.description || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {role.permissions.slice(0, 3).map((permission) => (
                              <Badge key={permission} variant="outline" className="text-xs">
                                {permission}
                              </Badge>
                            ))}
                            {role.permissions.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{role.permissions.length - 3}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {role.isSystem ? (
                            <Badge variant="default" className="gap-1 bg-blue-600">
                              Sistema
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              Personalizado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {role.createdAt ? format(new Date(role.createdAt), "dd MMM yyyy", { locale: es }) : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditRole(role)}
                              disabled={role.isSystem}
                            >
                              <Pencil size={16} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteClick(role)}
                              disabled={role.isSystem}
                            >
                              <Trash size={16} />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <RoleDialog
        open={roleDialogOpen}
        onOpenChange={(open) => {
          setRoleDialogOpen(open)
          if (!open) setEditingRole(undefined)
        }}
        role={editingRole}
        onSave={handleSaveRole}
      />

      {/* Diálogo de confirmación para eliminar */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <Warning className="h-6 w-6 text-destructive" weight="fill" />
              </div>
              <div>
                <DialogTitle>Eliminar Rol</DialogTitle>
                <DialogDescription>
                  Esta acción no se puede deshacer
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              ¿Está seguro que desea eliminar el rol <span className="font-semibold text-foreground">"{roleToDelete?.name}"</span>?
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Los usuarios con este rol perderán los permisos asociados.
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash className="mr-2 h-4 w-4" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
