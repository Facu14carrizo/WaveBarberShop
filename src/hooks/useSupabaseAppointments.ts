import { useState, useEffect, useCallback } from 'react'
import { supabase, AppointmentRow, PublicAppointmentSlotRow } from '../lib/supabase'
import { Appointment } from '../types'
import { getUserIP } from './useBans'
import { useAdminAuth } from '../contexts/AdminAuthContext'
import { normalizePhoneDigits } from '../utils/validation'

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

const slotRowToAppointment = (row: PublicAppointmentSlotRow): Appointment => ({
  id: row.id,
  customerName: '',
  customerPhone: '',
  service: {
    id: '',
    name: '',
    price: 0,
    duration: row.service_duration || 60,
    icon: '',
    description: '',
  },
  date: row.date,
  time: row.time,
  status: (row.status as Appointment['status']) || 'confirmed',
  createdAt: new Date(row.created_at),
  updatedAt: new Date(row.created_at),
})

// Función para convertir de AppointmentRow (Supabase) a Appointment (app)
const convertToAppointment = (row: AppointmentRow): Appointment => {
  const parsed = parseNotes(row.notes)
  
  // Asegurar que ipAddress se convierta correctamente (null/undefined -> undefined)
  // Convertir null explícitamente a undefined para cumplir con el tipo Appointment
  const ipAddress = row.ip_address ? row.ip_address : undefined;
  
  return {
    id: row.id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    customerEmail: row.customer_email,
    service: {
      id: '',                         // <-- fix: add default id
      name: row.service_name,
      price: row.service_price,
      duration: row.service_duration,
      icon: row.service_icon,
      description: ''                 // <-- fix: add default description
    },
    date: row.date,
    time: row.time,
    status: row.status,
    notes: parsed.cleanNotes,
    additionalCustomerNames: parsed.companions,
    ipAddress: ipAddress,
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
  
  // Asegurar que ip_address sea string, null o undefined (Supabase acepta null)
  const ipAddress = appointment.ipAddress || null;
  
  return {
    id: appointment.id ?? '',   // <-- Añadido para evitar error de tipo
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
    notes: combinedNotes || null as any,
    ip_address: ipAddress as string | null | undefined
  }
}

export const useSupabaseAppointments = () => {
  const { isAdmin } = useAdminAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true)

      if (!isAdmin) {
        const { data, error: rpcError } = await supabase.rpc('get_public_appointment_slots')
        if (rpcError) {
          throw new Error(
            'No se pudieron cargar los horarios. Ejecutá supabase/security_setup.sql en Supabase.'
          )
        }
        setAppointments((data as PublicAppointmentSlotRow[])?.map(slotRowToAppointment) || [])
        setError(null)
        return
      }

      // Admin: acceso completo
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
  }, [isAdmin])

  useEffect(() => {
    loadAppointments()
  }, [loadAppointments])

  useEffect(() => {
    if (!isAdmin) return

    const channel = supabase
      .channel('appointments_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => loadAppointments()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAdmin, loadAppointments])

  // Cargar turnos eliminados (papelera)
  const loadDeletedAppointments = async (): Promise<Appointment[]> => {
    if (!isAdmin) return [];
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
      const userIP = await getUserIP();

      if (!isAdmin) {
        const companions = appointment.additionalCustomerNames || [];
        const { data, error } = await supabase.rpc('create_public_booking', {
          p_customer_name: appointment.customerName,
          p_customer_phone: normalizePhoneDigits(appointment.customerPhone),
          p_service_name: appointment.service.name,
          p_service_price: appointment.service.price,
          p_service_duration: appointment.service.duration,
          p_service_icon: appointment.service.icon,
          p_date: appointment.date,
          p_time: appointment.time,
          p_notes: appointment.notes ?? null,
          p_ip_address: userIP ?? null,
          p_additional_names: companions,
        });

        if (error) {
          const msg = error.message?.includes('bloquead')
            ? error.message
            : 'No se pudo crear el turno. Verificá los datos o contactá a la barbería.';
          throw new Error(msg);
        }

        const row = data as AppointmentRow;
        const newAppointment = convertToAppointment(row);
        await loadAppointments();
        return newAppointment;
      }

      const id = crypto.randomUUID();
      const withId = { ...appointment, id, ipAddress: userIP || undefined };
      const row = convertToRow(withId);

      const insertData = {
        ...row,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('appointments')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      const newAppointment = convertToAppointment(data);
      setAppointments((prev) => [newAppointment, ...prev]);
      return newAppointment;
    } catch (err) {
      console.error('Error adding appointment:', err)
      setError(err instanceof Error ? err.message : 'Error al crear turno')
      throw err
    }
  }

  const updateAppointment = async (id: string, updates: Partial<Appointment>) => {
    if (!isAdmin) throw new Error('No autorizado');
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

  const deleteAppointment = async (id: string, customerPhone?: string) => {
    if (!isAdmin) {
      if (!customerPhone) throw new Error('No autorizado');
      const { error } = await supabase.rpc('cancel_public_booking', {
        p_appointment_id: id,
        p_customer_phone: normalizePhoneDigits(customerPhone),
      });
      if (error) throw new Error(error.message || 'No se pudo cancelar el turno');
      await loadAppointments();
      return;
    }
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
    if (!isAdmin) throw new Error('No autorizado');
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
    if (!isAdmin) throw new Error('No autorizado');
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




