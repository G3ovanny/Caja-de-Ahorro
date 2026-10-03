# Caja de Ahorro App

Sistema de gestion para caja de ahorro (socios, ahorros, prestamos, cierres e informes) con autenticacion por usuarios y roles.

## Requisitos

- Node.js 20+
- PostgreSQL
- Variables en `.env` (ver `.env.example`)

## Configuracion

```bash
cp .env.example .env
# Editar DATABASE_URL y AUTH_SECRET (minimo 32 caracteres)

npm install
npm run db:migrate
npm run db:generate
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
