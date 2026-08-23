import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  DoorOpen,
  FolderOpen,
  GraduationCap,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import { addGroup, deleteGroup, updateGroup, useDB } from "../../lib/db";
import type { Group } from "../../lib/db";
import {
  Button,
  Chip,
  EmptyState,
  Field,
  Modal,
  Reveal,
  SectionHead,
  TextInput,
  useToast,
} from "../../components/ui";

const ROOM_EMOJIS = ["🐝", "🐦", "🦉", "🦋", "🐞", "🐢", "🦊", "🐸", "🌻", "🌈", "⭐", "🍄", "🐬", "🌙"];

function GroupForm({ open, onClose, initial }: { open: boolean; onClose: () => void; initial: Group | null }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [ages, setAges] = useState("");
  const [emoji, setEmoji] = useState(ROOM_EMOJIS[0]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setAges(initial?.ages ?? "");
    setEmoji(initial?.emoji ?? ROOM_EMOJIS[Math.floor(Math.random() * ROOM_EMOJIS.length)]);
    setError("");
  }, [open, initial]);

  const submit = () => {
    if (name.trim().length < 3) {
      setError("El nombre del aula necesita al menos 3 caracteres.");
      return;
    }
    if (initial) {
      updateGroup(initial.id, { name: name.trim(), ages: ages.trim() || "Por definir", emoji });
      toast("success", `Aula “${name.trim()}” actualizada.`);
    } else {
      addGroup({ name: name.trim(), ages: ages.trim() || "Por definir", emoji });
      toast("success", `¡Aula “${name.trim()}” creada! Ya puedes asignarle niños y educadores.`);
    }
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Editar aula" : "Nueva aula"}
      subtitle={initial ? initial.name : "Un nuevo espacio para tus peques"}
      footer={
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon={<DoorOpen size={15} />} onClick={submit}>
            {initial ? "Guardar cambios" : "Crear aula"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Nombre del aula" error={error || undefined}>
          <TextInput placeholder="Ej. Sala Tucanes" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Edades" hint="Ej. 3–4 años">
          <TextInput placeholder="Ej. 3–4 años" value={ages} onChange={(e) => setAges(e.target.value)} />
        </Field>
        <Field label="Mascota del aula">
          <div className="flex flex-wrap gap-2">
            {ROOM_EMOJIS.map((em) => (
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
      </div>
    </Modal>
  );
}

export default function AulasPage() {
  const db = useDB();
  const toast = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Group | null>(null);
  const [delId, setDelId] = useState<string | null>(null);

  return (
    <div>
      <SectionHead
        title="Aulas de la plataforma"
        desc="Crea, renombra o elimina salas. Los cambios se reflejan en horarios, expedientes y materiales."
        action={
          <Button
            icon={<Plus size={17} />}
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            Nueva aula
          </Button>
        }
      />

      {db.groups.length === 0 ? (
        <EmptyState
          icon={<DoorOpen size={26} />}
          title="No hay aulas creadas"
          desc="Crea la primera aula para empezar a organizar niños, educadores y horarios."
          action={
            <Button
              icon={<Plus size={16} />}
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              Crear aula
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {db.groups.map((g, i) => {
            const kids = db.children.filter((c) => c.group === g.id).length;
            const educators = db.users.filter((u) => u.role === "educator" && u.group === g.id).length;
            const blocks = db.blocks.filter((b) => b.group === g.id).length;
            const materials = db.materials.filter((m) => m.scope === g.id).length;
            return (
              <Reveal key={g.id} delay={i * 60}>
                <motion.article whileHover={{ y: -3 }} className="card card-hover flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-ink bg-mint text-3xl">
                      {g.emoji}
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          setEditing(g);
                          setFormOpen(true);
                        }}
                        className="btn-toy flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink bg-white text-seadeep shadow-toy-xs hover:bg-mint"
                        aria-label="Editar aula"
                      >
                        <Pencil size={13} />
                      </button>
                      {delId === g.id ? (
                        <button
                          onClick={() => {
                            try {
                              deleteGroup(g.id);
                              toast("info", `Aula “${g.name}” eliminada.`);
                            } catch (err) {
                              toast("error", err instanceof Error ? err.message : "No se pudo eliminar.");
                            }
                            setDelId(null);
                          }}
                          className="btn-toy flex h-8 items-center justify-center rounded-lg border-2 border-ink bg-coral px-2 text-[11px] font-black text-white shadow-toy-xs"
                        >
                          ¿Seguro?
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setDelId(g.id);
                            window.setTimeout(() => setDelId((v) => (v === g.id ? null : v)), 2600);
                          }}
                          className="btn-toy flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink/15 bg-white text-ink/40 shadow-toy-xs hover:border-ink hover:bg-coral hover:text-white"
                          aria-label="Eliminar aula"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                  <h3 className="mt-3 font-display text-xl leading-tight font-bold">{g.name}</h3>
                  <Chip color="#12A59B">{g.ages}</Chip>
                  <div className="mt-4 grid grid-cols-2 gap-2 border-t-2 border-dashed border-ink/10 pt-4">
                    <p className="flex items-center gap-1.5 text-[13px] font-black text-ink/60">
                      <Users size={14} className="text-breeze" /> {kids} niño{kids !== 1 ? "s" : ""}
                    </p>
                    <p className="flex items-center gap-1.5 text-[13px] font-black text-ink/60">
                      <GraduationCap size={14} className="text-sea" /> {educators} educador{educators !== 1 ? "es" : ""}
                    </p>
                    <p className="flex items-center gap-1.5 text-[13px] font-black text-ink/60">
                      <CalendarDays size={14} className="text-sundeep" /> {blocks} bloques
                    </p>
                    <p className="flex items-center gap-1.5 text-[13px] font-black text-ink/60">
                      <FolderOpen size={14} className="text-coral" /> {materials} exclusivos
                    </p>
                  </div>
                  {kids === 0 && educators === 0 && (
                    <p className="mt-3 rounded-lg bg-sun/20 px-2.5 py-1.5 text-[11px] font-black text-sundeep">
                      Aula libre: puedes eliminarla sin riesgo.
                    </p>
                  )}
                </motion.article>
              </Reveal>
            );
          })}

          {/* Tarjeta fantasma para crear */}
          <Reveal delay={db.groups.length * 60}>
            <button
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="btn-toy flex h-full min-h-[210px] w-full flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-ink/25 bg-white/40 text-ink/45 hover:border-sea hover:bg-mint/50 hover:text-seadeep"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-ink bg-sun text-ink">
                <Plus size={22} strokeWidth={2.6} />
              </span>
              <span className="font-display text-base font-semibold">Agregar aula</span>
            </button>
          </Reveal>
        </div>
      )}

      <GroupForm open={formOpen} onClose={() => setFormOpen(false)} initial={editing} />
    </div>
  );
}
