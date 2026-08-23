import { useState } from "react";
import { motion } from "framer-motion";
import {
  BookOpen,
  Download,
  ExternalLink,
  FileText,
  Lightbulb,
  Link2,
  Music,
  PlayCircle,
  Search,
  Trash2,
  UploadCloud,
} from "lucide-react";
import {
  addMaterial,
  allGroups,
  bumpDownload,
  CATEGORIES,
  deleteMaterial,
  fmtBytes,
  groupById,
  timeAgo,
  useDB,
  visibleMaterials,
} from "../lib/db";
import type { Material, MaterialCategory, User } from "../lib/db";
import type { Page } from "../App";
import {
  Button,
  Chip,
  EmptyState,
  Field,
  FileDrop,
  Reveal,
  SectionHead,
  Select,
  TextArea,
  TextInput,
  useToast,
} from "../components/ui";

const CAT_META: Record<MaterialCategory, { color: string; Icon: typeof BookOpen }> = {
  Guías: { color: "#12A59B", Icon: BookOpen },
  Fichas: { color: "#58B8E8", Icon: FileText },
  Canciones: { color: "#F2789F", Icon: Music },
  Videos: { color: "#FF6F61", Icon: PlayCircle },
  Actividades: { color: "#F59E4B", Icon: Lightbulb },
};

