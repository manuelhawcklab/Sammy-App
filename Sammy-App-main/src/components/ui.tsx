import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  FileCheck2,
  Info,
  Loader2,
  UploadCloud,
  X,
  XCircle,
} from "lucide-react";
import { fmtBytes, MAX_FILE_MB, readFileAsDataURL } from "../lib/db";

export const SAMMY_URL =
  "https://image.qwenlm.ai/generated-images/c61da584-ba8c-4ecc-9bd7-561d100b70ab/_result.png";

/* ============ Toasts ============ */
type ToastKind = "success" | "error" | "info";
type ToastItem = { id: number; kind: ToastKind; msg: string };

const ToastCtx = createContext<(kind: ToastKind, msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

const TOAST_META: Record<ToastKind, { icon: ReactNode; klass: string }> = {
  success: { icon: <CheckCircle2 size={19} className="text-seadeep" />, klass: "bg-mint" },
  error: { icon: <XCircle size={19} className="text-coraldeep" />, klass: "bg-[#ffe3e0]" },
  info: { icon: <Info size={19} className="text-[#20739c]" />, klass: "bg-[#e2f2fb]" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(1);
  const push = useCallback((kind: ToastKind, msg: string) => {
    const id = idRef.current++;
    setItems((v) => [...v.slice(-3), { id, kind, msg }]);
    window.setTimeout(() => setItems((v) => v.filter((t) => t.id !== id)), 4200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-24 z-[95] flex w-[min(92vw,350px)] flex-col gap-2 md:bottom-6">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 44, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30, scale: 0.96 }}
              transition={{ type: "spring", damping: 24, stiffness: 340 }}
              className={`pointer-events-auto flex items-start gap-2.5 rounded-xl border-2 border-ink px-4 py-3 shadow-toy-sm ${TOAST_META[t.kind].klass}`}
            >
              <span className="mt-0.5 shrink-0">{TOAST_META[t.kind].icon}</span>
              <p className="flex-1 text-sm font-bold text-ink">{t.msg}</p>
              <button
                onClick={() => setItems((v) => v.filter((x) => x.id !== t.id))}
                className="shrink-0 rounded-md p-0.5 text-ink/40 hover:text-ink"
                aria-label="Cerrar aviso"
              >
                <X size={15} strokeWidth={3} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

/* ============ Botón ============ */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "sun" | "coral" | "ghost";
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  loading?: boolean;
};
export function Button({
  variant = "primary",
  size = "md",
  icon,
  loading,
  className = "",
  children,
  disabled,
  type = "button",
  ...rest
}: BtnProps) {
  const variants: Record<string, string> = {
    primary: "bg-sea text-white",
    sun: "bg-sun text-ink",
    coral: "bg-coral text-white",
    ghost: "bg-white text-ink",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-[13px]",
    md: "px-4 py-2.5 text-[15px]",
    lg: "px-5 py-3 text-base",
  };
  return (
    <button
      type={type}
      className={`btn-toy inline-flex items-center justify-center gap-2 rounded-xl border-2 border-ink font-display font-semibold shadow-toy-xs ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
      {children}
    </button>
  );
}

/* ============ Formularios ============ */
export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="block">
      <span className="mb-1.5 block text-[13px] font-black tracking-wide text-ink/70 uppercase">
        {label}
      </span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs font-bold text-ink/40">{hint}</span>}
      {error && (
        <span className="mt-1 flex items-center gap-1 text-xs font-black text-coraldeep">
          <AlertTriangle size={12} strokeWidth={3} /> {error}
        </span>
      )}
    </div>
  );
}

const inputBase =
  "w-full rounded-xl border-2 border-ink/20 bg-white px-3.5 py-2.5 text-[15px] font-semibold text-ink outline-none transition placeholder:font-semibold placeholder:text-ink/30 focus:border-sea focus:ring-2 focus:ring-sea/25";

export function TextInput({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputBase} ${className}`} {...rest} />;
}
export function TextArea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputBase} min-h-[96px] resize-y ${className}`} {...rest} />;
}
export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${inputBase} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2214%22%20height%3D%2214%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23143432%22%20stroke-width%3D%223%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[right_0.8rem_center] bg-no-repeat pr-9 ${className}`} {...rest}>
      {children}
    </select>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: ReactNode }[];
}) {
  return (
    <div className="flex w-full rounded-xl border-2 border-ink bg-paper p-1 shadow-toy-xs">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2.5 py-2 font-display text-sm font-semibold transition-all ${
              active ? "border-2 border-ink bg-pine text-white shadow-toy-xs" : "border-2 border-transparent text-ink/55 hover:text-ink"
            }`}
          >
            {o.icon}
            <span className="truncate">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/* ============ Modal ============ */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  footer,
  wide,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  footer?: ReactNode;
  wide?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", h);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[85] flex items-end justify-center bg-ink/45 backdrop-blur-[2px] sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 46, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 34, scale: 0.97 }}
            transition={{ type: "spring", damping: 27, stiffness: 330 }}
            className={`card max-h-[92vh] w-full overflow-hidden rounded-b-none sm:rounded-b-[18px] ${
              wide ? "sm:max-w-2xl" : "sm:max-w-md"
            }`}
          >
            <div className="flex items-start justify-between gap-3 border-b-2 border-ink/10 bg-paper px-5 py-4">
              <div>
                <h3 className="font-display text-lg leading-tight font-bold">{title}</h3>
                {subtitle && <p className="mt-0.5 text-[13px] font-semibold text-ink/50">{subtitle}</p>}
              </div>
              <button
                onClick={onClose}
                className="btn-toy flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-white shadow-toy-xs"
                aria-label="Cerrar"
              >
                <X size={15} strokeWidth={2.6} />
              </button>
            </div>
            <div className="scroll-thin max-h-[62vh] overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="border-t-2 border-ink/10 bg-paper px-5 py-3.5">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============ Piezas pequeñas ============ */
const LIGHT_COLORS = ["#FFC24B", "#7DC95E", "#9AD6CC", "#F59E4B", "#62D9C8"];
export function Chip({ color, children }: { color: string; children: ReactNode }) {
  const hex = color.toUpperCase();
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border-2 border-ink/15 px-2 py-0.5 text-[11px] leading-4 font-black whitespace-nowrap"
      style={{
        backgroundColor: `${color}2E`,
        color: LIGHT_COLORS.includes(hex) ? "#143432" : color,
      }}
    >
      {children}
    </span>
  );
}

export function Avatar({ emoji, color, size = 44 }: { emoji: string; color: string; size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl border-2 border-ink select-none"
      style={{ width: size, height: size, backgroundColor: `${color}55`, fontSize: size * 0.52 }}
      aria-hidden
    >
      {emoji}
    </span>
  );
}

export function Stars({
  value,
  size = 14,
  onChange,
}: {
  value: number;
  size?: number;
  onChange?: (v: number) => void;
}) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= value;
        const star = (
          <svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? "#FFC24B" : "none"}
            stroke={filled ? "#E8A200" : "rgba(20,52,50,0.3)"}
            strokeWidth="2"
          >
            <path
              d="M12 2l2.9 6.26 6.6.57-5 4.4 1.5 6.47L12 16.9 5.99 19.7l1.5-6.47-5-4.4 6.6-.57z"
              strokeLinejoin="round"
            />
          </svg>
        );
        return onChange ? (
          <button key={i} type="button" onClick={() => onChange(i)} className="transition-transform hover:scale-125" aria-label={`${i} estrellas`}>
            {star}
          </button>
        ) : (
          <span key={i}>{star}</span>
        );
      })}
    </span>
  );
}

export function ProgressRing({
  value,
  size = 96,
  stroke = 10,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.min(Math.max(value, 0), 1);
  return (
    <div className="relative inline-flex shrink-0 items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(18,165,155,0.16)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#12A59B"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          style={{ transition: "stroke-dashoffset 0.9s cubic-bezier(0.2,0.9,0.3,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/* ============ Zona de archivos ============ */
export function FileDrop({
  onFile,
  onClear,
  onError,
}: {
  onFile: (f: File, dataUrl: string) => void;
  onClear?: () => void;
  onError?: (msg: string) => void;
}) {
  const [drag, setDrag] = useState(false);
  const [prog, setProg] = useState(0);
  const [reading, setReading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = async (f: File | null | undefined) => {
    if (!f) return;
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      onError?.(`El archivo supera ${MAX_FILE_MB} MB. Prueba con uno más ligero.`);
      return;
    }
    setReading(true);
    setProg(4);
    setFile(f);
    const iv = window.setInterval(() => setProg((p) => Math.min(p + 8 + Math.random() * 15, 92)), 90);
    try {
      const dataUrl = await readFileAsDataURL(f);
      window.clearInterval(iv);
      setProg(100);
      window.setTimeout(() => {
        setReading(false);
        onFile(f, dataUrl);
      }, 280);
    } catch {
      window.clearInterval(iv);
      setReading(false);
      setFile(null);
      setProg(0);
      onError?.("No se pudo leer el archivo.");
    }
  };

  const clear = () => {
    setFile(null);
    setProg(0);
    setReading(false);
    if (inputRef.current) inputRef.current.value = "";
    onClear?.();
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(e) => {
          void handle(e.target.files?.[0]);
        }}
      />
      {file && !reading ? (
        <div className="anim-fade flex items-center gap-3 rounded-xl border-2 border-ink bg-mint px-4 py-3.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-white text-seadeep">
            <FileCheck2 size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">{file.name}</p>
            <p className="text-xs font-bold text-ink/50">{fmtBytes(file.size)} · listo para publicar</p>
          </div>
          <button
            onClick={clear}
            className="btn-toy flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-ink bg-white shadow-toy-xs"
            aria-label="Quitar archivo"
          >
            <X size={14} strokeWidth={2.6} />
          </button>
        </div>
      ) : reading ? (
        <div className="anim-fade rounded-xl border-2 border-ink bg-paper px-4 py-4">
          <div className="flex items-center gap-2 text-sm font-black text-seadeep">
            <Loader2 size={16} className="animate-spin" /> Guardando “{file?.name}”…
          </div>
          <div className="mt-2.5 h-3 overflow-hidden rounded-full border-2 border-ink/20 bg-white">
            <div
              className="h-full rounded-full bg-sea transition-all duration-150"
              style={{ width: `${prog}%` }}
            />
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            void handle(e.dataTransfer.files?.[0]);
          }}
          className={`flex w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-7 transition-all ${
            drag
              ? "scale-[1.02] border-sea bg-mint shadow-toy-xs"
              : "border-ink/25 bg-paper hover:border-sea/60 hover:bg-mint/50"
          }`}
        >
          <UploadCloud size={26} className={drag ? "text-seadeep" : "text-ink/40"} />
          <span className="text-sm font-black">{drag ? "¡Suéltalo aquí!" : "Arrastra un archivo o toca para elegir"}</span>
          <span className="text-xs font-bold text-ink/40">PDF, imágenes, audio o docs · máx. {MAX_FILE_MB} MB</span>
        </button>
      )}
    </div>
  );
}

/* ============ Revelado al hacer scroll ============ */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${inView ? "reveal-in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ============ Varios ============ */
export function SammyImg({ className = "" }: { className?: string }) {
  return <img src={SAMMY_URL} alt="Sammy, el panda de la plataforma" className={className} />;
}

export function SectionHead({
  title,
  desc,
  action,
}: {
  title: string;
  desc?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-display text-xl font-bold sm:text-2xl">{title}</h2>
        {desc && <p className="mt-0.5 max-w-xl text-sm font-semibold text-ink/50">{desc}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  desc,
  action,
}: {
  icon: ReactNode;
  title: string;
  desc: string;
  action?: ReactNode;
}) {
  return (
    <div className="card bg-dots flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      <span className="anim-float flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-ink bg-mint text-seadeep">
        {icon}
      </span>
      <h3 className="mt-2 font-display text-lg font-bold">{title}</h3>
      <p className="max-w-sm text-sm font-semibold text-ink/55">{desc}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
