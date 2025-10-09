import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
// Reemplaza estas variables con tus credenciales de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'TU_SUPABASE_URL_AQUI'
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'TU_SUPABASE_ANON_KEY_AQUI'

export const supabase = createClient(supabaseUrl, supabaseKey)

// Tipos para TypeScript
export interface AppointmentRow {
  id: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  service_name: string
  service_price: number
  service_duration: number
  service_icon: string
  date: string
  time: string
  status: 'confirmed' | 'completed' | 'cancelled' | 'no-show'
  notes?: string
  created_at: string
  updated_at: string
}
