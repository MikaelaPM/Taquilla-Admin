import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { User } from '@/lib/types'
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
  // Campos de la vista users_with_roles
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
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Función para guardar usuarios localmente
  const saveLocalUsers = (localUsers: User[]) => {
    localStorage.setItem('localUsers', JSON.stringify(localUsers))
  }

  // Función para cargar usuarios localmente
  const getLocalUsers = (): User[] => {
    const stored = localStorage.getItem('localUsers')
    return stored ? JSON.parse(stored) : []
  }

  // Cargar usuarios desde Supabase + locales
  const loadUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Cargar usuarios locales
      const localUsers = getLocalUsers()
      
      // Intentar cargar desde Supabase si está configurado
      let supabaseUsers: User[] = []
      
      if (isSupabaseConfigured()) {
        try {
          const { data, error } = await supabase
            .from('users_with_roles')
            .select('*')
            .order('created_at', { ascending: true })

          if (!error && data) {
            supabaseUsers = data.map((user: SupabaseUser) => ({
              id: user.id,
              name: user.name,
              email: user.email,
              roleIds: user.roles?.map(role => role.id) || [],
              isActive: user.is_active,
              createdAt: user.created_at,
              createdBy: user.created_by || 'system',
            }))
            console.log(`✅ Cargados ${supabaseUsers.length} usuarios de Supabase`)
          }
        } catch (supabaseError) {
          console.log('⚠️ Error cargando desde Supabase, usando solo usuarios locales')
        }
      }

      // Combinar usuarios: Supabase + locales (evitar duplicados por email)
      const combinedUsers = [...supabaseUsers]
      localUsers.forEach(localUser => {
        if (!supabaseUsers.find(su => su.email === localUser.email)) {
          combinedUsers.push(localUser)
        }
      })

      // Si no hay usuarios, crear uno por defecto
      if (combinedUsers.length === 0) {
        const defaultUser: User = {
          id: 'admin-user-default',
          name: 'Administrador Principal',
          email: 'admin@loteria.com',
          roleIds: ['admin'],
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: 'system',
        }
        combinedUsers.push(defaultUser)
      }

      setUsers(combinedUsers)
      console.log(`📋 Total usuarios cargados: ${combinedUsers.length}`)
      
    } catch (error: any) {
      console.error('Error loading users:', error)
      setError(error.message || 'Error al cargar usuarios')
      
      // Fallback a usuarios locales únicamente
      const localUsers = getLocalUsers()
      setUsers(localUsers)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Crear nuevo usuario con approach híbrido
  const createUser = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<boolean> => {
    try {
      const newUser: User = {
        ...userData,
        id: `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date().toISOString(),
      }

      // Intentar guardar en Supabase primero
      if (isSupabaseConfigured()) {
        try {
          const { data: createdUser, error: userError } = await supabase
            .from('users')
            .insert([{
              name: userData.name,
              email: userData.email,
              password_hash: userData.password || 'changeme123',
              is_active: userData.isActive,
              created_by: userData.createdBy
            }])
            .select()
            .single()

          if (!userError && createdUser) {
            // Si se guardó en Supabase, usar el ID real
            const supabaseUser: User = {
              ...userData,
              id: createdUser.id,
              createdAt: createdUser.created_at,
            }
            
            setUsers(current => [...current, supabaseUser])
            toast.success('Usuario creado exitosamente en Supabase')
            return true
          }
        } catch (supabaseError: any) {
          console.log('⚠️ No se pudo guardar en Supabase:', supabaseError.message)
        }
      }

      // Si falló Supabase o no está configurado, guardar localmente
      setUsers(current => [...current, newUser])
      
      // Guardar en localStorage
      const currentLocal = getLocalUsers()
      const updatedLocal = [...currentLocal, newUser]
      saveLocalUsers(updatedLocal)
      
      toast.success('Usuario creado exitosamente (guardado localmente)', {
        description: 'Se sincronizará con Supabase cuando esté disponible'
      })
      return true
      
    } catch (error: any) {
      console.error('Error creating user:', error)
      toast.error('Error al crear usuario')
      return false
    }
  }

  // Actualizar usuario
  const updateUser = async (userId: string, userData: Partial<User>): Promise<boolean> => {
    try {
      // Intentar actualizar en Supabase
      if (isSupabaseConfigured() && !userId.startsWith('local-')) {
        try {
          const { error } = await supabase
            .from('users')
            .update({
              name: userData.name,
              email: userData.email,
              is_active: userData.isActive,
            })
            .eq('id', userId)

          if (!error) {
            setUsers(current =>
              current.map(user =>
                user.id === userId ? { ...user, ...userData } : user
              )
            )
            toast.success('Usuario actualizado exitosamente en Supabase')
            return true
          }
        } catch (supabaseError) {
          console.log('⚠️ No se pudo actualizar en Supabase, actualizando localmente')
        }
      }

      // Actualizar localmente
      setUsers(current =>
        current.map(user =>
          user.id === userId ? { ...user, ...userData } : user
        )
      )

      // Si es usuario local, actualizar localStorage
      if (userId.startsWith('local-')) {
        const currentLocal = getLocalUsers()
        const updatedLocal = currentLocal.map(user =>
          user.id === userId ? { ...user, ...userData } : user
        )
        saveLocalUsers(updatedLocal)
      }

      toast.success('Usuario actualizado exitosamente')
      return true
      
    } catch (error: any) {
      console.error('Error updating user:', error)
      toast.error('Error al actualizar usuario')
      return false
    }
  }

  // Eliminar usuario
  const deleteUser = async (userId: string): Promise<boolean> => {
    try {
      // Intentar eliminar de Supabase
      if (isSupabaseConfigured() && !userId.startsWith('local-')) {
        try {
          const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId)

          if (!error) {
            setUsers(current => current.filter(user => user.id !== userId))
            toast.success('Usuario eliminado exitosamente de Supabase')
            return true
          }
        } catch (supabaseError) {
          console.log('⚠️ No se pudo eliminar de Supabase, eliminando localmente')
        }
      }

      // Eliminar localmente
      setUsers(current => current.filter(user => user.id !== userId))
      
      // Si es usuario local, actualizar localStorage
      if (userId.startsWith('local-')) {
        const currentLocal = getLocalUsers()
        const updatedLocal = currentLocal.filter(user => user.id !== userId)
        saveLocalUsers(updatedLocal)
      }

      toast.success('Usuario eliminado exitosamente')
      return true
      
    } catch (error: any) {
      console.error('Error deleting user:', error)
      toast.error('Error al eliminar usuario')
      return false
    }
  }

  // Alternar estado del usuario
  const toggleUserStatus = async (userId: string): Promise<boolean> => {
    const user = users.find(u => u.id === userId)
    if (!user) return false
    
    return await updateUser(userId, { isActive: !user.isActive })
  }

  // Función para sincronizar usuarios locales con Supabase
  const syncLocalUsersToSupabase = async (): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
      toast.error('Supabase no está configurado')
      return false
    }

    try {
      const localUsers = getLocalUsers()
      const localOnlyUsers = localUsers.filter(user => user.id.startsWith('local-'))
      
      if (localOnlyUsers.length === 0) {
        toast.info('No hay usuarios locales para sincronizar')
        return true
      }

      let syncedCount = 0
      
      for (const user of localOnlyUsers) {
        try {
          const { data: createdUser, error } = await supabase
            .from('users')
            .insert([{
              name: user.name,
              email: user.email,
              password_hash: 'changeme123',
              is_active: user.isActive,
              created_by: user.createdBy
            }])
            .select()
            .single()

          if (!error && createdUser) {
            syncedCount++
            console.log(`✅ Usuario ${user.email} sincronizado con ID ${createdUser.id}`)
          }
        } catch (syncError) {
          console.log(`❌ Error sincronizando ${user.email}:`, syncError)
        }
      }

      if (syncedCount > 0) {
        toast.success(`${syncedCount} usuarios sincronizados con Supabase`)
        // Recargar usuarios para mostrar los IDs reales
        await loadUsers()
      }

      return syncedCount > 0
      
    } catch (error: any) {
      console.error('Error syncing users:', error)
      toast.error('Error al sincronizar usuarios')
      return false
    }
  }

  // Cargar usuarios al montar el componente
  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  return {
    users,
    isLoading,
    error,
    loadUsers,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
    syncLocalUsersToSupabase,
  }
}