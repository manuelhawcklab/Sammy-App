import type { PostgrestError } from "@supabase/supabase-js";
import { supabase, isSupabaseConfigured } from "./supabase";

/**
 * Error estricto de sincronización con la nube (Supabase).
 * Se lanza SIEMPRE que una operación contra Supabase falla: así la UI
 * puede mostrar el mensaje real y revertir cualquier cambio optimista.
 */
export class CloudSyncError extends Error {
  code: string;
  constructor(message: string, code = "cloud_error") {
    super(message);
    this.name = "CloudSyncError";
    this.code = code;
  }
}

/** Traduce errores de PostgREST/Supabase a mensajes claros para el usuario. */
function toFriendlyMessage(err: PostgrestError): string {
  // PostgREST suele incluir table/column dentro de `details` o `hint`
  const extra = `${err.details ?? ""} ${err.hint ?? ""}`;
  const tableMatch = extra.match(/table[^\w]*([\w-]+)/i);
  const columnMatch = extra.match(/column[^\w]*([\w-]+)/i);
  const table = tableMatch?.[1] ?? "la tabla";
  const column = columnMatch?.[1];

  // 42501 / PGRST301 => Row Level Security denegando la operación
  if (err.code === "42501" || err.code === "PGRST301" || err.message.toLowerCase().includes("row-level security")) {
    return `Seguridad de datos (RLS) denegó la operación en "${table}". Aplica las políticas SQL en Supabase (SQL Editor → ejecutar policies.sql).`;
  }
  // 42P01 => tabla inexistente
  if (err.code === "42P01") {
    return `La tabla "${table}" no existe en Supabase. Ejecuta el SQL de esquema en SQL Editor.`;
  }
  // 23505 => violación de clave única
  if (err.code === "23505") {
    return "Ya existe un registro con esos datos (correo duplicado u otra clave única).";
  }
  // 22P02 / 42804 / PGRST204 => tipos/columnas inválidas
  if (err.code === "22P02" || err.code === "42804" || err.code === "PGRST204") {
    return `El formato de los datos no coincide con el esquema de la tabla${column ? ` (columna: ${column})` : ""}: ${err.message}`;
  }
  return err.message || "No se pudo sincronizar con la nube.";
}

/**
 * Escribe (upsert) UNA fila en la tabla indicada de Supabase.
 * - Si Supabase no está configurado: no hace nada (modo local offline).
 * - Si la operación falla: LANZA CloudSyncError (nunca silencia el error).
 *   El llamador debe revertir el estado local y mostrar el mensaje al usuario.
 */
export async function upsertRow(table: string, row: Record<string, unknown>): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return; // modo local sin nube configurada

  const { error } = await supabase.from(table).upsert(row, { onConflict: "id" });
  if (error) {
    throw new CloudSyncError(toFriendlyMessage(error), error.code);
  }
}

/** Upsert de muchas filas en un solo viaje. Lanza CloudSyncError si algo falla. */
export async function upsertRows(table: string, rows: Record<string, unknown>[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase || rows.length === 0) return;
  const { error } = await supabase.from(table).upsert(rows as object[], { onConflict: "id" });
  if (error) {
    throw new CloudSyncError(toFriendlyMessage(error), error.code);
  }
}

/** Elimina una fila por id. Lanza CloudSyncError si la nube rechaza la operación. */
export async function deleteRow(table: string, id: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) {
    throw new CloudSyncError(toFriendlyMessage(error), error.code);
  }
}
