import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface BannedItem {
  id: string;
  type: 'ip' | 'phone' | 'email';
  value: string;
  reason?: string;
  banned_at: string;
  banned_by?: string;
}

export interface BannedIP {
  id: string;
  ip_address: string;
  reason?: string;
  banned_at: string;
}

export interface BannedPhone {
  id: string;
  phone: string;
  reason?: string;
  banned_at: string;
}

export interface BannedEmail {
  id: string;
  email: string;
  reason?: string;
  banned_at: string;
}

// Función para obtener la IP del usuario
export const getUserIP = async (): Promise<string | null> => {
  console.log('[getUserIP] Iniciando obtención de IP...');
  try {
    // Intentar obtener IP desde un servicio externo
    console.log('[getUserIP] Intentando con api.ipify.org...');
    const response = await fetch('https://api.ipify.org?format=json', {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const ip = data.ip || null;
    console.log('[getUserIP] ✅ IP obtenida de api.ipify.org:', ip);
    return ip;
  } catch (error) {
    console.warn('[getUserIP] Error con api.ipify.org, intentando fallback...', error);
    // Fallback: intentar con otro servicio
    try {
      console.log('[getUserIP] Intentando con ipapi.co...');
      const response = await fetch('https://ipapi.co/ip/', {
        method: 'GET',
        headers: {
          'Accept': 'text/plain'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const ip = (await response.text()).trim();
      console.log('[getUserIP] ✅ IP obtenida de ipapi.co:', ip);
      return ip || null;
    } catch (fallbackError) {
      console.error('[getUserIP] ❌ Error en fallback de IP:', fallbackError);
      return null;
    }
  }
};

export const useBans = () => {
  const [bannedIPs, setBannedIPs] = useState<BannedIP[]>([]);
  const [bannedPhones, setBannedPhones] = useState<BannedPhone[]>([]);
  const [bannedEmails, setBannedEmails] = useState<BannedEmail[]>([]);
  const [loading, setLoading] = useState(true);

  // Cargar baneos desde Supabase
  const loadBans = async () => {
    try {
      setLoading(true);
      
      // Cargar IPs baneadas desde Supabase
      let supabaseIPs: BannedIP[] = [];
      try {
        const { data: ipData, error: ipError } = await supabase
          .from('banned_ips')
          .select('*')
          .order('banned_at', { ascending: false });

        if (ipError) {
          if (ipError.message?.includes('does not exist') || ipError.code === 'PGRST116') {
            console.log('[useBans] Tabla banned_ips no existe en Supabase, usando solo localStorage');
          } else {
            console.error('[useBans] Error cargando IPs baneadas:', ipError);
          }
        } else {
          supabaseIPs = ipData || [];
          console.log('[useBans] IPs cargadas de Supabase:', supabaseIPs.length);
          
          // Sincronizar localStorage con Supabase (eliminar de localStorage lo que no está en Supabase)
          try {
            localStorage.setItem('banned_ips', JSON.stringify(supabaseIPs));
            console.log('[useBans] localStorage sincronizado con Supabase');
          } catch (syncErr) {
            console.warn('[useBans] Error sincronizando localStorage:', syncErr);
          }
        }
      } catch (supabaseErr) {
        console.warn('[useBans] Error con Supabase, usando localStorage:', supabaseErr);
      }

      // Cargar IPs desde localStorage
      let localIPs: BannedIP[] = [];
      try {
        const localBans = JSON.parse(localStorage.getItem('banned_ips') || '[]');
        localIPs = localBans.map((b: any) => ({
          id: b.id || Math.random().toString(36).substr(2, 9),
          ip_address: b.ip_address,
          reason: b.reason,
          banned_at: b.banned_at
        }));
        console.log('[useBans] IPs cargadas de localStorage:', localIPs.length);
      } catch (localErr) {
        console.error('[useBans] Error cargando localStorage:', localErr);
      }

      // Si hay datos en Supabase, usar solo esos (sincronizar localStorage con Supabase)
      // Si no hay datos en Supabase, usar localStorage como fallback
      let finalIPs: BannedIP[] = [];
      
      if (supabaseIPs.length > 0) {
        // Prioridad a Supabase: usar solo las IPs de Supabase y sincronizar localStorage
        finalIPs = supabaseIPs;
        console.log('[useBans] Usando IPs de Supabase (fuente de verdad)');
      } else {
        // Si no hay datos en Supabase, usar localStorage como fallback
        finalIPs = localIPs;
        console.log('[useBans] Usando IPs de localStorage (fallback)');
      }

      setBannedIPs(finalIPs);
      console.log('[useBans] Total IPs baneadas:', finalIPs.length);

      // Cargar teléfonos baneados (solo para compatibilidad, no se usan en la UI)
      try {
        const { data: phoneData, error: phoneError } = await supabase
          .from('banned_phones')
          .select('*')
          .order('banned_at', { ascending: false });

        if (phoneError && !phoneError.message?.includes('does not exist')) {
          console.error('Error cargando teléfonos baneados:', phoneError);
        } else {
          setBannedPhones(phoneData || []);
        }
      } catch (phoneErr) {
        console.warn('Error cargando teléfonos:', phoneErr);
      }

      // Cargar emails baneados (solo para compatibilidad, no se usan en la UI)
      try {
        const { data: emailData, error: emailError } = await supabase
          .from('banned_emails')
          .select('*')
          .order('banned_at', { ascending: false });

        if (emailError && !emailError.message?.includes('does not exist')) {
          console.error('Error cargando emails baneados:', emailError);
        } else {
          setBannedEmails(emailData || []);
        }
      } catch (emailErr) {
        console.warn('Error cargando emails:', emailErr);
      }
    } catch (err) {
      console.error('Error cargando baneos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBans();
  }, []);

  // Verificar si una IP está baneada
  const isIPBanned = (ip: string): boolean => {
    if (!ip || ip.trim() === '') return false;
    const ipTrimmed = ip.trim();
    
    // Verificar en el estado
    const inState = bannedIPs.some(banned => banned.ip_address === ipTrimmed);
    if (inState) return true;
    
    // Verificar también en localStorage como fallback
    try {
      const localBans = JSON.parse(localStorage.getItem('banned_ips') || '[]');
      const inLocal = localBans.some((b: any) => b.ip_address === ipTrimmed);
      return inLocal;
    } catch {
      return false;
    }
  };

  // Verificar si un teléfono está baneado
  const isPhoneBanned = (phone: string): boolean => {
    // Normalizar teléfono (remover espacios, guiones, etc.)
    const normalized = phone.replace(/\s|-|\(|\)/g, '');
    return bannedPhones.some(banned => {
      const bannedNormalized = banned.phone.replace(/\s|-|\(|\)/g, '');
      return bannedNormalized === normalized;
    });
  };

  // Verificar si un email está baneado
  const isEmailBanned = (email: string): boolean => {
    return bannedEmails.some(banned => banned.email.toLowerCase() === email.toLowerCase());
  };

  // Banear una IP
  const banIP = async (ip: string, reason?: string): Promise<boolean> => {
    console.log('[useBans] banIP llamado con:', { ip, reason });
    
    if (!ip || ip.trim() === '') {
      console.error('[useBans] IP vacía o inválida');
      return false;
    }

    try {
      // Verificar primero si ya está baneada
      const alreadyBanned = isIPBanned(ip);
      if (alreadyBanned) {
        console.log('[useBans] IP ya estaba baneada:', ip);
        return true; // Ya está baneada, consideramos éxito
      }

      const banData = {
        ip_address: ip.trim(),
        reason: reason || 'Turno con datos falsos',
        banned_at: new Date().toISOString()
      };

      // Intentar guardar en Supabase primero
      let savedInSupabase = false;
      try {
        const { data, error } = await supabase
          .from('banned_ips')
          .insert([banData])
          .select()
          .single();

        if (!error && data) {
          console.log('[useBans] IP baneada en Supabase exitosamente:', data);
          savedInSupabase = true;
        } else if (error?.code === '23505') {
          // Error de duplicado - ya está baneada en Supabase
          console.log('[useBans] IP ya estaba baneada en Supabase (duplicado)');
          savedInSupabase = true; // Consideramos éxito
        } else {
          console.warn('[useBans] Error en Supabase, usando localStorage:', error);
        }
      } catch (supabaseError: any) {
        if (supabaseError?.code === '23505') {
          console.log('[useBans] IP ya estaba baneada en Supabase (catch duplicado)');
          savedInSupabase = true;
        } else {
          console.warn('[useBans] Error con Supabase, usando localStorage:', supabaseError);
        }
      }

      // Siempre guardar también en localStorage como backup
      try {
        const localBans = JSON.parse(localStorage.getItem('banned_ips') || '[]');
        const existsInLocal = localBans.some((b: any) => b.ip_address === ip.trim());
        
        if (!existsInLocal) {
          localBans.push({ 
            id: Math.random().toString(36).substr(2, 9),
            ...banData
          });
          localStorage.setItem('banned_ips', JSON.stringify(localBans));
          console.log('[useBans] IP guardada en localStorage');
        } else {
          console.log('[useBans] IP ya estaba en localStorage');
        }
      } catch (localError) {
        console.error('[useBans] Error guardando en localStorage:', localError);
      }

      // Recargar baneos para sincronizar
      await loadBans();
      
      // Sincronizar localStorage con Supabase para que la validación funcione inmediatamente
      try {
        const { data: freshBans } = await supabase.from('banned_ips').select('*');
        if (freshBans) {
          localStorage.setItem('banned_ips', JSON.stringify(freshBans));
          console.log('[useBans] localStorage sincronizado con Supabase:', freshBans.length, 'IPs');
        }
      } catch (syncError) {
        console.warn('[useBans] Error sincronizando localStorage:', syncError);
      }
      
      // Retornar true si se guardó en Supabase o localStorage
      return true;
    } catch (err) {
      console.error('[useBans] Error crítico baneando IP:', err);
      // Intentar guardar en localStorage como último recurso
      try {
        const localBans = JSON.parse(localStorage.getItem('banned_ips') || '[]');
        if (!localBans.some((b: any) => b.ip_address === ip.trim())) {
          localBans.push({ 
            id: Math.random().toString(36).substr(2, 9),
            ip_address: ip.trim(),
            reason: reason || 'Turno con datos falsos',
            banned_at: new Date().toISOString()
          });
          localStorage.setItem('banned_ips', JSON.stringify(localBans));
          await loadBans();
          return true;
        }
      } catch (finalError) {
        console.error('[useBans] Error en fallback final:', finalError);
      }
      return false;
    }
  };

  // Banear un teléfono
  const banPhone = async (phone: string, reason?: string): Promise<boolean> => {
    console.log('[useBans] banPhone llamado con:', { phone, reason });
    try {
      // Verificar primero si ya está baneado
      const normalizedPhone = phone.replace(/\s|-|\(|\)/g, '');
      if (isPhoneBanned(phone)) {
        console.log('[useBans] Teléfono ya estaba baneado');
        return true; // Ya está baneado, consideramos éxito
      }

      // Intentar guardar en Supabase primero
      try {
        const { data, error } = await supabase
          .from('banned_phones')
          .insert([{
            phone: phone,
            reason: reason || 'Turno con datos falsos',
            banned_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (!error && data) {
          console.log('[useBans] Teléfono baneado en Supabase:', data);
          await loadBans();
          return true;
        } else if (error?.code === '23505') {
          // Error de duplicado - ya está baneado en Supabase
          console.log('[useBans] Teléfono ya estaba baneado en Supabase');
          await loadBans(); // Recargar para sincronizar
          return true; // Consideramos éxito
        } else {
          console.warn('[useBans] Error en Supabase, usando localStorage:', error);
        }
      } catch (supabaseError: any) {
        if (supabaseError?.code === '23505') {
          console.log('[useBans] Teléfono ya estaba baneado en Supabase (catch)');
          await loadBans();
          return true;
        }
        console.warn('[useBans] Error con Supabase, usando localStorage:', supabaseError);
      }

      // Fallback a localStorage
      const localBans = JSON.parse(localStorage.getItem('banned_phones') || '[]');
      if (!localBans.some((b: any) => {
        const bNormalized = b.phone?.replace(/\s|-|\(|\)/g, '');
        return bNormalized === normalizedPhone;
      })) {
        localBans.push({ 
          id: Math.random().toString(36).substr(2, 9),
          phone, 
          reason: reason || 'Turno con datos falsos', 
          banned_at: new Date().toISOString() 
        });
        localStorage.setItem('banned_phones', JSON.stringify(localBans));
        console.log('[useBans] Teléfono guardado en localStorage');
        await loadBans();
        return true;
      } else {
        console.log('[useBans] Teléfono ya estaba baneado en localStorage');
        return true;
      }
    } catch (err) {
      console.error('[useBans] Error crítico baneando teléfono:', err);
      return false;
    }
  };

  // Banear un email
  const banEmail = async (email: string, reason?: string): Promise<boolean> => {
    console.log('[useBans] banEmail llamado con:', { email, reason });
    try {
      const emailLower = email.toLowerCase();
      
      // Verificar primero si ya está baneado
      if (isEmailBanned(email)) {
        console.log('[useBans] Email ya estaba baneado');
        return true; // Ya está baneado, consideramos éxito
      }
      
      // Intentar guardar en Supabase primero
      try {
        const { data, error } = await supabase
          .from('banned_emails')
          .insert([{
            email: emailLower,
            reason: reason || 'Turno con datos falsos',
            banned_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (!error && data) {
          console.log('[useBans] Email baneado en Supabase:', data);
          await loadBans();
          return true;
        } else if (error?.code === '23505') {
          // Error de duplicado - ya está baneado en Supabase
          console.log('[useBans] Email ya estaba baneado en Supabase');
          await loadBans(); // Recargar para sincronizar
          return true; // Consideramos éxito
        } else {
          console.warn('[useBans] Error en Supabase, usando localStorage:', error);
        }
      } catch (supabaseError: any) {
        if (supabaseError?.code === '23505') {
          console.log('[useBans] Email ya estaba baneado en Supabase (catch)');
          await loadBans();
          return true;
        }
        console.warn('[useBans] Error con Supabase, usando localStorage:', supabaseError);
      }

      // Fallback a localStorage
      const localBans = JSON.parse(localStorage.getItem('banned_emails') || '[]');
      if (!localBans.some((b: any) => b.email === emailLower)) {
        localBans.push({ 
          id: Math.random().toString(36).substr(2, 9),
          email: emailLower, 
          reason: reason || 'Turno con datos falsos', 
          banned_at: new Date().toISOString() 
        });
        localStorage.setItem('banned_emails', JSON.stringify(localBans));
        console.log('[useBans] Email guardado en localStorage');
        await loadBans();
        return true;
      } else {
        console.log('[useBans] Email ya estaba baneado en localStorage');
        return true;
      }
    } catch (err) {
      console.error('[useBans] Error crítico baneando email:', err);
      return false;
    }
  };

  // Desbanear una IP
  const unbanIP = async (ip: string): Promise<boolean> => {
    console.log('[useBans] unbanIP llamado con:', ip);
    try {
      const ipTrimmed = ip.trim();
      
      // Eliminar de Supabase
      const { error, data } = await supabase
        .from('banned_ips')
        .delete()
        .eq('ip_address', ipTrimmed)
        .select();

      if (error) {
        console.error('[useBans] Error eliminando de Supabase:', error);
      } else {
        console.log('[useBans] IP eliminada de Supabase:', data);
      }

      // SIEMPRE eliminar también de localStorage (tanto si hay error como si no)
      try {
        const localBans = JSON.parse(localStorage.getItem('banned_ips') || '[]');
        const filtered = localBans.filter((b: any) => (b.ip_address || '').trim() !== ipTrimmed);
        localStorage.setItem('banned_ips', JSON.stringify(filtered));
        console.log('[useBans] IP eliminada de localStorage. Quedan:', filtered.length);
      } catch (localError) {
        console.error('[useBans] Error eliminando de localStorage:', localError);
      }

      // Recargar baneos desde Supabase
      await loadBans();
      
      // Sincronizar localStorage con Supabase después de desbanear
      try {
        const { data: freshBans } = await supabase.from('banned_ips').select('*');
        if (freshBans) {
          localStorage.setItem('banned_ips', JSON.stringify(freshBans));
          console.log('[useBans] localStorage sincronizado con Supabase después de desbanear:', freshBans.length);
        }
      } catch (syncError) {
        console.warn('[useBans] Error sincronizando localStorage:', syncError);
      }
      
      return true;
    } catch (err) {
      console.error('[useBans] Error crítico desbaneando IP:', err);
      return false;
    }
  };

  // Desbanear un teléfono
  const unbanPhone = async (phone: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('banned_phones')
        .delete()
        .eq('phone', phone);

      if (error) {
        const localBans = JSON.parse(localStorage.getItem('banned_phones') || '[]');
        const filtered = localBans.filter((b: any) => b.phone !== phone);
        localStorage.setItem('banned_phones', JSON.stringify(filtered));
      }

      await loadBans();
      return true;
    } catch (err) {
      console.error('Error desbaneando teléfono:', err);
      return false;
    }
  };

  // Desbanear un email
  const unbanEmail = async (email: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('banned_emails')
        .delete()
        .eq('email', email.toLowerCase());

      if (error) {
        const localBans = JSON.parse(localStorage.getItem('banned_emails') || '[]');
        const filtered = localBans.filter((b: any) => b.email !== email.toLowerCase());
        localStorage.setItem('banned_emails', JSON.stringify(filtered));
      }

      await loadBans();
      return true;
    } catch (err) {
      console.error('Error desbaneando email:', err);
      return false;
    }
  };


  return {
    bannedIPs,
    bannedPhones,
    bannedEmails,
    loading,
    isIPBanned,
    isPhoneBanned,
    isEmailBanned,
    banIP,
    banPhone,
    banEmail,
    unbanIP,
    unbanPhone,
    unbanEmail,
    refresh: loadBans
  };
};

