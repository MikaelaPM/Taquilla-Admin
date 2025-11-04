import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Bet, DrawResult, Lottery } from "@/lib/types"
import { formatCurrency } from "@/lib/pot-utils"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { ChartBar } from "@phosphor-icons/react"

interface DrawStatsCardProps {
  bets: Bet[]
  draws: DrawResult[]
  lotteries: Lottery[]
}

interface AnimalStats {
  animalNumber: string
  animalName: string
  totalBets: number
  totalAmount: number
  percentage: number
  betCount: number
}

export function DrawStatsCard({ bets, draws, lotteries }: DrawStatsCardProps) {
  const [selectedDrawId, setSelectedDrawId] = useState<string>("")

  const sortedDraws = useMemo(() => {
    return [...draws].sort((a, b) => new Date(b.drawTime).getTime() - new Date(a.drawTime).getTime())
  }, [draws])

  const animalStats = useMemo<AnimalStats[]>(() => {
    if (!selectedDrawId) return []

    const selectedDraw = draws.find((d) => d.id === selectedDrawId)
    if (!selectedDraw) return []

    const drawBets = bets.filter((bet) => {
      const betDate = new Date(bet.timestamp)
      const drawDate = new Date(selectedDraw.drawTime)
      
      return (
        bet.lotteryId === selectedDraw.lotteryId &&
        betDate <= drawDate
      )
    })

    const totalAmount = drawBets.reduce((sum, bet) => sum + bet.amount, 0)

    const statsMap = new Map<string, AnimalStats>()

    drawBets.forEach((bet) => {
      const key = bet.animalNumber
      if (!statsMap.has(key)) {
        statsMap.set(key, {
          animalNumber: bet.animalNumber,
          animalName: bet.animalName,
          totalBets: 0,
          totalAmount: 0,
          percentage: 0,
          betCount: 0,
        })
      }

      const stats = statsMap.get(key)!
      stats.totalAmount += bet.amount
      stats.betCount += 1
      stats.totalBets += bet.amount
    })

    const statsArray = Array.from(statsMap.values()).map((stat) => ({
      ...stat,
      percentage: totalAmount > 0 ? (stat.totalAmount / totalAmount) * 100 : 0,
    }))

    return statsArray.sort((a, b) => b.totalAmount - a.totalAmount)
  }, [selectedDrawId, bets, draws])

  const selectedDraw = draws.find((d) => d.id === selectedDrawId)
  const totalAmount = animalStats.reduce((sum, stat) => sum + stat.totalAmount, 0)
  const totalBetCount = animalStats.reduce((sum, stat) => sum + stat.betCount, 0)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ChartBar className="h-5 w-5" />
          Estadísticas por Animalito
        </CardTitle>
        <CardDescription>
          Seleccione un sorteo para ver el porcentaje de jugadas por animalito
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium">Seleccionar Sorteo</label>
          <Select value={selectedDrawId} onValueChange={setSelectedDrawId}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione un sorteo..." />
            </SelectTrigger>
            <SelectContent>
              {sortedDraws.length === 0 ? (
                <div className="p-2 text-sm text-muted-foreground">No hay sorteos realizados</div>
              ) : (
                sortedDraws.map((draw) => (
                  <SelectItem key={draw.id} value={draw.id}>
                    {draw.lotteryName} - {format(new Date(draw.drawTime), "dd/MM/yyyy HH:mm", { locale: es })} - Ganador: {draw.winningAnimalNumber} {draw.winningAnimalName}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedDrawId && selectedDraw && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold tabular-nums">{formatCurrency(totalAmount)}</div>
                  <p className="text-sm text-muted-foreground">Total Jugado</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold tabular-nums">{totalBetCount}</div>
                  <p className="text-sm text-muted-foreground">Total Jugadas</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold tabular-nums">{animalStats.length}</div>
                  <p className="text-sm text-muted-foreground">Animalitos Jugados</p>
                </CardContent>
              </Card>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Animalito Ganador</h3>
                <Badge variant="default" className="text-xs">
                  {selectedDraw.winningAnimalNumber} - {selectedDraw.winningAnimalName}
                </Badge>
              </div>
            </div>

            {animalStats.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No hay jugadas registradas para este sorteo
              </p>
            ) : (
              <ScrollArea className="h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[60px]">Posición</TableHead>
                      <TableHead>Animalito</TableHead>
                      <TableHead className="text-right">Jugadas</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Porcentaje</TableHead>
                      <TableHead className="w-[200px]">Distribución</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {animalStats.map((stat, index) => {
                      const isWinner = stat.animalNumber === selectedDraw.winningAnimalNumber
                      return (
                        <TableRow key={stat.animalNumber} className={isWinner ? "bg-accent/20" : ""}>
                          <TableCell className="font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-semibold">{stat.animalNumber}</span>
                              <span>{stat.animalName}</span>
                              {isWinner && (
                                <Badge variant="default" className="text-xs">
                                  Ganador
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {stat.betCount}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-medium">
                            {formatCurrency(stat.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums font-semibold">
                            {stat.percentage.toFixed(2)}%
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={stat.percentage} className="h-2" />
                              <span className="text-xs text-muted-foreground tabular-nums min-w-[45px]">
                                {stat.percentage.toFixed(1)}%
                              </span>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>
        )}

        {!selectedDrawId && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ChartBar className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Seleccione un sorteo</p>
            <p className="text-muted-foreground">
              Elija un sorteo del menú desplegable para ver las estadísticas detalladas
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
