import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import confetti from "canvas-confetti";
import {
  CalendarDays,
  FolderOpen,
  GraduationCap,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  UserPlus,
  Users,
} from "lucide-react";
import { isSupabaseConfigured, supabase } from "../lib/supabase";
import {
  allGroups,
  login as loginLocal,
  register as registerLocal,
  mutate,
  type Role,
  type User as DBUser,
} from "../lib/db";
import {
  Button,
  Field,
  SammyImg,
  Segmented,
  Select,
  TextInput,
  useToast,
} from "../components/ui";

function Floaty({
  className = "",
  delay = 0,
  slow = false,
  children,
}: {
  className?: string;
  delay?: number;
  slow?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={`pointer-events-none absolute ${slow ? "anim-float-slow" : "anim-float"} ${className}`}
      style={{ animationDelay: `${delay}s` }}
    >
      {children}
    </div>
  );
}

const PERKS = [
  { Icon: Users, text: "Familias, educadores y dirección conectados en un mismo lugar" },
  { Icon: FolderOpen, text: "Material didáctico siempre a mano, incluso sin señal" },
  { Icon: CalendarDays, text: "Horarios de la sala y avances de los peques al día" },
  { Icon: TrendingUp, text: "Seguimiento del desarrollo por áreas, semana a semana" },
];

