import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Role, ModulePermission } from "@/lib/types"
import { toast } from "sonner"

interface RoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role?: Role
  onSave: (role: Role) => void
}

const AVAILABLE_MODULES: { value: ModulePermission; label: string; description: string }[] = [
  { value: "dashboard", label: "Dashboard", description: "Ver balance de potes y estadísticas" },
  { value: "lotteries", label: "Loterías", description: "Crear y gestionar loterías" },
  { value: "bets", label: "Jugadas", description: "Registrar jugadas de usuarios" },
  { value: "winners", label: "Ganadores", description: "Realizar sorteos y ver ganadores" },
  { value: "history", label: "Historial", description: "Ver transferencias y retiros" },
  { value: "users", label: "Usuarios", description: "Gestionar usuarios del sistema" },
  { value: "roles", label: "Roles", description: "Crear y editar roles" },
]

export function RoleDialog({ open, onOpenChange, role, onSave }: RoleDialogProps) {
  const [name, setName] = useState(role?.name || "")
  const [description, setDescription] = useState(role?.description || "")
  const [permissions, setPermissions] = useState<ModulePermission[]>(role?.permissions || [])

  const handleSave = () => {
    if (!name) {
      toast.error("Por favor ingrese el nombre del rol")
      return
    }

    if (permissions.length === 0) {
      toast.error("Seleccione al menos un permiso")
      return
    }

    const roleData: Role = {
      id: role?.id || Date.now().toString(),
      name,
      description,
      permissions,
      createdAt: role?.createdAt || new Date().toISOString(),
      isSystem: role?.isSystem || false,
    }

    onSave(roleData)
    onOpenChange(false)
    toast.success(role ? "Rol actualizado" : "Rol creado")
  }

  const togglePermission = (permission: ModulePermission) => {
    setPermissions((current) =>
      current.includes(permission)
        ? current.filter((p) => p !== permission)
        : [...current, permission]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{role ? "Editar Rol" : "Nuevo Rol"}</DialogTitle>
          <DialogDescription>
            Configure el rol y los módulos a los que tendrá acceso
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="role-name">Nombre del Rol</Label>
            <Input
              id="role-name"
              placeholder="Ej: Vendedor"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={role?.isSystem}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-description">Descripción</Label>
            <Textarea
              id="role-description"
              placeholder="Descripción del rol y sus responsabilidades"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <Label>Permisos de Módulos</Label>
            <div className="space-y-3 border rounded-lg p-4">
              {AVAILABLE_MODULES.map((module) => (
                <div key={module.value} className="flex items-start space-x-3">
                  <Checkbox
                    id={module.value}
                    checked={permissions.includes(module.value)}
                    onCheckedChange={() => togglePermission(module.value)}
                    disabled={role?.isSystem}
                  />
                  <div className="space-y-0.5 flex-1">
                    <Label
                      htmlFor={module.value}
                      className="font-medium cursor-pointer"
                    >
                      {module.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {module.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={role?.isSystem}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
