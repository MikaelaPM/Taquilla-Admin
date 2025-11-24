import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import type { Taquilla } from '@/lib/types'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (taq: { fullName: string; address: string; telefono: string; email: string; password?: string }) => Promise<boolean>
}

export function TaquillaDialog({ open, onOpenChange, onSave }: Props) {
  const [fullName, setFullName] = useState('')
  const [address, setAddress] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) {
      setFullName(''); setAddress(''); setTelefono(''); setEmail(''); setPassword('')
    }
  }, [open])

  const handleSave = async () => {
    setSaving(true)
    const ok = await onSave({ fullName, address, telefono, email, password })
    setSaving(false)
    if (ok) onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Taquilla</DialogTitle>
          <DialogDescription>Ingrese los datos de la taquilla. La contraseña se guarda de forma segura.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-2">
            <Label>Nombre completo</Label>
            <Input 
              value={fullName} 
              onChange={e => setFullName(e.target.value)} 
              placeholder="Ej: Taquilla Centro"
            />
          </div>
          <div className="grid gap-2">
            <Label>Dirección</Label>
            <Input 
              value={address} 
              onChange={e => setAddress(e.target.value)} 
              placeholder="Ej: Av. Bolívar, Local 5"
            />
          </div>
          <div className="grid gap-2">
            <Label>Teléfono</Label>
            <Input 
              value={telefono} 
              onChange={e => setTelefono(e.target.value)} 
              placeholder="Ej: 0414-1234567"
            />
          </div>
          <div className="grid gap-2">
            <Label>Correo</Label>
            <Input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="correo@ejemplo.com"
            />
          </div>
          <div className="grid gap-2">
            <Label>Contraseña</Label>
            <Input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="Mínimo 6 caracteres"
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button type="button" onClick={handleSave} disabled={saving || !fullName || !email || !password}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