/* ============ Panel de subida (educadores y dirección) ============ */
function UploadPanel({ me }: { me: User }) {
  const toast = useToast();
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [category, setCategory] = useState<MaterialCategory>("Guías");
  const [scope, setScope] = useState("all");
  const [useUrl, setUseUrl] = useState(false);
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<{ name: string; size: number; dataUrl: string } | null>(null);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [fileKey, setFileKey] = useState(0);

  const reset = () => {
    setTitle("");
    setDesc("");
    setCategory("Guías");
    setUseUrl(false);
    setUrl("");
    setFile(null);
    setError("");
    setFileKey((k) => k + 1);
  };

  const publish = () => {
    if (title.trim().length < 4) {
      setError("Escribe un título descriptivo (mínimo 4 caracteres).");
      return;
    }
    if (!useUrl && !file) {
      setError("Sube un archivo o activa la opción de enlace.");
      return;
    }
    if (useUrl && !/^https?:\/\/.+\..+/.test(url.trim())) {
      setError("Pega un enlace válido que empiece con https://");
      return;
    }
    setError("");
    setPublishing(true);
    window.setTimeout(() => {
      try {
        addMaterial({
          authorId: me.id,
          title: title.trim(),
          desc: desc.trim() || `Material compartido por ${me.name}.`,
          category,
          scope,
          fileName: useUrl ? undefined : file?.name,
          size: useUrl ? undefined : file?.size,
          dataUrl: useUrl ? undefined : file?.dataUrl,
          url: useUrl ? url.trim() : undefined,
        });
        toast("success", "¡Material publicado! Las familias ya pueden descargarlo.");
        reset();
      } catch (err) {
        toast("error", err instanceof Error ? err.message : "No se pudo publicar el material.");
      } finally {
        setPublishing(false);
      }
    }, 550);
  };

  const scopeOptions =
    me.role === "admin" ? allGroups() : allGroups().filter((g) => g.id === me.group);

  return (
    <Reveal>
      <section className="card mb-8 overflow-hidden">
        <div className="flex items-center gap-3 border-b-2 border-ink/10 bg-pine px-5 py-4 text-white">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-ink bg-sun text-ink">
            <UploadCloud size={20} strokeWidth={2.5} />
          </span>
          <div>
            <h2 className="font-display text-lg leading-tight font-semibold">Publicar material didáctico</h2>
            <p className="text-[13px] font-semibold text-mint/80">
              Guías, fichas, canciones o actividades para que las familias trabajen en casa.
            </p>
          </div>
        </div>
        <div className="grid gap-5 p-5 lg:grid-cols-2">
          <div className="space-y-4">
            <Field label="Título del material" error={error && !error.includes("archivo") && !error.includes("enlace") ? error : undefined}>
              <TextInput
                placeholder="Ej. Guía de lectoescritura para el verano"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </Field>
            <Field label="Descripción corta">
              <TextArea
                className="min-h-[70px]"
                placeholder="¿Qué incluye? ¿Para qué edad? ¿Cómo se usa en casa?"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Categoría">
                <Select value={category} onChange={(e) => setCategory(e.target.value as MaterialCategory)}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Visible para">
                <Select value={scope} onChange={(e) => setScope(e.target.value)}>
                  <option value="all">🌎 Todas las familias</option>
                  {scopeOptions.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.emoji} Solo {g.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border-2 border-ink/15 bg-paper px-3.5 py-2.5">
              <span className="flex items-center gap-2 text-sm font-black">
                <Link2 size={16} className="text-seadeep" /> Publicar un enlace externo
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={useUrl}
                onClick={() => setUseUrl((v) => !v)}
                className={`relative h-7 w-12 rounded-full border-2 border-ink transition-colors ${useUrl ? "bg-sea" : "bg-white"}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full border-2 border-ink bg-white transition-all ${
                    useUrl ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </label>
            {useUrl ? (
              <div className="anim-fade">
                <Field
                  label="Enlace (YouTube, Drive, Canva…)"
                  error={error && error.includes("enlace") ? error : undefined}
                >
                  <TextInput placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
                </Field>
              </div>
            ) : (
              <div className="anim-fade flex-1">
                <p className="mb-1.5 text-[13px] font-black tracking-wide text-ink/70 uppercase">Archivo</p>
                <FileDrop
                  key={fileKey}
                  onFile={(f, dataUrl) => setFile({ name: f.name, size: f.size, dataUrl })}
                  onClear={() => setFile(null)}
                  onError={(msg) => {
                    toast("error", msg);
                    setError(msg);
                  }}
                />
              </div>
            )}
            <div className="mt-auto">
              <Button size="lg" className="w-full" loading={publishing} icon={<UploadCloud size={18} />} onClick={publish}>
                Publicar material
              </Button>
              <p className="mt-2 text-center text-xs font-bold text-ink/40">
                {file
                  ? `Listo: ${file.name} (${fmtBytes(file.size)})`
                  : useUrl
                    ? "Listo: enlace externo"
                    : "El archivo se guarda y se puede descargar sin conexión."}
              </p>
            </div>
          </div>
        </div>
      </section>
    </Reveal>
  );
}

/* ============ Página ============ */
export default function MaterialsPage({ me }: { me: User; go: (p: Page) => void }) {
  const db = useDB();
  const toast = useToast();
  const canPublish = me.role !== "parent";
  const groups =
    me.role === "admin"
      ? db.groups.map((g) => g.id)
      : me.role === "educator"
        ? [me.group ?? ""]
        : [...new Set(db.children.filter((c) => c.parentId === me.id).map((c) => c.group))];

  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<"Todas" | MaterialCategory>("Todas");
  const [delId, setDelId] = useState<string | null>(null);

  const all = visibleMaterials(db, groups).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const filtered = all.filter((m) => {
    const okCat = cat === "Todas" || m.category === cat;
    const q = search.trim().toLowerCase();
    const okSearch = !q || m.title.toLowerCase().includes(q) || m.desc.toLowerCase().includes(q);
    return okCat && okSearch;
  });

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

  const authorName = (id: string) => db.users.find((u) => u.id === id)?.name ?? "Equipo Sammy";

  return (
    <div>
      {canPublish && <UploadPanel me={me} />}

      <SectionHead
        title={canPublish ? "Materiales disponibles" : "Biblioteca para tu familia"}
        desc={
          canPublish
            ? "Lo que tú y otros educadores han publicado."
            : "Descarga guías, fichas y actividades recomendadas por la sala."
        }
      />

      {/* Búsqueda y filtros */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative sm:w-72">
          <Search size={17} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-ink/35" />
          <TextInput
            className="pl-10"
            placeholder="Buscar material…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["Todas", ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={`btn-toy rounded-full border-2 px-3 py-1.5 text-xs font-black shadow-toy-xs ${
                cat === c ? "border-ink bg-pine text-white" : "border-ink/15 bg-white text-ink/55 hover:border-ink/40"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Search size={26} />}
          title={all.length === 0 ? "Aún no hay materiales" : "Nada coincide con tu búsqueda"}
          desc={
            all.length === 0
              ? canPublish
                ? "Publica tu primer material con el formulario de arriba: las familias lo verán al instante."
                : "Cuando la sala publique materiales, aparecerán aquí listos para descargar."
              : "Prueba con otra palabra o quita los filtros."
          }
          action={
            all.length > 0 ? (
              <Button
                variant="ghost"
                onClick={() => {
                  setSearch("");
                  setCat("Todas");
                }}
              >
                Limpiar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m, i) => {
            const meta = CAT_META[m.category];
            const scopeLabel = m.scope === "all" ? "Todas las salas" : groupById(m.scope)?.name ?? m.scope;
            const canDelete = canPublish && (me.role === "admin" || m.authorId === me.id);
            return (
              <motion.article
                key={m.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.05, 0.35) }}
                className="card card-hover flex flex-col p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-ink"
                    style={{ backgroundColor: `${meta.color}33`, color: meta.color }}
                  >
                    <meta.Icon size={20} />
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Chip color={meta.color}>{m.category}</Chip>
                    {canDelete &&
                      (delId === m.id ? (
                        <button
                          onClick={() => {
                            deleteMaterial(m.id);
                            setDelId(null);
                            toast("info", "Material eliminado de la biblioteca.");
                          }}
                          className="btn-toy rounded-lg border-2 border-ink bg-coral px-2 py-1 text-[11px] font-black text-white shadow-toy-xs"
                        >
                          ¿Eliminar?
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setDelId(m.id);
                            window.setTimeout(() => setDelId((v) => (v === m.id ? null : v)), 2600);
                          }}
                          className="btn-toy flex h-7 w-7 items-center justify-center rounded-lg border-2 border-ink/15 text-ink/40 hover:border-ink hover:bg-coral hover:text-white"
                          aria-label="Eliminar material"
                        >
                          <Trash2 size={13} />
                        </button>
                      ))}
                  </div>
                </div>

                <h3 className="mt-3 font-display text-[17px] leading-snug font-semibold">{m.title}</h3>
                <p className="clamp-2 mt-1 flex-1 text-[13px] font-semibold text-ink/55">{m.desc}</p>

                <p className="mt-3 text-[12px] font-bold text-ink/45">
                  {authorName(m.authorId)} · {timeAgo(m.createdAt)} · {scopeLabel}
                  {m.size ? ` · ${fmtBytes(m.size)}` : ""}
                </p>

                <div className="mt-3 flex items-center justify-between border-t-2 border-dashed border-ink/10 pt-3.5">
                  <span className="flex items-center gap-1 text-[12px] font-bold text-ink/45">
                    <Download size={13} /> {m.downloads}
                  </span>
                  <Button
                    size="sm"
                    variant={m.url ? "ghost" : "sun"}
                    icon={m.url ? <ExternalLink size={14} /> : <Download size={14} />}
                    onClick={() => download(m)}
                  >
                    {m.url ? "Abrir enlace" : "Descargar"}
                  </Button>
                </div>
              </motion.article>
            );
          })}
        </div>
      )}

      {me.role === "parent" && all.length > 0 && (
        <p className="mt-6 flex items-center justify-center gap-2 text-center text-[13px] font-bold text-ink/40">
          <FileText size={14} /> {all.length} materiale{all.length !== 1 ? "s" : ""} disponible
          {all.length !== 1 ? "s" : ""} · se descargan y quedan en tu dispositivo
        </p>
      )}
    </div>
  );
}
