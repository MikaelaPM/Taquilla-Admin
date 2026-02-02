import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { endOfDay, startOfDay } from 'date-fns'

export interface LolaSalesStats {
  rangeSales: number
  rangeBetsCount: number
  rangeTaquillaCommissions: number
  winnersCount: number
  salesByTaquilla: Array<{
    taquillaId: string
    taquillaName: string
    sales: number
    betsCount: number
    shareOnSales: number
    commission: number
    winnersCount: number
  }>
}

export interface UseSalesStatsLolaOptions {
  visibleTaquillaIds?: string[]
  dateFrom: Date
  dateTo: Date
  enabled?: boolean
}

const emptyStats: LolaSalesStats = {
  rangeSales: 0,
  rangeBetsCount: 0,
  rangeTaquillaCommissions: 0,
  winnersCount: 0,
  salesByTaquilla: []
}

export function useSalesStatsLola(options: UseSalesStatsLolaOptions) {
  const [stats, setStats] = useState<LolaSalesStats>(emptyStats)
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

      // undefined = sin filtro, [] = sin acceso
      if (visibleTaquillaIds !== undefined && visibleTaquillaIds.length === 0) {
        setStats(emptyStats)
        return
      }

      const queryStart = startOfDay(options.dateFrom).toISOString()
      const queryEnd = endOfDay(options.dateTo).toISOString()

      let itemsQuery = supabase
        .from('bets_item_lola_lottery')
        .select('id, user_id, amount, status')
        .gte('created_at', queryStart)
        .lte('created_at', queryEnd)

      if (visibleTaquillaIds && visibleTaquillaIds.length > 0) {
        itemsQuery = itemsQuery.in('user_id', visibleTaquillaIds)
      }

      const { data: items, error: itemsError } = await itemsQuery

      if (itemsError) {
        console.error('Error fetching lola items:', itemsError)
        setError(itemsError.message)
        setStats(emptyStats)
        return
      }

      const taquillaMap = new Map<string, { sales: number; betsCount: number; winnersCount: number }>()
      let totalSales = 0
      let totalBetsCount = 0
      let totalWinnersCount = 0

      ;(items || []).forEach((item: any) => {
        const taquillaId = String(item.user_id || '')
        if (!taquillaId) return

        const amount = Number(item.amount) || 0
        const status = String(item.status || '')

        const isCancelled = status === 'cancelled'
        const isWinner = status === 'winner'

        const current = taquillaMap.get(taquillaId) || { sales: 0, betsCount: 0, winnersCount: 0 }

        // "Jugadas" = filas del item (no cancelled)
        if (!isCancelled) {
          current.sales += amount
          current.betsCount += 1
          totalSales += amount
          totalBetsCount += 1
        }

        if (isWinner) {
          current.winnersCount += 1
          totalWinnersCount += 1
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
          console.error('Error fetching taquilla info for lola:', usersError)
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
            winnersCount: data.winnersCount
          }
        })
        .sort((a, b) => b.sales - a.sales)

      const rangeTaquillaCommissions = salesByTaquilla.reduce((sum, t) => sum + t.commission, 0)

      setStats({
        rangeSales: totalSales,
        rangeBetsCount: totalBetsCount,
        rangeTaquillaCommissions,
        winnersCount: totalWinnersCount,
        salesByTaquilla
      })
    } catch (err) {
      console.error('Error in loadStats (lola):', err)
      setError('Error al cargar estadísticas de ventas (Lola)')
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
