import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useApp } from '@/contexts/AppContext'
import { toast } from 'sonner'
import { format, startOfWeek, endOfWeek, addDays, addWeeks, subWeeks, isToday, isBefore, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { CaretLeft, CaretRight, Target, CheckCircle, Calendar, Warning } from '@phosphor-icons/react'
import { ANIMALS } from '@/lib/types'

export function DrawsPage() {
  const {
    lotteries,
    dailyResults,
    dailyResultsLoading,
    createDailyResult,
    getResultForLotteryAndDate
  } = useApp()

  const [currentWeekStart, setCurrentWeekStart] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  )
  const [selectedCell, setSelectedCell] = useState<{ lotteryId: string; date: string } | null>(null)
  const [selectedPrizeId, setSelectedPrizeId] = useState<string>('')
  const [savingResult, setSavingResult] = useState(false)
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false)

  // Loterías activas ordenadas por hora de jugada
  const activeLotteries = useMemo(() => {
    return lotteries
      .filter(l => l.isActive)
      .sort((a, b) => {
        const timeA = a.drawTime.replace(':', '')
        const timeB = b.drawTime.replace(':', '')
        return timeA.localeCompare(timeB)
      })
  }, [lotteries])

  // Días de la semana actual
  const weekDays = useMemo(() => {
    const days: Date[] = []
    for (let i = 0; i < 7; i++) {
      days.push(addDays(currentWeekStart, i))
    }
    return days
  }, [currentWeekStart])

  const weekEnd = endOfWeek(currentWeekStart, { weekStartsOn: 1 })

  const goToPreviousWeek = () => {
    setCurrentWeekStart(subWeeks(currentWeekStart, 1))
  }

  const goToNextWeek = () => {
    setCurrentWeekStart(addWeeks(currentWeekStart, 1))
  }

  const goToCurrentWeek = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
  }

  const handleCellClick = (lotteryId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const existingResult = getResultForLotteryAndDate(lotteryId, dateStr)

    // Si ya hay resultado, no permitir editar
    if (existingResult) {
      return
    }

    // Solo permitir cargar resultados para hoy o días anteriores
    if (isBefore(new Date(), date) && !isToday(date)) {
      toast.error('No puedes cargar resultados para días futuros')
      return
    }

    const lottery = lotteries.find(l => l.id === lotteryId)
    if (!lottery) return

    setSelectedCell({ lotteryId, date: dateStr })
    setSelectedPrizeId('')
  }

  const handleSaveResult = async () => {
    if (!selectedCell || !selectedPrizeId) {
      toast.error('Selecciona un animal/número')
      return
    }

    setConfirmDialogOpen(true)
  }

  const confirmSaveResult = async () => {
    if (!selectedCell || !selectedPrizeId) return

    setSavingResult(true)
    try {
      const success = await createDailyResult(
        selectedCell.lotteryId,
        selectedPrizeId,
        selectedCell.date
      )

      if (success) {
        toast.success('Resultado guardado exitosamente')
        setSelectedCell(null)
        setSelectedPrizeId('')
      } else {
        toast.error('Error al guardar el resultado')
      }
    } catch (error) {
      toast.error('Error al guardar el resultado')
    } finally {
      setSavingResult(false)
      setConfirmDialogOpen(false)
    }
  }

  const getResultDisplay = (lotteryId: string, date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    const result = getResultForLotteryAndDate(lotteryId, dateStr)

    if (result?.prize) {
      return {
        hasResult: true,
        number: result.prize.animalNumber,
        name: result.prize.animalName
      }
    }

    return { hasResult: false, number: '', name: '' }
  }

  const selectedLottery = selectedCell
    ? lotteries.find(l => l.id === selectedCell.lotteryId)
    : null

  const selectedAnimal = selectedPrizeId
    ? ANIMALS.find(a => {
        const prize = selectedLottery?.prizes?.find(p => p.id === selectedPrizeId)
        return prize?.animalNumber === a.number
      })
    : null

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Resultados Semanales</h2>
          <p className="text-muted-foreground">
            Gestiona los resultados de los sorteos por día
          </p>
        </div>
      </div>

      {/* Navegación de semanas */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={goToPreviousWeek} className="gap-1">
          <CaretLeft className="h-4 w-4" />
          Semana Anterior
        </Button>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm px-3 py-1">
            <Calendar className="h-4 w-4 mr-2" />
            {format(currentWeekStart, "d MMM", { locale: es })} - {format(weekEnd, "d MMM yyyy", { locale: es })}
          </Badge>
          <Button variant="ghost" size="sm" onClick={goToCurrentWeek}>
            Hoy
          </Button>
        </div>

        <Button variant="outline" size="sm" onClick={goToNextWeek} className="gap-1">
          Semana Siguiente
          <CaretRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Matriz semanal */}
      {dailyResultsLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mb-4"></div>
          <p className="text-muted-foreground">Cargando resultados...</p>
        </div>
      ) : activeLotteries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Target className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">No hay sorteos activos</p>
            <p className="text-muted-foreground text-sm">
              Activa sorteos en la sección de Sorteos para poder cargar resultados
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="text-left p-3 font-semibold text-sm sticky left-0 bg-muted/50 z-10 min-w-[180px]">
                    Sorteo / Hora
                  </th>
                  {weekDays.map((day) => {
                    const isTodayDate = isToday(day)
                    const dayName = format(day, 'EEE', { locale: es })
                    const dayNum = format(day, 'd')

                    return (
                      <th
                        key={day.toISOString()}
                        className={`text-center p-3 font-semibold text-sm min-w-[100px] ${
                          isTodayDate ? 'bg-primary/10' : ''
                        }`}
                      >
                        <div className="capitalize">{dayName}</div>
                        <div className={`text-lg ${isTodayDate ? 'text-primary font-bold' : ''}`}>
                          {dayNum}
                        </div>
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {activeLotteries.map((lottery) => (
                  <tr key={lottery.id} className="border-b hover:bg-muted/30 transition-colors">
                    <td className="p-3 sticky left-0 bg-background z-10 border-r">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
                          <Target className="h-4 w-4 text-white" weight="fill" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{lottery.name}</p>
                          <p className="text-xs text-muted-foreground">{lottery.drawTime}</p>
                        </div>
                      </div>
                    </td>
                    {weekDays.map((day) => {
                      const dateStr = format(day, 'yyyy-MM-dd')
                      const { hasResult, number, name } = getResultDisplay(lottery.id, day)
                      const isTodayDate = isToday(day)
                      const isPast = isBefore(day, new Date()) && !isTodayDate
                      const isFuture = isBefore(new Date(), day) && !isTodayDate
                      const isSelected = selectedCell?.lotteryId === lottery.id && selectedCell?.date === dateStr

                      return (
                        <td
                          key={`${lottery.id}-${dateStr}`}
                          className={`p-2 text-center border-r last:border-r-0 ${
                            isTodayDate ? 'bg-primary/5' : ''
                          }`}
                        >
                          {hasResult ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                                <span className="text-lg font-bold text-emerald-700">{number}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
                                {name}
                              </span>
                              <CheckCircle className="h-3 w-3 text-emerald-500" weight="fill" />
                            </div>
                          ) : isFuture ? (
                            <div className="h-10 w-10 mx-auto rounded-lg bg-muted/30 flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">-</span>
                            </div>
                          ) : isSelected ? (
                            <div className="space-y-1">
                              <Select value={selectedPrizeId} onValueChange={setSelectedPrizeId}>
                                <SelectTrigger className="h-10 w-full text-xs">
                                  <SelectValue placeholder="Seleccionar" />
                                </SelectTrigger>
                                <SelectContent>
                                  {(lottery.prizes || ANIMALS.map((a, i) => ({
                                    id: `temp-${i}`,
                                    animalNumber: a.number,
                                    animalName: a.name,
                                    multiplier: 30
                                  }))).map((prize) => (
                                    <SelectItem key={prize.id} value={prize.id}>
                                      {prize.animalNumber} - {prize.animalName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 text-xs flex-1"
                                  onClick={() => setSelectedCell(null)}
                                >
                                  Cancelar
                                </Button>
                                <Button
                                  size="sm"
                                  className="h-6 text-xs flex-1"
                                  onClick={handleSaveResult}
                                  disabled={!selectedPrizeId}
                                >
                                  Guardar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleCellClick(lottery.id, day)}
                              className={`h-10 w-10 mx-auto rounded-lg border-2 border-dashed flex items-center justify-center transition-all cursor-pointer ${
                                isTodayDate
                                  ? 'border-primary/50 hover:border-primary hover:bg-primary/10'
                                  : isPast
                                  ? 'border-amber-300 hover:border-amber-400 hover:bg-amber-50'
                                  : 'border-muted-foreground/30 hover:border-muted-foreground/50'
                              }`}
                              title={isTodayDate ? 'Cargar resultado de hoy' : isPast ? 'Cargar resultado pendiente' : ''}
                            >
                              <span className={`text-lg font-medium ${
                                isTodayDate ? 'text-primary' : 'text-muted-foreground'
                              }`}>
                                +
                              </span>
                            </button>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Leyenda */}
      <div className="flex flex-wrap gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-emerald-100 flex items-center justify-center">
            <CheckCircle className="h-3 w-3 text-emerald-500" weight="fill" />
          </div>
          <span className="text-muted-foreground">Resultado cargado</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded border-2 border-dashed border-primary/50"></div>
          <span className="text-muted-foreground">Disponible para cargar (hoy)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded border-2 border-dashed border-amber-300"></div>
          <span className="text-muted-foreground">Pendiente (días anteriores)</span>
        </div>
      </div>

      {/* Diálogo de confirmación */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Target className="h-6 w-6 text-primary" weight="fill" />
              </div>
              <div>
                <DialogTitle>Confirmar Resultado</DialogTitle>
                <DialogDescription>
                  Esta acción no se puede deshacer
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center mb-4">
              <p className="text-sm text-muted-foreground mb-1">{selectedLottery?.name}</p>
              <p className="text-sm text-muted-foreground mb-2">
                {selectedCell?.date && format(parseISO(selectedCell.date), "EEEE d 'de' MMMM", { locale: es })}
              </p>
              {selectedPrizeId && selectedLottery && (
                <div>
                  <p className="text-3xl font-bold text-primary">
                    {selectedLottery.prizes?.find(p => p.id === selectedPrizeId)?.animalNumber || '??'}
                  </p>
                  <p className="text-lg font-medium">
                    {selectedLottery.prizes?.find(p => p.id === selectedPrizeId)?.animalName || 'Desconocido'}
                  </p>
                </div>
              )}
            </div>
            <p className="text-sm text-muted-foreground text-center">
              ¿Está seguro que desea guardar este resultado?
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={savingResult}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmSaveResult}
              disabled={savingResult}
            >
              {savingResult ? 'Guardando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
