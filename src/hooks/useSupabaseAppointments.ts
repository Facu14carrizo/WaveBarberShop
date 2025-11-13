import { useState, useEffect } from 'react'
import { supabase, AppointmentRow } from '../lib/supabase'
import { Appointment } from '../types'

// Marcador para acompañantes dentro de notes
const COMPANIONS_MARK = '::ACOMP::'

const parseNotes = (notes?: string): { companions: string[]; cleanNotes?: string } => {
  if (!notes) return { companions: [], cleanNotes: undefined }
  const lines = notes.split(/\r?\n/)
  const first = lines[0] || ''
  if (first.startsWith(COMPANIONS_MARK)) {
    const json = first.slice(COMPANIONS_MARK.length)
    try {
      const companions = JSON.parse(json)
      const cleanNotes = lines.slice(1).join('\n') || undefined
      return { companions: Array.isArray(companions) ? companions : [], cleanNotes }
    } catch {
      return { companions: [], cleanNotes: notes }
    }
  }
  return { companions: [], cleanNotes: notes }
}

// Función para convertir de AppointmentRow (Supabase) a Appointment (app)
const convertToAppointment = (row: AppointmentRow): Appointment => {
  const parsed = parseNotes(row.notes)
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    service: {
      name: row.service_name,
      price: row.service_price,
      duration: row.service_duration,
      icon: row.service_icon
    },
    date: row.date,
    time: row.time,
    status: row.status,
    notes: parsed.cleanNotes,
    additionalCustomerNames: parsed.companions,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at)
  }
}

// Función para convertir de Appointment (app) a AppointmentRow (Supabase)
const convertToRow = (
  appointment: Omit<Appointment, 'createdAt' | 'updatedAt'>
): Omit<AppointmentRow, 'created_at' | 'updated_at'> => {
  const companions = appointment.additionalCustomerNames && appointment.additionalCustomerNames.length > 0
    ? `${COMPANIONS_MARK}${JSON.stringify(appointment.additionalCustomerNames)}\n`
    : ''
  const combinedNotes = `${companions}${appointment.notes || ''}`.trim()
  return {
    id: appointment.id,
    customer_name: appointment.customerName,
    customer_phone: appointment.customerPhone,
    customer_email: appointment.customerEmail,
    service_name: appointment.service.name,
    service_price: appointment.service.price,
    service_duration: appointment.service.duration,
    service_icon: appointment.service.icon,
    date: appointment.date,
    time: appointment.time,
    status: appointment.status,
    notes: combinedNotes || null as any
  }
}

