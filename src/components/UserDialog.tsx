import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { User, Role } from "@/lib/types"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User
  roles: Role[]
  currentUserId: string
  onSave: (user: User) => void
}

export function UserDialog({ open, onOpenChange, user, roles, currentUserId, onSave }: UserDialogProps) {
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>(user?.roleIds || [])
  const [isActive, setIsActive] = useState(user?.isActive ?? true)

  useEffect(() => {
    if (open && user) {
      setName(user.name)
      setEmail(user.email)
      setSelectedRoleIds(user.roleIds)
      setIsActive(user.isActive)
    } else if (open && !user) {
      setName("")
      setEmail("")
      setSelectedRoleIds([])
      setIsActive(true)
    }
  }, [open, user])

  const handleSave = () => {
    if (!name || !email) {
      toast.error("Por favor complete todos los campos")
      return
    }

    if (selectedRoleIds.length === 0) {
      toast.error("Seleccione al menos un rol")
      return
    }

    const userData: User = {
      id: user?.id || Date.now().toString(),
      name,
      email,
      roleIds: selectedRoleIds,
      isActive,
      createdAt: user?.createdAt || new Date().toISOString(),
      createdBy: user?.createdBy || currentUserId,
    }

    onSave(userData)
    onOpenChange(false)
    toast.success(user ? "Usuario actualizado" : "Usuario creado")
  }

  const toggleRole = (roleId: string) => {
    setSelectedRoleIds((current) =>
      current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{user ? "Editar Usuario" : "Nuevo Usuario"}</DialogTitle>
          <DialogDescription>
            Configure el usuario y los roles que tendrá asignados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="user-name">Nombre Completo</Label>
            <Input
              id="user-name"
              placeholder="Ej: María González"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="user-email">Correo Electrónico</Label>
            <Input
              id="user-email"
              type="email"
              placeholder="ejemplo@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Usuario Activo</Label>
              <p className="text-sm text-muted-foreground">
                El usuario puede acceder al sistema
              </p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          <div className="space-y-3">
            <Label>Roles Asignados</Label>
            {roles.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg">
                No hay roles disponibles. Cree roles primero.
              </p>
            ) : (
              <div className="space-y-3 border rounded-lg p-4">
                {roles.map((role) => (
                  <div key={role.id} className="flex items-start space-x-3">
                    <Checkbox
                      id={`role-${role.id}`}
                      checked={selectedRoleIds.includes(role.id)}
                      onCheckedChange={() => toggleRole(role.id)}
                    />
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <Label
                          htmlFor={`role-${role.id}`}
                          className="font-medium cursor-pointer"
                        >
                          {role.name}
                        </Label>
                        {role.isSystem && (
                          <Badge variant="secondary" className="text-xs">
                            Sistema
                          </Badge>
                        )}
                      </div>
                      {role.description && (
                        <p className="text-sm text-muted-foreground">
                          {role.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 mt-1">
                        {role.permissions.slice(0, 4).map((perm) => (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                        {role.permissions.length > 4 && (
                          <Badge variant="outline" className="text-xs">
                            +{role.permissions.length - 4} más
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
