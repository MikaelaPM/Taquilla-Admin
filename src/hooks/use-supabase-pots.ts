import { useState, useCallback } from 'react'
import { Pot, Transfer } from '@/lib/types'
import { INITIAL_POTS } from '@/lib/pot-utils'

// Hook simplificado que usa datos locales (las tablas pots/transfers no existen en Supabase)
export function useSupabasePots(enabled: boolean = true) {
  const [pots, setPots] = useState<Pot[]>(INITIAL_POTS)
  const [transfers, setTransfers] = useState<Transfer[]>([])

  const distributeBetToPots = useCallback(async (betAmount: number): Promise<boolean> => {
    if (!enabled) return false

    // Distribuir el monto entre los potes según sus porcentajes
    setPots(currentPots =>
      currentPots.map(pot => ({
        ...pot,
        balance: pot.balance + (betAmount * pot.percentage / 100)
      }))
    )
    return true
  }, [enabled])

  const createTransfer = useCallback(async (fromPotName: string, toPotName: string, amount: number): Promise<boolean> => {
    if (!enabled) return false

    setPots(currentPots => {
      const fromPot = currentPots.find(p => p.name === fromPotName)
      const toPot = currentPots.find(p => p.name === toPotName)

      if (!fromPot || !toPot || fromPot.balance < amount) return currentPots

      return currentPots.map(pot => {
        if (pot.name === fromPotName) return { ...pot, balance: pot.balance - amount }
        if (pot.name === toPotName) return { ...pot, balance: pot.balance + amount }
        return pot
      })
    })

    // Agregar a historial de transferencias
    const newTransfer: Transfer = {
      id: crypto.randomUUID(),
      fromPot: fromPotName,
      toPot: toPotName,
      amount,
      timestamp: new Date().toISOString()
    }
    setTransfers(prev => [newTransfer, ...prev])

    return true
  }, [enabled])

  const deductFromPot = useCallback(async (potName: string, amount: number): Promise<boolean> => {
    if (!enabled) return false

    setPots(currentPots =>
      currentPots.map(pot =>
        pot.name === potName
          ? { ...pot, balance: Math.max(0, pot.balance - amount) }
          : pot
      )
    )
    return true
  }, [enabled])

  const updatePotBalance = useCallback(async (potName: string, newBalance: number): Promise<boolean> => {
    if (!enabled) return false

    setPots(currentPots =>
      currentPots.map(pot =>
        pot.name === potName
          ? { ...pot, balance: newBalance }
          : pot
      )
    )
    return true
  }, [enabled])

  return {
    pots,
    transfers,
    distributeBetToPots,
    createTransfer,
    deductFromPot,
    updatePotBalance
  }
}
