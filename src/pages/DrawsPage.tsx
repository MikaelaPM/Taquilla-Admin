import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DrawManagementDialog } from '@/components/DrawManagementDialog'
import { useApp } from '@/contexts/AppContext'
import { formatCurrency } from '@/lib/pot-utils'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Plus, Pencil, Trash, MagnifyingGlass } from '@phosphor-icons/react'

export function DrawsPage() {
  const {
    draws,
    drawsLoading,
    lotteries,
    bets,
    createDraw,
    updateDraw,
    deleteDraw,
    updateBet,
    deductFromPot
  } = useApp()

  const [drawManagementDialogOpen, setDrawManagementDialogOpen] = useState(false)
  const [editingDraw, setEditingDraw] = useState<any | undefined>()
  const [deleteDrawDialogOpen, setDeleteDrawDialogOpen] = useState(false)
  const [drawToDelete, setDrawToDelete] = useState<any | null>(null)
  const [drawSearch, setDrawSearch] = useState('')
  const [drawFilters, setDrawFilters] = useState<{ lotteryId?: string }>({})

  const processWinnersAutomatically = async (drawData: any) => {
    try {
      const winningBets = bets.filter(bet =>
        bet.lotteryId === drawData.lotteryId &&
        bet.animalNumber === drawData.animalNumber &&
        !bet.isWinner
      )

      if (winningBets.length === 0) {
        toast.info('Sorteo creado. No hay jugadas ganadoras para este animal.')
        return { winnersCount: 0, totalPayout: 0 }
      }

      const totalPayout = winningBets.reduce((sum, bet) => sum + bet.potentialWin, 0)

      for (const bet of winningBets) {
        await updateBet(bet.id, { isWinner: true })
      }

      if (totalPayout > 0) {
        await deductFromPot('Pote de Premios', totalPayout)
      }

      toast.success(`🎉 ${winningBets.length} ganador${winningBets.length !== 1 ? 'es' : ''} registrado${winningBets.length !== 1 ? 's' : ''} automáticamente!`, {
        description: `Total pagado: Bs. ${totalPayout.toFixed(2)}`
      })

      return { winnersCount: winningBets.length, totalPayout }
    } catch (error) {
      toast.error('Error al procesar ganadores automáticamente')
      return { winnersCount: 0, totalPayout: 0 }
    }
  }

  const handleDeleteDraw = (draw: any) => {
    setDrawToDelete(draw)
    setDeleteDrawDialogOpen(true)
  }

  const confirmDeleteDraw = async () => {
    if (!drawToDelete) return

    try {
      await deleteDraw(drawToDelete.id)
      toast.success('Sorteo eliminado exitosamente')
      setDeleteDrawDialogOpen(false)
      setDrawToDelete(null)
    } catch (error) {
      toast.error('Error al eliminar sorteo')
    }
  }

  const filteredDraws = draws.filter((draw) => {
    if (drawSearch) {
      const lottery = lotteries.find(l => l.id === draw.lotteryId)
      const lotteryName = lottery?.name || ''
      const searchLower = drawSearch.toLowerCase()
      if (
        !lotteryName.toLowerCase().includes(searchLower) &&
        !draw.winningAnimalName.toLowerCase().includes(searchLower) &&
        !draw.winningAnimalNumber.includes(searchLower) &&
        !draw.drawTime.toLowerCase().includes(searchLower)
      ) {
        return false
      }
    }
    if (drawFilters.lotteryId && draw.lotteryId !== drawFilters.lotteryId) {
      return false
    }
    return true
  })

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">Administración de Sorteos</h2>
          <p className="text-muted-foreground text-sm">Crear, editar y eliminar resultados de sorteos realizados</p>
        </div>
        <Button
          onClick={() => {
            setEditingDraw(undefined)
            setDrawManagementDialogOpen(true)
          }}
          className="w-full sm:w-auto"
        >
          <Plus className="mr-2" />
          Crear Sorteo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Panel de Control de Sorteos</CardTitle>
          <CardDescription>Vista administrativa de todos los sorteos del sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{draws.length}</div>
              <div className="text-sm text-muted-foreground">Sorteos Registrados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{draws.filter(d => (d.winnersCount || 0) > 0).length}</div>
              <div className="text-sm text-muted-foreground">Con Ganadores</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {formatCurrency(draws.reduce((sum, d) => sum + (d.totalPayout || 0), 0))}
              </div>
              <div className="text-sm text-muted-foreground">Total Premios Pagados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{draws.filter(d => (d.winnersCount || 0) === 0).length}</div>
              <div className="text-sm text-muted-foreground">Sin Ganadores</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {drawsLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <p className="text-muted-foreground">Cargando resultados...</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Administrar Sorteos</CardTitle>
            <CardDescription>Gestionar resultados - crear, editar o eliminar sorteos del sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <div className="flex-1 relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por lotería, animal o fecha..."
                  value={drawSearch}
                  onChange={(e) => setDrawSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={drawFilters.lotteryId || 'all'}
                onValueChange={(value) =>
                  setDrawFilters((f) => ({ ...f, lotteryId: value === 'all' ? undefined : value }))
                }
              >
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Filtrar por lotería" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los sorteos</SelectItem>
                  {lotteries.map((lottery) => (
                    <SelectItem key={lottery.id} value={lottery.id}>
                      {lottery.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ScrollArea className="h-[400px] md:h-[500px]">
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">Fecha</TableHead>
                      <TableHead className="w-[80px]">Hora</TableHead>
                      <TableHead>Lotería</TableHead>
                      <TableHead>Animal</TableHead>
                      <TableHead className="w-[100px]">Estado</TableHead>
                      <TableHead className="w-[120px]">Premio</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDraws.map((draw) => {
                      const lottery = lotteries.find(l => l.id === draw.lotteryId)
                      return (
                        <TableRow key={draw.id}>
                          <TableCell className="font-medium">
                            {format(new Date(draw.drawTime), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell>{format(new Date(draw.drawTime), 'HH:mm')}</TableCell>
                          <TableCell>{lottery?.name || draw.lotteryName || 'N/A'}</TableCell>
                          <TableCell>
                            <span className="font-mono">
                              {draw.winningAnimalNumber} - {draw.winningAnimalName}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant={(draw.winnersCount || 0) > 0 ? 'default' : 'outline'}>
                              {(draw.winnersCount || 0) > 0 ? 'Con ganadores' : 'Sin ganadores'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {(draw.totalPayout || 0) > 0
                              ? formatCurrency(draw.totalPayout)
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setEditingDraw(draw)
                                  setDrawManagementDialogOpen(true)
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDraw(draw)}
                              >
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <DrawManagementDialog
        open={drawManagementDialogOpen}
        onOpenChange={(open) => {
          setDrawManagementDialogOpen(open)
          if (!open) setEditingDraw(undefined)
        }}
        draw={editingDraw}
        lotteries={lotteries}
        onSave={async (drawData) => {
          if (editingDraw) {
            const success = await updateDraw(editingDraw.id, drawData)
            return success
          } else {
            const success = await createDraw(drawData)
            if (success) {
              await processWinnersAutomatically(drawData)
            }
            return success
          }
        }}
      />

      <Dialog open={deleteDrawDialogOpen} onOpenChange={setDeleteDrawDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trash className="h-5 w-5 text-destructive" />
              Eliminar Sorteo
            </DialogTitle>
            <DialogDescription className="pt-2">
              ¿Está seguro de que desea eliminar este sorteo? Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setDeleteDrawDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteDraw}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
