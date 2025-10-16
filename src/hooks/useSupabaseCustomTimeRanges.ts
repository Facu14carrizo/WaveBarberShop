import { useEffect, useState } from 'react'
import { supabase, CustomTimeRangeRow } from '../lib/supabase'
import { CustomTimeRanges } from '../utils/timeSlots'

const STORAGE_KEY = 'wbs_custom_time_ranges'

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


