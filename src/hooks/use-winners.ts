import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

export interface Winner {
  id: string
  betsId: string
  odile: string
  prizeId: string | null
  amount: number
  potentialWin: number
  status: string
  createdAt: string
  // Datos de la taquilla (user)
  taquillaId: string
  taquillaName: string
  taquillaEmail: string
  // Datos del premio
  animalNumber: string
  animalName: string
  // Datos de la lotería (a través del daily_result)
  lotteryId: string | null
  lotteryName: string
}

export interface UseWinnersOptions {
  // IDs de taquillas visibles (si es undefined o vacío, no filtra)
  visibleTaquillaIds?: string[]
}

export function useWinners(options?: UseWinnersOptions) {
  const [winners, setWinners] = useState<Winner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadWinners = useCallback(async (startDate?: string, endDate?: string) => {
    try {
      setLoading(true)
      setError(null)

      const visibleTaquillaIds = options?.visibleTaquillaIds

      // Si visibleTaquillaIds es un array vacío (usuario sin taquillas), devolver lista vacía
      // undefined significa sin filtro (admin con permiso *)
      if (visibleTaquillaIds !== undefined && visibleTaquillaIds.length === 0) {
        setWinners([])
        setLoading(false)
        return
      }

      // Consultar bets_item_lottery_clasic con status = 'winner' o 'paid' (sin join)
      let query = supabase
        .from('bets_item_lottery_clasic')
        .select('id, bets_id, user_id, prize_id, amount, potential_bet_amount, status, created_at')
        .in('status', ['winner', 'paid'])
        .order('created_at', { ascending: false })

      if (startDate) {
        query = query.gte('created_at', startDate)
      }
      if (endDate) {
        query = query.lte('created_at', endDate)
      }

      // Filtrar por taquillas visibles si se especificaron
      if (visibleTaquillaIds && visibleTaquillaIds.length > 0) {
        query = query.in('user_id', visibleTaquillaIds)
      }

      const { data: winnerItems, error: fetchError } = await query

      // Consultar ganadores de Lola
      let lolaQuery = supabase
        .from('bets_item_lola_lottery')
        .select('id, bets_id, user_id, lola_lottery_id, number, amount, status, created_at, prize')
        .in('status', ['winner', 'paid'])
        .order('created_at', { ascending: false })

      if (startDate) {
        lolaQuery = lolaQuery.gte('created_at', startDate)
      }
      if (endDate) {
        lolaQuery = lolaQuery.lte('created_at', endDate)
      }

      if (visibleTaquillaIds && visibleTaquillaIds.length > 0) {
        lolaQuery = lolaQuery.in('user_id', visibleTaquillaIds)
      }

      const { data: lolaWinnerItems, error: lolaFetchError } = await lolaQuery

      if (fetchError) {
        console.error('Error fetching winners:', fetchError)
        setError(fetchError.message)
        return
      }

      if (lolaFetchError) {
        console.error('Error fetching lola winners:', lolaFetchError)
        setError(lolaFetchError.message)
        return
      }

      const classicItems = winnerItems || []
      const lolaItems = lolaWinnerItems || []

      if (classicItems.length === 0 && lolaItems.length === 0) {
        setWinners([])
        return
      }

      // Obtener IDs únicos de usuarios para buscar nombres de taquillas
      const userIds = [...new Set([
        ...classicItems.map(w => w.user_id),
        ...lolaItems.map(w => w.user_id)
      ].filter(Boolean))]

      // Obtener información de usuarios (taquillas)
      let usersMap = new Map<string, { name: string; email: string }>()
      if (userIds.length > 0) {
        const { data: users } = await supabase
          .from('users')
          .select('id, name, email')
          .in('id', userIds)

        if (users) {
          usersMap = new Map(users.map(u => [u.id, { name: u.name, email: u.email }]))
        }
      }

      // Obtener IDs únicos de premios para buscar información del animal
      const prizeIds = [...new Set(classicItems.map(w => w.prize_id).filter(Boolean))]

      // Obtener información de premios (animal_number, animal_name, lottery_id)
      let prizesMap = new Map<string, { animalNumber: string; animalName: string; lotteryId: string | null }>()
      if (prizeIds.length > 0) {
        const { data: prizes } = await supabase
          .from('prizes')
          .select('id, animal_number, animal_name, lottery_id')
          .in('id', prizeIds)

        if (prizes) {
          prizesMap = new Map(prizes.map(p => [p.id, {
            animalNumber: p.animal_number,
            animalName: p.animal_name,
            lotteryId: p.lottery_id
          }]))
        }
      }

      // Obtener IDs únicos de loterías para buscar nombres
      const lotteryIds = [...new Set(
        Array.from(prizesMap.values())
          .map(p => p.lotteryId)
          .filter(Boolean)
      )] as string[]

      let lotteriesMap = new Map<string, string>()
      if (lotteryIds.length > 0) {
        const { data: lotteries } = await supabase
          .from('lotteries')
          .select('id, name')
          .in('id', lotteryIds)

        if (lotteries) {
          lotteriesMap = new Map(lotteries.map(l => [l.id, l.name]))
        }
      }

      // Mapear los resultados
      const mappedClassic: Winner[] = classicItems.map((item: any) => {
        const userInfo = usersMap.get(item.user_id) || { name: 'Desconocida', email: '' }
        const prizeInfo = prizesMap.get(item.prize_id) || { animalNumber: '??', animalName: 'Desconocido', lotteryId: null }
        const lotteryId = prizeInfo.lotteryId
        const lotteryName = lotteryId ? (lotteriesMap.get(lotteryId) || 'Desconocida') : 'Desconocida'

        return {
          id: item.id,
          betsId: item.bets_id,
          odile: item.user_id,
          prizeId: item.prize_id,
          amount: Number(item.amount) || 0,
          potentialWin: Number(item.potential_bet_amount) || 0,
          status: item.status,
          createdAt: item.created_at,
          taquillaId: item.user_id,
          taquillaName: userInfo.name,
          taquillaEmail: userInfo.email,
          animalNumber: prizeInfo.animalNumber,
          animalName: prizeInfo.animalName,
          lotteryId,
          lotteryName
        }
      })

      // Obtener nombres de loterías Lola
      const lolaLotteryIds = [...new Set(lolaItems.map(i => String(i.lola_lottery_id || '')).filter(Boolean))]
      let lolaLotteriesMap = new Map<string, string>()
      if (lolaLotteryIds.length > 0) {
        const { data: lolaLotteries } = await supabase
          .from('lola_lotteries')
          .select('id, name')
          .in('id', lolaLotteryIds.map(id => Number(id)).filter(n => Number.isFinite(n)))

        if (lolaLotteries) {
          lolaLotteriesMap = new Map(
            lolaLotteries.map((l: any) => [String(l.id), l.name || `Lola #${l.id}`])
          )
        }
      }

      const mappedLola: Winner[] = lolaItems.map((item: any) => {
        const userInfo = usersMap.get(item.user_id) || { name: 'Desconocida', email: '' }
        const rawLolaId = String(item.lola_lottery_id || '')
        const lotteryId = rawLolaId ? `lola-${rawLolaId}` : null
        const lotteryName = rawLolaId ? (lolaLotteriesMap.get(rawLolaId) || `Lola #${rawLolaId}`) : 'Lola'
        const animalNumber = String(item.number ?? '') || '??'
        const animalName = animalNumber ? `Número ${animalNumber}` : 'Lola'

        return {
          id: item.id,
          betsId: item.bets_id,
          odile: item.user_id,
          prizeId: null,
          amount: Number(item.amount) || 0,
          potentialWin: Number(item.prize) || 0,
          status: item.status,
          createdAt: item.created_at,
          taquillaId: item.user_id,
          taquillaName: userInfo.name,
          taquillaEmail: userInfo.email,
          animalNumber,
          animalName,
          lotteryId,
          lotteryName
        }
      })

      const combined = [...mappedClassic, ...mappedLola]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      setWinners(combined)
    } catch (err) {
      console.error('Error in loadWinners:', err)
      setError('Error al cargar ganadores')
    } finally {
      setLoading(false)
    }
  }, [options?.visibleTaquillaIds])

  useEffect(() => {
    loadWinners()
  }, [loadWinners])

  return {
    winners,
    loading,
    error,
    loadWinners
  }
}
