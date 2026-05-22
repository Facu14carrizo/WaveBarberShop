import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Supabase] Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Copiá .env.example a .env'
  )
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

export const getMakeWebhookUrl = (): string | null => {
  const url = import.meta.env.VITE_MAKE_WEBHOOK_URL
  return url && url.startsWith('https://') ? url : null
}

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
  ip_address?: string | null
  created_at: string
  updated_at: string
  deleted_at?: string | null
}

export interface PublicAppointmentSlotRow {
  id: string
  date: string
  time: string
  status: string
  created_at: string
  service_duration: number
}

export interface CustomTimeRangeRow {
  id: string
  day: 'friday' | 'saturday'
  start: string
  end: string
  created_at?: string
}
