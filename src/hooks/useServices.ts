import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Service } from '../types';

// Servicios por defecto (fallback si no hay datos en Supabase)
const defaultServices: Service[] = [
  {
    id: 'classic-cut',
    name: 'Corte Clásico',
    duration: 30,
    price: 10000,
    description: 'Corte tradicional con tijera y máquina. Perfilado de cejas y barba.',
    icon: '✂️'
  },
  {
    id: 'beard-trim',
    name: 'Arreglo de Barba',
    duration: 20,
    price: 5000,
    description: 'Perfilado, reducción de volumen y arreglo de la barba con navaja, máquina y tijera.',
    icon: '🪒 '
  },
  {
    id: 'designs',
    name: 'Corte + Diseño',
    duration: 40,
    price: 12000,
    description: 'Diseño, líneas artísticas en el cabello: figuras, logos y detalles personalizados.',
    icon: '🎨'
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
          icon: row.icon || ''
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

  // Actualizar precio de un servicio
  const updateServicePrice = async (serviceId: string, newPrice: number) => {
    try {
      // Actualizar estado local inmediatamente
      setServices(prevServices =>
        prevServices.map(service =>
          service.id === serviceId ? { ...service, price: newPrice } : service
        )
      );

      // Actualizar en Supabase
      const { error } = await supabase
        .from('services')
        .update({ 
          price: newPrice,
          updated_at: new Date().toISOString()
        })
        .eq('id', serviceId);

      if (error) {
        // Revertir cambio local si falla
        loadServices();
        throw error;
      }

      setError(null);
    } catch (err) {
      console.error('Error updating service price:', err);
      setError(err instanceof Error ? err.message : 'Error al actualizar precio');
      // Recargar servicios para revertir cambios
      loadServices();
      throw err;
    }
  };

  return {
    services,
    loading,
    error,
    updateServicePrice,
    refresh: loadServices
  };
}

