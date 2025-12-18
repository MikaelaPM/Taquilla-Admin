import { useMemo, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useUsersQuery, useUpdateUserMutation, useDeleteUserMutation, userKeys } from './queries/useUsersQuery'
import { supabase } from '@/lib/supabase'
import { Agency } from '@/lib/types'
import { toast } from 'sonner'

export function useSupabaseAgencies() {
    const queryClient = useQueryClient()

    // Usar la query de usuarios
    const { data: users = [], isLoading } = useUsersQuery()

    // Mutations de usuarios
    const updateUserMutation = useUpdateUserMutation()
    const deleteUserMutation = useDeleteUserMutation()

    // Derivar agencias de usuarios (filter userType='agencia')
    const agencies = useMemo(() => {
        return users
            .filter(u => u.userType === 'agencia')
            .map(item => ({
                id: item.id,
                name: item.name,
                address: item.address,
                logo: undefined,
                parentId: item.parentId,
                shareOnSales: item.shareOnSales || 0,
                shareOnProfits: item.shareOnProfits || 0,
                currentBalance: 0,
                isActive: item.isActive,
                createdAt: item.createdAt,
                userId: item.id,
                userEmail: item.email
            }))
    }, [users])

    const loadAgencies = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: userKeys.all })
    }, [queryClient])

    const createAgency = useCallback(async (agency: Omit<Agency, 'id' | 'createdAt' | 'currentBalance' | 'isActive'>) => {
        try {
            const tempEmail = (agency as any).email || `agencia_${Date.now()}@system.local`
            const tempPassword = (agency as any).password || '123456'

            const { data: userData } = await supabase.auth.getUser()
            const currentUserId = userData.user?.id

            const newAgency = {
                name: agency.name,
                email: tempEmail,
                password_hash: `hash_${tempPassword}`,
                user_type: 'agencia',
                parent_id: agency.parentId || currentUserId,
                address: agency.address,
                logo: agency.logo,
                share_on_sales: agency.shareOnSales || 0,
                share_on_profits: agency.shareOnProfits || 0,
                current_balance: 0,
                is_active: true
            }

            const { error } = await supabase
                .from('users')
                .insert([newAgency])
                .select()
                .single()

            if (error) throw error

            // Invalidar cache de usuarios
            await queryClient.invalidateQueries({ queryKey: userKeys.all })
            toast.success('Agencia creada exitosamente')
            return true
        } catch (error) {
            console.error('Error creating agency:', error)
            toast.error('Error al crear agencia')
            return false
        }
    }, [queryClient])

    const updateAgency = useCallback(async (id: string, updates: Partial<Agency>) => {
        try {
            const supabaseUpdates: any = {}
            if (updates.name !== undefined) supabaseUpdates.name = updates.name
            if (updates.address !== undefined) supabaseUpdates.address = updates.address
            if (updates.logo !== undefined) supabaseUpdates.logo = updates.logo
            if (updates.parentId !== undefined) supabaseUpdates.parent_id = updates.parentId
            if (updates.shareOnSales !== undefined) supabaseUpdates.share_on_sales = updates.shareOnSales
            if (updates.shareOnProfits !== undefined) supabaseUpdates.share_on_profits = updates.shareOnProfits
            if (updates.currentBalance !== undefined) supabaseUpdates.current_balance = updates.currentBalance
            if (updates.isActive !== undefined) supabaseUpdates.is_active = updates.isActive

            const { error } = await supabase
                .from('users')
                .update(supabaseUpdates)
                .eq('id', id)
                .eq('user_type', 'agencia')

            if (error) throw error

            // Invalidar cache de usuarios
            await queryClient.invalidateQueries({ queryKey: userKeys.all })
            toast.success('Agencia actualizada exitosamente')
            return true
        } catch (error) {
            console.error('Error updating agency:', error)
            toast.error('Error al actualizar agencia')
            return false
        }
    }, [queryClient])

    const deleteAgency = useCallback(async (id: string) => {
        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', id)
                .eq('user_type', 'agencia')

            if (error) throw error

            // Invalidar cache de usuarios
            await queryClient.invalidateQueries({ queryKey: userKeys.all })
            toast.success('Agencia eliminada exitosamente')
            return true
        } catch (error) {
            console.error('Error deleting agency:', error)
            toast.error('Error al eliminar agencia')
            return false
        }
    }, [queryClient])

    return {
        agencies,
        isLoading,
        loadAgencies,
        createAgency,
        updateAgency,
        deleteAgency
    }
}
