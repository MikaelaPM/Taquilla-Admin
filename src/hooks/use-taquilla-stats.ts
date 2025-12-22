import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { startOfWeek, startOfDay, endOfDay } from 'date-fns'

export interface TaquillaStats {
  taquillaId: string
  taquillaName: string
  // Datos del día
  todaySales: number
  todayPrizes: number
  todaySalesCommission: number
  todayBalance: number
  // Datos de la semana
  weekSales: number
  weekPrizes: number
  salesCommission: number
  shareOnSales: number
  balance: number // weekSales - weekPrizes - salesCommission
}

export interface UseTaquillaStatsOptions {
  taquillas: Array<{
    id: string
    fullName: string
    shareOnSales?: number
  }>
}

export function useTaquillaStats(options: UseTaquillaStatsOptions) {
  const [stats, setStats] = useState<TaquillaStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create stable key for dependencies
  const taquillasKey = useMemo(() =>
    (options.taquillas || []).map(t => t.id).sort().join(','),
    [options.taquillas]
  )

  // Store latest options in a ref to avoid stale closures
  const optionsRef = useRef(options)
  optionsRef.current = options

  const loadStats = useCallback(async () => {
    const { taquillas } = optionsRef.current

    if (!taquillas || taquillas.length === 0) {
      setStats([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const now = new Date()
      const todayStart = startOfDay(now).toISOString()
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
      const todayEnd = endOfDay(now).toISOString()

      const taquillaIds = taquillas.map(t => t.id)

      // ============================================
      // 1. FETCH SALES from bets table
      // Sum bets.amount where user_id is in taquillas (excluir anulados)
      // ============================================
      const { data: salesData, error: salesError } = await supabase
        .from('bets')
        .select('user_id, amount, created_at')
        .in('user_id', taquillaIds)
        .gte('created_at', weekStart)
        .lte('created_at', todayEnd)
        .neq('status', 'cancelled')

      if (salesError) {
        console.error('Error fetching sales:', salesError)
        setError(salesError.message)
        return
      }

      // Sum sales by taquilla (semana y día)
      const salesByTaquilla = new Map<string, number>()
      const todaySalesByTaquilla = new Map<string, number>()
      ;(salesData || []).forEach(bet => {
        const odile = bet.user_id as string
        if (odile) {
          const amount = Number(bet.amount) || 0
          // Ventas de la semana
          const current = salesByTaquilla.get(odile) || 0
          salesByTaquilla.set(odile, current + amount)
          // Ventas del día
          if (bet.created_at >= todayStart) {
            const currentToday = todaySalesByTaquilla.get(odile) || 0
            todaySalesByTaquilla.set(odile, currentToday + amount)
          }
        }
      })

      // ============================================
      // 2. FETCH PRIZES from bets_item_lottery_clasic
      // Sum potential_bet_amount where user_id is in taquillas
      // and status is 'winner' or 'paid'
      // ============================================
      const { data: prizesData, error: prizesError } = await supabase
        .from('bets_item_lottery_clasic')
        .select('user_id, potential_bet_amount, status, created_at')
        .in('user_id', taquillaIds)
        .in('status', ['winner', 'paid'])
        .gte('created_at', weekStart)
        .lte('created_at', todayEnd)

      if (prizesError) {
        console.error('Error fetching prizes:', prizesError)
        setError(prizesError.message)
        return
      }

      // Sum prizes by taquilla (semana y día)
      const prizesByTaquilla = new Map<string, number>()
      const todayPrizesByTaquilla = new Map<string, number>()
      ;(prizesData || []).forEach(item => {
        const odile = item.user_id as string
        if (odile) {
          const amount = Number(item.potential_bet_amount) || 0
          // Premios de la semana
          const current = prizesByTaquilla.get(odile) || 0
          prizesByTaquilla.set(odile, current + amount)
          // Premios del día
          if (item.created_at >= todayStart) {
            const currentToday = todayPrizesByTaquilla.get(odile) || 0
            todayPrizesByTaquilla.set(odile, currentToday + amount)
          }
        }
      })

      // ============================================
      // 3. Calculate stats per taquilla
      // ============================================
      const computedStats: TaquillaStats[] = taquillas.map(taquilla => {
        const shareOnSales = taquilla.shareOnSales || 0

        // ---- Datos del DÍA ----
        const todaySales = todaySalesByTaquilla.get(taquilla.id) || 0
        const todayPrizes = todayPrizesByTaquilla.get(taquilla.id) || 0
        const todaySalesCommission = todaySales * (shareOnSales / 100)
        const todayBalance = todaySales - todayPrizes - todaySalesCommission

        // ---- Datos de la SEMANA ----
        const weekSales = salesByTaquilla.get(taquilla.id) || 0
        const weekPrizes = prizesByTaquilla.get(taquilla.id) || 0
        const salesCommission = weekSales * (shareOnSales / 100)
        const balance = weekSales - weekPrizes - salesCommission

        return {
          taquillaId: taquilla.id,
          taquillaName: taquilla.fullName,
          todaySales,
          todayPrizes,
          todaySalesCommission,
          todayBalance,
          weekSales,
          weekPrizes,
          salesCommission,
          shareOnSales,
          balance
        }
      })

      // Sort by sales descending
      computedStats.sort((a, b) => b.weekSales - a.weekSales)

      setStats(computedStats)
    } catch (err) {
      console.error('Error in loadStats:', err)
      setError('Error al cargar estadísticas de taquillas')
    } finally {
      setLoading(false)
    }
  }, []) // No dependencies - uses ref for latest options

  // Load stats when the key changes (meaning the actual data changed)
  useEffect(() => {
    if (taquillasKey) {
      loadStats()
    }
  }, [taquillasKey, loadStats])

  return {
    stats,
    loading,
    error,
    refresh: loadStats
  }
}
