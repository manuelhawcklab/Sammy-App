import { useSyncExternalStore } from "react";
import { differenceInMonths, differenceInYears, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { supabase } from "./supabase";

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
export function register(data: { role: Role; name: string; email: string; pass: string; group?: string }): User {
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
  mutate((d) => {
    d.users.push(user);
    d.session = user.id;
  });
  return user;
}

export function login(email: string, pass: string): User {
  const u = db.users.find((x) => x.email === email.trim().toLowerCase() && x.pass === pass);
  if (!u) throw new Error("Correo o contraseña incorrectos.");
  mutate((d) => {
    d.session = u.id;
  });
  return u;
}

export const logout = () => mutate((d) => void (d.session = null));
export const currentUser = (d: DBShape): User | null =>
  d.users.find((u) => u.id === d.session) ?? null;

/* ============ Aulas ============ */
export function addGroup(input: { name: string; emoji: string; ages: string }): Group {
  const g: Group = { ...input, id: uid() };
  mutate((d) => d.groups.push(g));
  return g;
}
export function updateGroup(id: string, patch: Partial<Omit<Group, "id">>) {
  mutate((d) => {
    const g = d.groups.find((x) => x.id === id);
    if (g) Object.assign(g, patch);
  });
}
export function deleteGroup(id: string) {
  const kids = db.children.filter((c) => c.group === id).length;
  const educators = db.users.filter((u) => u.role === "educator" && u.group === id).length;
  if (kids > 0 || educators > 0)
    throw new Error("Primero reasigna a los niños y educadores de esta aula desde Personas.");
  mutate((d) => {
    d.groups = d.groups.filter((g) => g.id !== id);
    d.blocks = d.blocks.filter((b) => b.group !== id);
    d.materials = d.materials.filter((m) => m.scope !== id);
  });
}

/* ============ Usuarios (admin) ============ */
export function adminCreateUser(data: { role: Role; name: string; email: string; pass: string; group?: string }): User {
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
  mutate((d) => d.users.push(user));
  return user;
}

export function updateUser(id: string, patch: Partial<User>): User {
  if (patch.email) {
    const email = patch.email.trim().toLowerCase();
    if (db.users.some((u) => u.id !== id && u.email === email))
      throw new Error("Ya existe otra cuenta con ese correo.");
    patch = { ...patch, email };
  }
  mutate((d) => {
    const u = d.users.find((x) => x.id === id);
    if (u) Object.assign(u, patch);
  });
  return db.users.find((u) => u.id === id)!;
}

export function deleteUser(id: string) {
  const target = db.users.find((u) => u.id === id);
  if (!target) return;
  if (id === db.session) throw new Error("No puedes eliminar la cuenta con la que estás en sesión.");
  if (target.role === "admin" && db.users.filter((u) => u.role === "admin").length <= 1)
    throw new Error("Debe existir al menos una cuenta de dirección.");
  mutate((d) => {
    d.users = d.users.filter((u) => u.id !== id);
    d.children.forEach((c) => {
      if (c.parentId === id) c.parentId = null;
    });
  });
}

/* ============ Niños ============ */
export type ChildInput = Omit<Child, "id" | "createdAt"> & { id?: string };
export function saveChild(input: ChildInput): Child {
  const existing = input.id ? db.children.find((c) => c.id === input.id) : undefined;
  if (existing) {
    mutate((d) => {
      const c = d.children.find((x) => x.id === input.id);
      if (c) Object.assign(c, input);
    });
    return { ...existing, ...input };
  }
  const child: Child = { ...input, id: uid(), createdAt: new Date().toISOString() };
  mutate((d) => d.children.push(child));
  return child;
}
export function deleteChild(id: string) {
  mutate((d) => {
    d.children = d.children.filter((c) => c.id !== id);
    d.entries = d.entries.filter((e) => e.childId !== id);
  });
}

/* ============ Horarios ============ */
export type BlockInput = Omit<Block, "id"> & { id?: string };
export function saveBlock(input: BlockInput) {
  if (input.id) {
    mutate((d) => {
      const b = d.blocks.find((x) => x.id === input.id);
      if (b) Object.assign(b, input);
    });
  } else {
    mutate((d) => d.blocks.push({ ...input, id: uid() }));
  }
}
export const deleteBlock = (id: string) =>
  mutate((d) => {
    d.blocks = d.blocks.filter((b) => b.id !== id);
  });

/* ============ Materiales ============ */
export type MaterialInput = Omit<Material, "id" | "createdAt" | "downloads"> & { id?: string };
export function addMaterial(input: MaterialInput): Material {
  const m: Material = { ...input, id: uid(), downloads: 0, createdAt: new Date().toISOString() };
  mutate((d) => d.materials.unshift(m));
  return m;
}
export const deleteMaterial = (id: string) =>
  mutate((d) => {
    d.materials = d.materials.filter((m) => m.id !== id);
  });
export const bumpDownload = (id: string) =>
  mutate((d) => {
    const m = d.materials.find((x) => x.id === id);
    if (m) m.downloads += 1;
  });

/* ============ Avances ============ */
export type EntryInput = Omit<Entry, "id"> & { id?: string };
export function addEntry(input: EntryInput) {
  mutate((d) => d.entries.unshift({ ...input, id: uid() }));
}
export const deleteEntry = (id: string) =>
  mutate((d) => {
    d.entries = d.entries.filter((e) => e.id !== id);
  });

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
 * Retorna un objeto DBShape con los datos, o null si Supabase no está
 * configurado o si alguna consulta falla (la app sigue funcionando local).
 */
export async function loadFromSupabase(): Promise<DBShape | null> {
  if (!supabase) return null;
  try {
    const [groupsRes, usersRes, childrenRes, blocksRes, materialsRes, entriesRes] = await Promise.all([
      supabase.from("groups").select("*"),
      supabase.from("users").select("*"),
      supabase.from("children").select("*"),
      supabase.from("blocks").select("*"),
      supabase.from("materials").select("*"),
      supabase.from("entries").select("*"),
    ]);

    // Verificar errores en cada consulta
    const errors = [
      { table: "groups", error: groupsRes.error },
      { table: "users", error: usersRes.error },
      { table: "children", error: childrenRes.error },
      { table: "blocks", error: blocksRes.error },
      { table: "materials", error: materialsRes.error },
      { table: "entries", error: entriesRes.error },
    ].filter((e) => e.error);

    if (errors.length > 0) {
      console.error("Errores al cargar desde Supabase:", errors);
      return null;
    }

    return {
      v: 4,
      groups: groupsRes.data || [],
      users: usersRes.data || [],
      children: childrenRes.data || [],
      blocks: blocksRes.data || [],
      materials: materialsRes.data || [],
      entries: entriesRes.data || [],
      session: null,
    };
  } catch (err) {
    console.error("Error inesperado al cargar desde Supabase:", err);
    return null;
  }
}

/**
 * Inserta o actualiza un registro en la tabla especificada.
 * Retorna true si éxito, false si error o si Supabase no está configurado.
 */
export async function saveToSupabase(table: string, data: unknown): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from(table).upsert(data as object, { onConflict: "id" });
    if (error) {
      console.error(`Error al guardar en ${table}:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Error inesperado al guardar en ${table}:`, err);
    return false;
  }
}

/**
 * Sincroniza los datos actuales de localStorage hacia Supabase.
 * Sube tabla por tabla y maneja errores de forma tolerante.
 */
export async function syncLocalToSupabase(): Promise<void> {
  if (!supabase) {
    console.warn("Supabase no está configurado: sincronización omitida.");
    return;
  }
  const localDB = db;

  const tables: Array<keyof Omit<DBShape, "v" | "session">> = [
    "groups",
    "users",
    "children",
    "blocks",
    "materials",
    "entries",
  ];

  for (const table of tables) {
    const records = localDB[table];
    if (!Array.isArray(records) || records.length === 0) continue;

    const success = await saveToSupabase(table, records);
    if (!success) {
      console.warn(`No se pudo sincronizar la tabla ${table}`);
    } else {
      console.log(`Tabla ${table} sincronizada correctamente (${records.length} registros)`);
    }
  }
}
