import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RoleDialog } from '@/components/RoleDialog'
import { useApp } from '@/contexts/AppContext'
import { Role } from '@/lib/types'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, PencilSimpleLine, X, MagnifyingGlass, ShieldCheck, Warning, Shield, Gear, CalendarBlank, Key, Trash } from '@phosphor-icons/react'

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
    return roles
      .filter(role => {
        const matchesSearch = search === '' ||
          role.name.toLowerCase().includes(search.toLowerCase()) ||
          role.description.toLowerCase().includes(search.toLowerCase())

        const matchesType = typeFilter === 'all' ||
          (typeFilter === 'system' && role.isSystem) ||
          (typeFilter === 'custom' && !role.isSystem)

        return matchesSearch && matchesType
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }))
  }, [roles, search, typeFilter])

  const systemCount = roles.filter(r => r.isSystem).length
  const customCount = roles.filter(r => !r.isSystem).length

  const handleCreate = () => {
    setEditingRole(undefined)
    setRoleDialogOpen(true)
  }

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

  const handleEdit = (role: Role) => {
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Roles</h2>
          <p className="text-muted-foreground">
            Gestiona los roles y permisos del sistema
          </p>
        </div>
        <Button onClick={handleCreate} className="gap-2 cursor-pointer">
          <Plus weight="bold" />
          Nuevo Rol
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nombre o descripción..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
            autoComplete="off"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={typeFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('all')}
            className="cursor-pointer"
          >
            Todos ({roles.length})
          </Button>
          <Button
            variant={typeFilter === 'system' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('system')}
            className={`cursor-pointer ${typeFilter === 'system' ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
          >
            Sistema ({systemCount})
          </Button>
          <Button
            variant={typeFilter === 'custom' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTypeFilter('custom')}
            className={`cursor-pointer ${typeFilter === 'custom' ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
          >
            Personalizados ({customCount})
          </Button>
        </div>
      </div>

      {/* Content */}
      {filteredRoles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">
              {search || typeFilter !== 'all' ? 'No se encontraron roles' : 'No hay roles registrados'}
            </p>
            <p className="text-muted-foreground text-sm mb-4">
              {search ? 'Intenta con otros criterios de búsqueda' : 'Crea tu primer rol para comenzar'}
            </p>
            {!search && typeFilter === 'all' && (
              <Button onClick={handleCreate} variant="outline" className="gap-2 cursor-pointer">
                <Plus weight="bold" />
                Crear Primer Rol
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredRoles.map((role) => (
            <Card
              key={role.id}
              className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4"
              style={{
                borderLeftColor: role.isSystem ? 'rgb(59 130 246)' : 'rgb(168 85 247)'
              }}
            >
              <CardContent className="px-4 py-2">
                {/* Header de la card */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center ${
                      role.isSystem
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600'
                        : 'bg-gradient-to-br from-purple-500 to-purple-600'
                    }`}>
                      {role.isSystem ? (
                        <Shield className="h-4 w-4 text-white" weight="fill" />
                      ) : (
                        <Gear className="h-4 w-4 text-white" weight="fill" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm leading-tight">
                        {role.name}
                      </h3>
                      <Badge
                        variant={role.isSystem ? "default" : "secondary"}
                        className={`mt-0.5 text-[10px] px-1.5 py-0 h-4 ${
                          role.isSystem
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                            : 'bg-purple-100 text-purple-700 hover:bg-purple-100'
                        }`}
                      >
                        {role.isSystem ? 'Sistema' : 'Personalizado'}
                      </Badge>
                    </div>
                  </div>
                  {!role.isSystem && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        onClick={() => handleEdit(role)}
                        title="Editar"
                      >
                        <PencilSimpleLine className="h-4 w-4" />
                      </button>
                      <button
                        className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        onClick={() => handleDeleteClick(role)}
                        title="Eliminar"
                      >
                        <X className="h-4 w-4" weight="bold" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Info de la card */}
                <div className="space-y-1.5">
                  {role.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {role.description}
                    </p>
                  )}

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CalendarBlank className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {role.createdAt
                        ? `Creado el ${format(new Date(role.createdAt), "d 'de' MMMM, yyyy", { locale: es })}`
                        : 'Sin fecha de creación'}
                    </span>
                  </div>

                  {/* Permisos */}
                  <div className="pt-1.5 border-t mt-2">
                    <div className="flex items-center gap-2 text-sm">
                      <Key className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.length > 0 ? (
                          <>
                            {role.permissions.slice(0, 3).map((permission) => (
                              <Badge key={permission} variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                                {permission}
                              </Badge>
                            ))}
                            {role.permissions.length > 3 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                +{role.permissions.length - 3}
                              </Badge>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground text-xs">Sin permisos asignados</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
              className="cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
              className="cursor-pointer"
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
