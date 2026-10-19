import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* ============ Variables de entorno (Vite) ============ */
const rawUrl = (import.meta.env.VITE_SUPABASE_URL ?? "").trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY ?? "").trim();

/** Valores por defecto del proyecto Sammy (solo desarrollo). En producción
 *  estas variables DEBEN configurarse en Vercel → Environment Variables. */
const DEFAULT_URL = "https://pshppwsueqkwzcczfkvu.supabase.co";
const DEFAULT_KEY = "sb_publishable_5-Y3GS2lYZ7i5E5324v5GQ_T0-FgK80";

export const SUPABASE_URL = rawUrl || DEFAULT_URL;
export const SUPABASE_ANON_KEY = rawKey || DEFAULT_KEY;
export const SUPABASE_REST_URL =
  (import.meta.env.VITE_SUPABASE_REST_URL ?? "").trim() || `${SUPABASE_URL}/rest/v1/`;

/** true si se están usando los valores por defecto (no se cargaron .env) */
export const usingDefaults = !rawUrl || !rawKey;

let _error: string | null = null;
if (!/^https?:\/\//.test(SUPABASE_URL)) {
  _error = `VITE_SUPABASE_URL no es una URL válida: "${SUPABASE_URL}"`;
} else if (!SUPABASE_ANON_KEY) {
  _error = "Falta la variable de entorno VITE_SUPABASE_ANON_KEY";
}

/** Estado de configuración — lo consume la UI para mostrar diagnósticos. */
export const supabaseConfigError = _error;

export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  global: { headers: { apikey: SUPABASE_ANON_KEY } },
});

/** Diagnóstico rápido de conectividad contra el REST API de Supabase. */
export async function pingSupabase(): Promise<{ ok: boolean; detail: string }> {
  if (supabaseConfigError) return { ok: false, detail: supabaseConfigError };
  try {
    const res = await fetch(`${SUPABASE_REST_URL.replace(/\/$/, "")}/groups?select=id&limit=1`, {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
    });
    if (res.ok) return { ok: true, detail: "Conexión REST correcta" };
    const body = await res.text();
    let detail = `HTTP ${res.status}`;
    try {
      const j = JSON.parse(body) as { message?: string; code?: string };
      if (j.message) detail += ` — ${j.message}`;
      if (j.code === "PGRST205")
        detail += " (faltan las tablas: ejecuta supabase/schema.sql en el SQL Editor de Supabase)";
    } catch {
      /* respuesta no JSON */
    }
    return { ok: false, detail };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : "No hay acceso a la red o el host es inalcanzable",
    };
  }
}
