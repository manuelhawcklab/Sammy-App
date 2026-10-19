/* ============ Mapeo de nombres entre el modelo local (camelCase) y
   PostgREST/Supabase (snake_case, columnas en minúsculas) ============ */

type Row = Record<string, unknown>;

const pick = (row: Row, camel: string): unknown => {
  if (row[camel] !== undefined && row[camel] !== null) return row[camel];
  const snake = camel.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
  if (row[snake] !== undefined && row[snake] !== null) return row[snake];
  const lower = camel.toLowerCase();
  return row[lower] ?? null;
};

/** Devuelve una copia del registro sin las claves derivadas de Postgres
 *  (p. ej. `createdat`) que no existen en el modelo TypeScript local. */
export function toLocal<T extends Row>(row: T): T {
  const out: Row = {};
  for (const [k, v] of Object.entries(row)) {
    if (v === null && (k === "parentid" || k === "group" || k === "authorid")) continue;
    if (v !== null && typeof v === "object") {
      // fechas/horas de Postgres → string plano
      out[k] = String(v);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

/** Convierte un registro local (camelCase) a filas PostgREST (snake_case),
 *  conservando también las variantes en minúsculas usadas por el esquema actual. */
export function toRow<T extends Row>(obj: T): Row {
  const row: Row = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    row[k] = v;
    const snake = k.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
    if (snake !== k) {
      row[snake] = v;
      row[k.toLowerCase()] = v;
    }
  }
  return row;
}

export function mapRows<T extends Row>(rows: Row[] | null | undefined): T[] {
  if (!Array.isArray(rows)) return [];
  return rows.map((r) => toLocal(r) as T);
}

export function mapRow<T extends Row>(row: Row | null | undefined): T | null {
  return row ? (toLocal(row) as T) : null;
}

export function mapRowsToDb<T extends Row>(rows: Row[] | null | undefined): T[] {
  return mapRows<T>(rows);
}

export { pick };
