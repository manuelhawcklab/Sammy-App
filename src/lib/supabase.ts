import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Indica si la plataforma está configurada con un proyecto de Supabase.
 * Cuando faltan las credenciales, la app funciona en modo local
 * (datos persistidos en el dispositivo) sin lanzar errores fatales.
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Cliente de Supabase o `null` si aún no se ha configurado el proyecto.
 * Toda la app debe verificar `isSupabaseConfigured` / `supabase !== null`
 * antes de intentar operaciones en la nube.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;
