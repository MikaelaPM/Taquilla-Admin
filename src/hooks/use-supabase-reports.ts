import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Bet, DrawResult, Lottery } from '@/lib/types'
import { toast } from 'sonner'
import { format, startOfDay, startOfWeek, startOfMonth, subDays, subWeeks, subMonths } from 'date-fns'

// Tipos para reportes
export interface ReportData {
  id: string
  type: 'daily' | 'weekly' | 'monthly' | 'custom'
  title: string
  startDate: string
  endDate: string
  data: {
    totalSales: number
    totalBets: number
    averageBet: number
    totalPayout: number
    netProfit: number
    winners: number
    topLotteries: Array<{ name: string; sales: number; bets: number }>
    topAnimals: Array<{ number: string; name: string; bets: number; amount: number }>
    hourlyData: Array<{ hour: string; bets: number; sales: number }>
    trends: {
      salesTrend: number
      betsTrend: number
      profitTrend: number
    }
  }
  generatedAt: string
  syncedToSupabase: boolean
}

export interface UseSupabaseReportsReturn {
  reports: ReportData[]
  isLoading: boolean
  error: string | null
  generateReport: (type: ReportData['type'], startDate?: Date, endDate?: Date) => Promise<ReportData | null>
  saveReport: (report: ReportData) => Promise<boolean>
  deleteReport: (reportId: string) => Promise<boolean>
  getReport: (reportId: string) => ReportData | null
  syncReportsWithSupabase: () => Promise<void>
  clearOldReports: (daysOld?: number) => Promise<void>
}

/**
 * Hook para gestionar reportes con integración Supabase + localStorage
 */
