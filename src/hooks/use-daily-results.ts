import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { DailyResult } from '@/lib/types'

export function useDailyResults() {
  const [dailyResults, setDailyResults] = useState<DailyResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadDailyResults = useCallback(async (startDate?: string, endDate?: string) => {
    try {
      setLoading(true)
      setError(null)

      let query = supabase
        .from('daily_results')
        .select(`
          id,
          lottery_id,
          prize_id,
          result_date,
          created_at,
          lotteries (
            id,
            name,
            opening_time,
            closing_time,
            draw_time,
            is_active,
            plays_tomorrow
          ),
          prizes (
            id,
            animal_number,
            animal_name,
            multiplier
          )
        `)
        .order('result_date', { ascending: false })

      if (startDate) {
        query = query.gte('result_date', startDate)
      }
      if (endDate) {
        query = query.lte('result_date', endDate)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        console.error('Error fetching daily results:', fetchError)
        setError(fetchError.message)
        return
      }

      const mapped: DailyResult[] = (data || []).map((item: any) => ({
        id: item.id,
        lotteryId: item.lottery_id,
        prizeId: item.prize_id,
        resultDate: item.result_date,
        createdAt: item.created_at,
        lottery: item.lotteries ? {
          id: item.lotteries.id,
          name: item.lotteries.name,
          openingTime: item.lotteries.opening_time,
          closingTime: item.lotteries.closing_time,
          drawTime: item.lotteries.draw_time,
          isActive: item.lotteries.is_active,
          playsTomorrow: item.lotteries.plays_tomorrow,
          prizes: [],
          createdAt: ''
        } : undefined,
        prize: item.prizes ? {
          id: item.prizes.id,
          animalNumber: item.prizes.animal_number,
          animalName: item.prizes.animal_name,
          multiplier: item.prizes.multiplier
        } : undefined
      }))

      setDailyResults(mapped)
    } catch (err) {
      console.error('Error in loadDailyResults:', err)
      setError('Error al cargar resultados diarios')
    } finally {
      setLoading(false)
    }
  }, [])

  const createDailyResult = useCallback(async (
    lotteryId: string,
    prizeId: string,
    resultDate: string
  ): Promise<boolean> => {
    try {
      const { data, error: insertError } = await supabase
        .from('daily_results')
        .insert({
          lottery_id: lotteryId,
          prize_id: prizeId,
          result_date: resultDate
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating daily result:', insertError)
        return false
      }

      // Recargar resultados
      await loadDailyResults()
      return true
    } catch (err) {
      console.error('Error in createDailyResult:', err)
      return false
    }
  }, [loadDailyResults])

  const updateDailyResult = useCallback(async (
    id: string,
    updates: Partial<{ prizeId: string }>
  ): Promise<boolean> => {
    try {
      const updateData: any = {}
      if (updates.prizeId !== undefined) updateData.prize_id = updates.prizeId

      const { error: updateError } = await supabase
        .from('daily_results')
        .update(updateData)
        .eq('id', id)

      if (updateError) {
        console.error('Error updating daily result:', updateError)
        return false
      }

      await loadDailyResults()
      return true
    } catch (err) {
      console.error('Error in updateDailyResult:', err)
      return false
    }
  }, [loadDailyResults])

  const deleteDailyResult = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('daily_results')
        .delete()
        .eq('id', id)

      if (deleteError) {
        console.error('Error deleting daily result:', deleteError)
        return false
      }

      await loadDailyResults()
      return true
    } catch (err) {
      console.error('Error in deleteDailyResult:', err)
      return false
    }
  }, [loadDailyResults])

  const getResultForLotteryAndDate = useCallback((lotteryId: string, date: string): DailyResult | undefined => {
    return dailyResults.find(r => r.lotteryId === lotteryId && r.resultDate === date)
  }, [dailyResults])

  const getResultsForWeek = useCallback((weekStart: string, weekEnd: string): DailyResult[] => {
    return dailyResults.filter(r => r.resultDate >= weekStart && r.resultDate <= weekEnd)
  }, [dailyResults])

  useEffect(() => {
    loadDailyResults()
  }, [loadDailyResults])

  return {
    dailyResults,
    loading,
    error,
    loadDailyResults,
    createDailyResult,
    updateDailyResult,
    deleteDailyResult,
    getResultForLotteryAndDate,
    getResultsForWeek
  }
}
