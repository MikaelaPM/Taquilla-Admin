import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ApiKey, ApiKeyPermission } from "@/lib/types"
import { toast } from "sonner"

interface ApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey?: ApiKey
  currentUserId: string
  onSave: (apiKey: ApiKey) => void
}

const API_KEY_PERMISSIONS: { value: ApiKeyPermission; label: string; description: string }[] = [
  { value: "create_bets", label: "Crear Jugadas", description: "Permite registrar jugadas desde el sistema externo" },
  { value: "read_lotteries", label: "Leer Loterías", description: "Acceso a consultar loterías disponibles" },
  { value: "read_draws", label: "Leer Sorteos", description: "Acceso a resultados de sorteos realizados" },
  { value: "read_winners", label: "Leer Ganadores", description: "Acceso a listado de jugadas ganadoras" },
]

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let key = "sk_"
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return key
}

export function ApiKeyDialog({ open, onOpenChange, apiKey, currentUserId, onSave }: ApiKeyDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [permissions, setPermissions] = useState<ApiKeyPermission[]>([])

  useEffect(() => {
    if (apiKey) {
      setName(apiKey.name)
      setDescription(apiKey.description)
      setIsActive(apiKey.isActive)
      setPermissions(apiKey.permissions)
    } else {
      setName("")
      setDescription("")
      setIsActive(true)
      setPermissions(["create_bets", "read_lotteries"])
    }
  }, [apiKey, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("El nombre es requerido")
      return
    }

    if (permissions.length === 0) {
      toast.error("Debe seleccionar al menos un permiso")
      return
    }

    const newApiKey: ApiKey = {
      id: apiKey?.id || Date.now().toString(),
      name: name.trim(),
      key: apiKey?.key || generateApiKey(),
      description: description.trim(),
      isActive,
      permissions,
      createdAt: apiKey?.createdAt || new Date().toISOString(),
      createdBy: apiKey?.createdBy || currentUserId,
      lastUsed: apiKey?.lastUsed,
    }

    onSave(newApiKey)
    toast.success(apiKey ? "API Key actualizada" : "API Key creada exitosamente")
    onOpenChange(false)
  }

  const togglePermission = (permission: ApiKeyPermission) => {
    setPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{apiKey ? "Editar API Key" : "Crear Nueva API Key"}</DialogTitle>
          <DialogDescription>
            {apiKey
              ? "Modifica los permisos y configuración de esta API Key"
              : "Crea una nueva API Key para conectar sistemas de ventas externos"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Sistema</Label>
              <Input
                id="name"
                placeholder="Ej: Sistema POS Local 1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                placeholder="Describe para qué se utilizará esta API Key..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-3">
              <Label>Permisos de Acceso</Label>
              <div className="space-y-3">
                {API_KEY_PERMISSIONS.map((perm) => (
                  <div key={perm.value} className="flex items-start gap-3 p-3 border rounded-lg">
                    <Checkbox
                      id={perm.value}
                      checked={permissions.includes(perm.value)}
                      onCheckedChange={() => togglePermission(perm.value)}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={perm.value}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {perm.label}
                      </label>
                      <p className="text-sm text-muted-foreground mt-1">{perm.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Checkbox id="isActive" checked={isActive} onCheckedChange={(checked) => setIsActive(!!checked)} />
              <div className="flex-1">
                <label
                  htmlFor="isActive"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  API Key Activa
                </label>
                <p className="text-sm text-muted-foreground mt-1">
                  Solo las API Keys activas pueden realizar peticiones al sistema
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">{apiKey ? "Guardar Cambios" : "Crear API Key"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
