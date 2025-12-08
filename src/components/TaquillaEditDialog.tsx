import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from '@phosphor-icons/react'
import type { Taquilla, Agency } from '@/lib/types'

interface Props {
  open: boolean
  taquilla?: Taquilla
  onOpenChange: (v: boolean) => void
  onSave: (id: string, updates: { fullName: string; address: string; telefono: string; email: string; agencyId?: string; isApproved: boolean; shareOnSales: number; shareOnProfits: number }) => Promise<boolean>
  agencies?: Agency[]
}

export function TaquillaEditDialog({ open, taquilla, onOpenChange, onSave, agencies }: Props) {
  const [fullName, setFullName] = useState('')
  const [address, setAddress] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [agencyId, setAgencyId] = useState<string | undefined>(undefined)
  const [shareOnSales, setShareOnSales] = useState('')
  const [shareOnProfits, setShareOnProfits] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Obtener la agencia seleccionada y sus límites de porcentaje
  const selectedAgency = useMemo(() => {
    if (!agencyId || !agencies) return null
    return agencies.find(a => a.id === agencyId) || null
  }, [agencyId, agencies])

  const maxShareOnSales = selectedAgency?.shareOnSales ?? 100
  const maxShareOnProfits = selectedAgency?.shareOnProfits ?? 100

  useEffect(() => {
    if (open && taquilla) {
      setFullName(taquilla.fullName)
      setAddress(taquilla.address)
      setTelefono(taquilla.telefono || '')
      setEmail(taquilla.email)
      setAgencyId(taquilla.parentId)
      setShareOnSales((taquilla.shareOnSales || 0).toString())
      setShareOnProfits((taquilla.shareOnProfits || 0).toString())
      setIsActive(taquilla.isApproved ?? true)
      setErrors({})
    }
  }, [open, taquilla])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!fullName.trim()) newErrors.fullName = 'El nombre es obligatorio'
    if (!address.trim()) newErrors.address = 'La dirección es obligatoria'

    if (!telefono.trim()) {
      newErrors.telefono = 'El teléfono es obligatorio'
    } else if (!/^[0-9\-\+\s]+$/.test(telefono)) {
      newErrors.telefono = 'El teléfono solo puede contener números, guiones y espacios'
    }

    if (!email.trim()) {
      newErrors.email = 'El correo es obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Correo electrónico inválido'
    }

    // Validar porcentajes contra los límites de la agencia
    const salesValue = parseFloat(shareOnSales)
    const profitsValue = parseFloat(shareOnProfits)

    if (salesValue < 0) {
      newErrors.shareOnSales = 'No puede ser negativo'
    } else if (selectedAgency && salesValue > maxShareOnSales) {
      newErrors.shareOnSales = `No puede superar ${maxShareOnSales}% (límite de la agencia)`
    }

    if (profitsValue < 0) {
      newErrors.shareOnProfits = 'No puede ser negativo'
    } else if (selectedAgency && profitsValue > maxShareOnProfits) {
      newErrors.shareOnProfits = `No puede superar ${maxShareOnProfits}% (límite de la agencia)`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!taquilla) return
    if (!validate()) return

    setSaving(true)
    const ok = await onSave(taquilla.id, {
      fullName,
      address,
      telefono,
      email,
      agencyId,
      isApproved: isActive,
      shareOnSales: parseFloat(shareOnSales) || 0,
      shareOnProfits: parseFloat(shareOnProfits) || 0
    })
    setSaving(false)
    if (ok) onOpenChange(false)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    if (/^[0-9\-\+\s]*$/.test(value)) {
      setTelefono(value)
      if (errors.telefono) setErrors({ ...errors, telefono: '' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Taquilla</DialogTitle>
          <DialogDescription>Actualiza los datos de la taquilla seleccionada.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-2">
            <Label>Nombre completo</Label>
            <Input
              value={fullName}
              onChange={e => {
                setFullName(e.target.value)
                if (errors.fullName) setErrors({ ...errors, fullName: '' })
              }}
              placeholder="Ej: Taquilla Centro"
              className={errors.fullName ? "border-destructive" : ""}
              autoComplete="off"
            />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Dirección</Label>
            <Input
              value={address}
              onChange={e => {
                setAddress(e.target.value)
                if (errors.address) setErrors({ ...errors, address: '' })
              }}
              placeholder="Ej: Av. Bolívar, Local 5"
              className={errors.address ? "border-destructive" : ""}
              autoComplete="off"
            />
            {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Teléfono</Label>
            <Input
              value={telefono}
              onChange={handlePhoneChange}
              placeholder="Ej: 0414-1234567"
              className={errors.telefono ? "border-destructive" : ""}
              autoComplete="off"
            />
            {errors.telefono && <p className="text-xs text-destructive">{errors.telefono}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Correo</Label>
            <Input
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value)
                if (errors.email) setErrors({ ...errors, email: '' })
              }}
              placeholder="correo@ejemplo.com"
              className={errors.email ? "border-destructive" : ""}
              autoComplete="off"
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>

          {agencies && agencies.length > 0 && (
            <div className="grid gap-2">
              <Label>Agencia</Label>
              <Select value={agencyId || "none"} onValueChange={(val) => setAgencyId(val === "none" ? undefined : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione una agencia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin agencia</SelectItem>
                  {agencies.map(agency => (
                    <SelectItem key={agency.id} value={agency.id}>
                      {agency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Información de límites de la agencia */}
          {selectedAgency && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Límites de <strong>{selectedAgency.name}</strong>:
                Ventas máx. {maxShareOnSales}%, Participación máx. {maxShareOnProfits}%
              </AlertDescription>
            </Alert>
          )}

          {/* Porcentajes */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>% Ventas {selectedAgency && <span className="text-muted-foreground">(máx. {maxShareOnSales}%)</span>}</Label>
              <Input
                type="number"
                min="0"
                max={maxShareOnSales}
                step="0.01"
                value={shareOnSales}
                onChange={e => {
                  setShareOnSales(e.target.value)
                  if (errors.shareOnSales) setErrors({ ...errors, shareOnSales: '' })
                }}
                placeholder={selectedAgency ? `0 - ${maxShareOnSales}` : "0 - 100"}
                className={errors.shareOnSales ? "border-destructive" : ""}
              />
              {errors.shareOnSales && <p className="text-xs text-destructive">{errors.shareOnSales}</p>}
            </div>
            <div className="grid gap-2">
              <Label>% Participación {selectedAgency && <span className="text-muted-foreground">(máx. {maxShareOnProfits}%)</span>}</Label>
              <Input
                type="number"
                min="0"
                max={maxShareOnProfits}
                step="0.01"
                value={shareOnProfits}
                onChange={e => {
                  setShareOnProfits(e.target.value)
                  if (errors.shareOnProfits) setErrors({ ...errors, shareOnProfits: '' })
                }}
                placeholder={selectedAgency ? `0 - ${maxShareOnProfits}` : "0 - 100"}
                className={errors.shareOnProfits ? "border-destructive" : ""}
              />
              {errors.shareOnProfits && <p className="text-xs text-destructive">{errors.shareOnProfits}</p>}
            </div>
          </div>

          {/* Estado activo */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="is-active">Estado Activo</Label>
              <p className="text-sm text-muted-foreground">
                Solo las taquillas activas pueden operar
              </p>
            </div>
            <Switch
              id="is-active"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
