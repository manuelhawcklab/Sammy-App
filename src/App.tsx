import { useState } from "react";
import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarDays,
  Check,
  DoorOpen,
  Download,
  FolderOpen,
  Home,
  Layers,
  LogOut,
  Settings,
  Smartphone,
  TrendingUp,
  Users,
} from "lucide-react";
import { currentUser, groupById, logout, useDB } from "./lib/db";
import type { Role, User } from "./lib/db";
import { useInstall } from "./lib/pwa";
import { Avatar, Chip, SammyImg, ToastProvider, useToast } from "./components/ui";
import Login from "./pages/Login";
import HomePage from "./pages/Home";
import ChildrenPage from "./pages/Children";
import SchedulePage from "./pages/Schedule";
import MaterialsPage from "./pages/Materials";
import ProgressPage from "./pages/Progress";
import AulasPage from "./pages/admin/Aulas";
import PeoplePage from "./pages/admin/People";
import ContentPage from "./pages/admin/Content";
import SettingsPage from "./pages/admin/Settings";

export type Page =
  | "home"
  | "children"
  | "schedule"
  | "materials"
  | "progress"
  | "aulas"
  | "people"
  | "content"
  | "settings";

const NAV: Record<Role, { id: Page; label: string; Icon: typeof Home }[]> = {
  parent: [
    { id: "home", label: "Inicio", Icon: Home },
    { id: "children", label: "Mis hijos", Icon: Users },
    { id: "schedule", label: "Horarios", Icon: CalendarDays },
    { id: "materials", label: "Materiales", Icon: FolderOpen },
    { id: "progress", label: "Progreso", Icon: TrendingUp },
  ],
  educator: [
    { id: "home", label: "Panel", Icon: Home },
    { id: "children", label: "Niños", Icon: Users },
    { id: "schedule", label: "Horarios", Icon: CalendarDays },
    { id: "materials", label: "Materiales", Icon: FolderOpen },
    { id: "progress", label: "Avances", Icon: TrendingUp },
  ],
  admin: [
    { id: "home", label: "Panel", Icon: Home },
    { id: "aulas", label: "Aulas", Icon: DoorOpen },
    { id: "people", label: "Personas", Icon: Users },
    { id: "content", label: "Contenido", Icon: Layers },
    { id: "settings", label: "Ajustes", Icon: Settings },
  ],
};

const TITLES: Record<Page, Record<Role, string>> = {
  home: { parent: "Inicio", educator: "Panel de la sala", admin: "Panel general" },
  children: { parent: "Mis hijos", educator: "Niños de la sala", admin: "Niños" },
  schedule: { parent: "Horarios", educator: "Horarios de la sala", admin: "Horarios" },
  materials: { parent: "Materiales didácticos", educator: "Materiales didácticos", admin: "Materiales" },
  progress: { parent: "Progreso", educator: "Avances", admin: "Avances" },
  aulas: { parent: "Aulas", educator: "Aulas", admin: "Aulas" },
  people: { parent: "Personas", educator: "Personas", admin: "Personas" },
  content: { parent: "Contenido", educator: "Contenido", admin: "Contenido" },
  settings: { parent: "Ajustes", educator: "Ajustes", admin: "Ajustes" },
};

const ROLE_BADGE: Record<Role, { label: string; emoji: string }> = {
  parent: { label: "Familia", emoji: "🧑‍🤝‍🧑" },
  educator: { label: "Educador", emoji: "🧑‍🏫" },
  admin: { label: "Dirección", emoji: "🛡️" },
};

function InstallChip({ compact = false }: { compact?: boolean }) {
  const { canInstall, installed, promptInstall } = useInstall();
  const toast = useToast();
  if (installed) {
    return (
      <Chip color="#12A59B">
        <Check size={13} strokeWidth={3} /> App instalada
      </Chip>
    );
  }
  if (!canInstall) return null;
  return (
    <button
      onClick={async () => {
        const ok = await promptInstall();
        toast(ok ? "success" : "info", ok ? "¡Sammy se instaló en tu dispositivo!" : "Instalación cancelada.");
      }}
      className="btn-toy inline-flex items-center gap-2 rounded-xl border-2 border-ink bg-sun px-3 py-2 font-display text-sm font-semibold shadow-toy-xs"
    >
      {compact ? <Download size={16} /> : <Smartphone size={16} />}
      Instalar app
    </button>
  );
}

