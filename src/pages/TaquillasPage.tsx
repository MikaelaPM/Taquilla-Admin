import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { TaquillaDialog } from '@/components/TaquillaDialog'
import { TaquillaEditDialog } from '@/components/TaquillaEditDialog'
import { TaquillaStatsDialog } from '@/components/TaquillaStatsDialog'
import { RegisterSaleDialog } from '@/components/RegisterSaleDialog'
import { useApp } from '@/contexts/AppContext'
import { filterTaquillas } from '@/lib/filter-utils'
import { Taquilla } from '@/lib/types'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Plus, Pencil, Trash, MagnifyingGlass, Storefront, ChartLine, CurrencyDollar, Check } from '@phosphor-icons/react'

export function TaquillasPage() {
  const {
    visibleTaquillas,
    visibleAgencies,
    defaultAgencyId,
    currentUser,
    createTaquilla,
    updateTaquilla,
    deleteTaquilla,
    approveTaquilla,
    taquillaSales,
    createTaquillaSale,
    deleteTaquillaSale
  } = useApp()

  const [taquillaDialogOpen, setTaquillaDialogOpen] = useState(false)
  const [taquillaEditOpen, setTaquillaEditOpen] = useState(false)
  const [taquillaEditing, setTaquillaEditing] = useState<Taquilla | undefined>()
  const [taquillaStatsOpen, setTaquillaStatsOpen] = useState(false)
  const [taquillaStats, setTaquillaStats] = useState<Taquilla | null>(null)
  const [registerSaleOpen, setRegisterSaleOpen] = useState(false)
  const [saleTaquilla, setSaleTaquilla] = useState<Taquilla | null>(null)
  const [deleteTaquillaDialogOpen, setDeleteTaquillaDialogOpen] = useState(false)
  const [taquillaToDelete, setTaquillaToDelete] = useState<string | null>(null)
  const [taquillaSearch, setTaquillaSearch] = useState('')
  const [taquillaFilters, setTaquillaFilters] = useState<{ isActive?: boolean }>({})

  const filteredTaquillas = filterTaquillas(visibleTaquillas, taquillaSearch, taquillaFilters)

  const handleDeleteTaquilla = (id: string) => {
    setTaquillaToDelete(id)
    setDeleteTaquillaDialogOpen(true)
  }

  const confirmDeleteTaquilla = async () => {
    if (!taquillaToDelete) return

    try {
      const success = await deleteTaquilla(taquillaToDelete)
      if (success) {
        toast.success('Taquilla eliminada exitosamente')
        setDeleteTaquillaDialogOpen(false)
        setTaquillaToDelete(null)
      } else {
        toast.error('Error al eliminar taquilla')
      }
    } catch (error) {
      toast.error('Error al eliminar taquilla')
    }
  }

  const handleApproveTaquilla = async (id: string) => {
    try {
      const success = await approveTaquilla(id)
      if (success) {
        toast.success('Taquilla aprobada exitosamente')
      }
    } catch (error) {
      toast.error('Error al aprobar taquilla')
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">Gestión de Taquillas</h2>
          <p className="text-muted-foreground text-sm">Administrar puntos de venta</p>
        </div>
        <Button onClick={() => setTaquillaDialogOpen(true)} className="w-full sm:w-auto">
          <Plus className="mr-2" />
          Nueva Taquilla
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o email..."
                value={taquillaSearch}
                onChange={(e) => setTaquillaSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={taquillaFilters.isActive === undefined ? 'all' : taquillaFilters.isActive.toString()}
              onValueChange={(value) =>
                setTaquillaFilters((f) => ({
                  ...f,
                  isActive: value === 'all' ? undefined : value === 'true',
                }))
              }
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="true">Aprobadas</SelectItem>
                <SelectItem value="false">Pendientes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {filteredTaquillas.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Storefront className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">
              {visibleTaquillas.length === 0 ? 'No hay taquillas registradas' : 'No se encontraron taquillas'}
            </p>
            <p className="text-muted-foreground mb-4">
              {visibleTaquillas.length === 0
                ? 'Cree su primera taquilla para empezar'
                : 'Intente con otros criterios de búsqueda'}
            </p>
            {visibleTaquillas.length === 0 && (
              <Button onClick={() => setTaquillaDialogOpen(true)}>
                <Plus className="mr-2" />
                Crear Primera Taquilla
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <ScrollArea className="h-[400px] md:h-[600px]">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="whitespace-nowrap">Nombre</TableHead>
                    <TableHead className="whitespace-nowrap">Email</TableHead>
                    <TableHead className="whitespace-nowrap">Dirección</TableHead>
                    <TableHead className="whitespace-nowrap">Estado</TableHead>
                    <TableHead className="whitespace-nowrap">Creada</TableHead>
                    <TableHead className="whitespace-nowrap">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTaquillas.map((taquilla) => (
                    <TableRow key={taquilla.id}>
                      <TableCell className="font-medium whitespace-nowrap text-xs md:text-sm">
                        {taquilla.fullName}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs md:text-sm">
                        {taquilla.email}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs md:text-sm max-w-[200px] truncate">
                        {taquilla.address || '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge variant={taquilla.isApproved ? 'default' : 'secondary'} className="text-xs">
                          {taquilla.isApproved ? 'Aprobada' : 'Pendiente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-xs md:text-sm">
                        {format(new Date(taquilla.createdAt), 'dd/MM/yyyy', { locale: es })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {!taquilla.isApproved && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleApproveTaquilla(taquilla.id)}
                              title="Aprobar"
                            >
                              <Check />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setTaquillaStats(taquilla)
                              setTaquillaStatsOpen(true)
                            }}
                            title="Estadísticas"
                          >
                            <ChartLine />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSaleTaquilla(taquilla)
                              setRegisterSaleOpen(true)
                            }}
                            title="Registrar Venta"
                          >
                            <CurrencyDollar />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setTaquillaEditing(taquilla)
                              setTaquillaEditOpen(true)
                            }}
                          >
                            <Pencil />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteTaquilla(taquilla.id)}
                          >
                            <Trash />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </Card>
      )}

      <TaquillaDialog
        open={taquillaDialogOpen}
        onOpenChange={setTaquillaDialogOpen}
        agencies={visibleAgencies}
        defaultAgencyId={defaultAgencyId}
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
        sales={taquillaSales.filter(s => s.taquillaId === taquillaStats?.id)}
      />

      <RegisterSaleDialog
        open={registerSaleOpen}
        onOpenChange={setRegisterSaleOpen}
        taquilla={saleTaquilla}
        onSave={async (sale) => {
          const success = await createTaquillaSale(sale)
          if (success) {
            toast.success('Venta registrada exitosamente')
            setRegisterSaleOpen(false)
          }
          return success
        }}
      />

      <Dialog open={deleteTaquillaDialogOpen} onOpenChange={setDeleteTaquillaDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash className="h-5 w-5 text-destructive" />
              Eliminar Taquilla
            </DialogTitle>
            <DialogDescription className="pt-2">
              ¿Está seguro de que desea eliminar esta taquilla? Esta acción eliminará también todas las ventas asociadas.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteTaquillaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteTaquilla}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
