import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface DayAvailability {
  friday: boolean;
  saturday: boolean;
}

const STORAGE_KEY = 'wbs_day_availability';

// Leer desde localStorage como fallback
const readLocal = (): DayAvailability => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { friday: true, saturday: true }; // Por defecto ambos activos
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { friday: true, saturday: true };
    return {
      friday: parsed.friday !== false, // true por defecto
      saturday: parsed.saturday !== false // true por defecto
    };
  } catch {
    return { friday: true, saturday: true };
  }
};

// Escribir en localStorage como fallback
const writeLocal = (availability: DayAvailability) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(availability));
  } catch {}
};

export function useDayAvailability() {
  const [availability, setAvailability] = useState<DayAvailability>({ friday: true, saturday: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar desde Supabase (o localStorage como fallback)
  const loadAvailability = async () => {
    try {
      setLoading(true);
      // Intentar cargar desde Supabase ordenado por fecha de creación desc
      const { data: rows, error: supabaseError } = await supabase
        .from('day_availability')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (supabaseError) {
        throw supabaseError;
      }

      if (rows && rows.length > 0) {
        const latest = rows[0];
        const loaded: DayAvailability = {
          friday: latest.friday !== false,
          saturday: latest.saturday !== false
        };
        setAvailability(loaded);
        writeLocal(loaded);
      } else {
        // Si no hay datos en Supabase, usar localStorage
        const local = readLocal();
        setAvailability(local);
        // Intentar crear registro inicial en Supabase
        try {
          await supabase
            .from('day_availability')
            .insert([{ friday: local.friday, saturday: local.saturday }]);
        } catch (insertError) {
          // Si falla, solo usar localStorage
          console.log('No se pudo crear registro en Supabase, usando localStorage');
        }
      }
      setError(null);
    } catch (err) {
      console.error('Error loading day availability:', err);
      // Fallback a localStorage
      const local = readLocal();
      setAvailability(local);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAvailability();
  }, []);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel('day_availability_changes_' + Math.random().toString(36).substring(2, 9))
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'day_availability'
      }, () => {
        loadAvailability();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateDayAvailability = async (day: 'friday' | 'saturday', enabled: boolean) => {
    const newAvailability = { ...availability, [day]: enabled };
    
    // Actualizar estado local inmediatamente
    setAvailability(newAvailability);
    writeLocal(newAvailability);

    try {
      // Obtener todos los registros existentes para actualizar el último y eliminar duplicados
      const { data: rows, error: fetchError } = await supabase
        .from('day_availability')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      if (rows && rows.length > 0) {
        const latestId = rows[0].id;
        // Actualizar registro principal
        const { error: updateError } = await supabase
          .from('day_availability')
          .update({ [day]: enabled, updated_at: new Date().toISOString() })
          .eq('id', latestId);

        if (updateError) throw updateError;

        // Si existen filas duplicadas acumuladas, eliminarlas para mantener la BD limpia
        if (rows.length > 1) {
          const duplicateIds = rows.slice(1).map(r => r.id);
          await supabase
            .from('day_availability')
            .delete()
            .in('id', duplicateIds);
        }
      } else {
        // Crear nuevo registro (primera vez)
        const { error: insertError } = await supabase
          .from('day_availability')
          .insert([{ friday: newAvailability.friday, saturday: newAvailability.saturday }]);

        if (insertError) throw insertError;
      }
      setError(null);
    } catch (err) {
      console.error('Error updating day availability:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar disponibilidad');
      // Revertir a estado anterior en caso de error
      setAvailability(availability);
      writeLocal(availability);
      throw err;
    }
  };

  return {
    availability,
    loading,
    error,
    updateDayAvailability,
    refresh: loadAvailability
  };
}

