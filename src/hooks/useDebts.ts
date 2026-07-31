import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Debt {
  id: string;
  appointmentId?: string;
  customerName: string;
  customerPhone?: string;
  amount: number;
  notes?: string;
  date: string;
  isPaid: boolean;
  paidAt?: string;
  createdAt: string;
}

const LOCAL_STORAGE_KEY = 'wavebarber_pending_payments';

const readLocalDebts = (): Debt[] => {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    console.error('[useDebts] Error leyendo de local storage:', e);
    return [];
  }
};

const writeLocalDebts = (debts: Debt[]) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(debts));
  } catch (e) {
    console.error('[useDebts] Error guardando en local storage:', e);
  }
};

// Convierte un registro de Supabase (snake_case) a nuestro objeto Debt (camelCase)
const mapRowToDebt = (row: any): Debt => ({
  id: row.id,
  appointmentId: row.appointment_id || undefined,
  customerName: row.customer_name,
  customerPhone: row.customer_phone || undefined,
  amount: Number(row.amount),
  notes: row.notes || undefined,
  date: row.date,
  isPaid: Boolean(row.is_paid),
  paidAt: row.paid_at || undefined,
  createdAt: row.created_at || new Date().toISOString()
});

export function useDebts() {
  const [debts, setDebts] = useState<Debt[]>(() => readLocalDebts());
  const [loading, setLoading] = useState(true);

  const loadDebts = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('debts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        // Si la tabla no existe en Supabase (error PGRST204/PGRST116 o 42P01), usamos localStorage
        console.warn('[useDebts] Supabase no disponible o tabla no existe, usando localStorage:', error.message);
        const local = readLocalDebts();
        setDebts(local);
        return;
      }

      if (data) {
        const mapped = data.map(mapRowToDebt);
        setDebts(mapped);
        writeLocalDebts(mapped);
      }
    } catch (err) {
      console.error('[useDebts] Error cargando deudas:', err);
      const local = readLocalDebts();
      setDebts(local);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDebts();
  }, [loadDebts]);

  // Suscripción en tiempo real a Supabase
  useEffect(() => {
    const channel = supabase
      .channel('debts_changes_' + Math.random().toString(36).substring(2, 9))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'debts' },
        () => {
          loadDebts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadDebts]);

  const addDebt = async (debtData: Omit<Debt, 'id' | 'createdAt' | 'isPaid'> & { isPaid?: boolean }) => {
    const newDebt: Debt = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
      appointmentId: debtData.appointmentId,
      customerName: debtData.customerName,
      customerPhone: debtData.customerPhone,
      amount: debtData.amount,
      notes: debtData.notes,
      date: debtData.date,
      isPaid: debtData.isPaid ?? false,
      createdAt: new Date().toISOString()
    };

    // Actualizar inmediatamente estado local y localStorage (Optimistic UI)
    const updatedLocal = [newDebt, ...readLocalDebts()];
    setDebts(updatedLocal);
    writeLocalDebts(updatedLocal);

    // Intentar guardar en Supabase
    try {
      const { data, error } = await supabase
        .from('debts')
        .insert([{
          id: newDebt.id,
          appointment_id: newDebt.appointmentId || null,
          customer_name: newDebt.customerName,
          customer_phone: newDebt.customerPhone || null,
          amount: newDebt.amount,
          notes: newDebt.notes || null,
          date: newDebt.date,
          is_paid: newDebt.isPaid,
          created_at: newDebt.createdAt
        }])
        .select()
        .single();

      if (error) {
        console.warn('[useDebts] Guardado localmente. Supabase devolvió error:', error.message);
      } else if (data) {
        // Actualizar id si Supabase generó uno distinto
        const supabaseDebt = mapRowToDebt(data);
        setDebts(prev => prev.map(d => d.id === newDebt.id ? supabaseDebt : d));
      }
    } catch (err) {
      console.warn('[useDebts] No se pudo guardar en Supabase, guardado en localStorage:', err);
    }

    return true;
  };

  const markAsPaid = async (id: string) => {
    const paidAt = new Date().toISOString();
    
    // Actualizar local
    const updatedLocal = readLocalDebts().map(d => d.id === id ? { ...d, isPaid: true, paidAt } : d);
    setDebts(updatedLocal);
    writeLocalDebts(updatedLocal);

    try {
      await supabase
        .from('debts')
        .update({ is_paid: true, paid_at: paidAt })
        .eq('id', id);
    } catch (err) {
      console.warn('[useDebts] Error actualizando en Supabase:', err);
    }

    return true;
  };

  const markAsPending = async (id: string) => {
    // Actualizar local
    const updatedLocal = readLocalDebts().map(d => d.id === id ? { ...d, isPaid: false, paidAt: undefined } : d);
    setDebts(updatedLocal);
    writeLocalDebts(updatedLocal);

    try {
      await supabase
        .from('debts')
        .update({ is_paid: false, paid_at: null })
        .eq('id', id);
    } catch (err) {
      console.warn('[useDebts] Error actualizando en Supabase:', err);
    }

    return true;
  };

  const deleteDebt = async (id: string) => {
    // Actualizar local
    const updatedLocal = readLocalDebts().filter(d => d.id !== id);
    setDebts(updatedLocal);
    writeLocalDebts(updatedLocal);

    try {
      await supabase
        .from('debts')
        .delete()
        .eq('id', id);
    } catch (err) {
      console.warn('[useDebts] Error eliminando en Supabase:', err);
    }

    return true;
  };

  const importDebts = async (importedList: any[]) => {
    if (!Array.isArray(importedList)) return false;

    const formattedList: Debt[] = importedList.map(item => ({
      id: item.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11)),
      appointmentId: item.appointmentId || item.appointment_id || undefined,
      customerName: item.customerName || item.customer_name || 'Cliente sin nombre',
      customerPhone: item.customerPhone || item.customer_phone || undefined,
      amount: Number(item.amount) || 0,
      notes: item.notes || undefined,
      date: item.date || new Date().toISOString().split('T')[0],
      isPaid: Boolean(item.isPaid ?? item.is_paid),
      paidAt: item.paidAt || item.paid_at || undefined,
      createdAt: item.createdAt || item.created_at || new Date().toISOString()
    }));

    setDebts(formattedList);
    writeLocalDebts(formattedList);

    // Intentar sincronizar todos a Supabase
    try {
      const rows = formattedList.map(d => ({
        id: d.id,
        appointment_id: d.appointmentId || null,
        customer_name: d.customerName,
        customer_phone: d.customerPhone || null,
        amount: d.amount,
        notes: d.notes || null,
        date: d.date,
        is_paid: d.isPaid,
        paid_at: d.paidAt || null,
        created_at: d.createdAt
      }));

      await supabase.from('debts').upsert(rows);
    } catch (err) {
      console.warn('[useDebts] Error importando a Supabase:', err);
    }

    return true;
  };

  return {
    debts,
    loading,
    addDebt,
    markAsPaid,
    markAsPending,
    deleteDebt,
    importDebts,
    refreshDebts: loadDebts
  };
}