export function useSupabaseReports(
  bets: Bet[], 
  draws: DrawResult[], 
  lotteries: Lottery[]
): UseSupabaseReportsReturn {
  const [reports, setReports] = useState<ReportData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Funciones de almacenamiento local
  const getLocalReports = (): ReportData[] => {
    try {
      const stored = localStorage.getItem('supabase_reports_v1')
      return stored ? JSON.parse(stored) : []
    } catch (error) {
      console.error('Error loading local reports:', error)
      return []
    }
  }

  const saveLocalReports = (reportsData: ReportData[]): void => {
    try {
      localStorage.setItem('supabase_reports_v1', JSON.stringify(reportsData))
      localStorage.setItem('reports_lastSync', new Date().toISOString())
      console.log(`💾 Guardados ${reportsData.length} reportes localmente`)
    } catch (error) {
      console.error('Error saving local reports:', error)
    }
  }

  // Función para test de conexión Supabase
  const testConnection = async (): Promise<boolean> => {
    if (!isSupabaseConfigured()) return false
    
    try {
      const { error } = await supabase
        .from('reports')
        .select('*', { head: true, count: 'exact' })
        .limit(1)

      return !error
    } catch {
      return false
    }
  }

  // Función para calcular estadísticas de un período
  const calculatePeriodStats = (
    filteredBets: Bet[], 
    filteredDraws: DrawResult[]
  ) => {
    const totalSales = filteredBets.reduce((sum, bet) => sum + bet.amount, 0)
    const totalBets = filteredBets.length
    const averageBet = totalBets > 0 ? totalSales / totalBets : 0
    const totalPayout = filteredDraws.reduce((sum, draw) => sum + draw.totalPayout, 0)
    const netProfit = totalSales - totalPayout
    const winners = filteredBets.filter((b) => b.isWinner).length

    return { totalSales, totalBets, averageBet, totalPayout, netProfit, winners }
  }

  // Función para obtener top loterías
  const getTopLotteries = (filteredBets: Bet[]) => {
    const lotteryStats = new Map<string, { name: string; sales: number; bets: number }>()

    filteredBets.forEach((bet) => {
      const current = lotteryStats.get(bet.lotteryId) || { name: bet.lotteryName, sales: 0, bets: 0 }
      lotteryStats.set(bet.lotteryId, {
        name: bet.lotteryName,
        sales: current.sales + bet.amount,
        bets: current.bets + 1,
      })
    })

    return Array.from(lotteryStats.values())
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5)
  }

  // Función para obtener top animales
  const getTopAnimals = (filteredBets: Bet[]) => {
    const animalStats = new Map<string, { name: string; bets: number; amount: number }>()

    filteredBets.forEach((bet) => {
      const key = `${bet.animalNumber}-${bet.animalName}`
      const current = animalStats.get(key) || { name: bet.animalName, bets: 0, amount: 0 }
      animalStats.set(key, {
        name: bet.animalName,
        bets: current.bets + 1,
        amount: current.amount + bet.amount,
      })
    })

    return Array.from(animalStats.entries())
      .sort((a, b) => b[1].bets - a[1].bets)
      .slice(0, 10)
      .map(([key, value]) => ({ number: key.split("-")[0], ...value }))
  }

  // Función para obtener datos por hora
  const getHourlyData = (filteredBets: Bet[]) => {
    const hourlyData = new Map<number, { bets: number; sales: number }>()

    filteredBets.forEach((bet) => {
      const hour = new Date(bet.timestamp).getHours()
      const current = hourlyData.get(hour) || { bets: 0, sales: 0 }
      hourlyData.set(hour, {
        bets: current.bets + 1,
        sales: current.sales + bet.amount,
      })
    })

    return Array.from(hourlyData.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([hour, data]) => ({
        hour: `${hour.toString().padStart(2, "0")}:00`,
        ...data,
      }))
  }

  // Función para calcular tendencias
  const calculateTrends = (
    currentStats: ReturnType<typeof calculatePeriodStats>,
    previousBets: Bet[],
    previousDraws: DrawResult[]
  ) => {
    const previousStats = calculatePeriodStats(previousBets, previousDraws)
    
    const salesTrend = previousStats.totalSales > 0 
      ? ((currentStats.totalSales - previousStats.totalSales) / previousStats.totalSales) * 100
      : 0
    
    const betsTrend = previousStats.totalBets > 0 
      ? ((currentStats.totalBets - previousStats.totalBets) / previousStats.totalBets) * 100
      : 0
    
    const profitTrend = previousStats.netProfit > 0 
      ? ((currentStats.netProfit - previousStats.netProfit) / previousStats.netProfit) * 100
      : 0

    return { salesTrend, betsTrend, profitTrend }
  }

  // Generar reporte
  const generateReport = async (
    type: ReportData['type'],
    startDate?: Date,
    endDate?: Date
  ): Promise<ReportData | null> => {
    try {
      const now = new Date()
      let reportStart: Date
      let reportEnd: Date
      let title: string

      // Definir fechas según el tipo de reporte
      switch (type) {
        case 'daily':
          reportStart = startDate || startOfDay(now)
          reportEnd = endDate || now
          title = `Reporte Diario - ${format(reportStart, 'dd/MM/yyyy')}`
          break
        case 'weekly':
          reportStart = startDate || startOfWeek(now, { weekStartsOn: 1 })
          reportEnd = endDate || now
          title = `Reporte Semanal - ${format(reportStart, 'dd/MM/yyyy')}`
          break
        case 'monthly':
          reportStart = startDate || startOfMonth(now)
          reportEnd = endDate || now
          title = `Reporte Mensual - ${format(reportStart, 'MM/yyyy')}`
          break
        case 'custom':
          if (!startDate || !endDate) {
            throw new Error('Las fechas son requeridas para reportes personalizados')
          }
          reportStart = startDate
          reportEnd = endDate
          title = `Reporte Personalizado - ${format(reportStart, 'dd/MM/yyyy')} a ${format(reportEnd, 'dd/MM/yyyy')}`
          break
      }

      // Filtrar datos por período
      const filteredBets = bets.filter((bet) => {
        const betDate = new Date(bet.timestamp)
        return betDate >= reportStart && betDate <= reportEnd
      })

      const filteredDraws = draws.filter((draw) => {
        const drawDate = new Date(draw.drawTime)
        return drawDate >= reportStart && drawDate <= reportEnd
      })

      // Calcular estadísticas del período actual
      const currentStats = calculatePeriodStats(filteredBets, filteredDraws)

      // Calcular período anterior para tendencias
      const periodDiff = reportEnd.getTime() - reportStart.getTime()
      const previousStart = new Date(reportStart.getTime() - periodDiff)
      const previousEnd = reportStart

      const previousBets = bets.filter((bet) => {
        const betDate = new Date(bet.timestamp)
        return betDate >= previousStart && betDate < previousEnd
      })

      const previousDraws = draws.filter((draw) => {
        const drawDate = new Date(draw.drawTime)
        return drawDate >= previousStart && drawDate < previousEnd
      })

      // Generar datos del reporte
      const reportData: ReportData = {
        id: `report-${type}-${Date.now()}`,
        type,
        title,
        startDate: reportStart.toISOString(),
        endDate: reportEnd.toISOString(),
        data: {
          ...currentStats,
          topLotteries: getTopLotteries(filteredBets),
          topAnimals: getTopAnimals(filteredBets),
          hourlyData: getHourlyData(filteredBets),
          trends: calculateTrends(currentStats, previousBets, previousDraws)
        },
        generatedAt: new Date().toISOString(),
        syncedToSupabase: false
      }

      // Guardar el reporte
      await saveReport(reportData)

      console.log(`📊 Reporte ${type} generado exitosamente`)
      toast.success(`Reporte ${type} generado`)
      
      return reportData

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error generando reporte'
      console.error('❌ Error generando reporte:', errorMessage)
      setError(errorMessage)
      toast.error(`Error generando reporte: ${errorMessage}`)
      return null
    }
  }

  // Guardar reporte (Supabase + Local)
  const saveReport = async (report: ReportData): Promise<boolean> => {
    try {
      let supabaseSuccess = false

      // Intentar guardar en Supabase si está configurado
      if (isSupabaseConfigured() && await testConnection()) {
        try {
          const { error } = await supabase
            .from('reports')
            .insert([{
              id: report.id,
              type: report.type,
              title: report.title,
              start_date: report.startDate,
              end_date: report.endDate,
              report_data: report.data,
              generated_at: report.generatedAt
            }])

          if (!error) {
            console.log('✅ Reporte guardado en Supabase')
            report.syncedToSupabase = true
            supabaseSuccess = true
          }
        } catch (supabaseError) {
          console.log('⚠️ Error guardando en Supabase:', supabaseError)
        }
      }

      // Guardar localmente (siempre)
      const updatedReports = [report, ...reports.filter(r => r.id !== report.id)]
      setReports(updatedReports)
      saveLocalReports(updatedReports)

      if (supabaseSuccess) {
        toast.success('Reporte guardado exitosamente')
      } else {
        toast.success('Reporte guardado localmente')
      }

      return true

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error guardando reporte'
      console.error('❌ Error guardando reporte:', errorMessage)
      toast.error(`Error guardando reporte: ${errorMessage}`)
      return false
    }
  }

  // Eliminar reporte
  const deleteReport = async (reportId: string): Promise<boolean> => {
    try {
      // Intentar eliminar de Supabase
      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase
            .from('reports')
            .delete()
            .eq('id', reportId)

          if (!error) {
            console.log('✅ Reporte eliminado de Supabase')
          }
        } catch (supabaseError) {
          console.log('⚠️ Error eliminando de Supabase:', supabaseError)
        }
      }

      // Eliminar localmente
      const updatedReports = reports.filter(r => r.id !== reportId)
      setReports(updatedReports)
      saveLocalReports(updatedReports)

      toast.success('Reporte eliminado')
      return true

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error eliminando reporte'
      console.error('❌ Error eliminando reporte:', errorMessage)
      toast.error(`Error eliminando reporte: ${errorMessage}`)
      return false
    }
  }

  // Obtener reporte específico
  const getReport = (reportId: string): ReportData | null => {
    return reports.find(r => r.id === reportId) || null
  }

  // Sincronizar con Supabase
  const syncReportsWithSupabase = async (): Promise<void> => {
    if (!isSupabaseConfigured()) return

    try {
      console.log('🔄 Sincronizando reportes con Supabase...')

      // Cargar reportes desde Supabase
      const { data: supabaseReports, error } = await supabase
        .from('reports')
        .select('*')
        .order('generated_at', { ascending: false })

      if (error) throw error

      // Transformar datos de Supabase
      const transformedReports: ReportData[] = (supabaseReports || []).map(item => ({
        id: item.id,
        type: item.type,
        title: item.title,
        startDate: item.start_date,
        endDate: item.end_date,
        data: item.report_data,
        generatedAt: item.generated_at,
        syncedToSupabase: true
      }))

      // Combinar con reportes locales no sincronizados
      const localReports = getLocalReports()
      const unsyncedLocalReports = localReports.filter(r => !r.syncedToSupabase)

      // Intentar sincronizar reportes locales no sincronizados
      for (const report of unsyncedLocalReports) {
        try {
          const { error: syncError } = await supabase
            .from('reports')
            .upsert([{
              id: report.id,
              type: report.type,
              title: report.title,
              start_date: report.startDate,
              end_date: report.endDate,
              report_data: report.data,
              generated_at: report.generatedAt
            }])

          if (!syncError) {
            report.syncedToSupabase = true
          }
        } catch (syncError) {
          console.log(`⚠️ No se pudo sincronizar reporte ${report.id}:`, syncError)
        }
      }

      // Combinar todos los reportes (evitando duplicados)
      const allReports = new Map<string, ReportData>()
      
      // Priorizar reportes de Supabase
      transformedReports.forEach(report => allReports.set(report.id, report))
      
      // Agregar reportes locales únicos
      localReports.forEach(report => {
        if (!allReports.has(report.id)) {
          allReports.set(report.id, report)
        }
      })

      const finalReports = Array.from(allReports.values())
        .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())

      setReports(finalReports)
      saveLocalReports(finalReports)

      console.log(`✅ ${finalReports.length} reportes sincronizados`)

    } catch (error) {
      console.error('❌ Error sincronizando reportes:', error)
    }
  }

  // Limpiar reportes antiguos
  const clearOldReports = async (daysOld = 90): Promise<void> => {
    try {
      const cutoffDate = subDays(new Date(), daysOld)

      // Filtrar reportes locales
      const filteredReports = reports.filter(report => 
        new Date(report.generatedAt) >= cutoffDate
      )

      // Eliminar de Supabase reportes antiguos
      if (isSupabaseConfigured()) {
        try {
          const { error } = await supabase
            .from('reports')
            .delete()
            .lt('generated_at', cutoffDate.toISOString())

          if (!error) {
            console.log('✅ Reportes antiguos eliminados de Supabase')
          }
        } catch (supabaseError) {
          console.log('⚠️ Error eliminando reportes antiguos de Supabase:', supabaseError)
        }
      }

      setReports(filteredReports)
      saveLocalReports(filteredReports)

      toast.success(`Reportes anteriores a ${format(cutoffDate, 'dd/MM/yyyy')} eliminados`)

    } catch (error) {
      console.error('❌ Error limpiando reportes antiguos:', error)
    }
  }

  // Cargar reportes al iniciar
  useEffect(() => {
    const loadReports = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Cargar desde localStorage primero
        const localReports = getLocalReports()
        setReports(localReports)

        // Intentar sincronizar con Supabase
        if (isSupabaseConfigured()) {
          await syncReportsWithSupabase()
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Error cargando reportes'
        console.error('❌ Error cargando reportes:', errorMessage)
        setError(errorMessage)

        // Fallback a localStorage en caso de error
        const localReports = getLocalReports()
        setReports(localReports)
      } finally {
        setIsLoading(false)
      }
    }

    loadReports()
  }, [])

  // Sincronización automática periódica
  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const syncInterval = setInterval(() => {
      syncReportsWithSupabase()
    }, 300000) // 5 minutos

    return () => clearInterval(syncInterval)
  }, [])

  return {
    reports,
    isLoading,
    error,
    generateReport,
    saveReport,
    deleteReport,
    getReport,
    syncReportsWithSupabase,
    clearOldReports
  }
}