function Shell({ me }: { me: User }) {
  const [page, setPage] = useState<Page>("home");
  const toast = useToast();
  const nav = NAV[me.role];
  const group = groupById(me.group);
  const today = format(new Date(), "EEEE d 'de' MMMM", { locale: es });

  const pageEl: ReactNode = (() => {
    const props = { me, go: setPage };
    switch (page) {
      case "home":
        return <HomePage {...props} />;
      case "children":
        return <ChildrenPage {...props} />;
      case "schedule":
        return <SchedulePage {...props} />;
      case "materials":
        return <MaterialsPage {...props} />;
      case "progress":
        return <ProgressPage {...props} />;
      case "aulas":
        return <AulasPage />;
      case "people":
        return <PeoplePage me={me} />;
      case "content":
        return <ContentPage {...props} />;
      case "settings":
        return <SettingsPage />;
    }
  })();

  const chipColor = me.role === "educator" ? "#FFC24B" : me.role === "admin" ? "#FF6F61" : "#58B8E8";

  return (
    <div className="min-h-screen">
      {/* ===== Sidebar escritorio ===== */}
      <aside className="bg-dots-light fixed inset-y-0 left-0 z-50 hidden w-64 flex-col border-r-2 border-ink bg-pine text-white md:flex">
        <div className="flex items-center gap-3 px-5 pt-6 pb-5">
          <SammyImg className="h-12 w-12 rounded-xl border-2 border-white/25" />
          <div>
            <p className="font-display text-[12px] font-medium text-mint">Aprende con</p>
            <p className="font-display text-xl leading-none font-bold">Sammy</p>
          </div>
        </div>
        <div className="px-5 pb-3">
          <Chip color={chipColor}>
            {me.role === "educator" && group
              ? `${group.emoji} ${group.name}`
              : `${ROLE_BADGE[me.role].emoji} ${ROLE_BADGE[me.role].label}`}
          </Chip>
        </div>
        <nav className="flex-1 space-y-1.5 overflow-y-auto px-4 py-2">
          {nav.map(({ id, label, Icon }) => {
            const active = page === id;
            return (
              <button
                key={id}
                onClick={() => setPage(id)}
                className={`btn-toy flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-display text-[15px] font-semibold ${
                  active
                    ? "border-2 border-ink bg-sun text-ink shadow-toy-xs"
                    : "border-2 border-transparent text-mint/85 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.5 : 2} />
                {label}
              </button>
            );
          })}
        </nav>
        <div className="space-y-3 border-t-2 border-white/10 px-5 py-4">
          <InstallChip />
          <div className="flex items-center gap-3">
            <Avatar emoji={ROLE_BADGE[me.role].emoji} color={me.color} size={40} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black">{me.name}</p>
              <p className="truncate text-xs font-semibold text-mint/60">{me.email}</p>
            </div>
            <button
              onClick={() => {
                logout();
                toast("info", "Sesión cerrada. ¡Vuelve pronto!");
              }}
              title="Cerrar sesión"
              className="btn-toy flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-coral text-white shadow-toy-xs"
            >
              <LogOut size={16} strokeWidth={2.5} />
            </button>
          </div>
        </div>
      </aside>

      {/* ===== Barra superior móvil ===== */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b-2 border-ink bg-pine px-4 py-3 text-white md:hidden">
        <div className="flex items-center gap-2.5">
          <SammyImg className="h-10 w-10 rounded-xl border-2 border-white/25" />
          <div>
            <p className="font-display text-base leading-none font-bold">{TITLES[page][me.role]}</p>
            <p className="text-[11px] font-bold text-mint/70 capitalize">
              {ROLE_BADGE[me.role].label} · {today}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            logout();
            toast("info", "Sesión cerrada.");
          }}
          className="btn-toy flex h-9 w-9 items-center justify-center rounded-xl border-2 border-ink bg-coral text-white shadow-toy-xs"
          aria-label="Cerrar sesión"
        >
          <LogOut size={16} strokeWidth={2.5} />
        </button>
      </header>

      {/* ===== Contenido ===== */}
      <main className="md:pl-64">
        <div className="mx-auto max-w-5xl px-4 pt-6 pb-28 sm:px-6 md:pt-8 md:pb-12">
          <div className="mb-6 hidden items-center justify-between gap-4 md:flex">
            <div>
              <h1 className="font-display text-3xl font-bold">{TITLES[page][me.role]}</h1>
              <p className="text-sm font-bold text-ink/50 capitalize">{today}</p>
            </div>
            <div className="flex items-center gap-3">
              <InstallChip compact />
              <div className="flex items-center gap-2 rounded-xl border-2 border-ink bg-white py-1.5 pr-4 pl-1.5 shadow-toy-xs">
                <Avatar emoji={ROLE_BADGE[me.role].emoji} color={me.color} size={34} />
                <div className="leading-tight">
                  <p className="text-sm font-black">{me.name.split(" ")[0]}</p>
                  <p className="text-[11px] font-bold text-ink/45">{ROLE_BADGE[me.role].label}</p>
                </div>
              </div>
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={page}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {pageEl}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ===== Navegación inferior móvil ===== */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex">
          {nav.map(({ id, label, Icon }) => {
            const active = page === id;
            return (
              <button
                key={id}
                onClick={() => setPage(id)}
                className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 ${
                  active ? "text-seadeep" : "text-ink/40"
                }`}
              >
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-full transition-all ${
                    active ? "border-2 border-ink bg-mint" : ""
                  }`}
                >
                  <Icon size={18} strokeWidth={active ? 2.6 : 2} />
                </span>
                <span className="text-[10px] font-black">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function Root() {
  const db = useDB();
  const me = currentUser(db);
  if (!me) return <Login />;
  return <Shell key={me.id} me={me} />;
}

export default function App() {
  return (
    <ToastProvider>
      <Root />
    </ToastProvider>
  );
}
