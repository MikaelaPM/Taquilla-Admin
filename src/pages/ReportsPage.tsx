import { ReportsCard } from '@/components/ReportsCard'
import { DrawStatsCard } from '@/components/DrawStatsCard'
import { useApp } from '@/contexts/AppContext'

export function ReportsPage() {
  const { draws, lotteries, bets, users } = useApp()

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-xl md:text-2xl font-semibold">Reportes y Estadísticas</h2>
        <p className="text-muted-foreground text-sm">Análisis en tiempo real de ventas y premios</p>
      </div>

      <ReportsCard
        draws={draws}
        lotteries={lotteries}
        bets={bets}
        users={users}
      />

      <DrawStatsCard bets={bets} draws={draws} lotteries={lotteries} />
    </div>
  )
}
