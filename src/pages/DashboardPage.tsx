import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { PotCard } from '@/components/PotCard'
import { TransferDialog } from '@/components/TransferDialog'
import { useApp } from '@/contexts/AppContext'
import { INITIAL_POTS } from '@/lib/pot-utils'

export function DashboardPage() {
  const {
    pots,
    lotteries,
    activeBets,
    winners,
    createTransfer,
    deductFromPot
  } = useApp()

  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [transferFromIndex, setTransferFromIndex] = useState<number | undefined>()

  const currentPots = pots || INITIAL_POTS

  const openTransferDialog = (potIndex: number) => {
    setTransferFromIndex(potIndex)
    setTransferDialogOpen(true)
  }

  const handleTransfer = async (fromIndex: number, toIndex: number, amount: number) => {
    const fromPotName = currentPots[fromIndex].name
    const toPotName = currentPots[toIndex].name
    await createTransfer(fromPotName, toPotName, amount)
  }

  const handleWithdraw = async (potIndex: number) => {
    // Funcionalidad simplificada - solo muestra mensaje informativo
    // La tabla de withdrawals no existe en Supabase
    const pot = currentPots[potIndex]
    console.log(`Retiro solicitado del pote: ${pot.name}`)
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold">Balance de Potes</h2>
          <p className="text-muted-foreground text-sm">Gestión de fondos del sistema</p>
        </div>
      </div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
        {currentPots.map((pot, index) => (
          <PotCard
            key={index}
            pot={pot}
            index={index}
            onTransfer={openTransferDialog}
            onWithdraw={() => handleWithdraw(index)}
          />
        ))}
      </div>

      <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Sorteos Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {lotteries.filter((l) => l.isActive).length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jugadas Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{activeBets.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Ganadores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{winners.length}</div>
          </CardContent>
        </Card>
      </div>

      {currentPots[0]?.balance < 10000 && (
        <Alert>
          <AlertDescription>
            El pote de premios está bajo. Considere transferir fondos desde costos o ganancias.
          </AlertDescription>
        </Alert>
      )}

      <TransferDialog
        open={transferDialogOpen}
        onOpenChange={setTransferDialogOpen}
        pots={currentPots}
        initialFromIndex={transferFromIndex}
        onTransfer={handleTransfer}
      />
    </div>
  )
}
