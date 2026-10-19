import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel, RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { loadFromSupabase, type DBShape } from "./db";
import { supabaseConfigError } from "./supabase";
import { supabase } from "./supabase";

const TABLES = ["groups", "users", "children", "blocks", "materials", "entries"] as const;

export interface SupabaseStatus {
  connected: boolean;
  checkedAt: number | null;
  detail: string;
}

/**
 * Hook de estado de conexión con Supabase.
 * - Carga los datos en la nube al montar (y con `reload`).
 * - Se suscribe a cambios en tiempo real (postgres_changes) por tabla.
 * - No bloquea la app: si Supabase falla, la app sigue funcionando
 *   con el store local (localStorage) y solo muestra el banner de estado.
 */
export function useSupabaseDB() {
  const [db, setDb] = useState<DBShape | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      if (supabaseConfigError) {
        setError(supabaseConfigError);
        setDb(null);
        return;
      }
      const result = await loadFromSupabase();

      if (result.ok && result.data) {
        setDb(result.data);
      } else {
        setError(result.error ?? "No se pudieron cargar los datos desde Supabase");
        setDb(null);
      }
    } catch (err) {
      console.error("Error al cargar datos de Supabase:", err);
      setError(err instanceof Error ? err.message : "Error desconocido");
      setDb(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Carga inicial
    void loadData();

    // Rebote (debounce) para no recargar ante ráfagas de eventos
    const scheduleReload = () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => void loadData(), 500);
    };

    // Canal único de tiempo real para todas las tablas
    let channel: RealtimeChannel = supabase.channel("db-changes");

    TABLES.forEach((table) => {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload: RealtimePostgresChangesPayload<{ id?: string }>) => {
          console.log(`Cambio detectado en ${table}:`, payload.eventType);
          scheduleReload();
        }
      );
    });

    channel.subscribe();

    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  return { db, loading, error, reload: loadData };
}
