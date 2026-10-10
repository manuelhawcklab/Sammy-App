import { useSyncExternalStore } from "react";
import { differenceInMonths, differenceInYears, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase, isSupabaseConfigured } from "./supabase";
import { upsertRow, upsertRows, deleteRow } from "./cloud";

/* ============ Tipos ============ */
export type Role = "parent" | "educator" | "admin";
export type Area =
  | "Lenguaje"
  | "Motricidad fina"
  | "Motricidad gruesa"
  | "Socioemocional"
  | "Lógica"
  | "Arte";
export type BlockKind =
  | "bienvenida"
  | "clase"
  | "taller"
  | "juego"
  | "comida"
  | "siesta"
  | "salida";
export type MaterialCategory = "Guías" | "Fichas" | "Canciones" | "Videos" | "Actividades";

export interface Group {
  id: string;
  name: string;
  emoji: string;
  ages: string;
}
export interface User {
  id: string;
  role: Role;
  name: string;
  email: string;
  pass: string;
  group?: string;
  color: string;
  createdAt: string;
}
export interface Child {
  id: string;
  parentId: string | null;
  name: string;
  birth: string;
  group: string;
  emoji: string;
  color: string;
  allergies: string[];
  notes: string;
  authorized: string;
  createdAt: string;
}
export interface Block {
  id: string;
  group: string;
  day: number; // 1 = Lunes … 5 = Viernes
  start: string;
  end: string;
  title: string;
  kind: BlockKind;
}
export interface Material {
  id: string;
  authorId: string;
  title: string;
  desc: string;
  category: MaterialCategory;
  scope: string; // grupo o "all"
  fileName?: string;
  size?: number;
  dataUrl?: string;
  url?: string;
  downloads: number;
  createdAt: string;
}
export interface Entry {
  id: string;
  childId: string;
  authorId: string;
  area: Area;
  stars: number; // 1..5
  note: string;
  date: string;
}
export interface DBShape {
  v: number;
  groups: Group[];
  users: User[];
  children: Child[];
  blocks: Block[];
  materials: Material[];
  entries: Entry[];
  session: string | null;
}

/* ============ Constantes ============ */
export const DEFAULT_GROUPS: Group[] = [
  { id: "abejitas", name: "Sala Abejitas", emoji: "🐝", ages: "3–4 años" },
  { id: "colibries", name: "Sala Colibríes", emoji: "🐦", ages: "2–3 años" },
  { id: "buhos", name: "Sala Búhos", emoji: "🦉", ages: "4–5 años" },
];
export const allGroups = (): Group[] => db.groups;
export const groupById = (id?: string): Group | undefined =>
  id ? db.groups.find((g) => g.id === id) : undefined;

export const AREAS: Area[] = [
  "Lenguaje",
  "Motricidad fina",
  "Motricidad gruesa",
  "Socioemocional",
  "Lógica",
  "Arte",
];
export const AREA_COLORS: Record<Area, string> = {
  Lenguaje: "#12A59B",
  "Motricidad fina": "#F2789F",
  "Motricidad gruesa": "#F59E4B",
  Socioemocional: "#58B8E8",
  Lógica: "#7DC95E",
  Arte: "#FF6F61",
};
export const KIND_META: Record<BlockKind, { label: string; color: string }> = {
  bienvenida: { label: "Bienvenida", color: "#58B8E8" },
  clase: { label: "Clase", color: "#12A59B" },
  taller: { label: "Taller", color: "#F2789F" },
  juego: { label: "Juego", color: "#7DC95E" },
  comida: { label: "Comida", color: "#FFC24B" },
  siesta: { label: "Descanso", color: "#9AD6CC" },
  salida: { label: "Salida", color: "#FF6F61" },
};
export const BLOCK_KINDS: BlockKind[] = [
  "bienvenida",
  "clase",
  "taller",
  "juego",
  "comida",
  "siesta",
  "salida",
];
export const CATEGORIES: MaterialCategory[] = [
  "Guías",
  "Fichas",
  "Canciones",
  "Videos",
  "Actividades",
];
export const DAYS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];
export const AVATAR_EMOJIS = ["🦖", "🐰", "🦊", "🐼", "🐸", "🦁", "🐙", "🦄", "🐢", "🐝", "🐳", "🦋"];
export const AVATAR_COLORS = [
  "#12A59B",
  "#FFC24B",
  "#FF6F61",
  "#58B8E8",
  "#7DC95E",
  "#F2789F",
  "#F59E4B",
  "#62D9C8",
];

