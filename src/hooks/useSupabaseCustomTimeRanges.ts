import { useEffect, useState } from 'react'
import { supabase, CustomTimeRangeRow } from '../lib/supabase'
import { CustomTimeRanges } from '../utils/timeSlots'

const STORAGE_KEY = 'wbs_custom_time_ranges'
const LAST_RESET_KEY = 'wbs_last_reset_date'

const readLocal = (): CustomTimeRanges => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return { friday: [], saturday: [] }
    const parsed = JSON.parse(raw)
    return {
      friday: Array.isArray(parsed.friday) ? parsed.friday : [],
      saturday: Array.isArray(parsed.saturday) ? parsed.saturday : []
    }
  } catch {
    return { friday: [], saturday: [] }
  }
}

const writeLocal = (ranges: CustomTimeRanges) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ranges))
  } catch {}
}

// Función para verificar si es domingo y si ya se hizo el reset hoy
const shouldResetRanges = (): boolean => {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = domingo, 1 = lunes, etc.
  
  // Solo resetear si es domingo
  if (dayOfWeek !== 0) return false
  
  // Verificar si ya se hizo el reset hoy
  try {
    const lastResetDate = window.localStorage.getItem(LAST_RESET_KEY)
    if (lastResetDate) {
      const lastReset = new Date(lastResetDate)
      const todayStr = today.toDateString()
      const lastResetStr = lastReset.toDateString()
      
      // Si ya se hizo el reset hoy, no resetear de nuevo
      if (todayStr === lastResetStr) return false
    }
  } catch {
    // Si hay error leyendo, proceder con el reset
  }
  
  return true
}

// Función para marcar que se hizo el reset hoy
const markResetDone = () => {
  try {
    window.localStorage.setItem(LAST_RESET_KEY, new Date().toISOString())
  } catch {}
}

// Función para resetear todos los rangos personalizados
const resetAllRanges = async (): Promise<void> => {
  try {
    // Obtener todos los rangos primero
    const { data: allRanges, error: fetchError } = await supabase
      .from('custom_time_ranges')
      .select('*')
    
    if (fetchError) {
      console.error('Error fetching ranges for reset:', fetchError)
      return
    }
    
    // Eliminar todos los rangos uno por uno
    if (allRanges && allRanges.length > 0) {
      for (const range of allRanges) {
        const { error: deleteError } = await supabase
          .from('custom_time_ranges')
          .delete()
          .eq('id', range.id)
        
        if (deleteError) {
          console.error(`Error deleting range ${range.id}:`, deleteError)
        }
      }
    }
    
    // Limpiar localStorage también
    writeLocal({ friday: [], saturday: [] })
    markResetDone()
    
    console.log('Rangos personalizados reseteados automáticamente (domingo)')
  } catch (err) {
    console.error('Error al resetear rangos:', err)
  }
}

export function useSupabaseCustomTimeRanges() {
  const [ranges, setRanges] = useState<CustomTimeRanges>({ friday: [], saturday: [] })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const mergeRanges = (rows: CustomTimeRangeRow[]): CustomTimeRanges => {
    const next: CustomTimeRanges = { friday: [], saturday: [] }
    for (const r of rows) {
      // Manejar columna "end" comillada en SQL
      const endValue = (r as any).end ?? (r as any).end_time ?? ''
      if (r.day === 'friday') next.friday.push({ start: r.start, end: endValue })
      if (r.day === 'saturday') next.saturday.push({ start: r.start, end: endValue })
    }
    return next
  }

  const loadFromServer = async () => {
    try {
      setLoading(true)
      
      // Verificar si es domingo y resetear si es necesario
      if (shouldResetRanges()) {
        await resetAllRanges()
      }
      
      const { data, error } = await supabase
        .from('custom_time_ranges')
        .select('*')
        .order('created_at', { ascending: true })
      if (error) throw error
      const merged = mergeRanges(data || [])
      setRanges(merged)
      writeLocal(merged)
      setError(null)
    } catch (err) {
      console.error('Error loading custom time ranges:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
      // fallback a localStorage
      setRanges(readLocal())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFromServer()
  }, [])

  // Verificar periódicamente si es domingo para resetear (por si la app está abierta durante la transición)
  useEffect(() => {
    const checkAndReset = async () => {
      if (shouldResetRanges()) {
        await resetAllRanges()
        // Recargar después del reset
        try {
          const { data, error } = await supabase
            .from('custom_time_ranges')
            .select('*')
            .order('created_at', { ascending: true })
          if (!error) {
            const merged = mergeRanges(data || [])
            setRanges(merged)
            writeLocal(merged)
          }
        } catch (err) {
          console.error('Error reloading after reset:', err)
        }
      }
    }

    // Verificar cada hora si es domingo
    const interval = setInterval(checkAndReset, 60 * 60 * 1000) // Cada hora

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('custom_time_ranges_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'custom_time_ranges' }, () => {
        loadFromServer()
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const addRange = async (day: 'friday' | 'saturday', start: string, end: string) => {
    // validaciones básicas
    if (!start || !end) throw new Error('Debes indicar inicio y fin')
    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number)
      return h * 60 + (m || 0)
    }
    if (toMinutes(start) > toMinutes(end)) throw new Error('El inicio no puede ser mayor al fin')
    try {
      const { error } = await supabase
        .from('custom_time_ranges')
        .insert([{ day, start, end }])
      if (error) throw error
      await loadFromServer()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar rango')
      throw err
    }
  }

  const deleteRange = async (day: 'friday' | 'saturday', start: string, end: string) => {
    try {
      const { error } = await supabase
        .from('custom_time_ranges')
        .delete()
        .match({ day, start, end })
      if (error) throw error
      await loadFromServer()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar rango')
      throw err
    }
  }

  return { ranges, loading, error, addRange, deleteRange, refresh: loadFromServer }
}


