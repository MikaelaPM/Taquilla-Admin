import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/config/supabase'
import { toast } from 'sonner'

export interface SupabaseBet {
  id: string
  lottery_id: string
  lottery_name: string
  animal_number: string
  animal_name: string
  amount: number
  potential_win: number
  is_winner: boolean
  created_at: string
}

export interface Bet {
  id: string
  lotteryId: string
  lotteryName: string
  animalNumber: string
  animalName: string
  amount: number
  potentialWin: number
  isWinner: boolean
  timestamp: string
}

// Función para mapear datos de Supabase al formato local
const mapSupabaseBet = (supabaseBet: SupabaseBet): Bet => ({
  id: supabaseBet.id,
  lotteryId: supabaseBet.lottery_id,
  lotteryName: supabaseBet.lottery_name,
  animalNumber: supabaseBet.animal_number,
  animalName: supabaseBet.animal_name,
  amount: supabaseBet.amount,
  potentialWin: supabaseBet.potential_win,
  isWinner: supabaseBet.is_winner,
  timestamp: supabaseBet.created_at
})

// Función para mapear datos locales al formato de Supabase
const mapLocalBet = (localBet: Omit<Bet, 'id' | 'timestamp'>): Omit<SupabaseBet, 'id' | 'created_at'> => ({
  lottery_id: localBet.lotteryId,
  lottery_name: localBet.lotteryName,
  animal_number: localBet.animalNumber,
  animal_name: localBet.animalName,
  amount: localBet.amount,
  potential_win: localBet.potentialWin,
  is_winner: localBet.isWinner || false
})