export default function Login() {
  const toast = useToast();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [role, setRole] = useState<Role>("parent");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [group, setGroup] = useState(() => allGroups()[0]?.id ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode === "register" && name.trim().length < 3) e.name = "Escribe tu nombre completo.";
    if (!/^\S+@\S+\.\S+$/.test(email)) e.email = "Escribe un correo válido.";
    if (pass.length < 6) e.pass = "La contraseña debe tener al menos 6 caracteres.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      if (mode === "login") {
        if (isSupabaseConfigured && supabase) {
          // Autenticación contra la nube (tabla users de Supabase)
          const { data, error } = await supabase
            .from("users")
            .select("*")
            .eq("email", email.trim().toLowerCase())
            .single();

          if (error || !data) {
            toast("error", "Correo o contraseña incorrectos.");
            return;
          }
          const user = data as DBUser;
          if (user.pass !== pass) {
            toast("error", "Correo o contraseña incorrectos.");
            return;
          }

          // Actualizar sesión usando mutate() - esto dispara el evento de actualización
          mutate((d) => {
            d.session = user.id;
            // Asegurar que el usuario esté en la lista local
            if (!d.users.some((u) => u.id === user.id)) {
              d.users.push(user);
            } else {
              // Actualizar usuario existente
              const idx = d.users.findIndex((u) => u.id === user.id);
              d.users[idx] = user;
            }
          });
        } else {
          // Sin Supabase configurado: autenticación local en el dispositivo
          loginLocal(email, pass);
        }
        toast("success", `¡Hola de nuevo!`);
      } else {
        // Registro: crear cuenta y abrir sesión
        const normalizedEmail = email.trim().toLowerCase();
        const u = registerLocal({ role, name, email: normalizedEmail, pass, group });

        if (isSupabaseConfigured && supabase) {
          // Espejar la cuenta en la nube (sin bloquear si falla)
          const { error } = await supabase.from("users").upsert(u as object, { onConflict: "id" });
          if (error) console.warn("No se pudo registrar el usuario en Supabase:", error.message);
        }

        confetti({
          particleCount: 140,
          spread: 75,
          origin: { y: 0.35 },
          colors: ["#12A59B", "#FFC24B", "#FF6F61", "#58B8E8", "#7DC95E"],
        });
        toast("success", `¡Cuenta creada! Bienvenid@, ${u.name.split(" ")[0]}.`);
      }
    } catch (err) {
      toast("error", err instanceof Error ? err.message : "Algo salió mal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      {/* ---- Panel de marca ---- */}
      <div className="bg-dots-light relative hidden overflow-hidden bg-pine text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Floaty className="left-10 top-16" delay={0.2}>
          <Sparkles size={30} className="text-sun" />
        </Floaty>
        <Floaty className="right-14 top-28" delay={1.1} slow>
          <div className="flex h-14 w-14 rotate-6 items-center justify-center rounded-2xl border-2 border-ink bg-coral font-display text-2xl font-bold">
            a
          </div>
        </Floaty>
        <Floaty className="left-16 bottom-40" delay={0.6} slow>
          <div className="flex h-12 w-12 -rotate-6 items-center justify-center rounded-full border-2 border-ink bg-breeze font-display text-xl font-bold">
            3
          </div>
        </Floaty>
        <Floaty className="right-24 bottom-24" delay={1.6}>
          <svg width="70" height="22" viewBox="0 0 70 22" fill="none">
            <path
              d="M2 14 C 10 2, 18 2, 26 14 S 42 26, 50 14 S 64 4, 68 10"
              stroke="#7DC95E"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </svg>
        </Floaty>
        <Floaty className="left-1/2 top-12" delay={2}>
          <div className="h-5 w-5 rotate-45 rounded-[6px] border-2 border-ink bg-sun" />
        </Floaty>

        <div className="relative z-10 mt-4">
          <div className="inline-flex items-center gap-3">
            <SammyImg className="h-14 w-14 rounded-2xl border-2 border-white/25 shadow-toy" />
            <div>
              <p className="font-display text-sm font-medium text-mint">Aprende con</p>
              <p className="font-display text-3xl leading-none font-bold">Sammy</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-5xl leading-[1.05] font-bold xl:text-6xl">
            El aula y la familia,{" "}
            <span className="relative inline-block text-sun">
              conectadas
              <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 220 12" fill="none">
                <path d="M3 9 C 60 2, 160 2, 217 8" stroke="#FF6F61" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-5 text-lg font-semibold text-mint/90">
            Registra a tus peques, consulta el horario de la sala, descarga material didáctico y
            celebra cada avance. Todo en una app.
          </p>
          <ul className="mt-8 space-y-3">
            {PERKS.map(({ Icon, text }, i) => (
              <li key={text} className="anim-slide-up flex items-center gap-3" style={{ animationDelay: `${0.15 + i * 0.1}s` }}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-white/10 text-sun">
                  <Icon size={19} />
                </span>
                <span className="font-bold text-white/90">{text}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-sm font-bold text-mint/70">
          Instalable como app en tu teléfono · funciona sin conexión
        </p>
      </div>

      {/* ---- Formulario ---- */}
      <div className="bg-dots flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="anim-pop w-full max-w-md">
          <div className="mb-6 flex items-center gap-3 lg:hidden">
            <SammyImg className="h-14 w-14 rounded-2xl border-2 border-ink shadow-toy-sm" />
            <div>
              <p className="font-display text-sm font-medium text-seadeep">Aprende con</p>
              <p className="font-display text-2xl leading-none font-bold text-ink">Sammy</p>
            </div>
          </div>

          <div className="card p-6 sm:p-8">
            <h2 className="font-display text-2xl font-bold">
              {mode === "login" ? "¡Hola otra vez!" : "Crea tu cuenta"}
            </h2>
            <p className="mt-1 text-sm font-semibold text-ink/55">
              {mode === "login"
                ? "Entra para ver el día de tus peques."
                : "Únete en menos de un minuto. Es gratis."}
            </p>

            <div className="mt-5">
              <Segmented
                value={mode}
                onChange={setMode}
                options={[
                  { value: "login", label: "Entrar", icon: <User size={15} /> },
                  { value: "register", label: "Crear cuenta", icon: <UserPlus size={15} /> },
                ]}
              />
            </div>

            <form onSubmit={submit} className="mt-5 space-y-4">
              {mode === "register" && (
                <div className="anim-fade">
                  <Segmented
                    value={role}
                    onChange={setRole}
                    options={[
                      { value: "parent", label: "Soy familia", icon: <Users size={15} /> },
                      { value: "educator", label: "Soy educador", icon: <GraduationCap size={15} /> },
                    ]}
                  />
                </div>
              )}

              {mode === "register" && (
                <Field label="Nombre completo" error={errors.name}>
                  <div className="relative">
                    <User size={17} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink/35" />
                    <TextInput
                      className="pl-10"
                      placeholder="Ej. María Fernanda López"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </Field>
              )}

              <Field label="Correo electrónico" error={errors.email}>
                <div className="relative">
                  <Mail size={17} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink/35" />
                  <TextInput
                    className="pl-10"
                    type="email"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </Field>

              <Field label="Contraseña" error={errors.pass}>
                <div className="relative">
                  <Lock size={17} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink/35" />
                  <TextInput
                    className="pl-10"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                  />
                </div>
              </Field>

              {mode === "register" && role === "educator" && (
                <div className="anim-fade">
                  <Field label="Sala que lideras" hint="Podrás gestionarla al entrar.">
                    <Select value={group} onChange={(e) => setGroup(e.target.value)}>
                      {allGroups().map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.emoji} {g.name} · {g.ages}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              )}

              <Button type="submit" size="lg" loading={loading} className="w-full">
                {mode === "login" ? "Entrar" : "Crear mi cuenta"}
              </Button>
            </form>
          </div>

          <p className="mt-4 text-center text-xs font-bold text-ink/40">
            Hecho con cariño para peques curiosos 🐼
          </p>
        </div>
      </div>
    </div>
  );
}
