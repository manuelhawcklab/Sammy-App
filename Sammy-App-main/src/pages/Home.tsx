import { useState } from "react";
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarDays,
  ClipboardList,
  DoorOpen,
  Download,
  FolderOpen,
  GraduationCap,
  Plus,
  Settings,
  Smartphone,
  Sparkles,
  TrendingUp,
  UploadCloud,
  UserPlus,
  Users,
} from "lucide-react";
import {
  bumpDownload,
  DAYS,
  fmtDate,
  groupById,
  KIND_META,
  nowMinutes,
  timeAgo,
  toMin,
  todayDayIdx,
  useDB,
  visibleMaterials,
} from "../lib/db";
import type { Block, Material, User } from "../lib/db";
import type { Page } from "../App";
import { useInstall } from "../lib/pwa";
import {
  Avatar,
  Button,
  Chip,
  Reveal,
  SammyImg,
  SectionHead,
  Stars,
  useToast,
} from "../components/ui";

/* ---------- Tarjeta de estadística ---------- */
function StatCard({
  icon,
  label,
  value,
  color,
  delay,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  color: string;
  delay: number;
  onClick?: () => void;
}) {
  return (
    <Reveal delay={delay}>
      <motion.button
        whileHover={{ y: -3 }}
        onClick={onClick}
        className="card card-hover flex w-full items-center gap-3.5 p-4 text-left"
      >
        <span
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-ink"
          style={{ backgroundColor: `${color}33`, color }}
        >
          {icon}
        </span>
        <span>
          <span className="block font-display text-3xl leading-none font-bold">{value}</span>
          <span className="text-[13px] font-bold text-ink/55">{label}</span>
        </span>
      </motion.button>
    </Reveal>
  );
}