export function useSupabaseBets() {
  const [bets, setBets] = useState<Bet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)

  // Función para probar la conexión
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('bets')
        .select('id')
        .limit(1)

      if (error) {
        console.log('❌ Error de conexión:', error.message)
        setIsConnected(false)
        return false
      }

      console.log('✅ Conexión a Supabase OK')
      setIsConnected(true)
      return true
    } catch (err) {
      console.log('❌ Error de red:', err)
      setIsConnected(false)
      return false
    }
  }, [])

  // Cargar jugadas desde Supabase + fallback local
  const loadBets = useCallback(async () => {
    setIsLoading(true)
    try {
      console.log('🔄 Cargando jugadas desde Supabase...')
      
      // Probar conexión primero
      const connectionOK = await testConnection()
      
      if (connectionOK) {
        const { data: supabaseBets, error } = await supabase
          .from('bets')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) {
          console.log('❌ Error cargando jugadas:', error.message)
          // Cargar desde localStorage como fallback
          const localBets = JSON.parse(localStorage.getItem('supabase_bets_backup_v2') || '[]')
          console.log(`🔄 Cargando ${localBets.length} jugadas desde localStorage`)
          setBets(localBets)
          setIsConnected(false)
          toast.error('Error cargando jugadas, usando datos locales')
        } else {
          const mappedBets = supabaseBets.map(mapSupabaseBet)
          console.log(`🎯 Mapeando ${supabaseBets.length} jugadas de Supabase:`, supabaseBets)
          console.log(`📋 Resultado mapeado:`, mappedBets)
          setBets(mappedBets)
          // Guardar backup local
          localStorage.setItem('supabase_bets_backup_v2', JSON.stringify(mappedBets))
          console.log(`✅ ${mappedBets.length} jugadas cargadas desde Supabase`)
          setIsConnected(true)
        }
      } else {
        // Sin conexión, usar datos locales
        const localBets = JSON.parse(localStorage.getItem('supabase_bets_backup_v2') || '[]')
        setBets(localBets)
        toast.error('Sin conexión, usando datos locales')
      }
    } catch (err) {
      console.log('❌ Error general cargando jugadas:', err)
      const localBets = JSON.parse(localStorage.getItem('supabase_bets_backup_v2') || '[]')
      setBets(localBets)
      setIsConnected(false)
      toast.error('Error de conexión, usando datos locales')
    } finally {
      setIsLoading(false)
    }
  }, [testConnection])

  // Crear nueva jugada
  const createBet = useCallback(async (betData: Omit<Bet, 'id' | 'timestamp'>): Promise<boolean> => {
    try {
      console.log('📝 Creando nueva jugada...', betData)

      // Probar conexión primero
      const connectionOK = await testConnection()

      if (connectionOK) {
        const supabaseData = mapLocalBet(betData)
        
        const { data: createdBet, error } = await supabase
          .from('bets')
          .insert([supabaseData])
          .select()
          .single()

        if (error) {
          console.log('❌ Error creando jugada en Supabase:', error.message)
          
          // Guardar localmente como fallback
          const newBet: Bet = {
            id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            ...betData,
            timestamp: new Date().toISOString(),
            isWinner: false
          }
          
          const currentBets = [...bets, newBet]
          setBets(currentBets)
          localStorage.setItem('supabase_bets_backup_v2', JSON.stringify(currentBets))
          
          toast.error('Error guardando en servidor, guardado localmente')
          setIsConnected(false)
          return true // Retornamos true porque sí se guardó localmente
        } else {
          console.log('✅ Jugada creada exitosamente:', createdBet.id)
          toast.success('Jugada registrada exitosamente')
          setIsConnected(true)
          
          // Recargar todas las jugadas para asegurar sincronización
          await loadBets()
          return true
        }
      } else {
        // Sin conexión, guardar solo localmente
        const newBet: Bet = {
          id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ...betData,
          timestamp: new Date().toISOString(),
          isWinner: false
        }
        
        const currentBets = [...bets, newBet]
        setBets(currentBets)
        localStorage.setItem('supabase_bets_backup_v2', JSON.stringify(currentBets))
        
        toast.success('Jugada guardada localmente (sin conexión)')
        return true
      }
    } catch (err) {
      console.log('❌ Error general creando jugada:', err)
      toast.error('Error inesperado creando jugada')
      return false
    }
  }, [bets, testConnection, loadBets])

  // Actualizar jugada existente
  const updateBet = useCallback(async (id: string, updates: Partial<Bet>): Promise<boolean> => {
    try {
      const connectionOK = await testConnection()

      if (connectionOK) {
        const supabaseUpdates = {
          ...(updates.lotteryId && { lottery_id: updates.lotteryId }),
          ...(updates.lotteryName && { lottery_name: updates.lotteryName }),
          ...(updates.animalNumber && { animal_number: updates.animalNumber }),
          ...(updates.animalName && { animal_name: updates.animalName }),
          ...(updates.amount !== undefined && { amount: updates.amount }),
          ...(updates.potentialWin !== undefined && { potential_win: updates.potentialWin }),
          ...(updates.isWinner !== undefined && { is_winner: updates.isWinner }),
        }

        const { error } = await supabase
          .from('bets')
          .update(supabaseUpdates)
          .eq('id', id)

        if (error) {
          console.log('❌ Error actualizando jugada:', error.message)
          toast.error('Error actualizando jugada en servidor')
          setIsConnected(false)
          return false
        }
      }

      // Actualizar estado local
      const updatedBets = bets.map(bet => 
        bet.id === id 
          ? { ...bet, ...updates }
          : bet
      )
      setBets(updatedBets)
      localStorage.setItem('supabase_bets_backup_v2', JSON.stringify(updatedBets))
      
      toast.success('Jugada actualizada')
      return true
    } catch (err) {
      console.log('❌ Error actualizando jugada:', err)
      toast.error('Error inesperado actualizando jugada')
      return false
    }
  }, [bets, testConnection])

  // Eliminar jugada
  const deleteBet = useCallback(async (id: string): Promise<boolean> => {
    try {
      const connectionOK = await testConnection()

      if (connectionOK && !id.startsWith('local-')) {
        const { error } = await supabase
          .from('bets')
          .delete()
          .eq('id', id)

        if (error) {
          console.log('❌ Error eliminando jugada:', error.message)
          toast.error('Error eliminando jugada del servidor')
          setIsConnected(false)
          return false
        }
      }

      // Actualizar estado local
      const filteredBets = bets.filter(bet => bet.id !== id)
      setBets(filteredBets)
      localStorage.setItem('supabase_bets_backup_v2', JSON.stringify(filteredBets))
      
      toast.success('Jugada eliminada')
      return true
    } catch (err) {
      console.log('❌ Error eliminando jugada:', err)
      toast.error('Error inesperado eliminando jugada')
      return false
    }
  }, [bets, testConnection])

  // Marcar ganadores según número ganador
  const markWinners = useCallback(async (lotteryId: string, winningAnimalNumber: string): Promise<boolean> => {
    try {
      // Encontrar jugadas ganadoras
      const winningBets = bets.filter(bet => 
        bet.lotteryId === lotteryId && 
        bet.animalNumber === winningAnimalNumber
      )

      if (winningBets.length === 0) {
        toast.info('No hay jugadas ganadoras para este sorteo')
        return true
      }

      // Actualizar cada jugada ganadora
      let allSuccess = true
      for (const bet of winningBets) {
        const success = await updateBet(bet.id, { isWinner: true })
        if (!success) allSuccess = false
      }

      if (allSuccess) {
        console.log(`✅ ${winningBets.length} jugadas marcadas como ganadoras`)
        toast.success(`${winningBets.length} jugadas marcadas como ganadoras`)
      }

      return allSuccess
    } catch (err) {
      console.log('❌ Error marcando ganadores:', err)
      toast.error('Error marcando jugadas ganadoras')
      return false
    }
  }, [bets, updateBet])

  // Cargar datos al inicializar
  useEffect(() => {
    loadBets()
  }, [loadBets])

  // Función de debugging para probar manualmente
  const debugForceReload = useCallback(async () => {
    console.log('🔧 DEBUG: Forzando recarga de jugadas...')
    console.log('📊 Estado actual:', { betsCount: bets.length, isLoading, isConnected })
    await loadBets()
  }, [bets.length, isLoading, isConnected, loadBets])

  return {
    bets,
    isLoading,
    isConnected,
    createBet,
    updateBet,
    deleteBet,
    markWinners,
    loadBets,
    testConnection,
    debugForceReload
  }
}