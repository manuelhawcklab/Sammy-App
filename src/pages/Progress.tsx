import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { ClipboardList, Sparkles, Trash2 } from "lucide-react";
import {
  addEntry,
  AREAS,
  AREA_COLORS,
  deleteEntry,
  fmtDate,
  timeAgo,
  useDB,
} from "../lib/db";
import type { Area, User } from "../lib/db";
import type { Page } from "../App";
import {
  Avatar,
  Button,
  Chip,
  EmptyState,
  Field,
  Modal,
  ProgressRing,
  Reveal,
  SectionHead,
  Select,
  Stars,
  TextArea,
  TextInput,
  useToast,
} from "../components/ui";

const SHORT: Record<Area, string> = {
  Lenguaje: "Lenguaje",
  "Motricidad fina": "M. fina",
  "Motricidad gruesa": "M. gruesa",
  Socioemocional: "Social",
  Lógica: "Lógica",
  Arte: "Arte",
};

/* ============ Formulario de avance ============ */
function EntryForm({
  open,
  onClose,
  childId,
  childName,
  me,
}: {
  open: boolean;
  onClose: () => void;
  childId: string;
  childName: string;
  me: User;
}) {
  const toast = useToast();
  const [area, setArea] = useState<Area>(AREAS[0]);
  const [stars, setStars] = useState(4);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setArea(AREAS[0]);
    setStars(4);
    setNote("");
    setDate(new Date().toISOString().slice(0, 10));
    setError("");
  }, [open]);

  const submit = () => {
    if (note.trim().length < 5) {
      setError("Describe el logro con al menos 5 caracteres.");
      return;
    }
    addEntry({
      childId,
      authorId: me.id,
      area,
      stars,
      note: note.trim(),
      date: new Date(`${date}T12:00:00`).toISOString(),
    });
    toast("success", `Avance registrado para ${childName.split(" ")[0]}. ¡A celebrar!`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Registrar avance"
      subtitle={`Nuevo logro de ${childName}`}
      footer={
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon={<Sparkles size={15} />} onClick={submit}>
            Guardar avance
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Área de desarrollo">
            <Select value={area} onChange={(e) => setArea(e.target.value as Area)}>
              {AREAS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Fecha">
            <TextInput type="date" value={date} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>
        <Field label="¿Cómo lo hizo?">
          <div className="rounded-xl border-2 border-ink/15 bg-paper px-3.5 py-3">
            <Stars value={stars} size={26} onChange={setStars} />
            <p className="mt-1 text-xs font-bold text-ink/45">
              {["", "Aún con mucho apoyo", "Con bastante apoyo", "Con algo de apoyo", "Casi independiente", "¡Lo domina!"][stars]}
            </p>
          </div>
        </Field>
        <Field label="Nota para la familia" error={error || undefined}>
          <TextArea
            placeholder="Ej. Hoy logró recortar siguiendo la línea curva él solito, con tijera de punta roma."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
    </Modal>
  );
}

/* ============ Página ============ */
export default function ProgressPage({ me }: { me: User; go: (p: Page) => void }) {
  const db = useDB();
  const toast = useToast();
  const isEducator = me.role === "educator";
  const canManage = me.role !== "parent";

  const kids = db.children
    .filter((c) =>
      me.role === "admin" ? true : isEducator ? c.group === me.group : c.parentId === me.id
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const [selId, setSelId] = useState<string | null>(null);
  const sel = kids.find((k) => k.id === selId) ?? kids[0] ?? null;

  const [formOpen, setFormOpen] = useState(false);
  const [delId, setDelId] = useState<string | null>(null);

  const entries = useMemo(
    () =>
      sel
        ? db.entries.filter((e) => e.childId === sel.id).sort((a, b) => b.date.localeCompare(a.date))
        : [],
    [db.entries, sel]
  );

  const radarData = useMemo(() => {
    return AREAS.map((a) => {
      const list = entries.filter((e) => e.area === a);
      const avg = list.length ? list.reduce((s, e) => s + e.stars, 0) / list.length : 0;
      return { area: SHORT[a], avg: Math.round(avg * 10) / 10, full: a };
    });
  }, [entries]);

  const overall = entries.length ? entries.reduce((s, e) => s + e.stars, 0) / entries.length / 5 : 0;
  const monthCount = entries.filter((e) => Date.now() - new Date(e.date).getTime() < 30 * 86400000).length;

  if (kids.length === 0) {
    return (
      <div>
        <SectionHead
          title={isEducator ? "Avances de tu sala" : "El progreso de los peques"}
          desc="Cada logro cuenta: aquí se celebra todo."
        />
        <EmptyState
          icon={<Sparkles size={26} />}
          title="Aún no hay peques registrados"
          desc="Primero crea un expediente en la sección de Niños; después podrás registrar y ver avances."
        />
      </div>
    );
  }

  return (
    <div>
      <SectionHead
        title={isEducator ? "Avances de tu sala" : me.role === "admin" ? "Avances de la plataforma" : "El progreso de tus peques"}
        desc={
          isEducator
            ? "Registra logros por área: la familia los verá al instante."
            : me.role === "admin"
              ? "Vista global de todos los registros por peque."
              : "Un vistazo al desarrollo de tu peque, área por área."
        }
        action={
          isEducator && sel ? (
            <Button icon={<ClipboardList size={16} />} onClick={() => setFormOpen(true)}>
              Registrar avance
            </Button>
          ) : undefined
        }
      />

      {/* Selector de peque */}
      <div className="mb-6 flex flex-wrap gap-2">
        {kids.map((k) => {
          const active = sel?.id === k.id;
          return (
            <button
              key={k.id}
              onClick={() => setSelId(k.id)}
              className={`btn-toy flex items-center gap-2.5 rounded-full border-2 py-1.5 pr-4 pl-1.5 shadow-toy-xs ${
                active ? "border-ink bg-pine text-white" : "border-ink/15 bg-white text-ink/60 hover:border-ink/40"
              }`}
            >
              <Avatar emoji={k.emoji} color={k.color} size={32} />
              <span className="font-display text-sm font-semibold">{k.name.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

      {sel && (
        <>
          <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
            {/* Radar */}
            <Reveal>
              <section className="card p-5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-lg font-semibold">Perfil de desarrollo</h3>
                  <Chip color="#12A59B">
                    {entries.length} registro{entries.length !== 1 ? "s" : ""}
                  </Chip>
                </div>
                {entries.length === 0 ? (
                  <p className="mt-4 rounded-xl border-2 border-dashed border-ink/20 bg-paper px-4 py-10 text-center text-sm font-bold text-ink/45">
                    Sin avances todavía. {isEducator ? "Registra el primero con el botón de arriba." : "La sala registrará aquí sus logros."}
                  </p>
                ) : (
                  <div className="h-[290px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} outerRadius="72%">
                        <PolarGrid stroke="rgba(20,52,50,0.15)" />
                        <PolarAngleAxis dataKey="area" tick={{ fill: "#143432", fontSize: 12, fontWeight: 800 }} />
                        <PolarRadiusAxis domain={[0, 5]} tickCount={6} tick={{ fill: "rgba(20,52,50,0.35)", fontSize: 10 }} axisLine={false} />
                        <Radar name="Promedio" dataKey="avg" stroke="#0E8A80" strokeWidth={2.5} fill="#12A59B" fillOpacity={0.4} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>
            </Reveal>

            {/* Resumen */}
            <Reveal delay={90}>
              <section className="card flex h-full flex-col p-5">
                <div className="flex items-center gap-5">
                  <ProgressRing value={overall} size={104} stroke={11}>
                    <span className="font-display text-2xl leading-none font-bold">
                      {entries.length ? (overall * 5).toFixed(1) : "–"}
                    </span>
                    <span className="text-[10px] font-black text-ink/45 uppercase">de 5.0</span>
                  </ProgressRing>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <Avatar emoji={sel.emoji} color={sel.color} size={36} />
                      <div>
                        <p className="font-display text-lg leading-tight font-bold">{sel.name.split(" ")[0]}</p>
                        <p className="text-xs font-bold text-ink/45">
                          {monthCount} avance{monthCount !== 1 ? "s" : ""} en 30 días
                        </p>
                      </div>
                    </div>
                    <p className="text-[13px] font-semibold text-ink/55">
                      Promedio general de todas las áreas registradas.
                    </p>
                  </div>
                </div>
                <div className="mt-5 space-y-2.5 border-t-2 border-dashed border-ink/10 pt-4">
                  {AREAS.map((a) => {
                    const d = radarData.find((r) => r.full === a);
                    const v = d?.avg ?? 0;
                    return (
                      <div key={a}>
                        <div className="flex items-center justify-between text-[12px] font-black">
                          <span className="text-ink/65">{a}</span>
                          <span style={{ color: AREA_COLORS[a] }}>{v > 0 ? v.toFixed(1) : "—"}</span>
                        </div>
                        <div className="mt-1 h-2.5 overflow-hidden rounded-full border border-ink/15 bg-paper">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${(v / 5) * 100}%`, backgroundColor: AREA_COLORS[a] }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </Reveal>
          </div>

          {/* Historial */}
          <section className="mt-8">
            <SectionHead title="Historial de logros" desc={`Todo lo que ${sel.name.split(" ")[0]} ha ido conquistando`} />
            {entries.length === 0 ? (
              <p className="rounded-xl border-2 border-dashed border-ink/20 bg-white/60 px-4 py-8 text-center text-sm font-bold text-ink/45">
                Aquí aparecerá cada avance con su fecha y estrellas.
              </p>
            ) : (
              <ol className="space-y-3">
                {entries.map((e, i) => {
                  const author = db.users.find((u) => u.id === e.authorId);
                  return (
                    <motion.li
                      key={e.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.04, 0.3) }}
                      className="card flex items-start gap-4 p-4"
                    >
                      <span
                        className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink font-display text-sm font-bold text-white"
                        style={{ backgroundColor: AREA_COLORS[e.area] }}
                      >
                        {SHORT[e.area].slice(0, 2)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-display text-[15px] font-semibold">{e.area}</p>
                          <Stars value={e.stars} size={13} />
                          <span className="ml-auto text-[11px] font-bold text-ink/40">
                            {fmtDate(e.date)} · {timeAgo(e.date)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-ink/70">{e.note}</p>
                        <p className="mt-1 text-[11px] font-bold text-ink/40">Registrado por {author?.name ?? "—"}</p>
                      </div>
                      {canManage &&
                        (delId === e.id ? (
                          <div className="flex shrink-0 flex-col gap-1">
                            <button
                              onClick={() => {
                                deleteEntry(e.id);
                                setDelId(null);
                                toast("info", "Avance eliminado.");
                              }}
                              className="btn-toy rounded-lg border-2 border-ink bg-coral px-2 py-1 text-[11px] font-black text-white shadow-toy-xs"
                            >
                              ¿Seguro?
                            </button>
                            <button onClick={() => setDelId(null)} className="text-[11px] font-black text-ink/45 hover:underline">
                              no
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setDelId(e.id);
                              window.setTimeout(() => setDelId((v) => (v === e.id ? null : v)), 2600);
                            }}
                            className="btn-toy flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-ink/15 text-ink/40 hover:border-ink hover:bg-coral hover:text-white"
                            aria-label="Eliminar avance"
                          >
                            <Trash2 size={14} />
                          </button>
                        ))}
                    </motion.li>
                  );
                })}
              </ol>
            )}
          </section>

          {isEducator && sel && (
            <EntryForm
              open={formOpen}
              onClose={() => setFormOpen(false)}
              childId={sel.id}
              childName={sel.name}
              me={me}
            />
          )}
        </>
      )}
    </div>
  );
}
