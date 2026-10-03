# Caja de Ahorro App

Sistema de gestion para caja de ahorro (socios, ahorros, prestamos, cierres e informes) con autenticacion por usuarios y roles.

## Requisitos

- Node.js 20+
- PostgreSQL (local o [Supabase](https://supabase.com) gratis)
- Variables en `.env` (ver `.env.example`)

## Configuracion local

```bash
cp .env.example .env
# Editar DATABASE_URL, DIRECT_URL y AUTH_SECRET (minimo 32 caracteres)

npm install
npm run db:migrate
npm run seed:admin
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000). Sin sesion redirige a `/login`.

### Admin inicial

Por defecto (`npm run seed:admin`):

- Correo: `admin@caja.local`
- Contrasena: `Admin123!`
- Debe cambiar la contrasena en el primer acceso

Puede sobreescribirse con `ADMIN_EMAIL`, `ADMIN_PASSWORD` y `ADMIN_NOMBRE`.

## Despliegue gratis (Vercel + Supabase)

Stack $0 para la primera version: app en [Vercel Hobby](https://vercel.com) y base de datos en [Supabase Free](https://supabase.com).

### 1. Crear proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) y crea un proyecto (plan Free).
2. Ve a **Project Settings → Database**.
3. Copia dos connection strings:
   - **Transaction** (pooler, puerto `6543`) → `DATABASE_URL`  
     Agrega al final: `?pgbouncer=true` si no viene.
   - **Session** o **Direct** (puerto `5432`) → `DIRECT_URL`
4. Guarda la contrasena de la base; la necesitas en ambas URLs.

Ejemplo:

```env
DATABASE_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxxx:PASSWORD@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
```

### 2. Generar AUTH_SECRET

```bash
openssl rand -base64 48
```

### 3. Desplegar en Vercel

1. Entra a [vercel.com](https://vercel.com) e inicia sesion con GitHub.
2. **Add New Project** → importa `G3ovanny/Caja-de-Ahorro`.
3. Framework: **Next.js** (detectado solo).
4. En **Environment Variables** agrega (Production + Preview):

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | Pooler Supabase (6543 + `pgbouncer=true`) |
| `DIRECT_URL` | Conexion directa/session (5432) |
| `AUTH_SECRET` | Secreto largo (>= 32 chars) |
| `ADMIN_EMAIL` | (opcional) correo admin |
| `ADMIN_PASSWORD` | (opcional) contrasena inicial |
| `ADMIN_NOMBRE` | (opcional) nombre admin |

5. **Deploy**. El build ejecuta `prisma migrate deploy` y luego `next build`.

### 4. Crear usuario admin en produccion

Desde tu PC, con las mismas URLs de Supabase en `.env`:

```bash
npm run seed:admin
```

Luego abre la URL de Vercel → `/login`.

### Notas del plan gratis

- Supabase Free puede pausar el proyecto tras ~7 dias sin actividad; reactivalo desde el dashboard.
- Vercel Hobby es para uso personal / no comercial a escala pequena.
- No subas el archivo `.env` al repositorio.

## Roles

| Rol | Permisos |
| --- | --- |
| `ADMIN` | Todo + gestion de usuarios |
| `OPERADOR` | Lectura y escritura operativa |
| `SOLO_LECTURA` | Solo consultas |

Los usuarios los crea un administrador en **Configuracion → Usuarios**. No hay registro publico.

## Seguridad incluida

- Contrasenas con bcrypt (12 rounds)
- Sesion JWT en cookie `httpOnly`
- Bloqueo temporal tras 5 intentos fallidos
- Cambio obligatorio de contrasena en primer acceso
- Invalidacion de sesion al cambiar contrasena
- Middleware + guards en APIs