/* ============ Store (localStorage) ============ */
const KEY = "sammy_db_v4";

export const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

/**
 * Estado inicial de la plataforma: completamente vacío.
 * Ya no existen datos de demostración; toda la información
 * (usuarios, niños, horarios, materiales y avances) se crea desde la app.
 */
function emptyDB(): DBShape {
  return {
    v: 4,
    groups: DEFAULT_GROUPS.map((g) => ({ ...g })),
    users: [],
    children: [],
    blocks: [],
    materials: [],
    entries: [],
    session: null,
  };
}

function load(): DBShape {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DBShape;
      if (parsed && parsed.v === 4 && Array.isArray(parsed.users)) {
        // Migración: se eliminan los antiguos datos de demostración.
        const demoIds = new Set([
          "u-admin", "u-val", "u-marcos", "u-caro", "u-andres",
          "c-lucas", "c-emma", "c-bruno",
          "m1", "m2", "m3", "m4", "m5", "m6",
        ]);
        const hadDemo =
          parsed.users.some((u) => demoIds.has(u.id)) ||
          parsed.children.some((c) => demoIds.has(c.id)) ||
          parsed.materials.some((m) => demoIds.has(m.id));
        if (hadDemo) {
          parsed.users = parsed.users.filter(
            (u) => !demoIds.has(u.id) && !/@sammy\.app$/i.test(u.email)
          );
          parsed.children = parsed.children.filter((c) => !demoIds.has(c.id));
          parsed.materials = parsed.materials.filter((m) => !demoIds.has(m.id));
          const childIds = new Set(parsed.children.map((c) => c.id));
          const userIds = new Set(parsed.users.map((u) => u.id));
          parsed.entries = (parsed.entries ?? []).filter(
            (e) => childIds.has(e.childId) && userIds.has(e.authorId)
          );
          parsed.blocks = [];
          if (parsed.session && !userIds.has(parsed.session)) parsed.session = null;
          parsed.groups =
            Array.isArray(parsed.groups) && parsed.groups.length > 0
              ? parsed.groups
              : DEFAULT_GROUPS.map((g) => ({ ...g }));
          persist(parsed);
          return parsed;
        }
        if (!Array.isArray(parsed.groups) || parsed.groups.length === 0)
          parsed.groups = DEFAULT_GROUPS.map((g) => ({ ...g }));
        parsed.entries = parsed.entries ?? [];
        parsed.blocks = parsed.blocks ?? [];
        parsed.materials = parsed.materials ?? [];
        return parsed;
      }
    }
  } catch {
    /* datos corruptos → reiniciar */
  }
  const fresh = emptyDB();
  try {
    localStorage.setItem(KEY, JSON.stringify(fresh));
  } catch {
    /* sin persistencia disponible */
  }
  return fresh;
}

function persist(state?: DBShape): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state ?? db));
  } catch {
    if (state) throw new Error("No hay espacio suficiente en este dispositivo para guardar.");
  }
}

let db: DBShape = load();
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());

export function mutate(fn: (d: DBShape) => void) {
  const next = JSON.parse(JSON.stringify(db)) as DBShape;
  fn(next);
  db = next;
  persist();
  emit();
}

/** Captura una foto del estado actual (para poder revertir cambios optimistas). */
const snapshot = (): DBShape => JSON.parse(JSON.stringify(db)) as DBShape;

/** Restaura un estado previo y notifica a los suscriptores. */
function restore(prev: DBShape): void {
  db = prev;
  persist();
  emit();
}

type TableName = "groups" | "users" | "children" | "blocks" | "materials" | "entries";

