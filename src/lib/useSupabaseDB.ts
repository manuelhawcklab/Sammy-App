import { useState, useEffect } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { DBShape } from "./db";
import { loadFromSupabase } from "./db";
import { supabase, isSupabaseConfigured } from "./supabase";

export function useSupabaseDB() {
  const [db, setDb] = useState<DBShape | null>(null);
  const [loading, setLoading] = useState<boolean>(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Sin credenciales configuradas: no intentar conexiones a la nube.
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false);
      return;
    }

    let disposed = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await loadFromSupabase();

        if (disposed) return;

        if (data) {
          setDb(data);
        } else {
          setError("No se pudieron cargar los datos desde Supabase");
          setDb(null);
        }
      } catch (err) {
        console.error("Error al cargar datos de Supabase:", err);
        if (!disposed) {
          setError(err instanceof Error ? err.message : "Error desconocido");
          setDb(null);
        }
      } finally {
        if (!disposed) setLoading(false);
      }
    }

    // Cargar datos iniciales
    loadData();

    // Suscribirse a cambios en tiempo real para cada tabla
    channel = supabase.channel("db-changes");

    const tables = ["groups", "users", "children", "blocks", "materials", "entries"];

    tables.forEach((table) => {
      channel = channel!.on(
        "postgres_changes",
        { event: "*", schema: "public", table },
        (payload: RealtimePostgresChangesPayload<{ [key: string]: unknown }>) => {
          console.log(`Cambio detectado en ${table}:`, payload);
          // Recargar todos los datos cuando hay cambios
          loadData();
        }
      );
    });

    channel.subscribe();

    // Cleanup al desmontar
    return () => {
      disposed = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return { db, loading, error };
}
