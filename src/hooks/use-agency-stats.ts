import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { startOfWeek, startOfDay, endOfDay } from 'date-fns'

export interface AgencyStats {
  agencyId: string
  agencyName: string
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

export interface UseAgencyStatsOptions {
  agencies: Array<{
    id: string
    name: string
    shareOnSales: number
  }>
  taquillas: Array<{
    id: string
    parentId?: string
  }>
}

export function useAgencyStats(options: UseAgencyStatsOptions) {
  const [stats, setStats] = useState<AgencyStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Create stable keys for dependencies
  const agenciesKey = useMemo(() =>
    (options.agencies || []).map(a => a.id).sort().join(','),
    [options.agencies]
  )

  const taquillasKey = useMemo(() =>
    (options.taquillas || []).map(t => t.id).sort().join(','),
    [options.taquillas]
  )

  // Store latest options in a ref to avoid stale closures
  const optionsRef = useRef(options)
  optionsRef.current = options

  const loadStats = useCallback(async () => {
    const { agencies, taquillas } = optionsRef.current

    if (!agencies || agencies.length === 0) {
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

      // Build a map: agencyId -> taquillaIds[]
      const agencyTaquillasMap = new Map<string, string[]>()

      agencies.forEach(agency => {
        // Get taquillas for this agency (taquillas where parentId = agency.id)
        const agencyTaquillaIds = taquillas
          .filter(t => t.parentId === agency.id)
          .map(t => t.id)

        agencyTaquillasMap.set(agency.id, agencyTaquillaIds)
      })

      // Get all taquilla IDs we need to query
      const allTaquillaIds = Array.from(agencyTaquillasMap.values()).flat()

      if (allTaquillaIds.length === 0) {
        // No taquillas, set stats with zeros
        const emptyStats = agencies.map(agency => ({
          agencyId: agency.id,
          agencyName: agency.name,
          todaySales: 0,
          todayPrizes: 0,
          todaySalesCommission: 0,
          todayBalance: 0,
          weekSales: 0,
          weekPrizes: 0,
          salesCommission: 0,
          shareOnSales: agency.shareOnSales || 0,
          balance: 0
        }))
        setStats(emptyStats)
        return
      }

      // ============================================
      // 1. FETCH SALES from bets table
      // Sum bets.amount where user_id is in taquillas (excluir anulados)
      // ============================================
      const { data: salesData, error: salesError } = await supabase
        .from('bets')
        .select('user_id, amount, created_at')
        .in('user_id', allTaquillaIds)
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
        .in('user_id', allTaquillaIds)
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
      // 3. Calculate stats per agency
      // ============================================
      const computedStats: AgencyStats[] = agencies.map(agency => {
        const taquillaIds = agencyTaquillasMap.get(agency.id) || []
        const shareOnSales = agency.shareOnSales || 0

        // ---- Datos del DÍA ----
        const todaySales = taquillaIds.reduce((sum, tId) => {
          return sum + (todaySalesByTaquilla.get(tId) || 0)
        }, 0)

        const todayPrizes = taquillaIds.reduce((sum, tId) => {
          return sum + (todayPrizesByTaquilla.get(tId) || 0)
        }, 0)

        const todaySalesCommission = todaySales * (shareOnSales / 100)
        const todayBalance = todaySales - todayPrizes - todaySalesCommission

        // ---- Datos de la SEMANA ----
        const weekSales = taquillaIds.reduce((sum, tId) => {
          return sum + (salesByTaquilla.get(tId) || 0)
        }, 0)

        const weekPrizes = taquillaIds.reduce((sum, tId) => {
          return sum + (prizesByTaquilla.get(tId) || 0)
        }, 0)

        const salesCommission = weekSales * (shareOnSales / 100)
        const balance = weekSales - weekPrizes - salesCommission

        return {
          agencyId: agency.id,
          agencyName: agency.name,
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
      setError('Error al cargar estadísticas de agencias')
    } finally {
      setLoading(false)
    }
  }, []) // No dependencies - uses ref for latest options

  // Load stats when the keys change (meaning the actual data changed)
  useEffect(() => {
    if (agenciesKey) {
      loadStats()
    }
  }, [agenciesKey, taquillasKey, loadStats])

  return {
    stats,
    loading,
    error,
    refresh: loadStats
  }
}
