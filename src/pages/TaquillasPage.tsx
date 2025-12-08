import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TaquillaDialog } from '@/components/TaquillaDialog'
import { TaquillaEditDialog } from '@/components/TaquillaEditDialog'
import { TaquillaStatsDialog } from '@/components/TaquillaStatsDialog'
import { useApp } from '@/contexts/AppContext'
import { Taquilla } from '@/lib/types'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Pencil, MagnifyingGlass, Storefront, ChartLine, CheckCircle, XCircle } from '@phosphor-icons/react'

export function TaquillasPage() {
  const {
    visibleTaquillas,
    visibleAgencies,
    createTaquilla,
    updateTaquilla,
    currentUser
  } = useApp()

  const isAgencia = currentUser?.userType === 'agencia'

  const [taquillaDialogOpen, setTaquillaDialogOpen] = useState(false)
  const [taquillaEditOpen, setTaquillaEditOpen] = useState(false)
  const [taquillaEditing, setTaquillaEditing] = useState<Taquilla | undefined>()
  const [taquillaStatsOpen, setTaquillaStatsOpen] = useState(false)
  const [taquillaStats, setTaquillaStats] = useState<Taquilla | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  const filteredTaquillas = useMemo(() => {
    return visibleTaquillas.filter(t => {
      const matchesSearch = search === '' ||
        t.fullName.toLowerCase().includes(search.toLowerCase()) ||
        t.email.toLowerCase().includes(search.toLowerCase()) ||
        (t.address || '').toLowerCase().includes(search.toLowerCase())

      const matchesStatus = statusFilter === 'all' ||
        (statusFilter === 'active' && t.isApproved) ||
        (statusFilter === 'inactive' && !t.isApproved)

      return matchesSearch && matchesStatus
    })
  }, [visibleTaquillas, search, statusFilter])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Taquillas</CardTitle>
              <CardDescription>
                Gestiona los puntos de venta del sistema
              </CardDescription>
            </div>
            <Button onClick={() => setTaquillaDialogOpen(true)}>
              <Plus className="mr-2" weight="bold" />
              Nueva Taquilla
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
                  placeholder="Buscar por nombre, email o dirección..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                  autoComplete="off"
                />
              </div>
            </div>

            {/* Estadísticas - Filtros clickeables */}
            <div className="flex gap-2">
              <Button
                variant={statusFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('all')}
                className="h-8"
              >
                Total: {visibleTaquillas.length}
              </Button>
              <Button
                variant={statusFilter === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('active')}
                className={`h-8 ${statusFilter === 'active' ? 'bg-green-600 hover:bg-green-700' : 'text-green-600 border-green-600 hover:bg-green-50'}`}
              >
                Activas: {visibleTaquillas.filter(t => t.isApproved).length}
              </Button>
              <Button
                variant={statusFilter === 'inactive' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter('inactive')}
                className={`h-8 ${statusFilter === 'inactive' ? 'bg-red-600 hover:bg-red-700' : 'text-red-600 border-red-600 hover:bg-red-50'}`}
              >
                Inactivas: {visibleTaquillas.filter(t => !t.isApproved).length}
              </Button>
            </div>

            {/* Tabla */}
            {filteredTaquillas.length === 0 ? (
              <div className="text-center py-8">
                <Storefront className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {search || statusFilter !== 'all' ? 'No se encontraron taquillas' : 'No hay taquillas registradas'}
                </p>
                {!search && statusFilter === 'all' && (
                  <Button onClick={() => setTaquillaDialogOpen(true)} variant="outline" className="mt-4">
                    <Plus className="mr-2" weight="bold" />
                    Crear Primera Taquilla
                  </Button>
                )}
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Dirección</TableHead>
                      {!isAgencia && <TableHead>Agencia</TableHead>}
                      <TableHead>Participación</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Creada</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTaquillas.map((taquilla) => {
                      const agencia = visibleAgencies.find(a => a.id === taquilla.parentId)
                      return (
                        <TableRow key={taquilla.id}>
                          <TableCell>
                            <span className="font-medium">{taquilla.fullName}</span>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {taquilla.email}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {taquilla.telefono || '-'}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {taquilla.address || '-'}
                          </TableCell>
                          {!isAgencia && (
                            <TableCell className="text-muted-foreground">
                              {agencia?.name || 'Sin asignar'}
                            </TableCell>
                          )}
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge variant="outline" className="w-fit">
                                Ventas: {taquilla.shareOnSales || 0}%
                              </Badge>
                              <Badge variant="outline" className="w-fit">
                                Participación: {taquilla.shareOnProfits || 0}%
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            {taquilla.isApproved ? (
                              <Badge variant="default" className="gap-1 bg-green-600">
                                <CheckCircle weight="fill" size={14} />
                                Activa
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="gap-1">
                                <XCircle weight="fill" size={14} />
                                Inactiva
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-sm">
                            {taquilla.createdAt ? format(new Date(taquilla.createdAt), "dd MMM yyyy", { locale: es }) : '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setTaquillaStats(taquilla)
                                  setTaquillaStatsOpen(true)
                                }}
                                title="Estadísticas"
                              >
                                <ChartLine size={16} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setTaquillaEditing(taquilla)
                                  setTaquillaEditOpen(true)
                                }}
                              >
                                <Pencil size={16} />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <TaquillaDialog
        open={taquillaDialogOpen}
        onOpenChange={setTaquillaDialogOpen}
        agencies={visibleAgencies}
        onSave={async (data) => {
          const success = await createTaquilla(data)
          if (success) {
            toast.success('Taquilla creada exitosamente')
            setTaquillaDialogOpen(false)
          }
          return success
        }}
      />

      <TaquillaEditDialog
        open={taquillaEditOpen}
        onOpenChange={(open) => {
          setTaquillaEditOpen(open)
          if (!open) setTaquillaEditing(undefined)
        }}
        taquilla={taquillaEditing}
        agencies={visibleAgencies}
        onSave={async (id, data) => {
          const success = await updateTaquilla(id, data)
          if (success) {
            toast.success('Taquilla actualizada exitosamente')
          }
          return success
        }}
      />

      <TaquillaStatsDialog
        open={taquillaStatsOpen}
        onOpenChange={setTaquillaStatsOpen}
        taquilla={taquillaStats}
      />
    </div>
  )
}