export const useSupabaseAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Cargar turnos al inicializar
  useEffect(() => {
    loadAppointments()
  }, [])

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel('appointments_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments'
        },
        () => {
          // Recargar turnos cuando hay cambios
          loadAppointments()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadAppointments = async () => {
    try {
      setLoading(true)
      
      // Primero intentar cargar con el filtro de deleted_at
      let query = supabase
        .from('appointments')
        .select('*')
        .order('created_at', { ascending: false })
      
      // Intentar filtrar por deleted_at, pero si falla (columna no existe), cargar todos
      try {
        const { data, error } = await query.is('deleted_at', null)
        
        if (error) {
          // Si el error es porque la columna no existe, cargar todos los turnos
          if (error.message?.includes('deleted_at') || error.code === 'PGRST116') {
            console.log('Columna deleted_at no existe, cargando todos los turnos')
            const { data: allData, error: allError } = await supabase
              .from('appointments')
              .select('*')
              .order('created_at', { ascending: false })
            
            if (allError) throw allError
            
            const convertedAppointments = allData?.map(convertToAppointment) || []
            setAppointments(convertedAppointments)
            setError(null)
            return
          }
          throw error
        }
        
        const convertedAppointments = data?.map(convertToAppointment) || []
        setAppointments(convertedAppointments)
        setError(null)
      } catch (filterError: any) {
        // Si falla el filtro, intentar cargar todos los turnos
        console.log('Error con filtro deleted_at, cargando todos los turnos:', filterError)
        const { data: allData, error: allError } = await supabase
          .from('appointments')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (allError) throw allError
        
        const convertedAppointments = allData?.map(convertToAppointment) || []
        setAppointments(convertedAppointments)
        setError(null)
      }
    } catch (err) {
      console.error('Error loading appointments:', err)
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  // Cargar turnos eliminados (papelera)
  const loadDeletedAppointments = async (): Promise<Appointment[]> => {
    try {
      // Intentar cargar turnos eliminados
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .not('deleted_at', 'is', null) // Solo turnos eliminados
        .order('deleted_at', { ascending: false })

      if (error) {
        // Si la columna no existe, retornar array vacío
        if (error.message?.includes('deleted_at') || error.code === 'PGRST116') {
          console.log('Columna deleted_at no existe, no hay turnos eliminados')
          return []
        }
        throw error
      }

      return data?.map(convertToAppointment) || []
    } catch (err) {
      console.error('Error loading deleted appointments:', err)
      // Si hay error, retornar array vacío en lugar de lanzar error
      return []
    }
  }

  const addAppointment = async (appointment: Omit<Appointment, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const row = convertToRow(appointment)
      const { data, error } = await supabase
        .from('appointments')
        .insert([{
          ...row,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single()

      if (error) throw error

      const newAppointment = convertToAppointment(data)
      setAppointments(prev => [newAppointment, ...prev])
      return newAppointment
    } catch (err) {
      console.error('Error adding appointment:', err)
      setError(err instanceof Error ? err.message : 'Error al crear turno')
      throw err
    }
  }

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    try {
      const appointment = appointments.find(apt => apt.id === id)
      if (!appointment) throw new Error('Turno no encontrado')

      const updatedAppointment = { ...appointment, ...updates }
      const row = convertToRow(updatedAppointment)
      
      const { data, error } = await supabase
        .from('appointments')
        .update({
          ...row,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      const convertedAppointment = convertToAppointment(data)
      setAppointments(prev => 
        prev.map(apt => apt.id === id ? convertedAppointment : apt)
      )
      return convertedAppointment
    } catch (err) {
      console.error('Error updating appointment:', err)
      setError(err instanceof Error ? err.message : 'Error al actualizar turno')
      throw err
    }
  }

  const deleteAppointment = async (id: string) => {
    try {
      // Intentar marcar como eliminado (si la columna existe)
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (updateError) {
        // Si la columna deleted_at no existe, eliminar permanentemente
        if (updateError.message?.includes('deleted_at')) {
          console.log('Columna deleted_at no existe, eliminando permanentemente')
          const { error: deleteError } = await supabase
            .from('appointments')
            .delete()
            .eq('id', id)
          
          if (deleteError) throw deleteError
        } else {
          throw updateError
        }
      }

      // Remover de la lista de turnos activos
      setAppointments(prev => prev.filter(apt => apt.id !== id))
    } catch (err) {
      console.error('Error deleting appointment:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar turno')
      throw err
    }
  }

  // Restaurar un turno desde la papelera
  const restoreAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          deleted_at: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) {
        // Si la columna no existe, no hay nada que restaurar
        if (error.message?.includes('deleted_at')) {
          console.log('Columna deleted_at no existe, no se puede restaurar')
          return
        }
        throw error
      }

      // Recargar turnos para incluir el restaurado
      await loadAppointments()
    } catch (err) {
      console.error('Error restoring appointment:', err)
      setError(err instanceof Error ? err.message : 'Error al restaurar turno')
      throw err
    }
  }

  // Eliminar permanentemente de la papelera
  const permanentlyDeleteAppointment = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id)

      if (error) throw error
    } catch (err) {
      console.error('Error permanently deleting appointment:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar permanentemente')
      throw err
    }
  }

  return {
    appointments,
    loading,
    error,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    restoreAppointment,
    permanentlyDeleteAppointment,
    loadDeletedAppointments,
    refresh: loadAppointments
  }
}




