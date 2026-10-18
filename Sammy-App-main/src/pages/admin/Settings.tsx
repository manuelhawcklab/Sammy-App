import { useRef, useState } from "react";
import {
  Database,
  Download,
  RefreshCw,
  ShieldAlert,
  Smartphone,
  Upload,
} from "lucide-react";
import { importData, resetData, storageKB, useDB } from "../../lib/db";
import { useInstall } from "../../lib/pwa";
import { Button, Chip, Modal, Reveal, SectionHead, useToast } from "../../components/ui";

export default function SettingsPage() {
  const db = useDB();
  const toast = useToast();
  const { canInstall, installed, promptInstall } = useInstall();
  const fileRef = useRef<HTMLInputElement>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const kb = storageKB();
  const pct = Math.min((kb / 4096) * 100, 100);

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sammy-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("success", "Respaldo descargado. Guárdalo en un lugar seguro.");
  };

  const counts: [string, number][] = [
    ["Usuarios", db.users.length],
    ["Niños", db.children.length],
    ["Aulas", db.groups.length],
    ["Bloques de horario", db.blocks.length],
    ["Materiales", db.materials.length],
    ["Avances", db.entries.length],
  ];

  return (
    <div>
      <SectionHead
        title="Ajustes de la plataforma"
        desc="Datos, respaldos y mantenimiento. Todo lo que hagas aquí afecta a toda la comunidad."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        {/* ===== Datos y almacenamiento ===== */}
        <Reveal>
          <section className="card flex h-full flex-col p-5">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Database size={19} className="text-seadeep" /> Datos y almacenamiento
            </h3>
            <p className="mt-1 text-[13px] font-semibold text-ink/55">
              La información vive en este dispositivo. Haz respaldos frecuentes.
            </p>
            <div className="mt-4">
              <div className="flex items-center justify-between text-[12px] font-black">
                <span className="text-ink/55">Espacio usado</span>
                <span className="text-seadeep">{kb.toFixed(1)} KB</span>
              </div>
              <div className="mt-1.5 h-3.5 overflow-hidden rounded-full border-2 border-ink/20 bg-paper">
                <div
                  className="h-full rounded-full bg-sea transition-all duration-700"
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {counts.map(([label, n]) => (
                <div key={label} className="rounded-xl border-2 border-ink/10 bg-paper px-3 py-2.5">
                  <p className="font-display text-xl leading-none font-bold">{n}</p>
                  <p className="mt-0.5 text-[11px] font-black text-ink/45">{label}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* ===== Respaldo ===== */}
        <Reveal delay={80}>
          <section className="card flex h-full flex-col p-5">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Download size={19} className="text-seadeep" /> Respaldo y restauración
            </h3>
            <p className="mt-1 text-[13px] font-semibold text-ink/55">
              Exporta toda la plataforma en un archivo JSON o restaura un respaldo previo.
            </p>
            <div className="mt-4 flex flex-col gap-2.5">
              <Button icon={<Download size={16} />} onClick={exportJSON}>
                Exportar respaldo (.json)
              </Button>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  try {
                    const text = await f.text();
                    importData(text);
                    toast("success", "Respaldo importado. La plataforma quedó restaurada.");
                  } catch (err) {
                    toast(
                      "error",
                      err instanceof Error ? err.message : "El archivo no es un respaldo válido."
                    );
                  }
                }}
              />
              <Button variant="ghost" icon={<Upload size={16} />} onClick={() => fileRef.current?.click()}>
                Importar respaldo
              </Button>
            </div>
            <p className="mt-auto pt-4 text-[11px] font-bold text-ink/40">
              Al importar, los datos actuales se reemplazan por completo.
            </p>
          </section>
        </Reveal>

        {/* ===== Zona de peligro ===== */}
        <Reveal delay={120}>
          <section className="card flex h-full flex-col border-coral p-5">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold text-coraldeep">
              <ShieldAlert size={19} /> Zona de peligro
            </h3>
            <p className="mt-1 text-[13px] font-semibold text-ink/55">
              Restablece la plataforma a sus datos de demostración: aulas, usuarios, niños, horarios y
              materiales vuelven a su estado inicial.
            </p>
            <div className="mt-4">
              <Button variant="coral" icon={<RefreshCw size={16} />} onClick={() => setResetOpen(true)}>
                Restablecer datos de demostración
              </Button>
            </div>
            <p className="mt-auto pt-4 text-[11px] font-bold text-ink/40">
              Tu sesión de dirección se conserva. Esta acción no se puede deshacer.
            </p>
          </section>
        </Reveal>

        {/* ===== App instalable ===== */}
        <Reveal delay={160}>
          <section className="card flex h-full flex-col p-5">
            <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Smartphone size={19} className="text-seadeep" /> App instalable (PWA)
            </h3>
            <p className="mt-1 text-[13px] font-semibold text-ink/55">
              Toda la comunidad puede instalar Sammy como app: abre sin barra del navegador y consulta
              materiales incluso sin conexión.
            </p>
            <div className="mt-4">
              {installed ? (
                <Chip color="#12A59B">✓ Ya está instalada en este dispositivo</Chip>
              ) : canInstall ? (
                <Button
                  variant="sun"
                  icon={<Download size={16} />}
                  onClick={async () => {
                    const ok = await promptInstall();
                    toast(ok ? "success" : "info", ok ? "¡Sammy se instaló!" : "Instalación cancelada.");
                  }}
                >
                  Instalar app
                </Button>
              ) : (
                <p className="rounded-xl border-2 border-dashed border-ink/20 bg-paper px-3.5 py-3 text-[13px] font-bold text-ink/55">
                  En iPhone o iPad: toca <span className="text-ink">Compartir</span> y luego{" "}
                  <span className="text-ink">“Agregar a inicio”</span>.
                </p>
              )}
            </div>
            <p className="mt-auto pt-4 text-[11px] font-bold text-ink/40">
              Versión de demostración · los datos se guardan localmente en cada dispositivo.
            </p>
          </section>
        </Reveal>
      </div>

      {/* Modal de confirmación */}
      <Modal
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        title="¿Restablecer todo?"
        subtitle="Se borrarán los cambios y volverán los datos de demostración"
        footer={
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="coral"
              icon={<RefreshCw size={15} />}
              onClick={() => {
                resetData();
                setResetOpen(false);
                toast("success", "Plataforma restablecida a los datos de demostración.");
              }}
            >
              Sí, restablecer
            </Button>
          </div>
        }
      >
        <p className="text-sm font-semibold text-ink/70">
          Esta acción elimina usuarios creados, niños, horarios, materiales y avances registrados en
          este dispositivo, y restaura las cuentas y datos originales de la demo. Te recomendamos{" "}
          <strong>exportar un respaldo</strong> antes de continuar.
        </p>
      </Modal>
    </div>
  );
}