/**
 * MUTACIÓN CON SINCRONIZACIÓN ESTRICTA A LA NUBE (write-through).
 *
 * 1. Captura un snapshot del estado local.
 * 2. Aplica el cambio local (UI optimista) y hace `await` del upsert en
 *    Supabase evaluando el objeto `error` (nunca lo silencia).
 * 3. Si la nube rechaza la operación → REVIERTE el estado local y
 *    relanza el error para que la UI muestre el mensaje real al usuario.
 */
export async function syncMutate(
  table: TableName,
  applyLocal: (d: DBShape) => void,
  cloudRow: Record<string, unknown>,
): Promise<void> {
  const prev = snapshot();
  mutate(applyLocal);
  try {
    await upsertRow(table, cloudRow);
  } catch (err) {
    restore(prev); // rollback: la UI vuelve al estado anterior real
    throw err;
  }
}

/**
 * Eliminación con confirmación en la nube: primero se envía el DELETE a
 * Supabase; si la nube lo rechaza (RLS, red, etc.) se lanza el error y
 * nada cambia en el estado local. Solo tras la confirmación se borra local.
 */
export async function deleteRecord(
  table: TableName,
  id: string,
  applyLocal: (d: DBShape) => void,
): Promise<void> {
  await deleteRow(table, id); // lanza CloudSyncError si la nube lo rechaza
  mutate(applyLocal); // solo ahora aplicamos el borrado local
}

export function useDB(): DBShape {
  return useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => {
        subs.delete(f);
      };
    },
    () => db
  );
}

/* ============ Auth ============ */

/**
 * Registro estricto: primero confirma la cuenta en Supabase (await + error
 * evaluado) y SOLO DESPUÉS actualiza el estado local. Si la nube falla,
 * se lanza el error y la UI no muestra éxito ni cambia el estado.
 */
export async function register(data: { role: Role; name: string; email: string; pass: string; group?: string }): Promise<User> {
  const email = data.email.trim().toLowerCase();
  if (db.users.some((u) => u.email === email))
    throw new Error("Ya existe una cuenta con ese correo. Intenta iniciar sesión.");
  const user: User = {
    id: uid(),
    role: data.role,
    name: data.name.trim(),
    email,
    pass: data.pass,
    group: data.role === "educator" ? data.group : undefined,
    color: AVATAR_COLORS[db.users.length % AVATAR_COLORS.length],
    createdAt: new Date().toISOString(),
  };
  // 1) Escritura confirmada en la nube (lanza CloudSyncError si falla).
  await upsertRow("users", user as unknown as Record<string, unknown>);
  // 2) Solo entonces actualizamos el estado local.
  mutate((d) => {
    d.users.push(user);
    d.session = user.id;
  });
  return user;
}

/**
 * Inicio de sesión estricto: valida credenciales contra Supabase cuando está
 * configurado; cualquier error de consulta se propaga (no se silencia).
 */
export async function login(email: string, pass: string): Promise<User> {
  const normalized = email.trim().toLowerCase();
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", normalized)
      .maybeSingle();
    if (error) {
      throw new Error(`No se pudo verificar tu cuenta en la nube (${error.code}): ${error.message}`);
    }
    if (!data || (data as User).pass !== pass) {
      throw new Error("Correo o contraseña incorrectos.");
    }
    const user = data as User;
    mutate((d) => {
      const idx = d.users.findIndex((u) => u.id === user.id);
      if (idx >= 0) d.users[idx] = user;
      else d.users.push(user);
      d.session = user.id;
    });
    return user;
  }
  // Modo local sin nube configurada: validación contra el almacenamiento del dispositivo.
  const u = db.users.find((x) => x.email === normalized && x.pass === pass);
  if (!u) throw new Error("Correo o contraseña incorrectos.");
  mutate((d) => {
    d.session = u.id;
  });
  return u;
}

/**
 * Registro estricto de acceso directo (helper para componentes):
 * SIEMPRE confirma primero en la nube y solo después abre sesión local.
 */
export async function registerAndLogin(data: {
  role: Role;
  name: string;
  email: string;
  pass: string;
  group?: string;
}): Promise<User> {
  return register(data);
}

export const logout = () => mutate((d) => void (d.session = null));
export const currentUser = (d: DBShape): User | null =>
  d.users.find((u) => u.id === d.session) ?? null;