/* ---------- Línea de tiempo del día ---------- */
function DayTimeline({ blocks, emptyHint }: { blocks: Block[]; emptyHint: string }) {
  const now = nowMinutes();
  if (blocks.length === 0) {
    return (
      <p className="rounded-xl border-2 border-dashed border-ink/20 bg-paper px-4 py-8 text-center text-sm font-bold text-ink/45">
        {emptyHint}
      </p>
    );
  }
  return (
    <ol className="space-y-2.5">
      {blocks.map((b, i) => {
        const isNow = toMin(b.start) <= now && now < toMin(b.end);
        const past = now >= toMin(b.end);
        return (
          <motion.li
            key={b.id}
            initial={{ opacity: 0, x: -14 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-stretch gap-3 rounded-xl border-2 p-3 ${
              isNow ? "border-ink bg-mint shadow-toy-xs" : "border-ink/10 bg-white"
            } ${past && !isNow ? "opacity-55" : ""}`}
          >
            <div className="w-[72px] shrink-0 text-right">
              <p className="text-sm font-black">{b.start}</p>
              <p className="text-xs font-bold text-ink/40">{b.end}</p>
            </div>
            <span className="w-1.5 shrink-0 rounded-full" style={{ backgroundColor: KIND_META[b.kind].color }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black">{b.title}</p>
              <div className="mt-0.5 flex items-center gap-2">
                <Chip color={KIND_META[b.kind].color}>{KIND_META[b.kind].label}</Chip>
                {isNow && (
                  <span className="flex items-center gap-1.5 text-[11px] font-black text-seadeep uppercase">
                    <span className="anim-pulse-dot h-2 w-2 rounded-full bg-sea" /> Ahora
                  </span>
                )}
              </div>
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

/* ---------- Tarjeta de instalación ---------- */
function InstallCard() {
  const { canInstall, installed, promptInstall } = useInstall();
  const toast = useToast();
  if (installed) return null;
  return (
    <Reveal delay={120}>
      <div className="card flex items-start gap-4 border-sea bg-mint/50 p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-sun">
          <Smartphone size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-base font-semibold">Lleva a Sammy contigo</h3>
          <p className="mt-0.5 text-[13px] font-semibold text-ink/60">
            {canInstall
              ? "Instala la app: acceso directo desde tu pantalla y modo sin conexión."
              : "En iPhone o iPad: toca Compartir y luego “Agregar a inicio”."}
          </p>
          {canInstall && (
            <Button
              variant="sun"
              size="sm"
              className="mt-3"
              icon={<Download size={15} />}
              onClick={async () => {
                const ok = await promptInstall();
                toast(ok ? "success" : "info", ok ? "¡Sammy se instaló en tu dispositivo!" : "Instalación cancelada.");
              }}
            >
              Instalar app
            </Button>
          )}
        </div>
      </div>
    </Reveal>
  );
}

/* ---------- Página ---------- */
export default function HomePage({ me, go }: { me: User; go: (p: Page) => void }) {
  const db = useDB();
  const toast = useToast();
  const isParent = me.role === "parent";
  const isAdmin = me.role === "admin";

  const myKids = isAdmin
    ? db.children
    : db.children.filter((c) => (isParent ? c.parentId === me.id : c.group === me.group));
  const kidIds = new Set(myKids.map((k) => k.id));
  const groups = [...new Set(myKids.map((k) => k.group))];
  const educatorGroups = me.group ? [me.group] : [];
  const activeGroups = isAdmin ? db.groups.map((g) => g.id) : isParent ? groups : educatorGroups;
  const [selGroup, setSelGroup] = useState<string>("");

  const day = todayDayIdx();
  const blocksToday = db.blocks
    .filter((b) => b.group === (selGroup || activeGroups[0]) && b.day === day)
    .sort((a, b) => toMin(a.start) - toMin(b.start));

  const mats = visibleMaterials(db, activeGroups);
  const newMats = mats.filter((m) => Date.now() - new Date(m.createdAt).getTime() < 7 * 86400000);
  const monthEntries = db.entries.filter(
    (e) => kidIds.has(e.childId) && Date.now() - new Date(e.date).getTime() < 30 * 86400000
  );
  const recentEntries = db.entries
    .filter((e) => kidIds.has(e.childId))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4);
  const weekBlocks = db.blocks.filter((b) => activeGroups.includes(b.group)).length;
  const childById = (id: string) => db.children.find((c) => c.id === id);
  const userById = (id: string) => db.users.find((u) => u.id === id);

  const download = (m: Material) => {
    if (m.dataUrl) {
      const a = document.createElement("a");
      a.href = m.dataUrl;
      a.download = m.fileName ?? "material.txt";
      a.click();
      toast("success", `Descargando “${m.title}”.`);
    } else if (m.url) {
      window.open(m.url, "_blank", "noopener");
      toast("info", "Abriendo el enlace del material.");
    }
    bumpDownload(m.id);
  };

  const firstName = me.name.split(" ")[0];
  const hour = new Date().getHours();
  const saludo = hour < 12 ? "¡Buenos días" : hour < 19 ? "¡Buenas tardes" : "¡Buenas noches";

  return (
    <div>
      {/* ===== Banner ===== */}
      <Reveal>
        <div className="card relative overflow-hidden">
          <div className="pointer-events-none absolute -top-10 -right-10 h-44 w-44 rounded-full bg-mint" />
          <div className="pointer-events-none absolute -bottom-14 right-24 h-32 w-32 rounded-full bg-sun/25" />
          <div className="relative flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-black tracking-wide text-seadeep uppercase">
                <Sparkles size={15} /> {DAYS[day - 1]} en la sala
                {isAdmin && (
                  <span className="ml-1 flex items-center gap-1.5 rounded-full border-2 border-ink bg-coral px-2 py-0.5 text-[10px] text-white">
                    <span className="anim-pulse-dot h-1.5 w-1.5 rounded-full bg-white" /> modo dirección
                  </span>
                )}
              </p>
              <h2 className="mt-1 font-display text-3xl font-bold sm:text-4xl">
                {saludo}, {firstName}!
              </h2>
              <p className="mt-1.5 max-w-md text-[15px] font-semibold text-ink/60">
                {isAdmin
                  ? `Tienes ${db.users.length} usuarios, ${db.children.length} peques y ${db.groups.length} aulas bajo tu gestión.`
                  : isParent
                    ? myKids.length > 0
                      ? `Hoy ${myKids.map((k) => k.name.split(" ")[0]).join(" y ")} ${
                          myKids.length > 1 ? "tienen" : "tiene"
                        } ${blocksToday.length} actividades programadas.`
                      : "Agrega a tu peque para ver su día, horarios y avances."
                    : `Tu sala tiene hoy ${blocksToday.length} bloques y ${myKids.length} peques a tu cargo.`}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {isAdmin ? (
                  <>
                    <Button size="sm" icon={<DoorOpen size={15} />} onClick={() => go("aulas")}>
                      Nueva aula
                    </Button>
                    <Button size="sm" variant="sun" icon={<UserPlus size={15} />} onClick={() => go("people")}>
                      Registrar usuario
                    </Button>
                    <Button size="sm" variant="ghost" icon={<UploadCloud size={15} />} onClick={() => go("content")}>
                      Publicar material
                    </Button>
                    <Button size="sm" variant="ghost" icon={<Settings size={15} />} onClick={() => go("settings")}>
                      Ajustes
                    </Button>
                  </>
                ) : isParent ? (
                  <>
                    <Button size="sm" icon={<Plus size={15} />} onClick={() => go("children")}>
                      Agregar peque
                    </Button>
                    <Button size="sm" variant="ghost" icon={<CalendarDays size={15} />} onClick={() => go("schedule")}>
                      Horario de hoy
                    </Button>
                    <Button size="sm" variant="ghost" icon={<FolderOpen size={15} />} onClick={() => go("materials")}>
                      Materiales
                    </Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" icon={<ClipboardList size={15} />} onClick={() => go("progress")}>
                      Registrar avance
                    </Button>
                    <Button size="sm" variant="sun" icon={<UploadCloud size={15} />} onClick={() => go("materials")}>
                      Subir material
                    </Button>
                    <Button size="sm" variant="ghost" icon={<CalendarDays size={15} />} onClick={() => go("schedule")}>
                      Ajustar horario
                    </Button>
                  </>
                )}
              </div>
            </div>
            <SammyImg className="anim-float mx-auto h-28 w-28 rounded-[26px] border-2 border-ink shadow-toy sm:mx-0 sm:h-36 sm:w-36" />
          </div>
        </div>
      </Reveal>

      {/* ===== Stats ===== */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {isAdmin ? (
          <>
            <StatCard delay={0} color="#58B8E8" icon={<Users size={22} />} value={db.users.length} label="Usuarios registrados" onClick={() => go("people")} />
            <StatCard delay={60} color="#7DC95E" icon={<GraduationCap size={22} />} value={db.children.length} label="Niños en plataforma" onClick={() => go("people")} />
            <StatCard delay={120} color="#FFC24B" icon={<DoorOpen size={22} />} value={db.groups.length} label="Aulas activas" onClick={() => go("aulas")} />
            <StatCard delay={180} color="#FF6F61" icon={<FolderOpen size={22} />} value={db.materials.length} label="Materiales publicados" onClick={() => go("content")} />
          </>
        ) : isParent ? (
          <>
            <StatCard delay={0} color="#58B8E8" icon={<Users size={22} />} value={myKids.length} label="Mis peques" onClick={() => go("children")} />
            <StatCard delay={60} color="#FFC24B" icon={<FolderOpen size={22} />} value={newMats.length} label="Materiales nuevos (7 días)" onClick={() => go("materials")} />
            <StatCard delay={120} color="#FF6F61" icon={<TrendingUp size={22} />} value={monthEntries.length} label="Avances este mes" onClick={() => go("progress")} />
            <StatCard delay={180} color="#7DC95E" icon={<CalendarDays size={22} />} value={blocksToday.length} label="Actividades de hoy" onClick={() => go("schedule")} />
          </>
        ) : (
          <>
            <StatCard delay={0} color="#58B8E8" icon={<Users size={22} />} value={myKids.length} label="Peques en mi sala" onClick={() => go("children")} />
            <StatCard delay={60} color="#FFC24B" icon={<UploadCloud size={22} />} value={db.materials.filter((m) => m.authorId === me.id).length} label="Materiales publicados" onClick={() => go("materials")} />
            <StatCard delay={120} color="#FF6F61" icon={<TrendingUp size={22} />} value={monthEntries.length} label="Avances este mes" onClick={() => go("progress")} />
            <StatCard delay={180} color="#7DC95E" icon={<CalendarDays size={22} />} value={weekBlocks} label="Bloques en la semana" onClick={() => go("schedule")} />
          </>
        )}
      </div>

      {/* ===== Columnas ===== */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <Reveal delay={80}>
          <section className="card p-5">
            <SectionHead
              title={`Hoy · ${DAYS[day - 1]}`}
              desc={groupById(selGroup || activeGroups[0])?.name ?? "Sin sala asignada"}
              action={
                activeGroups.length > 1 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {activeGroups.map((g) => {
                      const grp = groupById(g);
                      const active = (selGroup || activeGroups[0]) === g;
                      return (
                        <button
                          key={g}
                          onClick={() => setSelGroup(g)}
                          className={`btn-toy rounded-full border-2 px-3 py-1.5 text-xs font-black shadow-toy-xs ${
                            active ? "border-ink bg-pine text-white" : "border-ink/20 bg-white text-ink/60"
                          }`}
                        >
                          {grp?.emoji} {grp?.name.replace("Sala ", "")}
                        </button>
                      );
                    })}
                  </div>
                ) : undefined
              }
            />
            <DayTimeline
              blocks={blocksToday}
              emptyHint={
                isParent
                  ? "Aún no hay horario publicado para esta sala."
                  : "No hay bloques para hoy. Ajusta el horario desde la pestaña Horarios."
              }
            />
            {blocksToday.length > 0 && (
              <button
                onClick={() => go("schedule")}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-black text-seadeep hover:underline"
              >
                Ver semana completa <ArrowRight size={15} />
              </button>
            )}
          </section>
        </Reveal>

        <div className="flex flex-col gap-6">
          <Reveal delay={140}>
            <section className="card p-5">
              <SectionHead
                title={isParent ? "Últimos avances" : "Actividad reciente"}
                desc={isParent ? "Lo que celebramos esta semana" : isAdmin ? "Registros de todas las salas" : "Registros de tu sala"}
                action={
                  <button onClick={() => go(isAdmin ? "content" : "progress")} className="text-sm font-black text-seadeep hover:underline">
                    Ver todo
                  </button>
                }
              />
              {recentEntries.length === 0 ? (
                <p className="rounded-xl border-2 border-dashed border-ink/20 bg-paper px-4 py-8 text-center text-sm font-bold text-ink/45">
                  Todavía no hay avances registrados.
                </p>
              ) : (
                <ul className="space-y-3">
                  {recentEntries.map((e) => {
                    const child = childById(e.childId);
                    const author = userById(e.authorId);
                    if (!child) return null;
                    return (
                      <li key={e.id} className="flex items-start gap-3 rounded-xl border-2 border-ink/10 bg-white p-3">
                        <Avatar emoji={child.emoji} color={child.color} size={38} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black">{child.name.split(" ")[0]}</p>
                            <Chip color="#12A59B">{e.area}</Chip>
                            <span className="ml-auto text-[11px] font-bold text-ink/40">{timeAgo(e.date)}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <Stars value={e.stars} size={13} />
                          </div>
                          <p className="clamp-2 mt-1 text-[13px] font-semibold text-ink/60">{e.note}</p>
                          {author && (
                            <p className="mt-1 text-[11px] font-bold text-ink/40">por {author.name}</p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </Reveal>
          <InstallCard />
        </div>
      </div>

      {/* ===== Materiales recientes ===== */}
      <Reveal delay={100}>
        <section className="mt-8">
          <SectionHead
            title={isAdmin ? "Materiales en la plataforma" : "Materiales para ti"}
            desc="Los más recientes de tus salas"
            action={
              <Button size="sm" variant="ghost" icon={<ArrowRight size={15} />} onClick={() => go("materials")}>
                Ver todos
              </Button>
            }
          />
          {mats.length === 0 ? (
            <p className="rounded-xl border-2 border-dashed border-ink/20 bg-white/60 px-4 py-8 text-center text-sm font-bold text-ink/45">
              Aún no hay materiales publicados.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mats.slice(0, 3).map((m, i) => (
                <motion.article
                  key={m.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="card card-hover flex flex-col p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Chip color="#FFC24B">{m.category}</Chip>
                    <span className="text-[11px] font-bold text-ink/40">{fmtDate(m.createdAt)}</span>
                  </div>
                  <h3 className="clamp-2 mt-2 font-display text-base leading-snug font-semibold">{m.title}</h3>
                  <p className="mt-1 flex-1 text-[13px] font-semibold text-ink/55">{m.desc}</p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-[11px] font-bold text-ink/40">{m.downloads} descargas</span>
                    <Button size="sm" variant="sun" icon={<Download size={14} />} onClick={() => download(m)}>
                      {m.dataUrl ? "Descargar" : "Abrir"}
                    </Button>
                  </div>
                </motion.article>
              ))}
            </div>
          )}
        </section>
      </Reveal>
    </div>
  );
}
