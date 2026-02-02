import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { startOfWeek, startOfDay, endOfDay, startOfMonth } from 'date-fns'

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
  weekSalesCommission: number
  weekBalance: number
  // Datos del mes
  monthSales: number
  monthPrizes: number
  monthSalesCommission: number
  monthBalance: number
  // Datos del rango personalizado
  rangeSales: number
  rangePrizes: number
  rangeSalesCommission: number
  rangeBalance: number
  // Legacy
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
  // Rango de fechas personalizado (opcional)
  dateFrom?: Date
  dateTo?: Date

  // Permite deshabilitar el hook (por ejemplo, cuando lotteryType = 'lola')
  enabled?: boolean
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

  // Key para detectar cambios en el rango de fechas
  const dateRangeKey = useMemo(() => {
    const from = options.dateFrom ? startOfDay(options.dateFrom).toISOString() : 'default'
    const to = options.dateTo ? endOfDay(options.dateTo).toISOString() : 'default'
    return `${from}-${to}`
  }, [options.dateFrom, options.dateTo])

  // Store latest options in a ref to avoid stale closures
  const optionsRef = useRef(options)
  optionsRef.current = options

  const loadStats = useCallback(async () => {
    const { enabled = true, taquillas, dateFrom, dateTo } = optionsRef.current

    if (!enabled) {
      setStats([])
      setLoading(false)
      setError(null)
      return
    }

    if (!taquillas || taquillas.length === 0) {
      setStats([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const now = new Date()
      // Usar fechas personalizadas si se proporcionan
      const queryStart = dateFrom ? startOfDay(dateFrom).toISOString() : startOfMonth(now).toISOString()
      const queryEnd = dateTo ? endOfDay(dateTo).toISOString() : endOfDay(now).toISOString()

      // Para compatibilidad, mantener referencias fijas
      const todayStart = startOfDay(now).toISOString()
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }).toISOString()
      const monthStart = startOfMonth(now).toISOString()
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
        .gte('created_at', queryStart)
        .lte('created_at', queryEnd)
        .neq('status', 'cancelled')

      if (salesError) {
        console.error('Error fetching sales:', salesError)
        setError(salesError.message)
        return
      }

      // Sum sales by taquilla (rango personalizado, mes, semana y día)
      const rangeSalesByTaquilla = new Map<string, number>()
      const monthSalesByTaquilla = new Map<string, number>()
      const weekSalesByTaquilla = new Map<string, number>()
      const todaySalesByTaquilla = new Map<string, number>()
      ;(salesData || []).forEach(bet => {
        const odile = bet.user_id as string
        if (odile) {
          const amount = Number(bet.amount) || 0
          // Ventas del rango personalizado (todos los datos del query)
          const currentRange = rangeSalesByTaquilla.get(odile) || 0
          rangeSalesByTaquilla.set(odile, currentRange + amount)
          // Ventas del mes (si está dentro del mes actual)
          if (bet.created_at >= monthStart) {
            const currentMonth = monthSalesByTaquilla.get(odile) || 0
            monthSalesByTaquilla.set(odile, currentMonth + amount)
          }
          // Ventas de la semana
          if (bet.created_at >= weekStart) {
            const currentWeek = weekSalesByTaquilla.get(odile) || 0
            weekSalesByTaquilla.set(odile, currentWeek + amount)
          }
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
        .gte('created_at', queryStart)
        .lte('created_at', queryEnd)

      if (prizesError) {
        console.error('Error fetching prizes:', prizesError)
        setError(prizesError.message)
        return
      }

      // Sum prizes by taquilla (rango personalizado, mes, semana y día)
      const rangePrizesByTaquilla = new Map<string, number>()
      const monthPrizesByTaquilla = new Map<string, number>()
      const weekPrizesByTaquilla = new Map<string, number>()
      const todayPrizesByTaquilla = new Map<string, number>()
      ;(prizesData || []).forEach(item => {
        const odile = item.user_id as string
        if (odile) {
          const amount = Number(item.potential_bet_amount) || 0
          // Premios del rango personalizado (todos los datos del query)
          const currentRange = rangePrizesByTaquilla.get(odile) || 0
          rangePrizesByTaquilla.set(odile, currentRange + amount)
          // Premios del mes (si está dentro del mes actual)
          if (item.created_at >= monthStart) {
            const currentMonth = monthPrizesByTaquilla.get(odile) || 0
            monthPrizesByTaquilla.set(odile, currentMonth + amount)
          }
          // Premios de la semana
          if (item.created_at >= weekStart) {
            const currentWeek = weekPrizesByTaquilla.get(odile) || 0
            weekPrizesByTaquilla.set(odile, currentWeek + amount)
          }
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
        const weekSales = weekSalesByTaquilla.get(taquilla.id) || 0
        const weekPrizes = weekPrizesByTaquilla.get(taquilla.id) || 0
        const weekSalesCommission = weekSales * (shareOnSales / 100)
        const weekBalance = weekSales - weekPrizes - weekSalesCommission

        // ---- Datos del MES ----
        const monthSales = monthSalesByTaquilla.get(taquilla.id) || 0
        const monthPrizes = monthPrizesByTaquilla.get(taquilla.id) || 0
        const monthSalesCommission = monthSales * (shareOnSales / 100)
        const monthBalance = monthSales - monthPrizes - monthSalesCommission

        // ---- Datos del RANGO PERSONALIZADO ----
        const rangeSales = rangeSalesByTaquilla.get(taquilla.id) || 0
        const rangePrizes = rangePrizesByTaquilla.get(taquilla.id) || 0
        const rangeSalesCommission = rangeSales * (shareOnSales / 100)
        const rangeBalance = rangeSales - rangePrizes - rangeSalesCommission

        // Legacy
        const salesCommission = weekSalesCommission
        const balance = weekBalance

        return {
          taquillaId: taquilla.id,
          taquillaName: taquilla.fullName,
          todaySales,
          todayPrizes,
          todaySalesCommission,
          todayBalance,
          weekSales,
          weekPrizes,
          weekSalesCommission,
          weekBalance,
          monthSales,
          monthPrizes,
          monthSalesCommission,
          monthBalance,
          rangeSales,
          rangePrizes,
          rangeSalesCommission,
          rangeBalance,
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
  }, [taquillasKey, dateRangeKey, options.enabled, loadStats])

  return {
    stats,
    loading,
    error,
    refresh: loadStats
  }
}
