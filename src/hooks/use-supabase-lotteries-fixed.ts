import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { Lottery, Prize } from '@/lib/types'
import { toast } from 'sonner'

export interface SupabaseLottery {
  id: string
  name: string
  opening_time: string
  closing_time: string
  draw_time: string
  is_active: boolean
  plays_tomorrow: boolean
  created_at: string
  updated_at: string
  // Relación con premios
  prizes?: Array<{
    id: string
    animal_number: string
    animal_name: string
    multiplier: number
  }>
}

// Funciones de almacenamiento local para loterías
const getLocalLotteries = (): Lottery[] => {
  try {
    const stored = localStorage.getItem('lotteries')
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error loading local lotteries:', error)
    return []
  }
}

const saveLocalLotteries = (lotteries: Lottery[]): void => {
  try {
    localStorage.setItem('lotteries', JSON.stringify(lotteries))
    console.log(`💾 Guardadas ${lotteries.length} loterías localmente`)
  } catch (error) {
    console.error('Error saving local lotteries:', error)
  }
}

export function useSupabaseLotteries() {
  const [lotteries, setLotteries] = useState<Lottery[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar loterías desde Supabase y local
  const loadLotteries = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    // Cargar loterías locales primero
    const localLotteries = getLocalLotteries()
    console.log(`📱 Cargadas ${localLotteries.length} loterías desde localStorage`)

    if (!isSupabaseConfigured()) {
      // Solo usar loterías locales + loterías por defecto si Supabase no está configurado
      const defaultLotteries: Lottery[] = [
        {
          id: 'lottery-default-1',
          name: 'Lotto Activo',
          openingTime: '06:00',
          closingTime: '18:00',
          drawTime: '19:00',
          isActive: true,
          playsTomorrow: false,
          prizes: [
            {
              id: 'prize-1',
              animalNumber: '00',
              animalName: 'Delfín',
              multiplier: 50
            }
          ],
          createdAt: new Date().toISOString(),
        },
        {
          id: 'lottery-default-2',
          name: 'Granja Millonaria',
          openingTime: '07:00',
          closingTime: '17:30',
          drawTime: '18:00',
          isActive: true,
          playsTomorrow: false,
          prizes: [
            {
              id: 'prize-2',
              animalNumber: '00',
              animalName: 'Delfín',
              multiplier: 45
            }
          ],
          createdAt: new Date().toISOString(),
        }
      ]
      
      // Combinar loterías por defecto con locales (evitar duplicados)
      const combinedLotteries = [...defaultLotteries]
      localLotteries.forEach(localLottery => {
        if (!combinedLotteries.find(l => l.id === localLottery.id)) {
          combinedLotteries.push(localLottery)
        }
      })
      
      setLotteries(combinedLotteries)
      setIsLoading(false)
      return
    }

    try {
      // Cargar loterías desde Supabase
      const { data, error } = await supabase
        .from('lotteries')
        .select(`
          *,
          prizes (
            id,
            animal_number,
            animal_name,
            multiplier
          )
        `)
        .order('created_at', { ascending: true })

      if (error) throw error

      // Transformar datos de Supabase al formato local
      const supabaseLotteries: Lottery[] = data.map((lottery: SupabaseLottery) => ({
        id: lottery.id,
        name: lottery.name,
        openingTime: lottery.opening_time,
        closingTime: lottery.closing_time,
        drawTime: lottery.draw_time,
        isActive: lottery.is_active,
        playsTomorrow: lottery.plays_tomorrow,
        prizes: lottery.prizes?.map(prize => ({
          id: prize.id,
          animalNumber: prize.animal_number,
          animalName: prize.animal_name,
          multiplier: prize.multiplier
        })) || [],
        createdAt: lottery.created_at,
      }))

      console.log(`☁️ Cargadas ${supabaseLotteries.length} loterías desde Supabase`)

      // Combinar loterías de Supabase con locales (prioridad a Supabase)
      const combinedLotteries = [...supabaseLotteries]
      localLotteries.forEach(localLottery => {
        if (!combinedLotteries.find(l => l.id === localLottery.id || l.name === localLottery.name)) {
          combinedLotteries.push(localLottery)
        }
      })

      setLotteries(combinedLotteries)
      
      // Guardar la combinación localmente
      saveLocalLotteries(combinedLotteries)
      
    } catch (error: any) {
      console.error('Error loading lotteries from Supabase:', error)
      setError(error.message || 'Error al cargar loterías')
      toast.error('Error al cargar loterías desde Supabase, usando datos locales')
      
      // Fallback a loterías locales + por defecto
      const defaultLotteries: Lottery[] = [
        {
          id: 'lottery-fallback-1',
          name: 'Lotto Activo',
          openingTime: '06:00',
          closingTime: '18:00',
          drawTime: '19:00',
          isActive: true,
          playsTomorrow: false,
          prizes: [],
          createdAt: new Date().toISOString(),
        }
      ]
      
      const combinedLotteries = [...defaultLotteries, ...localLotteries]
      setLotteries(combinedLotteries)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Crear nueva lotería (Supabase + Local)
  const createLottery = async (lotteryData: Omit<Lottery, 'id' | 'createdAt'>): Promise<boolean> => {
    const newLotteryId = `lottery-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const newLottery: Lottery = {
      id: newLotteryId,
      name: lotteryData.name,
      openingTime: lotteryData.openingTime,
      closingTime: lotteryData.closingTime,
      drawTime: lotteryData.drawTime,
      isActive: lotteryData.isActive,
      playsTomorrow: lotteryData.playsTomorrow,
      prizes: lotteryData.prizes || [],
      createdAt: new Date().toISOString()
    }

    // Verificar duplicados localmente primero
    const existingLocal = lotteries.find(l => l.name.toLowerCase() === lotteryData.name.toLowerCase())
    if (existingLocal) {
      console.log(`❌ Lotería con nombre "${lotteryData.name}" ya existe localmente`)
      toast.error(`Ya existe una lotería con el nombre: ${lotteryData.name}`)
      return false
    }

    // Intentar crear en Supabase si está configurado
    if (isSupabaseConfigured()) {
      try {
        console.log(`🔍 Verificando duplicados en Supabase: ${lotteryData.name}`)
        
        const { data: existingLotteries, error: checkError } = await supabase
          .from('lotteries')
          .select('id, name')
          .eq('name', lotteryData.name)
          .limit(1)

        if (!checkError && existingLotteries && existingLotteries.length > 0) {
          console.log(`❌ Lotería "${lotteryData.name}" ya existe en Supabase`)
          toast.error(`Ya existe una lotería con el nombre: ${lotteryData.name}`)
          return false
        }

        console.log(`📝 Creando lotería en Supabase...`)
        const { data: createdLotteries, error: lotteryError } = await supabase
          .from('lotteries')
          .insert([
            {
              name: lotteryData.name,
              opening_time: lotteryData.openingTime,
              closing_time: lotteryData.closingTime,
              draw_time: lotteryData.drawTime,
              is_active: lotteryData.isActive,
              plays_tomorrow: lotteryData.playsTomorrow
            }
          ])
          .select()

        if (lotteryError) {
          // Verificar si es error de RLS
          if (lotteryError.message.includes('row-level security policy') || 
              lotteryError.message.includes('RLS') ||
              lotteryError.code === 'PGRST301') {
            console.log('⚠️ Error de RLS en Supabase, guardando solo localmente')
            toast.error('Error de permisos en Supabase. Guardando lotería localmente.')
          } else {
            throw lotteryError
          }
        } else {
          // Éxito en Supabase
          const supabaseLottery = createdLotteries && createdLotteries[0]
          if (supabaseLottery) {
            newLottery.id = supabaseLottery.id
            newLottery.createdAt = supabaseLottery.created_at

            // Crear premios en Supabase si se proporcionaron
            if (lotteryData.prizes && lotteryData.prizes.length > 0) {
              const lotteryPrizes = lotteryData.prizes.map(prize => ({
                lottery_id: supabaseLottery.id,
                animal_number: prize.animalNumber,
                animal_name: prize.animalName,
                multiplier: prize.multiplier
              }))

              const { error: prizesError } = await supabase
                .from('prizes')
                .insert(lotteryPrizes)

              if (prizesError) {
                console.error('Error insertando premios:', prizesError)
              }
            }

            console.log(`✅ Lotería creada en Supabase: ${supabaseLottery.name}`)
            toast.success('Lotería creada exitosamente en Supabase')
          }
        }
      } catch (error: any) {
        console.log(`⚠️ Error en Supabase: ${error.message}, guardando localmente`)
        toast.error(`Error en Supabase: ${error.message}. Guardando lotería localmente.`)
      }
    }

    // Guardar localmente (siempre)
    const updatedLotteries = [...lotteries, newLottery]
    setLotteries(updatedLotteries)
    saveLocalLotteries(updatedLotteries)
    
    if (!isSupabaseConfigured() || error) {
      toast.success('Lotería creada localmente')
    }

    return true
  }

  // Actualizar lotería (Supabase + Local)
  const updateLottery = async (lotteryId: string, lotteryData: Partial<Lottery>): Promise<boolean> => {
    // Intentar actualizar en Supabase primero
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('lotteries')
          .update({
            name: lotteryData.name,
            opening_time: lotteryData.openingTime,
            closing_time: lotteryData.closingTime,
            draw_time: lotteryData.drawTime,
            is_active: lotteryData.isActive,
            plays_tomorrow: lotteryData.playsTomorrow,
          })
          .eq('id', lotteryId)

        if (error) {
          if (error.message.includes('row-level security policy')) {
            console.log('⚠️ Error de RLS actualizando en Supabase')
            toast.error('Error de permisos en Supabase. Actualizando solo localmente.')
          } else {
            throw error
          }
        } else {
          console.log('✅ Lotería actualizada en Supabase')
          toast.success('Lotería actualizada en Supabase y localmente')
        }
      } catch (error: any) {
        console.error('Error updating lottery in Supabase:', error)
        toast.error(`Error en Supabase: ${error.message}. Actualizando solo localmente.`)
      }
    }

    // Actualizar localmente (siempre)
    const updatedLotteries = lotteries.map(lottery =>
      lottery.id === lotteryId ? { ...lottery, ...lotteryData } : lottery
    )
    setLotteries(updatedLotteries)
    saveLocalLotteries(updatedLotteries)

    if (!isSupabaseConfigured()) {
      toast.success('Lotería actualizada localmente')
    }

    return true
  }

  // Eliminar lotería (Supabase + Local)
  const deleteLottery = async (lotteryId: string): Promise<boolean> => {
    // Intentar eliminar de Supabase primero
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('lotteries')
          .delete()
          .eq('id', lotteryId)

        if (error) {
          if (error.message.includes('row-level security policy')) {
            console.log('⚠️ Error de RLS eliminando de Supabase')
            toast.error('Error de permisos en Supabase. Eliminando solo localmente.')
          } else {
            throw error
          }
        } else {
          console.log('✅ Lotería eliminada de Supabase')
          toast.success('Lotería eliminada de Supabase y localmente')
        }
      } catch (error: any) {
        console.error('Error deleting lottery from Supabase:', error)
        toast.error(`Error en Supabase: ${error.message}. Eliminando solo localmente.`)
      }
    }

    // Eliminar localmente (siempre)
    const updatedLotteries = lotteries.filter(lottery => lottery.id !== lotteryId)
    setLotteries(updatedLotteries)
    saveLocalLotteries(updatedLotteries)

    if (!isSupabaseConfigured()) {
      toast.success('Lotería eliminada localmente')
    }

    return true
  }

  // Alternar estado de la lotería
  const toggleLotteryStatus = async (lotteryId: string): Promise<boolean> => {
    const lottery = lotteries.find(l => l.id === lotteryId)
    if (!lottery) return false
    
    return await updateLottery(lotteryId, { isActive: !lottery.isActive })
  }

  // Cargar loterías al montar el componente
  useEffect(() => {
    loadLotteries()
  }, [loadLotteries])

  return {
    lotteries,
    isLoading,
    error,
    loadLotteries,
    createLottery,
    updateLottery,
    deleteLottery,
    toggleLotteryStatus,
  }
}