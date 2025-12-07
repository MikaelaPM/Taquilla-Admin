import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useApp } from '@/contexts/AppContext'
import { formatCurrency } from '@/lib/pot-utils'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { MagnifyingGlass } from '@phosphor-icons/react'

export function HistoryPage() {
  const { transfers, withdrawals } = useApp()

  const [transferSearch, setTransferSearch] = useState('')
  const [withdrawalSearch, setWithdrawalSearch] = useState('')

  const filteredTransfers = transfers.filter((transfer) => {
    return (
      transferSearch === '' ||
      transfer.fromPot.toLowerCase().includes(transferSearch.toLowerCase()) ||
      transfer.toPot.toLowerCase().includes(transferSearch.toLowerCase())
    )
  })

  const filteredWithdrawals = withdrawals.filter((withdrawal) => {
    return (
      withdrawalSearch === '' ||
      withdrawal.fromPot.toLowerCase().includes(withdrawalSearch.toLowerCase())
    )
  })

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-semibold">Historial de Transacciones</h2>
        <p className="text-muted-foreground text-sm">Transferencias y retiros realizados</p>
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Transferencias Entre Potes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre de pote..."
                value={transferSearch}
                onChange={(e) => setTransferSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredTransfers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {transfers.length === 0
                  ? 'No hay transferencias registradas'
                  : 'No se encontraron transferencias'}
              </p>
            ) : (
              <ScrollArea className="h-[350px] md:h-[400px]">
                <div className="space-y-3">
                  {filteredTransfers
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((transfer) => (
                      <div key={transfer.id} className="p-3 border rounded-lg space-y-1">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                          <div className="text-sm flex-1 min-w-0">
                            <p className="font-medium truncate">De: {transfer.fromPot}</p>
                            <p className="text-muted-foreground truncate">Para: {transfer.toPot}</p>
                          </div>
                          <p className="font-semibold tabular-nums shrink-0">
                            {formatCurrency(transfer.amount)}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(transfer.timestamp), 'dd/MM/yyyy HH:mm', {
                            locale: es,
                          })}
                        </p>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Retiros de Ganancias</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por pote..."
                value={withdrawalSearch}
                onChange={(e) => setWithdrawalSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredWithdrawals.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                {withdrawals.length === 0
                  ? 'No hay retiros registrados'
                  : 'No se encontraron retiros'}
              </p>
            ) : (
              <ScrollArea className="h-[350px] md:h-[400px]">
                <div className="space-y-3">
                  {filteredWithdrawals
                    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .map((withdrawal) => (
                      <div key={withdrawal.id} className="p-3 border rounded-lg space-y-1">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
                          <p className="text-sm font-medium truncate flex-1">{withdrawal.fromPot}</p>
                          <p className="font-semibold text-accent tabular-nums shrink-0">
                            {formatCurrency(withdrawal.amount)}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(withdrawal.timestamp), 'dd/MM/yyyy HH:mm', {
                            locale: es,
                          })}
                        </p>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
