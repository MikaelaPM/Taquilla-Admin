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

  // Cargar usuarios desde Supabase (como los roles)
  const loadUsers = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      // Fallback: usar usuarios por defecto si Supabase no está configurado
      const defaultUsers: User[] = [
        {
          id: 'admin-user-default',
          name: 'Administrador Principal',
          email: 'admin@loteria.com',
          roleIds: ['admin'],
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: 'system',
        }
      ]
      setUsers(defaultUsers)
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Cargar usuarios con sus roles desde la vista users_with_roles
      const { data, error } = await supabase
        .from('users_with_roles')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error

      // Transformar datos de Supabase al formato local
      const transformedUsers: User[] = data.map((user: SupabaseUser) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        roleIds: user.roles?.map(role => role.id) || [],
        isActive: user.is_active,
        createdAt: user.created_at,
        createdBy: user.created_by || 'system',
      }))

      setUsers(transformedUsers)
      console.log(`✅ Cargados ${transformedUsers.length} usuarios desde Supabase`)
      
    } catch (error: any) {
      console.error('Error loading users:', error)
      setError(error.message || 'Error al cargar usuarios')
      toast.error('Error al cargar usuarios desde Supabase')
      
      // Fallback a usuarios por defecto en caso de error
      const defaultUsers: User[] = [
        {
          id: 'admin-user-fallback',
          name: 'Administrador Principal',
          email: 'admin@loteria.com',
          roleIds: ['admin'],
          isActive: true,
          createdAt: new Date().toISOString(),
          createdBy: 'system',
        }
      ]
      setUsers(defaultUsers)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Crear nuevo usuario (solo en Supabase)
  const createUser = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
      toast.error('Supabase no está configurado')
      return false
    }

    try {
      // Hashear contraseña básica si no se proporciona
      const password = userData.password || 'changeme123'
      const passwordHash = `hashed_${password}_${Date.now()}` // Simplificado para desarrollo
      
      // Primero crear el usuario en la tabla users
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert([
          {
            name: userData.name,
            email: userData.email,
            password_hash: passwordHash,
            is_active: userData.isActive,
            created_by: userData.createdBy
          }
        ])
        .select()
        .single()

      if (userError) throw userError

      // Luego asignar roles si se proporcionaron
      if (userData.roleIds && userData.roleIds.length > 0) {
        const userRoles = userData.roleIds.map(roleId => ({
          user_id: newUser.id,
          role_id: roleId
        }))

        const { error: rolesError } = await supabase
          .from('user_roles')
          .insert(userRoles)

        if (rolesError) {
          console.error('Error asignando roles:', rolesError)
          // No fallar completamente, el usuario se creó
        }
      }

      // Transformar al formato local
      const createdUser: User = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        roleIds: userData.roleIds || [],
        isActive: newUser.is_active,
        createdAt: newUser.created_at,
        createdBy: newUser.created_by || 'system'
      }

      setUsers(current => [...current, createdUser])
      toast.success('Usuario creado exitosamente en Supabase')
      return true
      
    } catch (error: any) {
      console.error('Error creating user:', error)
      toast.error(`Error al crear usuario: ${error.message}`)
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