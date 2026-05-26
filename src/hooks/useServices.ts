import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Service } from '../types';

// Servicios por defecto (fallback si no hay datos en Supabase)
const defaultServices: Service[] = [
  {
    id: 'classic-cut',
    name: 'Corte Clásico',
    duration: 30,
    price: 14000,
    description: 'Corte con tijera y maquina tradicional, fade, etc.\n(incluye perfilado de barba y cejas).',
    icon: '✂️'
  },
  {
    id: 'beard-trim',
    name: 'Arreglo de Barba',
    duration: 20,
    price: 8000,
    description: 'Perfilado, reducción de volumen y arreglo de la barba con navaja, máquina y tijera. (Exclusivo para barba, no incluye corte de cabello)',
    icon: '🪒 '
  },
  {
    id: 'designs',
    name: 'Corte + Diseño',
    duration: 40,
    price: 15000,
    description: 'Diseño, líneas artísticas en el cabello: figuras, logos y detalles personalizados.',
    icon: '🎨',
    isActive: true
  }
];

export function useServices() {
  const [services, setServices] = useState<Service[]>(defaultServices);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cargar servicios desde Supabase
  const loadServices = async () => {
    try {
      setLoading(true);
      const { data, error: supabaseError } = await supabase
        .from('services')
        .select('*')
        .order('order_index', { ascending: true, nullsFirst: false });

      if (supabaseError) {
        // Si la tabla no existe, usar servicios por defecto
        if (supabaseError.code === 'PGRST116' || supabaseError.message?.includes('does not exist')) {
          console.log('Tabla services no existe en Supabase, usando servicios por defecto');
          setServices(defaultServices);
          setError(null);
          return;
        }
        throw supabaseError;
      }

      if (data && data.length > 0) {
        // Convertir datos de Supabase a formato Service (ya vienen ordenados por order_index)
        const loadedServices: Service[] = data.map((row: any) => ({
          id: row.id,
          name: row.name,
          duration: row.duration,
          price: row.price,
          description: row.description || '',
          icon: row.icon || '',
          isActive: row.is_active !== false // Por defecto true si es null
        }));
        setServices(loadedServices);
      } else {
        // Si no hay datos, usar servicios por defecto e insertarlos
        setServices(defaultServices);
        try {
          await supabase
            .from('services')
            .insert(defaultServices.map((s, index) => ({
              id: s.id,
              name: s.name,
              duration: s.duration,
              price: s.price,
              description: s.description,
              icon: s.icon,
              is_active: true,
              order_index: index + 1
            })));
        } catch (insertError) {
          console.log('No se pudieron insertar servicios por defecto en Supabase');
        }
      }
      setError(null);
    } catch (err) {
      console.error('Error loading services:', err);
      setServices(defaultServices);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  // Suscribirse a cambios en tiempo real
  useEffect(() => {
    const channel = supabase
      .channel('services_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'services'
      }, () => {
        loadServices();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Actualizar datos de un servicio
  const updateService = async (serviceId: string, updates: Partial<Service>) => {
    try {
      console.log('[useServices] Actualizando servicio:', serviceId, updates);
      
      // Actualizar estado local inmediatamente para responsividad
      setServices(prevServices =>
        prevServices.map(service =>
          service.id === serviceId ? { ...service, ...updates } : service
        )
      );

      // Construir el payload de actualización dinámicamente
      // Esto evita enviar columnas que podrían no existir en la base de datos antigua
      const payload: any = {
        updated_at: new Date().toISOString()
      };
      
      if (updates.name !== undefined) payload.name = updates.name;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.price !== undefined) payload.price = updates.price;
      if (updates.duration !== undefined) payload.duration = updates.duration;
      if (updates.icon !== undefined) payload.icon = updates.icon;
      if (updates.isActive !== undefined) payload.is_active = updates.isActive;

      console.log('[useServices] Payload enviado a Supabase:', payload);

      // Actualizar en Supabase
      const { error } = await supabase
        .from('services')
        .update(payload)
        .eq('id', serviceId);

      if (error) {
        console.error('[useServices] Error de Supabase:', error);
        // Revertir cambio local si falla
        loadServices();
        throw error;
      }

      setError(null);
    } catch (err) {
      console.error('Error updating service:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar servicio');
      // Recargar servicios para revertir cambios
      loadServices();
      throw err;
    }
  };

  // Crear un nuevo servicio
  const createService = async (newService: Omit<Service, 'id'>) => {
    try {
      const id = newService.name.toLowerCase().replace(/\s+/g, '-');
      
      const { data, error } = await supabase
        .from('services')
        .insert([{
          id,
          name: newService.name,
          description: newService.description,
          price: newService.price,
          icon: newService.icon,
          duration: newService.duration || 30,
          is_active: true,
          order_index: services.length + 1
        }])
        .select();

      if (error) throw error;
      
      await loadServices();
      return data?.[0];
    } catch (err) {
      console.error('Error creating service:', err);
      throw err;
    }
  };

  return {
    services,
    loading,
    error,
    updateService,
    createService,
    refresh: loadServices
  };
}