/* ============ Aulas ============ */
export async function addGroup(input: { name: string; emoji: string; ages: string }): Promise<Group> {
  const g: Group = { ...input, id: uid() };
  await syncMutate("groups", (d) => d.groups.push(g), g as unknown as Record<string, unknown>);
  return g;
}
export async function updateGroup(id: string, patch: Partial<Omit<Group, "id">>) {
  const current = db.groups.find((x) => x.id === id);
  if (!current) throw new Error("No se encontró el aula.");
  const next: Group = { ...current, ...patch };
  await syncMutate(
    "groups",
    (d) => {
      const g = d.groups.find((x) => x.id === id);
      if (g) Object.assign(g, patch);
    },
    next as unknown as Record<string, unknown>,
  );
}
export async function deleteGroup(id: string) {
  const kids = db.children.filter((c) => c.group === id).length;
  const educators = db.users.filter((u) => u.role === "educator" && u.group === id).length;
  if (kids > 0 || educators > 0)
    throw new Error("Primero reasigna a los niños y educadores de esta aula desde Personas.");
  // Primero confirmamos en la nube; si falla, nada cambia en local.
  await deleteRow("groups", id);
  const removedBlocks = db.blocks.filter((b) => b.group === id).map((b) => b.id);
  const removedMaterials = db.materials.filter((m) => m.scope === id).map((m) => m.id);
  for (const bid of removedBlocks) await deleteRow("blocks", bid);
  for (const mid of removedMaterials) await deleteRow("materials", mid);
  mutate((d) => {
    d.groups = d.groups.filter((g) => g.id !== id);
    d.blocks = d.blocks.filter((b) => b.group !== id);
    d.materials = d.materials.filter((m) => m.scope !== id);
  });
}

/* ============ Usuarios (admin) ============ */
export async function adminCreateUser(data: { role: Role; name: string; email: string; pass: string; group?: string }): Promise<User> {
  const email = data.email.trim().toLowerCase();
  if (db.users.some((u) => u.email === email))
    throw new Error("Ya existe una cuenta con ese correo.");
  const user: User = {
    id: uid(),
    role: data.role,
    name: data.name.trim(),
    email,
    pass: data.pass,
    group: data.role === "educator" ? data.group : undefined,
    color: AVATAR_COLORS[db.users.length % AVATAR_COLORS.length],
    createdAt: new Date().toISOString(),
  };
  await syncMutate("users", (d) => d.users.push(user), user as unknown as Record<string, unknown>);
  return user;
}

export async function updateUser(id: string, patch: Partial<User>): Promise<User> {
  if (patch.email) {
    const email = patch.email.trim().toLowerCase();
    if (db.users.some((u) => u.id !== id && u.email === email))
      throw new Error("Ya existe otra cuenta con ese correo.");
    patch = { ...patch, email };
  }
  const current = db.users.find((x) => x.id === id);
  if (!current) throw new Error("No se encontró la cuenta de usuario.");
  const next: User = { ...current, ...patch };
  await syncMutate(
    "users",
    (d) => {
      const u = d.users.find((x) => x.id === id);
      if (u) Object.assign(u, patch);
    },
    next as unknown as Record<string, unknown>,
  );
  return db.users.find((u) => u.id === id)!;
}

export async function deleteUser(id: string) {
  const target = db.users.find((u) => u.id === id);
  if (!target) return;
  if (id === db.session) throw new Error("No puedes eliminar la cuenta con la que estás en sesión.");
  if (target.role === "admin" && db.users.filter((u) => u.role === "admin").length <= 1)
    throw new Error("Debe existir al menos una cuenta de dirección.");
  await deleteRow("users", id);
  mutate((d) => {
    d.users = d.users.filter((u) => u.id !== id);
    d.children.forEach((c) => {
      if (c.parentId === id) c.parentId = null;
    });
  });
}

