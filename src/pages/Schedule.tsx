import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Pencil, Plus, Trash2 } from "lucide-react";
import {
  BLOCK_KINDS,
  DAYS,
  deleteBlock,
  groupById,
  KIND_META,
  nowMinutes,
  saveBlock,
  toMin,
  todayDayIdx,
  useDB,
} from "../lib/db";
import type { Block, BlockKind, User } from "../lib/db";
import type { Page } from "../App";
import {
  Button,
  Chip,
  EmptyState,
  Field,
  Modal,
  SectionHead,
  Select,
  TextInput,
  useToast,
} from "../components/ui";

/* ============ Formulario de bloque ============ */
function BlockForm({
  open,
  onClose,
  initial,
  group,
  day,
}: {
  open: boolean;
  onClose: () => void;
  initial: Block | null;
  group: string;
  day: number;
}) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<BlockKind>("clase");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("09:45");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setKind(initial?.kind ?? "clase");
    setStart(initial?.start ?? "09:00");
    setEnd(initial?.end ?? "09:45");
    setError("");
  }, [open, initial]);

  const submit = () => {
    if (title.trim().length < 3) {
      setError("Escribe el nombre de la actividad.");
      return;
    }
    if (toMin(start) >= toMin(end)) {
      setError("La hora de inicio debe ser anterior a la de fin.");
      return;
    }
    saveBlock({ id: initial?.id, group, day, title: title.trim(), kind, start, end });
    toast("success", initial ? "Bloque actualizado." : `Bloque agregado al ${DAYS[day - 1]}.`);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Editar bloque" : "Nuevo bloque"}
      subtitle={`${groupById(group)?.name ?? ""} · ${DAYS[day - 1]}`}
      footer={
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit}>{initial ? "Guardar cambios" : "Agregar al horario"}</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Actividad" error={error || undefined}>
          <TextInput
            placeholder="Ej. Cuentos y rincón de lectura"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </Field>
        <Field label="Tipo de bloque">
          <Select value={kind} onChange={(e) => setKind(e.target.value as BlockKind)}>
            {BLOCK_KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_META[k].label}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Inicio">
            <TextInput type="time" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Fin">
            <TextInput type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
        </div>
        <div className="flex items-center gap-2 rounded-xl border-2 border-dashed border-ink/20 bg-paper px-3.5 py-2.5">
          <span className="h-4 w-4 rounded-full border-2 border-ink" style={{ backgroundColor: KIND_META[kind].color }} />
          <p className="text-[13px] font-bold text-ink/60">
            Se verá así: <span className="text-ink">{KIND_META[kind].label}</span> · {start} – {end}
          </p>
        </div>
      </div>
    </Modal>
  );
}

