import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { endOfDay, startOfDay } from 'date-fns'

export interface PolloLlenoSalesStats {
  rangeSales: number
  rangeBetsCount: number
  rangeTaquillaCommissions: number
  rangePrizes: number
  winnersCount: number
  salesByTaquilla: Array<{
    taquillaId: string
    taquillaName: string
    sales: number
    betsCount: number
    shareOnSales: number
    commission: number
    winnersCount: number
    prizes: number
  }>
}

export interface UseSalesStatsPolloLlenoOptions {
  visibleTaquillaIds?: string[]
  dateFrom: Date
  dateTo: Date
  enabled?: boolean
}

const emptyStats: PolloLlenoSalesStats = {
  rangeSales: 0,
  rangeBetsCount: 0,
  rangeTaquillaCommissions: 0,
  rangePrizes: 0,
  winnersCount: 0,
  salesByTaquilla: []
}

export function useSalesStatsPolloLleno(options: UseSalesStatsPolloLlenoOptions) {
  const [stats, setStats] = useState<PolloLlenoSalesStats>(emptyStats)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    const enabled = options.enabled ?? true
    if (!enabled) {
      setStats(emptyStats)
      setLoading(false)
      setError(null)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const visibleTaquillaIds = options.visibleTaquillaIds

      if (visibleTaquillaIds !== undefined && visibleTaquillaIds.length === 0) {
        setStats(emptyStats)
        return
      }

      const queryStart = startOfDay(options.dateFrom).toISOString()
      const queryEnd = endOfDay(options.dateTo).toISOString()

      let itemsQuery = supabase
        .from('bets_item_pollo_lleno')
        .select('*')
        .gte('created_at', queryStart)
        .lte('created_at', queryEnd)

      if (visibleTaquillaIds && visibleTaquillaIds.length > 0) {
        itemsQuery = itemsQuery.in('user_id', visibleTaquillaIds)
      }

      const { data: items, error: itemsError } = await itemsQuery

      if (itemsError) {
        console.error('Error fetching pollo lleno items:', itemsError)
        setError(itemsError.message)
        setStats(emptyStats)
        return
      }

      const taquillaMap = new Map<string, { sales: number; betsCount: number; winnersCount: number; prizes: number }>()
      let totalSales = 0
      let totalBetsCount = 0
      let totalWinnersCount = 0
      let totalPrizes = 0

      ;(items || []).forEach((item: any) => {
        const taquillaId = String(item.user_id || '')
        if (!taquillaId) return

        const amount = Number(item.amount) || 0
        const prize = Number(item.prize) || 0
        const status = String(item.status || '')
        const isCancelled = status === 'cancelled'
        const isWinner = status === 'winner' || status === 'paid'

        const current = taquillaMap.get(taquillaId) || { sales: 0, betsCount: 0, winnersCount: 0, prizes: 0 }

        if (!isCancelled) {
          current.sales += amount
          current.betsCount += 1
          totalSales += amount
          totalBetsCount += 1
        }

        if (isWinner) {
          current.winnersCount += 1
          current.prizes += prize
          totalWinnersCount += 1
          totalPrizes += prize
        }

        taquillaMap.set(taquillaId, current)
      })

      const taquillaIds = Array.from(taquillaMap.keys())
      let taquillaInfoMap = new Map<string, { name: string; shareOnSales: number }>()

      if (taquillaIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, name, share_on_sales')
          .in('id', taquillaIds)

        if (usersError) {
          console.error('Error fetching taquilla info for pollo lleno:', usersError)
        }

        if (users) {
          taquillaInfoMap = new Map(
            users.map((u: any) => [
              u.id,
              {
                name: u.name,
                shareOnSales: Number(u.share_on_sales) || 0
              }
            ])
          )
        }
      }

      const salesByTaquilla = Array.from(taquillaMap.entries())
        .map(([taquillaId, data]) => {
          const info = taquillaInfoMap.get(taquillaId) || { name: 'Desconocida', shareOnSales: 0 }
          const commission = data.sales * (info.shareOnSales / 100)
          return {
            taquillaId,
            taquillaName: info.name,
            sales: data.sales,
            betsCount: data.betsCount,
            shareOnSales: info.shareOnSales,
            commission,
            winnersCount: data.winnersCount,
            prizes: data.prizes
          }
        })
        .sort((a, b) => b.sales - a.sales)

      const rangeTaquillaCommissions = salesByTaquilla.reduce((sum, t) => sum + t.commission, 0)

      setStats({
        rangeSales: totalSales,
        rangeBetsCount: totalBetsCount,
        rangeTaquillaCommissions,
        rangePrizes: totalPrizes,
        winnersCount: totalWinnersCount,
        salesByTaquilla
      })
    } catch (err) {
      console.error('Error in loadStats (pollo lleno):', err)
      setError('Error al cargar estadísticas de ventas (Pollo Lleno)')
      setStats(emptyStats)
    } finally {
      setLoading(false)
    }
  }, [options.dateFrom, options.dateTo, options.enabled, options.visibleTaquillaIds])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  return {
    stats,
    loading,
    error,
    refresh: loadStats
  }
}