/* ============ Niños ============ */
export type ChildInput = Omit<Child, "id" | "createdAt"> & { id?: string };
export async function saveChild(input: ChildInput): Promise<Child> {
  const existing = input.id ? db.children.find((c) => c.id === input.id) : undefined;
  if (existing) {
    const next: Child = { ...existing, ...input };
    await syncMutate(
      "children",
      (d) => {
        const c = d.children.find((x) => x.id === input.id);
        if (c) Object.assign(c, input);
      },
      next as unknown as Record<string, unknown>,
    );
    return next;
  }
  const child: Child = { ...input, id: uid(), createdAt: new Date().toISOString() };
  await syncMutate("children", (d) => d.children.push(child), child as unknown as Record<string, unknown>);
  return child;
}
export async function deleteChild(id: string) {
  await deleteRow("children", id);
  mutate((d) => {
    d.children = d.children.filter((c) => c.id !== id);
    d.entries = d.entries.filter((e) => e.childId !== id);
  });
}

/* ============ Horarios ============ */
export type BlockInput = Omit<Block, "id"> & { id?: string };
export async function saveBlock(input: BlockInput) {
  if (input.id) {
    const current = db.blocks.find((x) => x.id === input.id);
    if (!current) throw new Error("No se encontró el bloque del horario.");
    const next: Block = { ...current, ...input };
    await syncMutate(
      "blocks",
      (d) => {
        const b = d.blocks.find((x) => x.id === input.id);
        if (b) Object.assign(b, input);
      },
      next as unknown as Record<string, unknown>,
    );
  } else {
    const block: Block = { ...input, id: uid() };
    await syncMutate("blocks", (d) => d.blocks.push(block), block as unknown as Record<string, unknown>);
  }
}
export const deleteBlock = async (id: string) => {
  await deleteRow("blocks", id);
  mutate((d) => {
    d.blocks = d.blocks.filter((b) => b.id !== id);
  });
};

/* ============ Materiales ============ */
export type MaterialInput = Omit<Material, "id" | "createdAt" | "downloads"> & { id?: string };
export async function addMaterial(input: MaterialInput): Promise<Material> {
  const m: Material = { ...input, id: uid(), downloads: 0, createdAt: new Date().toISOString() };
  await syncMutate("materials", (d) => d.materials.unshift(m), m as unknown as Record<string, unknown>);
  return m;
}
export const deleteMaterial = async (id: string) => {
  await deleteRow("materials", id);
  mutate((d) => {
    d.materials = d.materials.filter((m) => m.id !== id);
  });
};
/** Contador de descargas: optimista + respaldo en la nube (no bloquea la UI). */
export const bumpDownload = (id: string) => {
  let updated: Material | undefined;
  mutate((d) => {
    const m = d.materials.find((x) => x.id === id);
    if (m) {
      m.downloads += 1;
      updated = m;
    }
  });
  if (updated) {
    upsertRow("materials", updated as unknown as Record<string, unknown>).catch(() => {
      /* métrica secundaria: se recuperará con la próxima escritura de la fila */
    });
  }
};

/* ============ Avances ============ */
export type EntryInput = Omit<Entry, "id"> & { id?: string };
export async function addEntry(input: EntryInput) {
  const entry: Entry = { ...input, id: uid() };
  await syncMutate("entries", (d) => d.entries.unshift(entry), entry as unknown as Record<string, unknown>);
}
export const deleteEntry = async (id: string) => {
  await deleteRow("entries", id);
  mutate((d) => {
    d.entries = d.entries.filter((e) => e.id !== id);
  });
};

/* ============ Respaldo y mantenimiento (admin) ============ */
export function importData(text: string) {
  const parsed = JSON.parse(text) as DBShape;
  if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.users) || !Array.isArray(parsed.children))
    throw new Error("El archivo no es un respaldo válido de Sammy.");
  if (!Array.isArray(parsed.groups) || parsed.groups.length === 0)
    parsed.groups = DEFAULT_GROUPS.map((g) => ({ ...g }));
  db = { ...parsed, v: 4, session: db.session && parsed.users.some((u) => u.id === db.session) ? db.session : null };
  persist();
  emit();
}
export function resetData() {
  db = emptyDB();
  persist();
  emit();
}
export const storageKB = (): number => Math.round(JSON.stringify(db).length / 102.4) / 10;

