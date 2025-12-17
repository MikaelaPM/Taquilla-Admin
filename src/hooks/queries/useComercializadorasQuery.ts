import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Comercializadora } from '@/lib/types'
import { toast } from 'sonner'

// Query Keys
export const comercializadoraKeys = {
  all: ['comercializadoras'] as const,
  list: (userId?: string) => [...comercializadoraKeys.all, 'list', userId] as const,
  detail: (id: string) => [...comercializadoraKeys.all, 'detail', id] as const,
}

interface FetchComercializadorasParams {
  currentUserId?: string
  userType?: string
  allPermissions?: string[]
}

// Función para obtener comercializadoras desde Supabase
async function fetchComercializadoras(params: FetchComercializadorasParams): Promise<Comercializadora[]> {
  if (!isSupabaseConfigured()) {
    return []
  }

  // Test de conexión
  const { error: testError } = await supabase.from('comercializadoras').select('id').limit(1)
  if (testError) {
    console.error('Error de conexión a comercializadoras:', testError)
    return []
  }

  const isAdmin = params.allPermissions?.includes('*') || params.allPermissions?.includes('comercializadoras')

  let query = supabase
    .from('comercializadoras')
    .select('*')
    .order('created_at', { ascending: false })

  // Filtrar si no es admin
  if (params.currentUserId && !isAdmin) {
    if (params.userType === 'comercializadora') {
      query = query.eq('id', params.currentUserId)
    } else {
      query = query.eq('user_id', params.currentUserId)
    }
  }

  const { data, error } = await query

  if (error) throw error

  return (data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    address: c.address,
    logo: c.logo,
    userId: c.user_id,
    shareOnSales: parseFloat(c.share_on_sales || 0),
    shareOnProfits: parseFloat(c.share_on_profits || 0),
    isActive: !!c.is_active,
    createdAt: c.created_at,
    createdBy: c.created_by,
  }))
}

// Hook principal para obtener comercializadoras
export function useComercializadorasQuery(params: FetchComercializadorasParams = {}) {
  return useQuery({
    queryKey: comercializadoraKeys.list(params.currentUserId),
    queryFn: () => fetchComercializadoras(params),
    staleTime: 5 * 60 * 1000,
    enabled: isSupabaseConfigured(),
  })
}

// Mutation para crear comercializadora
export function useCreateComercializadoraMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: Omit<Comercializadora, 'id' | 'createdAt'>) => {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase no está configurado')
      }

      const id = typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `com_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

      const { error } = await supabase.from('comercializadoras').insert([{
        id,
        name: input.name,
        email: input.email,
        address: input.address,
        logo: input.logo,
        user_id: input.userId,
        share_on_sales: input.shareOnSales,
        share_on_profits: input.shareOnProfits,
        is_active: input.isActive,
        created_by: input.createdBy,
      }])

      if (error) throw error

      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comercializadoraKeys.all })
      toast.success('Comercializadora creada exitosamente')
    },
    onError: (error: Error) => {
      toast.error('Error al crear comercializadora: ' + error.message)
    }
  })
}

// Mutation para actualizar comercializadora
export function useUpdateComercializadoraMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Omit<Comercializadora, 'id' | 'createdAt'>> }) => {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase no está configurado')
      }

      const supUpdates: any = {}
      if (updates.name !== undefined) supUpdates.name = updates.name
      if (updates.email !== undefined) supUpdates.email = updates.email
      if (updates.address !== undefined) supUpdates.address = updates.address
      if (updates.logo !== undefined) supUpdates.logo = updates.logo
      if (updates.userId !== undefined) supUpdates.user_id = updates.userId
      if (updates.shareOnSales !== undefined) supUpdates.share_on_sales = updates.shareOnSales
      if (updates.shareOnProfits !== undefined) supUpdates.share_on_profits = updates.shareOnProfits
      if (updates.isActive !== undefined) supUpdates.is_active = updates.isActive

      const { error } = await supabase
        .from('comercializadoras')
        .update(supUpdates)
        .eq('id', id)

      if (error) throw error

      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comercializadoraKeys.all })
      toast.success('Comercializadora actualizada exitosamente')
    },
    onError: (error: Error) => {
      toast.error('Error al actualizar comercializadora: ' + error.message)
    }
  })
}

// Mutation para eliminar comercializadora
export function useDeleteComercializadoraMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!isSupabaseConfigured()) {
        throw new Error('Supabase no está configurado')
      }

      // Verificar que no tenga agencias asociadas
      const { data: agencias } = await supabase
        .from('agencias')
        .select('id')
        .eq('commercializer_id', id)
        .limit(1)

      if (agencias && agencias.length > 0) {
        throw new Error('No se puede eliminar una comercializadora con agencias asociadas')
      }

      const { error } = await supabase
        .from('comercializadoras')
        .delete()
        .eq('id', id)

      if (error) throw error

      return { id }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: comercializadoraKeys.all })
      toast.success('Comercializadora eliminada exitosamente')
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })
}
