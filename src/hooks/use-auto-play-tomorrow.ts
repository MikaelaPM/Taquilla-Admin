import { useEffect, useCallback } from 'react'
import { Lottery } from '@/lib/types'

interface PlayTomorrowState {
  lotteryId: string
  deactivatedAt: string // ISO string de cuando se desactivó
  shouldAutoReactivate: boolean
}

const STORAGE_KEY = 'playTomorrowStates'

// Obtener estados guardados
const getPlayTomorrowStates = (): PlayTomorrowState[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error loading playTomorrow states:', error)
    return []
  }
}

// Guardar estados
const savePlayTomorrowStates = (states: PlayTomorrowState[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(states))
  } catch (error) {
    console.error('Error saving playTomorrow states:', error)
  }
}

// Verificar si ya pasó la medianoche desde la desactivación
const shouldReactivate = (deactivatedAt: string): boolean => {
  const deactivatedDate = new Date(deactivatedAt)
  const now = new Date()
  
  // Resetear las horas para comparar solo fechas
  const deactivatedDay = new Date(deactivatedDate.getFullYear(), deactivatedDate.getMonth(), deactivatedDate.getDate())
  const currentDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // Si ya es un día diferente al día de desactivación, debe reactivarse
  return currentDay > deactivatedDay
}

export function useAutoPlayTomorrow(
  lotteries: Lottery[],
  updateLottery: (id: string, lottery: Lottery) => Promise<void>
) {
  // Registrar cuando una lotería se desactiva de "juega mañana"
  const onPlayTomorrowChange = useCallback((lotteryId: string, newValue: boolean) => {
    const states = getPlayTomorrowStates()
    const existingIndex = states.findIndex(s => s.lotteryId === lotteryId)
    
    if (!newValue) {
      // Se desactivó "juega mañana" - guardar el timestamp
      const newState: PlayTomorrowState = {
        lotteryId,
        deactivatedAt: new Date().toISOString(),
        shouldAutoReactivate: true
      }
      
      if (existingIndex >= 0) {
        states[existingIndex] = newState
      } else {
        states.push(newState)
      }
      
      savePlayTomorrowStates(states)
      console.log(`📅 Registrada desactivación de "Juega Mañana" para lotería ${lotteryId}`)
    } else {
      // Se activó manualmente - remover del tracking
      if (existingIndex >= 0) {
        states.splice(existingIndex, 1)
        savePlayTomorrowStates(states)
        console.log(`✅ Removido tracking para lotería ${lotteryId} (activado manualmente)`)
      }
    }
  }, [])

  // Verificar periódicamente si debe reactivar
  const checkAndReactivate = useCallback(async () => {
    const states = getPlayTomorrowStates()
    const statesToKeep: PlayTomorrowState[] = []
    
    for (const state of states) {
      if (shouldReactivate(state.deactivatedAt)) {
        // Ha pasado la medianoche - reactivar
        const lottery = lotteries.find(l => l.id === state.lotteryId)
        
        if (lottery && !lottery.playsTomorrow) {
          console.log(`🌅 Auto-reactivando "Juega Mañana" para ${lottery.name}`)
          
          // Actualizar la lotería
          const updatedLottery = { ...lottery, playsTomorrow: true }
          await updateLottery(lottery.id, updatedLottery)
          
          // No mantener este estado ya que se reactivó
          console.log(`✅ ${lottery.name} ahora juega mañana automáticamente`)
        }
      } else {
        // Todavía no ha pasado la medianoche - mantener el estado
        statesToKeep.push(state)
      }
    }
    
    // Actualizar estados guardados
    if (statesToKeep.length !== states.length) {
      savePlayTomorrowStates(statesToKeep)
    }
  }, [lotteries, updateLottery])

  // Verificar cada minuto si debe reactivar
  useEffect(() => {
    // Verificar inmediatamente al cargar
    checkAndReactivate()
    
    // Configurar intervalo para verificar cada minuto
    const interval = setInterval(checkAndReactivate, 60000) // 60 segundos
    
    return () => clearInterval(interval)
  }, [checkAndReactivate])

  return {
    onPlayTomorrowChange,
    checkAndReactivate
  }
}
