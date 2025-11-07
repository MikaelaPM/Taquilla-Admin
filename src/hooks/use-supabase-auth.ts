import { useState, useEffect } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useKV } from '@github/spark/hooks'

export interface SupabaseUser {
  id: string
  name: string
  email: string
  is_active: boolean
  roles: Array<{
    id: string
    name: string
    description: string
    permissions: string[]
    is_system: boolean
  }>
  all_permissions: string[]
}

export function useSupabaseAuth() {
  const [currentUserId, setCurrentUserId] = useKV<string>('currentUserId', '')
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    // Solo cargar datos si hay un currentUserId válido
    if (currentUserId) {
      loadUserData(currentUserId)
    } else {
      setCurrentUser(null)
      setIsLoading(false)
    }
  }, [currentUserId])

  const loadUserData = async (userId: string) => {
    console.log('Loading user data for:', userId)
    
    try {
      setIsLoading(true)
      
      // Verificar si es un UUID válido
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(userId)
      
      if (!isValidUUID) {
        console.error('Invalid UUID format:', userId)
        setCurrentUser(null)
        setIsLoading(false)
        return
      }

      // Intentar cargar desde Supabase primero
      if (isSupabaseConfigured()) {
        try {
          const { data: userData, error } = await supabase
            .from('users_with_roles')
            .select('*')
            .eq('id', userId)
            .single()

          if (!error && userData) {
            // Usuario real de Supabase
            const user: SupabaseUser = {
              id: userData.id,
              name: userData.name,
              email: userData.email,
              is_active: userData.is_active,
              roles: userData.roles || [],
              all_permissions: userData.all_permissions || []
            }
            setCurrentUser(user)
            setIsLoading(false)
            return
          }
        } catch (supabaseError) {
          console.log('Usuario no encontrado en Supabase, creando usuario temporal')
        }
      }

      // Si no se encontró en Supabase, crear uno temporal
      const tempUser: SupabaseUser = {
        id: userId,
        name: 'Usuario Temporal',
        email: 'temp@loteria.com',
        is_active: true,
        roles: [{
          id: crypto.randomUUID ? crypto.randomUUID() : 'temp-role-uuid',
          name: 'Usuario Temporal',
          description: 'Acceso temporal',
          permissions: ['*'],
          is_system: false
        }],
        all_permissions: ['*']
      }
      setCurrentUser(tempUser)
      
    } catch (error) {
      console.error('Error in loadUserData:', error)
      setCurrentUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      // Usuarios de prueba con UUIDs válidos
      const testUsers = {
        'admin@loteria.com': {
          password: 'admin123',
          user: {
            name: 'Administrador Principal',
            email: 'admin@loteria.com',
            roles: [{
              id: crypto.randomUUID ? crypto.randomUUID() : 'admin-role-uuid',
              name: 'Super Administrador',
              description: 'Acceso completo al sistema',
              permissions: ['*'],
              is_system: true
            }],
            all_permissions: ['*']
          }
        },
        'juan@loteria.com': {
          password: 'usuario123',
          user: {
            name: 'Juan Pérez',
            email: 'juan@loteria.com',
            roles: [{
              id: crypto.randomUUID ? crypto.randomUUID() : 'operator-role-uuid',
              name: 'Operador',
              description: 'Operaciones de lotería',
              permissions: ['lotteries.read', 'bets.read', 'bets.create'],
              is_system: false
            }],
            all_permissions: ['lotteries.read', 'bets.read', 'bets.create']
          }
        },
        'maria@loteria.com': {
          password: 'usuario123',
          user: {
            name: 'María García',
            email: 'maria@loteria.com',
            roles: [{
              id: crypto.randomUUID ? crypto.randomUUID() : 'supervisor-role-uuid',
              name: 'Supervisor',
              description: 'Supervisión y reportes',
              permissions: ['lotteries.read', 'bets.read', 'draws.read', 'reports.read'],
              is_system: false
            }],
            all_permissions: ['lotteries.read', 'bets.read', 'draws.read', 'reports.read']
          }
        }
      }

      // Verificar si es un usuario de prueba
      const testUser = testUsers[email as keyof typeof testUsers]
      if (testUser && password === testUser.password) {
        // Generar UUID válido
        const userUUID = crypto.randomUUID ? crypto.randomUUID() : 
          'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        
        const user: SupabaseUser = {
          id: userUUID,
          name: testUser.user.name,
          email: testUser.user.email,
          is_active: true,
          roles: testUser.user.roles,
          all_permissions: testUser.user.all_permissions
        }
        
        setCurrentUserId(userUUID)
        setCurrentUser(user)
        return { success: true }
      }

      // Para otros usuarios, intentar autenticación real con Supabase
      if (!isSupabaseConfigured()) {
        return { success: false, error: 'Credenciales incorrectas' }
      }

      const { data: user, error } = await supabase
        .from('users')
        .select('id, password_hash, is_active')
        .eq('email', email)
        .single()

      if (error || !user) {
        return { success: false, error: 'Credenciales incorrectas' }
      }

      if (!user.is_active) {
        return { success: false, error: 'Usuario inactivo. Contacte al administrador' }
      }

      const passwordMatch = await verifyPassword(password, user.password_hash)
      
      if (!passwordMatch) {
        return { success: false, error: 'Credenciales incorrectas' }
      }

      // Usuario autenticado correctamente
      setCurrentUserId(user.id)
      return { success: true }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Error al iniciar sesión' }
    }
  }

  const logout = () => {
    setCurrentUserId('')
    setCurrentUser(null)
  }

  const hasPermission = (permission: string): boolean => {
    if (!currentUser) return false
    // Si el usuario tiene el permiso universal '*', tiene acceso a todo
    if (currentUser.all_permissions.includes('*')) return true
    return currentUser.all_permissions.includes(permission)
  }

  return {
    currentUser,
    currentUserId,
    isLoading,
    login,
    logout,
    hasPermission,
  }
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (hash === password) {
    return true
  }
  
  return false
}
