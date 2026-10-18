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

const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

function seed(): DBShape {
  const now = new Date().toISOString();
  const daysAgo = (n: number, h = 10) =>
    new Date(Date.now() - n * 86400000 - h * 3600000).toISOString();

  const groups: Group[] = DEFAULT_GROUPS.map((g) => ({ ...g }));

  const users: User[] = [
    { id: "u-admin", role: "admin", name: "Dirección Sammy", email: "admin@sammy.app", pass: "sammy123", color: "#FF6F61", createdAt: now },
    { id: "u-val", role: "parent", name: "Valentina Rojas", email: "familia@sammy.app", pass: "sammy123", color: "#F2789F", createdAt: now },
    { id: "u-marcos", role: "parent", name: "Marcos Herrera", email: "marcos@sammy.app", pass: "sammy123", color: "#58B8E8", createdAt: now },
    { id: "u-caro", role: "educator", name: "Miss Carolina", email: "miss@sammy.app", pass: "sammy123", group: "abejitas", color: "#12A59B", createdAt: now },
    { id: "u-andres", role: "educator", name: "Profe Andrés", email: "andres@sammy.app", pass: "sammy123", group: "colibries", color: "#FFC24B", createdAt: now },
  ];

  const children: Child[] = [
    {
      id: "c-lucas", parentId: "u-val", name: "Lucas Rojas", birth: "2021-05-14",
      group: "abejitas", emoji: "🦖", color: "#7DC95E", allergies: [],
      notes: "Le encanta armar bloques y los dinosaurios. Se adapta rápido a las rutinas nuevas.",
      authorized: "Valentina Rojas (mamá) · Pedro Rojas (papá)", createdAt: daysAgo(60),
    },
    {
      id: "c-emma", parentId: "u-val", name: "Emma Rojas", birth: "2022-11-02",
      group: "colibries", emoji: "🐰", color: "#F2789F", allergies: ["Lactosa"],
      notes: "Muy sociable. Prefiere leche vegetal en el refrigerio.",
      authorized: "Valentina Rojas (mamá) · Abuela Rosa", createdAt: daysAgo(45),
    },
    {
      id: "c-bruno", parentId: "u-marcos", name: "Bruno Herrera", birth: "2021-08-23",
      group: "abejitas", emoji: "🦊", color: "#FFC24B", allergies: ["Maní"],
      notes: "Alergia severa al maní. EpiPen disponible en enfermería.",
      authorized: "Marcos Herrera (papá) · Tía Julia", createdAt: daysAgo(50),
    },
  ];

  const blocks: Block[] = [];
  const talleres = [
    "Taller de arte",
    "Taller de lógica",
    "Taller de lenguaje",
    "Exploradores de la naturaleza",
    "Música y movimiento",
  ];
  for (let day = 1; day <= 5; day++) {
    const abe: [string, string, BlockKind, string][] = [
      ["08:00", "08:30", "bienvenida", "Bienvenida y saludo"],
      ["08:30", "09:15", "clase", "Asamblea de la mañana"],
      ["09:15", "09:45", "comida", "Refrigerio"],
      ["09:45", "10:45", "taller", talleres[day - 1]],
      ["10:45", "11:30", "juego", "Juego al aire libre"],
      ["11:30", "12:15", "comida", "Almuerzo"],
      ["12:15", "13:00", "siesta", "Descanso y siesta"],
      ["13:00", "13:45", "clase", "Cuentos y rincón de lectura"],
      ["13:45", "14:00", "salida", "Despedida"],
    ];
    abe.forEach(([start, end, kind, title]) =>
      blocks.push({ id: uid(), group: "abejitas", day, start, end, kind, title })
    );
    const col: [string, string, BlockKind, string][] = [
      ["08:30", "09:00", "bienvenida", "Bienvenida con canciones"],
      ["09:00", "09:40", "juego", "Juego sensorial"],
      ["09:40", "10:10", "comida", "Refrigerio"],
      ["10:10", "10:50", "taller", talleres[day - 1]],
      ["10:50", "11:30", "juego", "Patio y movimiento"],
      ["11:30", "12:00", "clase", "Cuentos cortos"],
      ["12:00", "12:15", "salida", "Despedida"],
    ];
    col.forEach(([start, end, kind, title]) =>
      blocks.push({ id: uid(), group: "colibries", day, start, end, kind, title })
    );
  }

  const txt = (t: string) => "text/plain;charset=utf-8," + encodeURIComponent(t);
  const materials: Material[] = [
    {
      id: "m1", authorId: "u-caro", title: "Rutinas de sueño para peques de 3 a 5 años",
      desc: "Guía práctica con pasos para lograr una rutina de sueño tranquila: anticipación, baño, cuento y despedida corta.",
      category: "Guías", scope: "all", fileName: "rutinas-de-sueno.txt",
      size: 480, dataUrl: txt("RUTINAS DE SUEÑO (3–5 años)\n\n1. Anticipa: avisa 15 minutos antes de ir a la cama.\n2. Orden estable: baño → pijama → cuento → luz apagada.\n3. Un solo cuento, elegido antes de acostarse.\n4. Despedida corta y tranquila: sin pantallas 1 hora antes.\n5. Si se despierta, acompáñalo con voz baja y vuelve a la rutina.\n\nCon cariño, Miss Carolina 🐝"),
      downloads: 34, createdAt: daysAgo(2),
    },
    {
      id: "m2", authorId: "u-caro", title: "Fichas de trazos: letras curvas",
      desc: "6 fichas imprimibles para practicar las curvas de la c, o, s y g con crayón grueso.",
      category: "Fichas", scope: "all", fileName: "fichas-trazos.txt",
      size: 320, dataUrl: txt("FICHAS DE TRAZOS — LETRAS CURVAS\n\nImprime y entrega un crayón grueso.\nHoja 1: curva de la C (grande → pequeña)\nHoja 2: círculo de la O (sentido antihorario)\nHoja 3: serpiente de la S\nHoja 4: gancho de la G\nConsejo: 10 minutos al día es suficiente."),
      downloads: 21, createdAt: daysAgo(4),
    },
    {
      id: "m3", authorId: "u-caro", title: "Cancionero de la asamblea (semana 12)",
      desc: "Las 5 canciones que cantamos esta semana en la asamblea, con letra para cantar en casa.",
      category: "Canciones", scope: "all", fileName: "cancionero-semana-12.txt",
      size: 410, dataUrl: txt("CANCIONERO — SEMANA 12\n\n1. Buenos días, amiguitos\n2. La araña pequeñita\n3. Cabeza, hombros, rodillas y pies\n4. El cocodrilo Dante\n5. Estrellita, ¿dónde estás?\n\nTip: cántenlas con señas, ¡a ellos les encanta!"),
      downloads: 18, createdAt: daysAgo(6),
    },
    {
      id: "m4", authorId: "u-andres", title: "Botella sensorial del océano: paso a paso",
      desc: "Actividad en casa para crear una botella sensorial con agua, escarcha y animalitos. Calma y concentra.",
      category: "Actividades", scope: "all", fileName: "botella-sensorial.txt",
      size: 390, dataUrl: txt("BOTELLA SENSORIAL DEL OCÉANO\n\nMateriales: botella transparente, agua tibia, pegamento transparente, escarcha azul, figuritas marinas.\n\n1. Llena 3/4 de la botella con agua tibia.\n2. Agrega 2 cucharadas de pegamento transparente.\n3. Añade escarcha y figuritas.\n4. Sella la tapa con pegamento caliente (adulto).\n5. ¡A girar y respirar profundo!"),
      downloads: 27, createdAt: daysAgo(8),
    },
    {
      id: "m5", authorId: "u-caro", title: "Calendario de emociones para imprimir",
      desc: "Calendario mensual para que los peques marquen cómo se sintieron cada día. Solo para la sala.",
      category: "Fichas", scope: "abejitas", fileName: "calendario-emociones.txt",
      size: 280, dataUrl: txt("CALENDARIO DE EMOCIONES\n\nCada noche, tu peque colorea la carita del día:\n😊 feliz · 😢 triste · 😠 enojado · 😨 con miedo · 😴 cansado\n\nAl final del mes conversen: ¿qué día fue su favorito? ¿por qué?"),
      downloads: 12, createdAt: daysAgo(3),
    },
    {
      id: "m6", authorId: "u-andres", title: "Video: yoga para niños (5 minutos)",
      desc: "Sesión corta de yoga con posturas de animales, perfecta para después del jardín.",
      category: "Videos", scope: "all",
      url: "https://www.youtube.com/watch?v=X655B4ISakg",
      downloads: 41, createdAt: daysAgo(10),
    },
  ];

  const e = (childId: string, authorId: string, area: Area, stars: number, note: string, n: number): Entry => ({
    id: uid(), childId, authorId, area, stars, note, date: daysAgo(n),
  });
  const entries: Entry[] = [
    e("c-lucas", "u-caro", "Lenguaje", 4, "Armó frases completas para contar su fin de semana frente al grupo.", 2),
    e("c-bruno", "u-caro", "Lógica", 4, "Completó el rompecabezas de 12 piezas sin ayuda.", 1),
    e("c-emma", "u-andres", "Socioemocional", 4, "Se calmó solito usando la botella sensorial después del recreo.", 3),
    e("c-lucas", "u-caro", "Lógica", 3, "Clasificó formas y colores; aún le cuesta completar la serie de 4.", 4),
    e("c-bruno", "u-caro", "Arte", 5, "Creó su propio cuento dibujado de 4 páginas. ¡Increíble imaginación!", 5),
    e("c-lucas", "u-caro", "Motricidad gruesa", 5, "Saltó en un pie sin perder el equilibrio, 10 segundos seguidos.", 6),
    e("c-emma", "u-andres", "Motricidad fina", 3, "Apiló una torre de 8 cubos con pinza fina estable.", 7),
    e("c-bruno", "u-caro", "Socioemocional", 3, "Está aprendiendo a esperar turnos; hoy lo logró 2 veces.", 8),
    e("c-lucas", "u-caro", "Socioemocional", 4, "Compartió sus bloques favoritos y ayudó a Bruno a construir.", 9),
    e("c-emma", "u-andres", "Lenguaje", 4, "Dice oraciones de 3 palabras y canta la canción de la araña.", 11),
    e("c-lucas", "u-caro", "Arte", 4, "Pintó con témpera usando trazos firmes y eligió su paleta.", 12),
    e("c-emma", "u-andres", "Motricidad gruesa", 4, "Sube la escalera alternando los pies, agarrándose poco.", 15),
    e("c-lucas", "u-caro", "Motricidad fina", 3, "Recortó siguiendo líneas rectas con apoyo de la mano.", 16),
    e("c-lucas", "u-caro", "Lenguaje", 3, "Reconoce las vocales de su nombre en el cartel del aula.", 20),
  ];

  return { v: 4, groups, users, children, blocks, materials, entries, session: null };
}

function load(): DBShape {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DBShape;
      if (parsed && parsed.v === 4 && Array.isArray(parsed.users)) {
        if (!Array.isArray(parsed.groups) || parsed.groups.length === 0)
          parsed.groups = DEFAULT_GROUPS.map((g) => ({ ...g }));
        return parsed;
      }
    }
  } catch {
    /* datos corruptos → re-sembrar */
  }
  const fresh = seed();
  try {
    localStorage.setItem(KEY, JSON.stringify(fresh));
  } catch {
    /* sin persistencia disponible */
  }
  return fresh;
}

let db: DBShape = load();
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const persist = () => {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch {
    throw new Error("No hay espacio suficiente en este dispositivo para guardar.");
  }
};

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
  db = seed();
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
 * Retorna un objeto DBShape con los datos o null si hay error.
 */
export async function loadFromSupabase(): Promise<DBShape | null> {
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
 * Retorna true si éxito, false si error.
 */
export async function saveToSupabase(table: string, data: any): Promise<boolean> {
  try {
    const { error } = await supabase.from(table).upsert(data, { onConflict: "id" });
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
 * Sube tabla por tabla y maneja errores gracefully.
 */
export async function syncLocalToSupabase(): Promise<void> {
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
