# 🐝 Sammy-App — Aprende con Sammy

Plataforma educativa que conecta **familias, educadores y dirección**: expedientes de niños, horarios de sala, materiales didácticos y seguimiento de avances. PWA instalable construida con **Vite + React + TypeScript + Tailwind CSS 4**, con backend en **Supabase** y despliegue en **Vercel**.

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | Vite 6 · React 18 · TypeScript (strict) · Tailwind CSS 4 · Framer Motion · Recharts · dnd-kit |
| Backend / DB | Supabase (Postgres + Realtime), proyecto `pshppwsueqkwzcczfkvu` |
| Hosting | Vercel (integración GitHub activa) |
| Offline | PWA: service worker + manifest (`public/sw.js`, `public/manifest.webmanifest`) |
| Datos | Store local (localStorage, modo offline-first) sincronizado con Supabase |

## Requisitos previos

- Node.js ≥ 20 y npm ≥ 10

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # las variables ya apuntan al proyecto Supabase real
npm run dev                  # http://localhost:3000
```

Scripts disponibles:

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo (puerto 3000) |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Previsualiza el build de producción |
| `npm run typecheck` | Verificación estricta de TypeScript |

## Configuración de entorno

Todas las variables se leen en tiempo de build vía `import.meta.env` (tipadas en `src/vite-env.d.ts`):

```env
VITE_SUPABASE_URL=https://pshppwsueqkwzcczfkvu.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_5-Y3GS2lYZ7i5E5324v5GQ_T0-FgK80
VITE_SUPABASE_REST_URL=https://pshppwsueqkwzcczfkvu.supabase.co/rest/v1/
```

> La anon key es pública por diseño (protegida por RLS). Nunca subas la `service_role` key al repositorio ni al frontend. `.gitignore` excluye `.env*` excepto `.env.example`.

## Base de datos (Supabase)

El esquema completo está en [`supabase/schema.sql`](supabase/schema.sql):

1. Abre **Supabase Dashboard → SQL Editor** en el proyecto `pshppwsueqkwzcczfkvu`.
2. Pega el contenido de `supabase/schema.sql` y ejecútalo.

Crea las 6 tablas usadas por la app (`groups`, `users`, `children`, `blocks`, `materials`, `entries`), políticas RLS para acceso con anon key, publicación de **Realtime** y datos semilla de demostración.

Para cargar todos los datos desde la propia app: entra como admin (`admin@sammy.app` / `sammy123`) → **Ajustes → "Sincronizar con Supabase ☁️"**.

## Deploy en Vercel

La integración con GitHub ya está activa; cada push a `main` genera un deploy automático.

### Variables de entorno en Vercel

En **Project Settings → Environment Variables** agrega:

| Variable | Valor | Environments |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://pshppwsueqkwzcczfkvu.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY` | `sb_publishable_5-Y3GS2lYZ7i5E5324v5GQ_T0-FgK80` | Production, Preview, Development |
| `VITE_SUPABASE_REST_URL` | `https://pshppwsueqkwzcczfkvu.supabase.co/rest/v1/` | Production, Preview, Development |

### Ajustes de build (detectados automáticamente por `vercel.json`)

- Framework: **Vite**
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`
- Rewrite SPA: `/(.*) → /index.html` (navegación directa a rutas funciona tras recargar)

## Estructura del proyecto

```
Sammy-App-main/
├── index.html                 # Shell HTML + fuentes + meta PWA
├── vercel.json                # Configuración de deploy en Vercel
├── vite.config.js             # Vite + plugin React + Tailwind 4
├── tsconfig.json              # TypeScript strict
├── .env.example               # Plantilla de variables de entorno
├── supabase/schema.sql        # Esquema Postgres + RLS + Realtime
├── public/                    # Manifest PWA, service worker, iconos
└── src/
    ├── main.tsx               # Punto de entrada
    ├── App.tsx                # Shell, navegación por roles, banner de conexión
    ├── components/ui.tsx      # Design system (Button, Modal, Toast…)
    ├── lib/
    │   ├── supabase.ts        # Cliente Supabase (desde env vars)
    │   ├── db.ts              # Store local + funciones de sincronización
    │   ├── useSupabaseDB.ts   # Hook de estado + realtime (postgres_changes)
    │   └── pwa.ts             # Hook de instalación PWA
    └── pages/                 # Login, Home, Children, Schedule, Materials,
                               # Progress y admin/{Aulas,People,Content,Settings}
```

## Cuentas de demostración

| Rol | Correo | Contraseña |
|---|---|---|
| Dirección (admin) | `admin@sammy.app` | `sammy123` |
| Familia | `familia@sammy.app` | `sammy123` |
| Educadora | `miss@sammy.app` | `sammy123` |

## Solución de problemas

- **"Faltan las variables de entorno…"** → crea `.env.local` desde `.env.example` (local) o verifica las env vars en Vercel (producción) y vuelve a desplegar.
- **Banner rojo "Error de conexión"** → revisa que `supabase/schema.sql` se haya ejecutado (tablas + policies RLS). La app sigue funcionando en modo local mientras tanto.
- **Login falla en producción** → confirma que exista la fila del usuario en la tabla `users` de Supabase (o usa una cuenta sembrada localmente, la app hace fallback automático).