/* ============ Utilidades ============ */
export const MAX_FILE_MB = 2.5;
export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error("No se pudo leer el archivo."));
    r.readAsDataURL(file);
  });
}
export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
export function fmtDate(iso: string): string {
  try {
    return format(parseISO(iso), "d MMM yyyy", { locale: es });
  } catch {
    return iso;
  }
}
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "justo ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "ayer";
  if (d < 7) return `hace ${d} días`;
  return fmtDate(iso);
}
export function ageLabel(birth: string): string {
  try {
    const b = parseISO(birth);
    const years = differenceInYears(new Date(), b);
    if (years >= 1) return `${years} años`;
    return `${Math.max(differenceInMonths(new Date(), b), 0)} meses`;
  } catch {
    return "—";
  }
}
export const todayDayIdx = (): number => {
  const d = new Date().getDay();
  return d >= 1 && d <= 5 ? d : 1;
};
export const nowMinutes = (): number => {
  const n = new Date();
  return n.getHours() * 60 + n.getMinutes();
};
export const toMin = (hhmm: string): number => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};
export const visibleMaterials = (d: DBShape, groups: string[]): Material[] =>
  d.materials.filter((m) => m.scope === "all" || groups.includes(m.scope));

/* ============ Integración con Supabase ============ */

/**
 * Carga datos desde las 6 tablas de Supabase en paralelo.
 * Evalúa el objeto `error` de CADA consulta: si alguna falla, lanza un error
 * descriptivo (antes devolvía `null` y la app seguía “silenciosamente” con
 * datos locales, dando la impresión de que todo funcionaba).
 */
export async function loadFromSupabase(): Promise<DBShape> {
  if (!supabase) throw new Error("Supabase no está configurado.");
  const [groupsRes, usersRes, childrenRes, blocksRes, materialsRes, entriesRes] = await Promise.all([
    supabase.from("groups").select("*"),
    supabase.from("users").select("*"),
    supabase.from("children").select("*"),
    supabase.from("blocks").select("*"),
    supabase.from("materials").select("*"),
    supabase.from("entries").select("*"),
  ]);

  const failed = [
    { table: "groups", error: groupsRes.error },
    { table: "users", error: usersRes.error },
    { table: "children", error: childrenRes.error },
    { table: "blocks", error: blocksRes.error },
    { table: "materials", error: materialsRes.error },
    { table: "entries", error: entriesRes.error },
  ].find((r) => r.error);

  if (failed?.error) {
    throw new Error(`Error al leer "${failed.table}" en Supabase (${failed.error.code}): ${failed.error.message}`);
  }

  return {
    v: 4,
    groups: groupsRes.data ?? [],
    users: usersRes.data ?? [],
    children: childrenRes.data ?? [],
    blocks: blocksRes.data ?? [],
    materials: materialsRes.data ?? [],
    entries: entriesRes.data ?? [],
    session: null,
  };
}

/**
 * Aplica los datos traídos de Supabase al estado local, CONSERVANDO la
 * sesión activa del dispositivo si el usuario sigue existiendo en la nube.
 */
export function applyCloudData(cloud: DBShape): void {
  const keepSession = db.session && cloud.users.some((u) => u.id === db.session) ? db.session : null;
  mutate((d) => {
    d.groups = cloud.groups;
    d.users = cloud.users;
    d.children = cloud.children;
    d.blocks = cloud.blocks;
    d.materials = cloud.materials;
    d.entries = cloud.entries;
    d.session = keepSession;
  });
}

/**
 * Envía TODOS los datos locales actuales a Supabase (migración/respaldo).
 * Ahora con manejo estricto: usa upsertRow por tabla y LANZA el error real
 * si la nube rechaza algo (RLS, esquema, red). No silencia fallos.
 */
export async function syncLocalToSupabase(): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase no está configurado: no hay nube a la que sincronizar.");
  }
  const tables: TableName[] = ["groups", "users", "children", "blocks", "materials", "entries"];
  for (const table of tables) {
    const records = db[table] as unknown as Record<string, unknown>[];
    if (!Array.isArray(records) || records.length === 0) continue;
    await upsertRows(table, records);
  }
}

// Reexport utilidades estrictas para componentes
export { upsertRow as cloudUpsert, deleteRow as cloudDelete };
