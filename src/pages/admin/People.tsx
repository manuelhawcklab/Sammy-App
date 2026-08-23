import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, Pencil, Plus, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import {
  adminCreateUser,
  ageLabel,
  allGroups,
  deleteChild,
  deleteUser,
  fmtDate,
  groupById,
  saveChild,
  updateUser,
  useDB,
} from "../../lib/db";
import type { Child, Role, User } from "../../lib/db";
import { ChildForm } from "../Children";
import {
  Avatar,
  Button,
  Chip,
  EmptyState,
  Field,
  Modal,
  Reveal,
  SectionHead,
  Segmented,
  Select,
  TextInput,
  useToast,
} from "../../components/ui";

const ROLE_META: Record<Role, { label: string; color: string }> = {
  parent: { label: "Familia", color: "#58B8E8" },
  educator: { label: "Educador", color: "#12A59B" },
  admin: { label: "Dirección", color: "#FF6F61" },
};
const roleEmoji = (r: Role) => (r === "educator" ? "🧑‍🏫" : r === "admin" ? "🛡️" : "🧑‍🤝‍🧑");

/* ============ Formulario de usuario ============ */
function UserForm({ open, onClose, initial }: { open: boolean; onClose: () => void; initial: User | null }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [role, setRole] = useState<Role>("parent");
  const [group, setGroup] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setEmail(initial?.email ?? "");
    setPass(initial?.pass ?? "");
    setRole(initial?.role ?? "parent");
    setGroup(initial?.group ?? allGroups()[0]?.id ?? "");
    setErrors({});
  }, [open, initial]);

  const submit = () => {
    const e: Record<string, string> = {};
    if (name.trim().length < 3) e.name = "Escribe el nombre completo.";
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = "Correo inválido.";
    if (pass.length < 6) e.pass = "Mínimo 6 caracteres.";
    if (role === "educator" && !group) e.group = "Elige una sala.";
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      if (initial) {
        updateUser(initial.id, {
          name: name.trim(),
          email,
          pass,
          role,
          group: role === "educator" ? group : undefined,
        });
        toast("success", `Cuenta de ${name.split(" ")[0]} actualizada.`);
      } else {
        adminCreateUser({ role, name, email, pass, group });
        toast("success", "Usuario creado. Ya puede iniciar sesión con su correo y contraseña.");
      }
      onClose();
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "No se pudo guardar el usuario.");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? "Editar usuario" : "Nuevo usuario"}
      subtitle={initial ? initial.email : "Crea la cuenta y comparte las credenciales"}
      footer={
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button icon={<UserPlus size={15} />} onClick={submit}>
            {initial ? "Guardar cambios" : "Crear usuario"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <Field label="Rol">
          <Segmented
            value={role}
            onChange={setRole}
            options={[
              { value: "parent", label: "Familia", icon: <Users size={14} /> },
              { value: "educator", label: "Educador", icon: <GraduationCap size={14} /> },
              { value: "admin", label: "Dirección", icon: <ShieldCheck size={14} /> },
            ]}
          />
        </Field>
        <Field label="Nombre completo" error={errors.name}>
          <TextInput placeholder="Ej. Miss Laura Torres" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Correo" error={errors.email}>
            <TextInput type="email" placeholder="correo@sammy.app" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Contraseña" error={errors.pass}>
            <TextInput value={pass} onChange={(e) => setPass(e.target.value)} />
          </Field>
        </div>
        {role === "educator" && (
          <div className="anim-fade">
            <Field label="Sala asignada" error={errors.group} hint="Puedes cambiarla cuando quieras.">
              <Select value={group} onChange={(e) => setGroup(e.target.value)}>
                {allGroups().map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.emoji} {g.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ============ Página ============ */
export default function PeoplePage({ me }: { me: User }) {
  const db = useDB();
  const toast = useToast();
  const [tab, setTab] = useState<"users" | "kids">("users");
  const [filter, setFilter] = useState<"all" | Role>("all");
  const [userFormOpen, setUserFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [delUser, setDelUser] = useState<string | null>(null);
  const [kidFormOpen, setKidFormOpen] = useState(false);
  const [editingKid, setEditingKid] = useState<Child | null>(null);
  const [delKid, setDelKid] = useState<string | null>(null);

  const users = db.users
    .filter((u) => filter === "all" || u.role === filter)
    .sort((a, b) => a.name.localeCompare(b.name));
  const parents = db.users.filter((u) => u.role === "parent");
  const kids = [...db.children].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      <SectionHead
        title="Personas de la plataforma"
        desc="Usuarios, familias y niños: crea cuentas, asigna salas y vincula peques con sus familias."
        action={
          tab === "users" ? (
            <Button
              icon={<UserPlus size={16} />}
              onClick={() => {
                setEditingUser(null);
                setUserFormOpen(true);
              }}
            >
              Nuevo usuario
            </Button>
          ) : (
            <Button
              icon={<Plus size={16} />}
              onClick={() => {
                setEditingKid(null);
                setKidFormOpen(true);
              }}
            >
              Nuevo niño
            </Button>
          )
        }
      />

      <div className="mb-5 max-w-md">
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "users", label: `Usuarios (${db.users.length})`, icon: <Users size={15} /> },
            { value: "kids", label: `Niños (${db.children.length})`, icon: <GraduationCap size={15} /> },
          ]}
        />
      </div>

      {tab === "users" ? (
        <>
          <div className="mb-4 flex flex-wrap gap-1.5">
            {(["all", "parent", "educator", "admin"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`btn-toy rounded-full border-2 px-3.5 py-1.5 text-xs font-black shadow-toy-xs ${
                  filter === f ? "border-ink bg-pine text-white" : "border-ink/15 bg-white text-ink/55 hover:border-ink/40"
                }`}
              >
                {f === "all" ? "Todos" : `${ROLE_META[f].label}s`}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {users.map((u, i) => {
              const grp = groupById(u.group);
              const kidCount = db.children.filter((c) => c.parentId === u.id).length;
              const isMe = u.id === me.id;
              return (
                <motion.article
                  key={u.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.3) }}
                  className="card flex flex-wrap items-center gap-3.5 p-4"
                >
                  <Avatar emoji={roleEmoji(u.role)} color={u.color} size={48} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-[16px] leading-tight font-bold">{u.name}</p>
                      <Chip color={ROLE_META[u.role].color}>{ROLE_META[u.role].label}</Chip>
                      {isMe && <Chip color="#FFC24B">Tú</Chip>}
                    </div>
                    <p className="truncate text-[13px] font-bold text-ink/50">
                      {u.email} · desde el {fmtDate(u.createdAt)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {u.role === "educator" && grp && (
                        <Chip color="#12A59B">
                          {grp.emoji} {grp.name}
                        </Chip>
                      )}
                      {u.role === "parent" && (
                        <Chip color="#58B8E8">
                          {kidCount} peque{kidCount !== 1 ? "s" : ""} vinculados
                        </Chip>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Pencil size={13} />}
                      onClick={() => {
                        setEditingUser(u);
                        setUserFormOpen(true);
                      }}
                    >
                      Editar
                    </Button>
                    {!isMe &&
                      (delUser === u.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="coral"
                            onClick={() => {
                              try {
                                deleteUser(u.id);
                                toast("info", `Cuenta de ${u.name.split(" ")[0]} eliminada.`);
                              } catch (err) {
                                toast("error", err instanceof Error ? err.message : "No se pudo eliminar.");
                              }
                              setDelUser(null);
                            }}
                          >
                            ¿Eliminar?
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDelUser(null)}>
                            No
                          </Button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setDelUser(u.id);
                            window.setTimeout(() => setDelUser((v) => (v === u.id ? null : v)), 2600);
                          }}
                          className="btn-toy flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink/15 text-ink/40 hover:border-ink hover:bg-coral hover:text-white"
                          aria-label="Eliminar usuario"
                        >
                          <Trash2 size={14} />
                        </button>
                      ))}
                  </div>
                </motion.article>
              );
            })}
          </div>
        </>
      ) : (
        <>
          {kids.length === 0 ? (
            <EmptyState
              icon={<Plus size={26} />}
              title="Aún no hay niños"
              desc="Crea el primer expediente y vincúlalo con su familia y su sala."
              action={
                <Button
                  icon={<Plus size={16} />}
                  onClick={() => {
                    setEditingKid(null);
                    setKidFormOpen(true);
                  }}
                >
                  Crear expediente
                </Button>
              }
            />
          ) : (
            <div className="space-y-3">
              {kids.map((k, i) => {
                const grp = groupById(k.group);
                return (
                  <motion.article
                    key={k.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.04, 0.3) }}
                    className="card flex flex-wrap items-center gap-3.5 p-4"
                  >
                    <Avatar emoji={k.emoji} color={k.color} size={48} />
                    <div className="min-w-[150px] flex-1">
                      <p className="font-display text-[16px] leading-tight font-bold">{k.name}</p>
                      <p className="text-[13px] font-bold text-ink/50">{ageLabel(k.birth)}</p>
                      {k.allergies.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {k.allergies.map((a) => (
                            <Chip key={a} color="#FF6F61">
                              {a}
                            </Chip>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid flex-1 grid-cols-1 gap-2 sm:min-w-[320px] sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-[10px] font-black tracking-wide text-ink/45 uppercase">Familia asignada</p>
                        <Select
                          value={k.parentId ?? ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            saveChild({ ...k, parentId: v || null });
                            const p = parents.find((x) => x.id === v);
                            toast(
                              "success",
                              p
                                ? `${k.name.split(" ")[0]} ahora está con la familia de ${p.name}.`
                                : `${k.name.split(" ")[0]} quedó sin familia vinculada.`
                            );
                          }}
                        >
                          <option value="">— Sin familia —</option>
                          {parents.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div>
                        <p className="mb-1 text-[10px] font-black tracking-wide text-ink/45 uppercase">Sala</p>
                        <Select
                          value={k.group}
                          onChange={(e) => {
                            saveChild({ ...k, group: e.target.value });
                            toast("success", `${k.name.split(" ")[0]} se movió a ${groupById(e.target.value)?.name}.`);
                          }}
                        >
                          {allGroups().map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.emoji} {g.name}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Pencil size={13} />}
                        onClick={() => {
                          setEditingKid(k);
                          setKidFormOpen(true);
                        }}
                      >
                        Ficha
                      </Button>
                      {delKid === k.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="coral"
                            onClick={() => {
                              deleteChild(k.id);
                              setDelKid(null);
                              toast("info", `Expediente de ${k.name.split(" ")[0]} eliminado.`);
                            }}
                          >
                            ¿Eliminar?
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDelKid(null)}>
                            No
                          </Button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setDelKid(k.id);
                            window.setTimeout(() => setDelKid((v) => (v === k.id ? null : v)), 2600);
                          }}
                          className="btn-toy flex h-8 w-8 items-center justify-center rounded-lg border-2 border-ink/15 text-ink/40 hover:border-ink hover:bg-coral hover:text-white"
                          aria-label="Eliminar niño"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                    {grp && <span className="sr-only">{grp.name}</span>}
                  </motion.article>
                );
              })}
            </div>
          )}
        </>
      )}

      <UserForm open={userFormOpen} onClose={() => setUserFormOpen(false)} initial={editingUser} />
      <ChildForm open={kidFormOpen} onClose={() => setKidFormOpen(false)} initial={editingKid} me={me} />
    </div>
  );
}
