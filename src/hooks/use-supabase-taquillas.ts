import { useEffect, useState, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Taquilla } from '@/lib/types'

// Hash simple compatible con verifyPassword del auth hook
function simpleHash(password: string): string {
  return `hashed_${password}_${Date.now()}`
}

export function useSupabaseTaquillas() {
  const [taquillas, setTaquillas] = useState<Taquilla[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!isSupabaseConfigured()) {
      setIsConnected(false)
      return false
    }
    try {
      const { error } = await supabase.from('taquillas').select('id').limit(1)
      const ok = !error
      setIsConnected(ok)
      return ok
    } catch (e) {
      setIsConnected(false)
      return false
    }
  }, [])

  const loadTaquillas = useCallback(async (): Promise<Taquilla[]> => {
    setIsLoading(true)
    try {
      if (!(await testConnection())) {
        const local = JSON.parse(localStorage.getItem('taquillas_backup') || '[]')
        setTaquillas(local)
        return local
      }
      const { data, error } = await supabase
        .from('taquillas')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      const mapped: Taquilla[] = (data || []).map((t: any) => ({
        id: t.id,
        fullName: t.full_name,
        address: t.address,
        telefono: t.telefono || t.phone, // Soporte para ambos nombres por si acaso
        email: t.email,
        username: t.username || undefined,
        isApproved: !!t.is_active, // Mapeamos is_active a isApproved
        approvedBy: t.activated_by || t.approved_by || undefined,
        approvedAt: t.activated_at || t.approved_at || undefined,
        createdAt: t.created_at,
      }))

      setTaquillas(mapped)
      localStorage.setItem('taquillas_backup', JSON.stringify(mapped))
      return mapped
    } catch (e) {
      const local = JSON.parse(localStorage.getItem('taquillas_backup') || '[]')
      setTaquillas(local)
      return local
    } finally {
      setIsLoading(false)
    }
  }, [testConnection])

  const createTaquilla = useCallback(async (input: Pick<Taquilla, 'fullName'|'address'|'telefono'|'email'|'password'|'username'>): Promise<boolean> => {
    try {
      const id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `taq_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      const now = new Date().toISOString()
      const passwordHash = input.password ? simpleHash(input.password) : undefined
      const newTaquilla: Taquilla = {
        id,
        fullName: input.fullName,
        address: input.address,
        telefono: input.telefono,
        email: input.email,
        username: input.username,
        passwordHash,
        isApproved: false,
        createdAt: now,
      }

      // Solo guardar en localStorage, no conectar con Supabase
      const updated = [newTaquilla, ...taquillas]
      setTaquillas(updated)
      localStorage.setItem('taquillas_backup', JSON.stringify(updated))
      return true
    } catch (e) {
      return false
    }
  }, [taquillas])

  const updateTaquilla = useCallback(async (id: string, updates: Partial<Pick<Taquilla,'fullName'|'address'|'telefono'|'email'|'password'>>): Promise<boolean> => {
    try {
      let remoteOk = false
      let passwordHash: string | undefined
      if (updates.password) {
        passwordHash = simpleHash(updates.password)
      }

      if (await testConnection()) {
        const supUpdates: any = {}
        if (updates.fullName !== undefined) supUpdates.full_name = updates.fullName
        if (updates.address !== undefined) supUpdates.address = updates.address
        if (updates.telefono !== undefined) supUpdates.telefono = updates.telefono
        if (updates.email !== undefined) supUpdates.email = updates.email
        if (passwordHash !== undefined) supUpdates.password_hash = passwordHash
        const { error } = await supabase.from('taquillas').update(supUpdates).eq('id', id)
        if (!error) remoteOk = true
      }

      const updated = taquillas.map(t => t.id === id ? {
        ...t,
        fullName: updates.fullName ?? t.fullName,
        address: updates.address ?? t.address,
        telefono: updates.telefono ?? t.telefono,
        email: updates.email ?? t.email,
        passwordHash: passwordHash ?? t.passwordHash,
      } : t)
      setTaquillas(updated)
      localStorage.setItem('taquillas_backup', JSON.stringify(updated))
      if (remoteOk) await loadTaquillas()
      return true
    } catch (e) {
      return false
    }
  }, [taquillas, testConnection, loadTaquillas])

  const approveTaquilla = useCallback(async (id: string, approverId: string): Promise<boolean> => {
    try {
      let remoteOk = false
      if (await testConnection()) {
        const { error } = await supabase.from('taquillas').update({
          is_approved: true,
          approved_by: approverId,
          approved_at: new Date().toISOString(),
        }).eq('id', id)
        if (!error) remoteOk = true
      }

      const updated = taquillas.map(t => t.id === id ? {
        ...t, isApproved: true, approvedBy: approverId, approvedAt: new Date().toISOString()
      } : t)
      setTaquillas(updated)
      localStorage.setItem('taquillas_backup', JSON.stringify(updated))
      if (remoteOk) await loadTaquillas()
      return true
    } catch (e) {
      return false
    }
  }, [taquillas, testConnection, loadTaquillas])

  const toggleTaquillaStatus = useCallback(async (id: string, isActive: boolean): Promise<boolean> => {
    try {
      let remoteOk = false
      if (await testConnection()) {
        const { error } = await supabase.from('taquillas').update({
          is_active: isActive,
          // Si se activa, podríamos querer guardar quién lo activó, pero por simplicidad solo cambiamos el estado
          // activated_by: isActive ? currentUserId : null, // Necesitaríamos el userId aquí
        }).eq('id', id)
        if (!error) remoteOk = true
      }

      const updated = taquillas.map(t => t.id === id ? {
        ...t, isApproved: isActive
      } : t)
      setTaquillas(updated)
      localStorage.setItem('taquillas_backup', JSON.stringify(updated))
      if (remoteOk) await loadTaquillas()
      return true
    } catch (e) {
      return false
    }
  }, [taquillas, testConnection, loadTaquillas])

  const deleteTaquilla = useCallback(async (id: string): Promise<boolean> => {
    try {
      let remoteOk = false
      if (await testConnection()) {
        const { error } = await supabase.from('taquillas').delete().eq('id', id)
        if (!error) remoteOk = true
      }

      const updated = taquillas.filter(t => t.id !== id)
      setTaquillas(updated)
      localStorage.setItem('taquillas_backup', JSON.stringify(updated))
      if (remoteOk) await loadTaquillas()
      return true
    } catch (e) {
      return false
    }
  }, [taquillas, testConnection, loadTaquillas])

  useEffect(() => {
    loadTaquillas()
  }, [loadTaquillas])

  return { taquillas, isLoading, isConnected, loadTaquillas, createTaquilla, approveTaquilla, updateTaquilla, toggleTaquillaStatus, deleteTaquilla }
}
