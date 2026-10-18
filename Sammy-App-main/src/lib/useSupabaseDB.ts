import { useState, useEffect } from "react";
import { DBShape } from "./db";
import { loadFromSupabase } from "./db";
import { supabase } from "./supabase";

export function useSupabaseDB() {
  const [db, setDb] = useState<DBShape | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const data = await loadFromSupabase();
        
        if (data) {
          setDb(data);
        } else {
          setError("No se pudieron cargar los datos desde Supabase");
          setDb(null);
        }
      } catch (err) {
        console.error("Error al cargar datos de Supabase:", err);
        setError(err instanceof Error ? err.message : "Error desconocido");
        setDb(null);
      } finally {
        setLoading(false);
      }
    }

    // Cargar datos iniciales
    loadData();

    // Suscribirse a cambios en tiempo real para cada tabla
    channel = supabase.channel("db-changes");

    const tables = ["groups", "users", "children", "blocks", "materials", "entries"];

    tables.forEach((table) => {
      channel.subscribe(
        `${table}:*`,
        (payload) => {
          console.log(`Cambio detectado en ${table}:`, payload);
          // Recargar todos los datos cuando hay cambios
          loadData();
        },
        { event: "*" }
      );
    });

    // Cleanup al desmontar
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return { db, loading, error };
}
