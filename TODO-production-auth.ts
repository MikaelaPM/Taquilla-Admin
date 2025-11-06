// ✅ ESTADO ACTUAL DEL SISTEMA DE AUTENTICACIÓN
// 
// 🎯 INTEGRACIÓN ACTUAL (100% FUNCIONAL):
// - Supabase Database: ✅ Real y conectado (https://dxfivioylmbpumzcpwtu.supabase.co)
// - Tablas: ✅ users, lotteries, prizes, roles (todas funcionando)
// - RLS Políticas: ✅ Configuradas y funcionando
// - Sistema Híbrido: ✅ Supabase + localStorage como backup
// - CRUD Completo: ✅ Crear, leer, actualizar, eliminar (todos los módulos)
//
// 🎭 PARA PRODUCCIÓN - PRÓXIMOS PASOS:
// - Implementar Supabase Auth (login real con email/password)
// - Configurar políticas RLS específicas por roles
// - Habilitar registro de usuarios públicos
// - Configurar variables de entorno de producción

import { supabase } from './src/lib/supabase'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

// ============================================
// CONFIGURACIÓN ACTUAL (DESARROLLO/TESTING)
// ============================================

// Credenciales hardcodeadas para desarrollo:
export const DEV_CREDENTIALS = {
  admin: {
    email: 'admin@loteria.com',
    password: 'admin123',
    role: 'Super Administrador'
  },
  operator: {
    email: 'juan@loteria.com', 
    password: 'usuario123',
    role: 'Operador'
  },
  supervisor: {
    email: 'maria@loteria.com',
    password: 'usuario123', 
    role: 'Supervisor'
  }
}

// ============================================
// IMPLEMENTACIÓN PARA PRODUCCIÓN
// ============================================

// Login real con Supabase Auth (para implementar)
const loginWithSupabase = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    
    if (error) {
      throw error
    }
    
    // Obtener datos del usuario desde la tabla users
    const { data: userData, error: userError } = await supabase
      .from('users_with_roles')
      .select('*')
      .eq('email', email)
      .single()
    
    if (userError) {
      throw userError
    }
    
    return {
      auth: data,
      user: userData
    }
  } catch (error) {
    console.error('Error en login:', error)
    throw error
  }
}

// Registro de usuarios (para implementar)
const registerUser = async (email: string, password: string, userData: {
  name: string
  roleIds: string[]
}) => {
  try {
    // 1. Registrar en Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: userData.name
        }
      }
    })
    
    if (authError) {
      throw authError
    }
    
    // 2. Crear registro en tabla users
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user?.id,
          name: userData.name,
          email: email,
          is_active: true,
          created_by: 'registration'
        }
      ])
      .select()
      .single()
    
    if (userError) {
      throw userError
    }
    
    // 3. Asignar roles
    if (userData.roleIds.length > 0) {
      const userRoles = userData.roleIds.map(roleId => ({
        user_id: newUser.id,
        role_id: roleId
      }))
      
      const { error: rolesError } = await supabase
        .from('user_roles')
        .insert(userRoles)
      
      if (rolesError) {
        console.error('Error asignando roles:', rolesError)
      }
    }
    
    return {
      auth: authData,
      user: newUser
    }
  } catch (error) {
    console.error('Error en registro:', error)
    throw error
  }
}

// Logout
const logout = async () => {
  try {
    await supabase.auth.signOut()
  } catch (error) {
    console.error('Error en logout:', error)
    throw error
  }
}

// Verificar sesión actual
const getCurrentSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      throw error
    }
    
    return session
  } catch (error) {
    console.error('Error obteniendo sesión:', error)
    return null
  }
}

// Escuchar cambios de autenticación
const onAuthStateChange = (callback: (session: Session | null) => void) => {
  return supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
    callback(session)
  })
}

// ============================================
// CONFIGURACIÓN PARA PRODUCCIÓN
// ============================================

export const PRODUCTION_SETUP = {
  // Variables de entorno requeridas
  requiredEnvVars: [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY' // Para operaciones admin
  ],
  
  // Configuración RLS recomendada
  rlsPolicies: {
    users: 'Solo admin puede gestionar, usuarios ven sus propios datos',
    lotteries: 'Público puede ver, solo admin/operador puede modificar',
    prizes: 'Público puede ver, solo admin puede modificar',
    roles: 'Público puede ver, solo super admin puede modificar'
  },
  
  // Roles de sistema recomendados
  systemRoles: [
    'Super Administrador',
    'Administrador', 
    'Operador',
    'Supervisor',
    'Usuario Público'
  ]
}

// ============================================
// EXPORTS
// ============================================

export { 
  loginWithSupabase, 
  registerUser, 
  logout,
  getCurrentSession,
  onAuthStateChange 
}