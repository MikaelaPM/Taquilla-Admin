import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { DailyResult, DailyResultLola } from '@/lib/types'
import { parseISO, startOfDay, endOfDay } from 'date-fns'

export function useDailyResults() {
  const [dailyResults, setDailyResults] = useState<DailyResult[]>([])
  const [dailyResultsLola, setDailyResultsLola] = useState<DailyResultLola[]>([])
  const [loadingClassic, setLoadingClassic] = useState(true)
  const [loadingLola, setLoadingLola] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loading = loadingClassic || loadingLola

  const getDatePart = (value: unknown): string => {
    const s = String(value ?? '')
    const m = s.match(/^(\d{4}-\d{2}-\d{2})/)
    return m ? m[1] : ''
  }

  const toLolaDbLotteryId = (lotteryId: string): number | null => {
    const s = String(lotteryId ?? '').trim()
    if (!s) return null

    // UI ids are like "lola-1" but DB expects bigint (1)
    const m = s.match(/^lola-(\d+)$/)
    const raw = m ? m[1] : s
    const n = Number.parseInt(raw, 10)
    return Number.isFinite(n) ? n : null
  }

  const fromLolaDbLotteryId = (lotteryId: unknown): string => {
    const n = typeof lotteryId === 'number' ? lotteryId : Number.parseInt(String(lotteryId ?? ''), 10)
    if (!Number.isFinite(n)) return ''
    return `lola-${n}`
  }

  const normalizeLolaNumber = (value: string) => {
    const cleaned = String(value ?? '').trim().replace(/\D+/g, '')
    if (!cleaned) return ''
    const parsed = Number.parseInt(cleaned, 10)
    if (Number.isNaN(parsed)) return ''
    const normalized = ((parsed % 100) + 100) % 100
    return String(normalized).padStart(2, '0')
  }

  const loadDailyResults = useCallback(async (startDate?: string, endDate?: string) => {
    try {
      setLoadingClassic(true)
      setError(null)

      let query = supabase
        .from('daily_results')
        .select(`
          id,
          lottery_id,
          prize_id,
          result_date,
          created_at,
          total_to_pay,
          total_raised,
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
        totalToPay: item.total_to_pay || 0,
        totalRaised: item.total_raised || 0,
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
      setLoadingClassic(false)
    }
  }, [])

  const loadDailyResultsLola = useCallback(async (startDate?: string, endDate?: string) => {
    try {
      setLoadingLola(true)
      setError(null)

      let query = supabase
        .from('daily_results_lola')
        .select('id, lottery_id, number, result_date, created_at, total_to_pay, total_raised')
        .order('result_date', { ascending: false })

      if (startDate) {
        query = query.gte('result_date', startDate)
      }
      if (endDate) {
        query = query.lte('result_date', endDate)
      }

      const { data, error: fetchError } = await query

      if (fetchError) {
        console.error('Error fetching daily results lola:', fetchError)
        setError(fetchError.message)
        return
      }

      const mapped: DailyResultLola[] = (data || []).map((item: any) => ({
        id: item.id,
        lotteryId: fromLolaDbLotteryId(item.lottery_id),
        number: String(item.number ?? ''),
        resultDate: getDatePart(item.result_date) || getDatePart(item.created_at),
        createdAt: item.created_at,
        totalToPay: Number(item.total_to_pay) || 0,
        totalRaised: Number(item.total_raised) || 0
      }))

      setDailyResultsLola(mapped)
    } catch (err) {
      console.error('Error in loadDailyResultsLola:', err)
      setError('Error al cargar resultados diarios (Lola)')
    } finally {
      setLoadingLola(false)
    }
  }, [])

  /**
   * Calcula el total a pagar buscando en bets_item_lottery_clasic
   * los items con el prize_id ganador y actualiza su status a 'winner'
   */
  const calculateWinnersAndTotals = useCallback(async (
    lotteryId: string,
    prizeId: string,
    resultDate: string
  ): Promise<{ totalToPay: number; totalRaised: number }> => {
    try {
      // Parsear la fecha para obtener el rango del día
      const dateObj = parseISO(resultDate);
      const dayStart = startOfDay(dateObj).toISOString();
      const dayEnd = endOfDay(dateObj).toISOString();

      // 1. Buscar todos los items de apuesta con el prize_id ganador para ese día
      // Primero obtenemos los bets del día que correspondan a esta lotería
      const { data: betsOfDay, error: betsError } = await supabase
        .from("bets")
        .select("id, amount")
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd);

      if (betsError) {
        console.error("Error fetching bets:", betsError);
        return { totalToPay: 0, totalRaised: 0 };
      }

      const betIds = (betsOfDay || []).map((b) => b.id);

      if (betIds.length === 0) {
        return { totalToPay: 0, totalRaised: 0 };
      }

      // 2. Buscar los items de lotería clásica con el premio ganador
      const { data: winningItems, error: itemsError } = await supabase
        .from("bets_item_lottery_clasic")
        .select("id, potential_bet_amount, amount")
        .in("bets_id", betIds)
        .eq("prize_id", prizeId)
        .eq("status", "active");

      if (itemsError) {
        console.error("Error fetching winning items:", itemsError);
        return { totalToPay: 0, totalRaised: 0 };
      }

      // 3. Calcular total a pagar (suma de potential_bet_amount de ganadores)
      const totalToPay = (winningItems || []).reduce((sum, item) => {
        return sum + (Number(item.potential_bet_amount) || 0);
      }, 0);

      // 4. Actualizar status a 'winner' para los items ganadores
      if (winningItems && winningItems.length > 0) {
        const winningIds = winningItems.map((w) => w.id);

        const { error: updateError } = await supabase
          .from("bets_item_lottery_clasic")
          .update({ status: "winner" })
          .in("id", winningIds);

        const { data: prizeRow, error: prizeError } = await supabase
          .from("prizes")
          .select("multiplier")
          .eq("id", prizeId)
          .single();

        if (prizeError) {
          console.error("Error fetching prize multiplier:", prizeError);
        }

        const multiplierValue = Number(prizeRow?.multiplier);
        let descriptionPrize = "";

        if (Number.isFinite(multiplierValue) && multiplierValue > 0) {
          const normalizedMultiplier = Number.isInteger(multiplierValue)
            ? multiplierValue.toFixed(0)
            : String(multiplierValue);
          descriptionPrize = `x${normalizedMultiplier}`;
        }

        const winnerIds = winningItems.map((w) => w.id);
        const winnerPrizes = winningItems.map(
          (w) => Number(w.potential_bet_amount) || 0,
        );
        const winnerDescriptions = winningItems.map(() => descriptionPrize);

        const { error: updateRpcError } = await supabase.rpc(
          "mark_mikaela_prizes",
          {
            p_ids: winnerIds,
            p_prizes: winnerPrizes,
            p_descriptions: winnerDescriptions,
          },
        );

        if (updateRpcError) {
          console.error("Error updating winner status:", updateError);
        }
      }

      // 5. Calcular total recaudado del día para esta lotería
      // Obtener todos los items de lotería clásica del día (no solo ganadores)
      const { data: allItems, error: allItemsError } = await supabase
        .from("bets_item_lottery_clasic")
        .select("amount")
        .in("bets_id", betIds);

      if (allItemsError) {
        console.error("Error fetching all items:", allItemsError);
        return { totalToPay, totalRaised: 0 };
      }

      // Total recaudado = suma de amounts de todos los items - total a pagar
      const totalSales = (allItems || []).reduce((sum, item) => {
        return sum + (Number(item.amount) || 0);
      }, 0);

      const totalRaised = totalSales - totalToPay;

      return { totalToPay, totalRaised };
    } catch (err) {
      console.error('Error in calculateWinnersAndTotals:', err)
      return { totalToPay: 0, totalRaised: 0 }
    }
  }, [])

  const createDailyResult = useCallback(async (
    lotteryId: string,
    prizeId: string,
    resultDate: string
  ): Promise<boolean> => {
    try {
      // 1. Calcular ganadores y totales
      const { totalToPay, totalRaised } = await calculateWinnersAndTotals(
        lotteryId,
        prizeId,
        resultDate
      )

      // 2. Crear el registro de resultado diario
      const { data, error: insertError } = await supabase
        .from('daily_results')
        .insert({
          lottery_id: lotteryId,
          prize_id: prizeId,
          result_date: resultDate,
          total_to_pay: totalToPay,
          total_raised: totalRaised
        })
        .select()
        .single()

      if (insertError) {
        console.error('Error creating daily result:', insertError)
        return false
      }

      // 3. Recargar resultados
      await loadDailyResults()
      return true
    } catch (err) {
      console.error('Error in createDailyResult:', err)
      return false
    }
  }, [loadDailyResults, calculateWinnersAndTotals])

  const createDailyResultLola = useCallback(async (
    lotteryId: string,
    number: string,
    totalToPay: number,
    totalRaised: number,
    resultDate: string
  ): Promise<boolean> => {
    try {
      const dbLotteryId = toLolaDbLotteryId(lotteryId)
      if (!dbLotteryId) {
        console.error('Invalid Lola lotteryId (expected lola-<n>):', lotteryId)
        return false
      }

      const normalizedResultDate = getDatePart(resultDate)
      if (!normalizedResultDate) {
        console.error('Invalid Lola resultDate (expected YYYY-MM-DD):', resultDate)
        return false
      }

      const normalizedNumber = normalizeLolaNumber(number)
      if (!normalizedNumber) {
        console.error('Invalid Lola result number:', number)
        return false
      }

      const dateObj = parseISO(normalizedResultDate)
      const dayStart = startOfDay(dateObj).toISOString()
      const dayEnd = endOfDay(dateObj).toISOString()

      const n = Number.parseInt(normalizedNumber, 10)
      const prevNumber = Number.isFinite(n) && n > 0 ? String(n - 1).padStart(2, '0') : ''
      const nextNumber = Number.isFinite(n) && n < 99 ? String(n + 1).padStart(2, '0') : ''

      const { data: lolaItems, error: lolaItemsError } = await supabase
        .from('bets_item_lola_lottery')
        .select('id, number, amount, status')
        .eq('lola_lottery_id', dbLotteryId)
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)
        .eq('status', 'active')

        console.log(lolaItems);
        

      if (lolaItemsError) {
        console.error('Error fetching lola items:', lolaItemsError)
        return false
      }

      const winnerUpdates = (lolaItems || [])
        .map((item: any) => {
          const itemNumber = normalizeLolaNumber(String(item.number ?? ''))
          if (!itemNumber) return null

          const isExact = itemNumber === normalizedNumber
          const isAdjacent = itemNumber === prevNumber || itemNumber === nextNumber
          if (!isExact && !isAdjacent) return null

          const multiplier = isExact ? 70 : 5
          const prize = (Number(item.amount) || 0) * multiplier

          return {
            id: item.id,
            status: 'winner',
            prize,
            description_prize: multiplier === 70 ? 'x70' : 'x5'
          }
        })
        .filter(Boolean) as Array<{ id: string; status: string; prize: number; description_prize: string }>

      if (winnerUpdates.length > 0) {

        const winnerIds = winnerUpdates.map(w => w.id)
        const winnerPrizes = winnerUpdates.map(w => w.prize)
        const winnerDescriptions = winnerUpdates.map(w => w.description_prize)

        const { error: updateError } = await supabase.rpc("mark_lola_winners", {
          p_ids: winnerIds,
          p_prizes: winnerPrizes,
          p_descriptions: winnerDescriptions,
        });
        if (updateError) {
          console.error('Error updating lola winner status:', updateError)
        }
      }

      const { error: insertError } = await supabase
        .from('daily_results_lola')
        .insert({
          lottery_id: dbLotteryId,
          number: normalizedNumber,
          total_to_pay: totalToPay,
          result_date: normalizedResultDate,
          total_raised: totalRaised - totalToPay
        })

      if (insertError) {
        console.error('Error creating daily result lola:', {
          code: (insertError as any).code,
          message: (insertError as any).message,
          details: (insertError as any).details,
          hint: (insertError as any).hint
        })
        return false
      }

      await loadDailyResultsLola()
      return true
    } catch (err) {
      console.error('Error in createDailyResultLola:', err)
      return false
    }
  }, [loadDailyResultsLola])

  const updateDailyResult = useCallback(async (
    id: string,
    updates: Partial<{ prizeId: string; totalToPay: number; totalRaised: number }>
  ): Promise<boolean> => {
    try {
      const updateData: any = {}
      if (updates.prizeId !== undefined) updateData.prize_id = updates.prizeId
      if (updates.totalToPay !== undefined) updateData.total_to_pay = updates.totalToPay
      if (updates.totalRaised !== undefined) updateData.total_raised = updates.totalRaised

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

  const getResultForLotteryAndDateLola = useCallback((lotteryId: string, date: string): DailyResultLola | undefined => {
    const target = getDatePart(date)
    return dailyResultsLola.find(r => r.lotteryId === lotteryId && getDatePart(r.resultDate) === target)
  }, [dailyResultsLola])

  const getResultsForWeek = useCallback((weekStart: string, weekEnd: string): DailyResult[] => {
    return dailyResults.filter(r => r.resultDate >= weekStart && r.resultDate <= weekEnd)
  }, [dailyResults])

  /**
   * Obtiene los ganadores de un resultado específico
   * Busca en bets_item_lottery_clasic los items con status 'winner' o 'paid' y el prize_id correspondiente
   * No filtra por fecha ya que las apuestas pueden haberse creado el día anterior (plays_tomorrow)
   * Incluye 'paid' porque los ganadores que ya fueron pagados cambian de 'winner' a 'paid'
   */
  const getWinnersForResult = useCallback(async (
    prizeId: string,
    _resultDate: string
  ): Promise<Array<{
    id: string
    amount: number
    potentialWin: number
    taquillaId: string
    taquillaName: string
    createdAt: string
  }>> => {
    try {
      // 1. Buscar directamente los items ganadores por prize_id y status 'winner' o 'paid'
      // No filtramos por fecha porque las apuestas pueden haberse creado el día anterior
      // (en caso de loterías con plays_tomorrow = true)
      // Incluimos 'paid' porque los ganadores ya pagados tienen ese status
      const { data: winningItems, error: itemsError } = await supabase
        .from('bets_item_lottery_clasic')
        .select('id, bets_id, user_id, amount, potential_bet_amount, created_at')
        .eq('prize_id', prizeId)
        .in('status', ['winner', 'paid'])

      if (itemsError || !winningItems || winningItems.length === 0) {
        return []
      }

      // 2. Obtener información de usuarios (taquillas) desde los items directamente
      const userIds = [...new Set(winningItems.map(w => w.user_id).filter(Boolean))]

      let usersMap = new Map<string, string>()
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name')
          .in('id', userIds)

        if (users) {
          usersMap = new Map(users.map(u => [u.id, u.name]))
        }
      }

      // 3. Mapear resultados
      return winningItems.map(item => {
        const taquillaId = item.user_id || ''
        const taquillaName = usersMap.get(taquillaId) || 'Desconocida'

        return {
          id: item.id,
          amount: Number(item.amount) || 0,
          potentialWin: Number(item.potential_bet_amount) || 0,
          taquillaId,
          taquillaName,
          createdAt: item.created_at || ''
        }
      })
    } catch (err) {
      console.error('Error in getWinnersForResult:', err)
      return []
    }
  }, [])

  /**
   * Obtiene los ganadores de un resultado Lola específico
   * Busca en bets_item_lola_lottery los items con status 'winner' o 'paid'
   * Filtra por lotería y día del resultado
   */
  const getWinnersForResultLola = useCallback(async (
    lolaLotteryId: string,
    resultDate: string
  ): Promise<Array<{
    id: string
    amount: number
    potentialWin: number
    taquillaId: string
    taquillaName: string
    createdAt: string
  }>> => {
    try {
      const dbLotteryId = toLolaDbLotteryId(lolaLotteryId)
      if (!dbLotteryId) return []

      const normalizedResultDate = getDatePart(resultDate)
      if (!normalizedResultDate) return []

      const dateObj = parseISO(normalizedResultDate)
      const dayStart = startOfDay(dateObj).toISOString()
      const dayEnd = endOfDay(dateObj).toISOString()

      const { data: winningItems, error: itemsError } = await supabase
        .from('bets_item_lola_lottery')
        .select('id, user_id, amount, prize, created_at')
        .eq('lola_lottery_id', dbLotteryId)
        .in('status', ['winner', 'paid'])
        .gte('created_at', dayStart)
        .lte('created_at', dayEnd)

      if (itemsError || !winningItems || winningItems.length === 0) {
        return []
      }

      const userIds = [...new Set(winningItems.map(w => w.user_id).filter(Boolean))]

      let usersMap = new Map<string, string>()
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name')
          .in('id', userIds)

        if (users) {
          usersMap = new Map(users.map(u => [u.id, u.name]))
        }
      }

      return winningItems.map(item => {
        const taquillaId = item.user_id || ''
        const taquillaName = usersMap.get(taquillaId) || 'Desconocida'

        return {
          id: item.id,
          amount: Number(item.amount) || 0,
          potentialWin: Number(item.prize) || 0,
          taquillaId,
          taquillaName,
          createdAt: item.created_at || ''
        }
      })
    } catch (err) {
      console.error('Error in getWinnersForResultLola:', err)
      return []
    }
  }, [])

  useEffect(() => {
    Promise.all([
      loadDailyResults(),
      loadDailyResultsLola()
    ]).catch((err) => {
      console.error('Error loading daily results (classic + lola):', err)
    })
  }, [loadDailyResults, loadDailyResultsLola])

  return {
    dailyResults,
    dailyResultsLola,
    loading,
    error,
    loadDailyResults,
    loadDailyResultsLola,
    createDailyResult,
    createDailyResultLola,
    updateDailyResult,
    deleteDailyResult,
    getResultForLotteryAndDate,
    getResultForLotteryAndDateLola,
    getResultsForWeek,
    getWinnersForResult,
    getWinnersForResultLola
  }
}
