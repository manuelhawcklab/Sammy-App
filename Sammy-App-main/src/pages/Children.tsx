import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { AlertTriangle, HeartPulse, Pencil, Plus, Trash2, UserCheck } from "lucide-react";
import {
  ageLabel,
  allGroups,
  AVATAR_COLORS,
  AVATAR_EMOJIS,
  deleteChild,
  groupById,
  saveChild,
  useDB,
} from "../lib/db";
import type { Child, User } from "../lib/db";
import type { Page } from "../App";
import {
  Avatar,
  Button,
  Chip,
  EmptyState,
  Field,
  Modal,
  Reveal,
  SectionHead,
  Select,
  TextArea,
  TextInput,
  useToast,
} from "../components/ui";

/* ============ Formulario de expediente ============ */
export function ChildForm({
  open,
  onClose,
  initial,
  me,
}: {
  open: boolean;
  onClose: () => void;
  initial: Child | null;
  me: User;
}) {
  const db = useDB();
  const toast = useToast();
  const isParent = me.role === "parent";
  const parents = db.users.filter((u) => u.role === "parent");

  const [name, setName] = useState("");
  const [birth, setBirth] = useState("");
  const [group, setGroup] = useState(allGroups()[0]?.id ?? "");
  const [emoji, setEmoji] = useState(AVATAR_EMOJIS[0]);
  const [color, setColor] = useState(AVATAR_COLORS[0]);
  const [allergiesText, setAllergiesText] = useState("");
  const [authorized, setAuthorized] = useState("");
  const [notes, setNotes] = useState("");
  const [parentLink, setParentLink] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setBirth(initial?.birth ?? "");
    setGroup(initial?.group ?? (isParent ? allGroups()[0]?.id ?? "" : me.group ?? allGroups()[0]?.id ?? ""));
    setEmoji(initial?.emoji ?? AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)]);
    setColor(initial?.color ?? AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)]);
    setAllergiesText(initial?.allergies.join(", ") ?? "");
    setAuthorized(initial?.authorized ?? "");
    setNotes(initial?.notes ?? "");
    setParentLink(initial?.parentId ?? "");
    setErrors({});
  }, [open, initial, isParent, me.group]);

  const submit = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 2) e.name = "Escribe el nombre del peque.";
    if (!birth) e.birth = "Selecciona la fecha de nacimiento.";
    else if (new Date(birth) > new Date()) e.birth = "La fecha no puede ser futura.";
    if (!group) e.group = "Elige una sala.";
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    saveChild({
      id: initial?.id,
      parentId: isParent ? me.id : parentLink || null,
      name: name.trim(),
      birth,
      group,
      emoji,
      color,
      allergies: allergiesText.split(",").map((s) => s.trim()).filter(Boolean),
      authorized: authorized.trim(),
      notes: notes.trim(),
    });
    if (initial) {
      toast("success", `Expediente de ${name.split(" ")[0]} actualizado.`);
    } else {
      confetti({ particleCount: 110, spread: 70, origin: { y: 0.4 }, colors: ["#12A59B", "#FFC24B", "#FF6F61", "#58B8E8"] });
      toast("success", `¡${name.split(" ")[0]} ya tiene su expediente en Sammy!`);
    }
    onClose();
  };

  const allergyPreview = allergiesText.split(",").map((s) => s.trim()).filter(Boolean);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Editar expediente" : "Nuevo expediente"}
      subtitle={initial ? `Actualizando la ficha de ${initial.name}` : "La ficha que educadores y familia comparten"}
      wide
      footer={
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon={<UserCheck size={16} />} onClick={submit}>
            {initial ? "Guardar cambios" : "Crear expediente"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
          <Field label="Nombre completo" error={errors.name}>
            <TextInput placeholder="Ej. Julieta Pérez" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Nacimiento" error={errors.birth} hint={birth ? `${ageLabel(birth)} hoy` : undefined}>
            <TextInput type="date" value={birth} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setBirth(e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Sala" error={errors.group}>
            <Select value={group} onChange={(e) => setGroup(e.target.value)}>
              {allGroups().map((g) => (
                <option key={g.id} value={g.id}>
                  {g.emoji} {g.name} · {g.ages}
                </option>
              ))}
            </Select>
          </Field>
          {!isParent && (
            <Field label="Familia vinculada" hint="Para que la familia vea sus horarios y avances.">
              <Select value={parentLink} onChange={(e) => setParentLink(e.target.value)}>
                <option value="">— Sin vincular por ahora —</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · {p.email}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>

        <Field label="Avatar del peque">
          <div className="flex flex-wrap items-center gap-2">
            {AVATAR_EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setEmoji(em)}
                className={`btn-toy flex h-11 w-11 items-center justify-center rounded-xl border-2 text-xl ${
                  emoji === em ? "border-ink bg-mint shadow-toy-xs" : "border-ink/15 bg-white hover:border-ink/40"
                }`}
              >
                {em}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Color favorito">
          <div className="flex flex-wrap items-center gap-2.5">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Color ${c}`}
                className={`btn-toy h-9 w-9 rounded-full border-2 border-ink ${color === c ? "scale-110 shadow-toy-xs" : "opacity-70"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </Field>

        <Field label="Alergias o cuidados de salud" hint="Separa con comas. Ej.: Maní, Lactosa">
          <TextInput placeholder="Sin alergias conocidas" value={allergiesText} onChange={(e) => setAllergiesText(e.target.value)} />
          {allergyPreview.length > 0 && (
            <span className="mt-2 flex flex-wrap gap-1.5">
              {allergyPreview.map((a) => (
                <Chip key={a} color="#FF6F61">
                  <AlertTriangle size={11} strokeWidth={3} /> {a}
                </Chip>
              ))}
            </span>
          )}
        </Field>

        <Field label="Personas autorizadas a retirarle">
          <TextInput placeholder="Ej. Mamá, papá, abuela Rosa" value={authorized} onChange={(e) => setAuthorized(e.target.value)} />
        </Field>

        <Field label="Notas para el aula (o para casa)">
          <TextArea placeholder="Gustos, rutinas, temas de salud, consuelos que funcionan…" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

/* ============ Detalle del expediente ============ */
function ChildDetail({
  child,
  onClose,
  onEdit,
  canEdit,
}: {
  child: Child | null;
  onClose: () => void;
  onEdit: () => void;
  canEdit: boolean;
}) {
  const db = useDB();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  useEffect(() => setConfirming(false), [child]);
  if (!child) return null;
  const parent = child.parentId ? db.users.find((u) => u.id === child.parentId) : null;
  const entries = db.entries.filter((e) => e.childId === child.id).length;
  const grp = groupById(child.group);

  return (
    <Modal
      open={!!child}
      onClose={onClose}
      title="Expediente del peque"
      subtitle="Actualizado por familia y educadores"
      footer={
        canEdit ? (
          <div className="flex flex-wrap justify-between gap-2 pt-1">
            {confirming ? (
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-coraldeep">¿Eliminar expediente?</span>
                <Button
                  size="sm"
                  variant="coral"
                  icon={<Trash2 size={14} />}
                  onClick={() => {
                    deleteChild(child.id);
                    toast("info", `Expediente de ${child.name.split(" ")[0]} eliminado.`);
                    onClose();
                  }}
                >
                  Sí, eliminar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
                  No
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} className="text-coraldeep" onClick={() => setConfirming(true)}>
                Eliminar
              </Button>
            )}
            <Button icon={<Pencil size={15} />} onClick={onEdit}>
              Editar expediente
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="flex items-center gap-4">
        <Avatar emoji={child.emoji} color={child.color} size={64} />
        <div>
          <h4 className="font-display text-2xl font-bold">{child.name}</h4>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <Chip color="#12A59B">{ageLabel(child.birth)} · nació el {child.birth}</Chip>
            {grp && (
              <Chip color="#FFC24B">
                {grp.emoji} {grp.name}
              </Chip>
            )}
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <section className="rounded-xl border-2 border-ink/10 bg-paper p-4">
          <h5 className="flex items-center gap-2 text-[13px] font-black tracking-wide text-ink/60 uppercase">
            <HeartPulse size={15} className="text-coral" /> Salud y alergias
          </h5>
          {child.allergies.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {child.allergies.map((a) => (
                <Chip key={a} color="#FF6F61">
                  <AlertTriangle size={11} strokeWidth={3} /> {a}
                </Chip>
              ))}
            </div>
          ) : (
            <p className="mt-1.5 text-sm font-semibold text-ink/55">Sin alergias registradas.</p>
          )}
        </section>

        <section className="rounded-xl border-2 border-ink/10 bg-paper p-4">
          <h5 className="flex items-center gap-2 text-[13px] font-black tracking-wide text-ink/60 uppercase">
            <UserCheck size={15} className="text-sea" /> Personas autorizadas
          </h5>
          <p className="mt-1.5 text-sm font-bold">{child.authorized || "Sin especificar"}</p>
        </section>

        <section className="rounded-xl border-2 border-ink/10 bg-paper p-4">
          <h5 className="text-[13px] font-black tracking-wide text-ink/60 uppercase">Notas compartidas</h5>
          <p className="mt-1.5 text-sm font-semibold text-ink/70">{child.notes || "Aún no hay notas."}</p>
        </section>

        <div className="flex flex-wrap gap-2">
          <Chip color="#58B8E8">{entries} avances registrados</Chip>
          {parent && <Chip color="#F2789F">Familia: {parent.name}</Chip>}
          {!parent && <Chip color="#F59E4B">Sin familia vinculada</Chip>}
        </div>
      </div>
    </Modal>
  );
}

/* ============ Página ============ */
export default function ChildrenPage({ me }: { me: User; go: (p: Page) => void }) {
  const db = useDB();
  const isParent = me.role === "parent";
  const kids = db.children
    .filter((c) => (isParent ? c.parentId === me.id : me.role === "admin" ? true : c.group === me.group))
    .sort((a, b) => a.name.localeCompare(b.name));

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Child | null>(null);
  const [viewing, setViewing] = useState<Child | null>(null);

  return (
    <div>
      <SectionHead
        title={isParent ? "Los expedientes de tus peques" : me.role === "admin" ? "Expedientes de la plataforma" : "Expedientes de tu sala"}
        desc={
          isParent
            ? "Información que compartes con la sala: salud, retiro y notas."
            : me.role === "admin"
              ? "Todos los niños registrados, con su familia y sala asignadas."
              : "Toda la información de los peques de tu sala, siempre a mano."
        }
        action={
          <Button
            icon={<Plus size={17} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            {isParent ? "Agregar a mi peque" : "Nuevo expediente"}
          </Button>
        }
      />

      {kids.length === 0 ? (
        <EmptyState
          icon={<Plus size={26} />}
          title={isParent ? "Aún no registras a ningún peque" : "Aún no hay niños registrados"}
          desc={
            isParent
              ? "Crea su expediente en un minuto: nombre, sala, alergias y personas autorizadas."
              : "Crea el primer expediente para empezar a registrar avances."
          }
          action={
            <Button
              icon={<Plus size={16} />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Crear expediente
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kids.map((k, i) => {
            const grp = groupById(k.group);
            const entries = db.entries.filter((e) => e.childId === k.id).length;
            const parent = k.parentId ? db.users.find((u) => u.id === k.parentId) : null;
            return (
              <Reveal key={k.id} delay={i * 60}>
                <article className="card card-hover flex h-full flex-col p-5">
                  <div className="flex items-start gap-3.5">
                    <Avatar emoji={k.emoji} color={k.color} size={56} />
                    <div className="min-w-0">
                      <h3 className="truncate font-display text-lg leading-tight font-bold">{k.name}</h3>
                      <p className="text-[13px] font-bold text-ink/50">{ageLabel(k.birth)}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {grp && (
                          <Chip color="#FFC24B">
                            {grp.emoji} {grp.name.replace("Sala ", "")}
                          </Chip>
                        )}
                        {k.allergies.length > 0 && (
                          <Chip color="#FF6F61">
                            <AlertTriangle size={11} strokeWidth={3} /> {k.allergies.length} alergia{k.allergies.length > 1 ? "s" : ""}
                          </Chip>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="clamp-2 mt-3 flex-1 text-[13px] font-semibold text-ink/55">
                    {k.notes || "Sin notas todavía."}
                  </p>
                  <div className="mt-4 flex items-center justify-between border-t-2 border-dashed border-ink/10 pt-3.5">
                    <span className="text-[12px] font-bold text-ink/45">
                      {entries} avance{entries !== 1 ? "s" : ""}
                      {!isParent && parent ? ` · ${parent.name.split(" ")[0]}` : ""}
                      {!isParent && !parent ? " · sin vincular" : ""}
                    </span>
                    <div className="flex gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Pencil size={13} />}
                        onClick={() => {
                          setEditing(k);
                          setFormOpen(true);
                        }}
                      >
                        Editar
                      </Button>
                      <Button size="sm" variant="sun" onClick={() => setViewing(k)}>
                        Ver
                      </Button>
                    </div>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      )}

      <ChildForm open={formOpen} onClose={() => setFormOpen(false)} initial={editing} me={me} />
      <ChildDetail
        child={viewing}
        onClose={() => setViewing(null)}
        canEdit
        onEdit={() => {
          if (!viewing) return;
          setEditing(viewing);
          setViewing(null);
          setFormOpen(true);
        }}
      />
    </div>
  );
}
