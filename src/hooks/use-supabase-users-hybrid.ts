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

// Funciones de almacenamiento local
const getLocalUsers = (): User[] => {
  try {
    const stored = localStorage.getItem('users')
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error loading local users:', error)
    return []
  }
}

const saveLocalUsers = (users: User[]): void => {
  try {
    localStorage.setItem('users', JSON.stringify(users))
    console.log(`💾 Guardados ${users.length} usuarios localmente`)
  } catch (error) {
    console.error('Error saving local users:', error)
  }
}

export function useSupabaseUsers() {
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Cargar usuarios desde Supabase y local
  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    // Cargar usuarios locales primero
    const localUsers = getLocalUsers()
    console.log(`📱 Cargados ${localUsers.length} usuarios desde localStorage`)

    if (!isSupabaseConfigured()) {
      // Solo usar usuarios locales + usuarios por defecto si Supabase no está configurado
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
      
      // Combinar usuarios por defecto con locales (evitar duplicados)
      const combinedUsers = [...defaultUsers]
      localUsers.forEach(localUser => {
        if (!combinedUsers.find(u => u.id === localUser.id)) {
          combinedUsers.push(localUser)
        }
      })
      
      setUsers(combinedUsers)
      setIsLoading(false)
      return
    }

    try {
      // Cargar usuarios desde Supabase
      const { data, error } = await supabase
        .from('users_with_roles')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error

      // Transformar datos de Supabase al formato local
      const supabaseUsers: User[] = data.map((user: SupabaseUser) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        roleIds: user.roles?.map(role => role.id) || [],
        isActive: user.is_active,
        createdAt: user.created_at,
        createdBy: user.created_by || 'system',
      }))

      console.log(`☁️ Cargados ${supabaseUsers.length} usuarios desde Supabase`)

      // Combinar usuarios de Supabase con locales (prioridad a Supabase)
      const combinedUsers = [...supabaseUsers]
      localUsers.forEach(localUser => {
        if (!combinedUsers.find(u => u.id === localUser.id || u.email === localUser.email)) {
          combinedUsers.push(localUser)
        }
      })

      setUsers(combinedUsers)
      
      // Guardar la combinación localmente
      saveLocalUsers(combinedUsers)
      
    } catch (error: any) {
      console.error('Error loading users from Supabase:', error)
      setError(error.message || 'Error al cargar usuarios')
      toast.error('Error al cargar usuarios desde Supabase, usando datos locales')
      
      // Fallback a usuarios locales + por defecto
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
      
      const combinedUsers = [...defaultUsers, ...localUsers]
      setUsers(combinedUsers)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Crear nuevo usuario (Supabase + Local)
  const createUser = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<boolean> => {
    const newUserId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    
    const newUser: User = {
      id: newUserId,
      name: userData.name,
      email: userData.email,
      roleIds: userData.roleIds || [],
      isActive: userData.isActive,
      createdAt: new Date().toISOString(),
      createdBy: userData.createdBy || 'local-system'
    }

    // Intentar crear en Supabase primero
    if (isSupabaseConfigured()) {
      try {
        const password = userData.password || 'changeme123'
        const passwordHash = `hashed_${password}_${Date.now()}`
        
        const { data: supabaseUser, error: userError } = await supabase
          .from('users')
          .insert([
            {
              name: userData.name,
              email: userData.email,
              password_hash: passwordHash,
              is_active: userData.isActive,
              created_by: null // Evitar problema de foreign key
            }
          ])
          .select()
          .single()

        if (userError) throw userError

        // Asignar roles si se proporcionaron
        if (userData.roleIds && userData.roleIds.length > 0) {
          const userRoles = userData.roleIds.map(roleId => ({
            user_id: supabaseUser.id,
            role_id: roleId
          }))

          const { error: rolesError } = await supabase
            .from('user_roles')
            .insert(userRoles)

          if (rolesError) {
            console.error('Error asignando roles:', rolesError)
          }
        }

        // Usar el ID de Supabase
        newUser.id = supabaseUser.id
        newUser.createdAt = supabaseUser.created_at

        console.log('✅ Usuario creado en Supabase:', newUser.email)
        toast.success('Usuario creado exitosamente en Supabase')
        
      } catch (error: any) {
        console.error('Error creating user in Supabase:', error)
        toast.error(`Error en Supabase: ${error.message}. Guardando solo localmente.`)
      }
    }

    // Guardar localmente (siempre)
    const updatedUsers = [...users, newUser]
    setUsers(updatedUsers)
    saveLocalUsers(updatedUsers)
    
    if (!isSupabaseConfigured() || error) {
      toast.success('Usuario creado localmente')
    }

    return true
  }

  // Actualizar usuario (Supabase + Local)
  const updateUser = async (userId: string, userData: Partial<User>): Promise<boolean> => {
    // Intentar actualizar en Supabase primero
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('users')
          .update({
            name: userData.name,
            email: userData.email,
            is_active: userData.isActive,
          })
          .eq('id', userId)

        if (error) throw error

        // Actualizar roles si se proporcionaron
        if (userData.roleIds !== undefined) {
          // Eliminar roles existentes
          await supabase
            .from('user_roles')
            .delete()
            .eq('user_id', userId)

          // Insertar nuevos roles
          if (userData.roleIds.length > 0) {
            const userRoles = userData.roleIds.map(roleId => ({
              user_id: userId,
              role_id: roleId
            }))

            const { error: rolesError } = await supabase
              .from('user_roles')
              .insert(userRoles)

            if (rolesError) {
              console.error('Error actualizando roles:', rolesError)
            }
          }
        }

        console.log('✅ Usuario actualizado en Supabase')
        toast.success('Usuario actualizado en Supabase y localmente')
        
      } catch (error: any) {
        console.error('Error updating user in Supabase:', error)
        toast.error(`Error en Supabase: ${error.message}. Actualizando solo localmente.`)
      }
    }

    // Actualizar localmente (siempre)
    const updatedUsers = users.map(user =>
      user.id === userId ? { ...user, ...userData } : user
    )
    setUsers(updatedUsers)
    saveLocalUsers(updatedUsers)

    if (!isSupabaseConfigured()) {
      toast.success('Usuario actualizado localmente')
    }

    return true
  }

  // Eliminar usuario (Supabase + Local)
  const deleteUser = async (userId: string): Promise<boolean> => {
    // Intentar eliminar de Supabase primero
    if (isSupabaseConfigured()) {
      try {
        // Eliminar relaciones de roles
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)

        // Eliminar usuario
        const { error } = await supabase
          .from('users')
          .delete()
          .eq('id', userId)

        if (error) {
          if (error.message.includes('row-level security policy')) {
            toast.error('No se puede eliminar el usuario debido a políticas de seguridad')
            return false
          }
          throw error
        }

        console.log('✅ Usuario eliminado de Supabase')
        toast.success('Usuario eliminado de Supabase y localmente')
        
      } catch (error: any) {
        console.error('Error deleting user from Supabase:', error)
        toast.error(`Error en Supabase: ${error.message}. Eliminando solo localmente.`)
      }
    }

    // Eliminar localmente (siempre)
    const updatedUsers = users.filter(user => user.id !== userId)
    setUsers(updatedUsers)
    saveLocalUsers(updatedUsers)

    if (!isSupabaseConfigured()) {
      toast.success('Usuario eliminado localmente')
    }

    return true
  }

  // Alternar estado del usuario
  const toggleUserStatus = async (userId: string): Promise<boolean> => {
    const user = users.find(u => u.id === userId)
    if (!user) return false
    
    return await updateUser(userId, { isActive: !user.isActive })
  }

  // Sincronizar usuarios locales con Supabase
  const syncUsersToSupabase = async (): Promise<void> => {
    if (!isSupabaseConfigured()) {
      toast.error('Supabase no está configurado')
      return
    }

    const localUsers = getLocalUsers()
    let syncedCount = 0

    for (const user of localUsers) {
      try {
        // Verificar si el usuario ya existe en Supabase
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', user.email)
          .single()

        if (!existingUser) {
          // Crear usuario en Supabase
          const password = 'changeme123'
          const passwordHash = `hashed_${password}_${Date.now()}`
          
          const { data: newSupabaseUser, error } = await supabase
            .from('users')
            .insert([
              {
                name: user.name,
                email: user.email,
                password_hash: passwordHash,
                is_active: user.isActive,
                created_by: null
              }
            ])
            .select()
            .single()

          if (!error && newSupabaseUser) {
            syncedCount++
            console.log(`📤 Usuario sincronizado: ${user.email}`)
          }
        }
      } catch (error) {
        console.error(`Error sincronizando usuario ${user.email}:`, error)
      }
    }

    if (syncedCount > 0) {
      toast.success(`${syncedCount} usuarios sincronizados con Supabase`)
      await loadUsers() // Recargar para obtener los IDs correctos
    } else {
      toast.info('Todos los usuarios ya están sincronizados')
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
    syncUsersToSupabase,
  }
}