/* ============ Página ============ */
export default function SchedulePage({ me }: { me: User; go: (p: Page) => void }) {
  const db = useDB();
  const toast = useToast();
  const isParent = me.role === "parent";
  const groups =
    me.role === "admin"
      ? db.groups.map((g) => g.id)
      : isParent
        ? [...new Set(db.children.filter((c) => c.parentId === me.id).map((c) => c.group))]
        : [me.group ?? ""];
  const [selGroup, setSelGroup] = useState<string>("");
  const group = selGroup || groups[0] || "";
  const [selDay, setSelDay] = useState(todayDayIdx());
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Block | null>(null);
  const [delId, setDelId] = useState<string | null>(null);

  const grp = groupById(group);
  const now = nowMinutes();
  const isTodayView = selDay === todayDayIdx();

  const dayBlocks = db.blocks
    .filter((b) => b.group === group && b.day === selDay)
    .sort((a, b) => toMin(a.start) - toMin(b.start));
  const countFor = (d: number) => db.blocks.filter((b) => b.group === group && b.day === d).length;

  return (
    <div>
      <SectionHead
        title={isParent ? "El horario de la sala" : me.role === "admin" ? "Horarios de todas las aulas" : "Ajusta el horario semanal"}
        desc={
          grp
            ? `${grp.emoji} ${grp.name} · las familias ven estos cambios al instante`
            : "Registra a tu peque para ver el horario de su sala."
        }
        action={
          !isParent && group ? (
            <Button
              icon={<Plus size={17} />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Agregar bloque
            </Button>
          ) : undefined
        }
      />

      {/* Selector de sala */}
      {groups.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {groups.map((g) => {
            const gg = groupById(g);
            const active = group === g;
            return (
              <button
                key={g}
                onClick={() => {
                  setSelGroup(g);
                  setSelDay(todayDayIdx());
                }}
                className={`btn-toy rounded-full border-2 px-4 py-2 text-sm font-black shadow-toy-xs ${
                  active ? "border-ink bg-pine text-white" : "border-ink/20 bg-white text-ink/60"
                }`}
              >
                {gg?.emoji} {gg?.name}
              </button>
            );
          })}
        </div>
      )}

      {!group ? (
        <EmptyState
          icon={<Plus size={26} />}
          title="Sin sala para mostrar"
          desc="Cuando agregues a tu peque y elijas su sala, aquí aparecerá su horario semanal."
        />
      ) : (
        <>
          {/* Días de la semana */}
          <div className="mb-5 grid grid-cols-5 gap-2">
            {DAYS.map((d, i) => {
              const day = i + 1;
              const active = selDay === day;
              const today = todayDayIdx() === day;
              const count = countFor(day);
              return (
                <button
                  key={d}
                  onClick={() => setSelDay(day)}
                  className={`btn-toy relative flex flex-col items-center rounded-xl border-2 px-1 py-2.5 shadow-toy-xs ${
                    active ? "border-ink bg-sea text-white" : "border-ink/15 bg-white hover:border-ink/40"
                  }`}
                >
                  {today && (
                    <span className="absolute -top-2 rounded-full border-2 border-ink bg-sun px-1.5 text-[9px] font-black text-ink uppercase">
                      hoy
                    </span>
                  )}
                  <span className="font-display text-sm font-semibold sm:text-base">{d.slice(0, 3)}</span>
                  <span className={`text-[11px] font-bold ${active ? "text-white/75" : "text-ink/40"}`}>
                    {count} bloque{count !== 1 ? "s" : ""}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Leyenda */}
          <div className="mb-5 flex flex-wrap gap-1.5">
            {BLOCK_KINDS.map((k) => (
              <Chip key={k} color={KIND_META[k].color}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: KIND_META[k].color }} />
                {KIND_META[k].label}
              </Chip>
            ))}
          </div>

          {dayBlocks.length === 0 ? (
            <EmptyState
              icon={<Plus size={26} />}
              title={`Sin bloques para el ${DAYS[selDay - 1].toLowerCase()}`}
              desc={
                isParent
                  ? "La sala todavía no publicó el horario de este día. Vuelve pronto."
                  : "Crea el primer bloque del día: bienvenida, talleres, comidas o despedida."
              }
              action={
                !isParent ? (
                  <Button
                    icon={<Plus size={16} />}
                    onClick={() => {
                      setEditing(null);
                      setFormOpen(true);
                    }}
                  >
                    Crear bloque
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <ol className="space-y-2.5">
              {dayBlocks.map((b, i) => {
                const isNow = isTodayView && toMin(b.start) <= now && now < toMin(b.end);
                const past = isTodayView && now >= toMin(b.end);
                return (
                  <motion.li
                    key={b.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`flex items-stretch gap-3 rounded-[16px] border-2 p-3.5 ${
                      isNow ? "border-ink bg-mint shadow-toy-xs" : "border-ink/10 bg-white"
                    } ${past && !isNow ? "opacity-55" : ""}`}
                  >
                    <div className="w-[76px] shrink-0 text-right">
                      <p className="font-display text-base font-semibold">{b.start}</p>
                      <p className="text-xs font-bold text-ink/40">{b.end}</p>
                    </div>
                    <span
                      className="w-2 shrink-0 rounded-full border border-ink/20"
                      style={{ backgroundColor: KIND_META[b.kind].color }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-[16px] leading-snug font-semibold">{b.title}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Chip color={KIND_META[b.kind].color}>{KIND_META[b.kind].label}</Chip>
                        {isNow && (
                          <span className="flex items-center gap-1.5 text-[11px] font-black text-seadeep uppercase">
                            <span className="anim-pulse-dot h-2 w-2 rounded-full bg-sea" /> ocurriendo ahora
                          </span>
                        )}
                      </div>
                    </div>
                    {!isParent && (
                      <div className="flex shrink-0 flex-col justify-center gap-1.5">
                        <button
                          onClick={() => {
                            setEditing(b);
                            setFormOpen(true);
                          }}
                          className="btn-toy flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-white text-seadeep shadow-toy-xs hover:bg-mint"
                          aria-label="Editar bloque"
                        >
                          <Pencil size={13} />
                        </button>
                        {delId === b.id ? (
                          <button
                            onClick={() => {
                              deleteBlock(b.id);
                              setDelId(null);
                              toast("info", "Bloque eliminado del horario.");
                            }}
                            className="btn-toy flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-coral text-white shadow-toy-xs"
                            aria-label="Confirmar eliminación"
                          >
                            <Trash2 size={13} />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setDelId(b.id);
                              window.setTimeout(() => setDelId((v) => (v === b.id ? null : v)), 2600);
                            }}
                            className="btn-toy flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink/15 bg-white text-ink/45 shadow-toy-xs hover:border-ink hover:bg-coral hover:text-white"
                            aria-label="Eliminar bloque"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                  </motion.li>
                );
              })}
            </ol>
          )}

          {grp && dayBlocks.length > 0 && (
            <p className="mt-5 text-center text-[13px] font-bold text-ink/40">
              {grp.emoji} Horario de {grp.name} · {DAYS[selDay - 1]} · {dayBlocks.length} bloque
              {dayBlocks.length !== 1 ? "s" : ""}
            </p>
          )}
        </>
      )}

      <BlockForm open={formOpen} onClose={() => setFormOpen(false)} initial={editing} group={group} day={selDay} />
    </div>
  );
}
