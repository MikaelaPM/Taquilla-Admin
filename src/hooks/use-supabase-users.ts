import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  useUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
  useToggleUserStatusMutation,
  userKeys
} from './queries/useUsersQuery'
import { User } from '@/lib/types'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { toast } from 'sonner'

export interface SupabaseUser {
  id: string
  name: string
  email: string
  password_hash: string
  is_active: boolean
  created_at: string
  created_by: string | null
  updated_at: string
  roles?: Array<{
    id: string
    name: string
    description: string
    permissions: string[]
    is_system: boolean
  }>
  all_permissions?: string[]
}

export function useSupabaseUsers() {
  const queryClient = useQueryClient()

  // Query para obtener usuarios
  const { data: users = [], isLoading, error } = useUsersQuery()

  // Mutations
  const createUserMutation = useCreateUserMutation()
  const updateUserMutation = useUpdateUserMutation()
  const deleteUserMutation = useDeleteUserMutation()
  const toggleStatusMutation = useToggleUserStatusMutation()

  // Función para recargar usuarios (invalida cache)
  const loadUsers = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: userKeys.all })
  }, [queryClient])

  // Crear usuario - mantiene la interfaz original
  const createUser = useCallback(async (userData: Omit<User, 'id' | 'createdAt'>): Promise<boolean> => {
    // Verificar si el email ya existe localmente
    const existingUser = users.find(u => u.email === userData.email)
    if (existingUser) {
      toast.error('Ya existe un usuario con este email')
      return false
    }

    try {
      await createUserMutation.mutateAsync(userData)
      return true
    } catch {
      return false
    }
  }, [users, createUserMutation])

  // Actualizar usuario - mantiene la interfaz original
  const updateUser = useCallback(async (userId: string, userData: Partial<User>): Promise<boolean> => {
    // Verificar duplicados de email localmente
    if (userData.email) {
      const existingUser = users.find(u => u.email === userData.email && u.id !== userId)
      if (existingUser) {
        toast.error('Ya existe otro usuario con este email')
        return false
      }
    }

    try {
      await updateUserMutation.mutateAsync({ userId, userData })
      return true
    } catch {
      return false
    }
  }, [users, updateUserMutation])

  // Eliminar usuario - mantiene la interfaz original
  const deleteUser = useCallback(async (userId: string): Promise<boolean> => {
    try {
      await deleteUserMutation.mutateAsync(userId)
      return true
    } catch {
      return false
    }
  }, [deleteUserMutation])

  // Alternar estado del usuario
  const toggleUserStatus = useCallback(async (userId: string): Promise<boolean> => {
    const user = users.find(u => u.id === userId)
    if (!user) return false

    try {
      await toggleStatusMutation.mutateAsync({ userId, currentStatus: user.isActive })
      return true
    } catch {
      return false
    }
  }, [users, toggleStatusMutation])

  // Sincronizar usuarios locales con Supabase (legacy - mantiene compatibilidad)
  const syncUsersToSupabase = useCallback(async (): Promise<void> => {
    if (!isSupabaseConfigured()) {
      toast.error('Supabase no está configurado')
      return
    }
    toast.info('La sincronización ya no es necesaria con React Query')
  }, [])

  // Limpiar usuarios duplicados en Supabase
  const cleanDuplicateUsers = useCallback(async (): Promise<void> => {
    if (!isSupabaseConfigured()) {
      toast.error('Supabase no está configurado')
      return
    }

    try {
      toast.info('Limpiando usuarios duplicados...')

      const { data: allUsers, error: fetchError } = await supabase
        .from('users')
        .select('id, name, email, created_at')
        .order('created_at', { ascending: true })

      if (fetchError) throw fetchError

      // Agrupar por email
      const emailGroups: { [key: string]: any[] } = {}
      allUsers.forEach(user => {
        if (!emailGroups[user.email]) {
          emailGroups[user.email] = []
        }
        emailGroups[user.email].push(user)
      })

      // Encontrar duplicados
      const duplicateEmails = Object.keys(emailGroups).filter(email => emailGroups[email].length > 1)

      if (duplicateEmails.length === 0) {
        toast.success('No se encontraron duplicados')
        return
      }

      let deletedCount = 0

      for (const email of duplicateEmails) {
        const duplicateUsers = emailGroups[email]
        duplicateUsers.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        const deleteUsers = duplicateUsers.slice(1)

        for (const user of deleteUsers) {
          try {
            await supabase.from('bets').delete().eq('user_id', user.id)
            await supabase.from('taquilla_sales').delete().eq('created_by', user.id)
            await supabase.from('api_keys').delete().eq('created_by', user.id)
            await supabase.from('taquillas').update({ activated_by: null }).eq('activated_by', user.id)
            await supabase.from('transfers').update({ created_by: null }).eq('created_by', user.id)
            await supabase.from('withdrawals').update({ created_by: null }).eq('created_by', user.id)
            await supabase.from('user_roles').delete().eq('user_id', user.id)

            const { error: deleteError } = await supabase
              .from('users')
              .delete()
              .eq('id', user.id)

            if (!deleteError) {
              deletedCount++
            }
          } catch (error) {
            console.error('Error eliminando usuario duplicado:', error)
          }
        }
      }

      toast.success(`Limpieza completada! ${deletedCount} usuarios duplicados eliminados`)

      // Recargar usuarios
      await loadUsers()

    } catch (error: any) {
      toast.error(`Error limpiando duplicados: ${error.message}`)
    }
  }, [loadUsers])

  return {
    users,
    isLoading,
    error: error?.message || null,
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    syncUsersToSupabase,
    cleanDuplicateUsers,
  }
}
