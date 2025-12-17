import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
    useComercializadorasQuery,
    useCreateComercializadoraMutation,
    useUpdateComercializadoraMutation,
    useDeleteComercializadoraMutation,
    comercializadoraKeys
} from './queries/useComercializadorasQuery'
import type { Comercializadora } from '@/lib/types'
import type { SupabaseUser } from './use-supabase-auth'
import { isSupabaseConfigured } from '@/lib/supabase'

export function useSupabaseComercializadoras(currentUser?: SupabaseUser | null) {
    const queryClient = useQueryClient()

    // Query params basados en el usuario actual
    const queryParams = {
        currentUserId: currentUser?.id,
        userType: currentUser?.userType,
        allPermissions: currentUser?.all_permissions
    }

    // Query principal
    const {
        data: comercializadoras = [],
        isLoading,
        isSuccess
    } = useComercializadorasQuery(queryParams)

    // Mutations
    const createMutation = useCreateComercializadoraMutation()
    const updateMutation = useUpdateComercializadoraMutation()
    const deleteMutation = useDeleteComercializadoraMutation()

    // Test de conexión - ahora simplificado
    const testConnection = useCallback(async (): Promise<boolean> => {
        return isSupabaseConfigured() && isSuccess
    }, [isSuccess])

    // Cargar comercializadoras (invalidar cache)
    const loadComercializadoras = useCallback(async (): Promise<Comercializadora[]> => {
        await queryClient.invalidateQueries({ queryKey: comercializadoraKeys.all })
        return comercializadoras
    }, [queryClient, comercializadoras])

    // Crear comercializadora
    const createComercializadora = useCallback(async (
        input: Omit<Comercializadora, 'id' | 'createdAt'>
    ): Promise<boolean> => {
        try {
            await createMutation.mutateAsync(input)
            return true
        } catch {
            return false
        }
    }, [createMutation])

    // Actualizar comercializadora
    const updateComercializadora = useCallback(async (
        id: string,
        updates: Partial<Omit<Comercializadora, 'id' | 'createdAt'>>
    ): Promise<boolean> => {
        try {
            await updateMutation.mutateAsync({ id, updates })
            return true
        } catch {
            return false
        }
    }, [updateMutation])

    // Eliminar comercializadora
    const deleteComercializadora = useCallback(async (id: string): Promise<boolean> => {
        try {
            await deleteMutation.mutateAsync(id)
            return true
        } catch {
            return false
        }
    }, [deleteMutation])

    return {
        comercializadoras,
        isLoading,
        isConnected: isSuccess,
        loadComercializadoras,
        createComercializadora,
        updateComercializadora,
        deleteComercializadora
    }
}
