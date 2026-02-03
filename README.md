# SnackFlow

Sistema de Punto de Venta (POS) para negocios de snacks y dulcerias.

## Stack Tecnologico

- Backend: NestJS + TypeScript
- Frontend: React + TypeScript + Tailwind CSS + Vite (Web y Mobile)
- Base de datos: PostgreSQL (Supabase)
- Autenticacion: Supabase Auth
- Tiempo real: Supabase Realtime

## Estructura del Proyecto

```
snackflow/
|-- apps/
|   |-- api/      # Backend NestJS
|   |-- web/      # Frontend React (Web)
|   `-- mobile/   # Frontend React (Mobile - Capacitor)
|-- packages/
|   `-- shared/   # Tipos y constantes compartidas
|-- supabase/
|   |-- schema.sql    # Esquema de base de datos
|   `-- migrations/   # Migraciones adicionales
`-- ...
```

## Requisitos

- Node.js 18+
- pnpm 9+
- Proyecto de Supabase

## Instalacion

### 1. Clonar e instalar dependencias

```bash
git clone <repo-url>
cd snackflow
pnpm install
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales de Supabase:

```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_KEY=tu-service-key
JWT_SECRET=tu-jwt-secret
```

### 3. Configurar base de datos

1. Ve a tu proyecto en Supabase
2. Abre el SQL Editor
3. Ejecuta el contenido de `supabase/schema.sql`
4. Ejecuta las migraciones de `supabase/migrations/` en orden si aplica

### 4. Crear usuario de prueba

1. En Supabase, ve a Authentication > Users
2. Crea un nuevo usuario con email/password
3. Ejecuta el SQL de seed (al final de schema.sql) reemplazando el ID del usuario

## Desarrollo

### Iniciar todos los servicios

```bash
pnpm dev
```

### Iniciar solo el backend

```bash
pnpm dev:api
```

### Iniciar solo el frontend web

```bash
pnpm dev:web
```

## URLs

- Frontend: http://localhost:5173
- API: http://localhost:3000/api
- Swagger Docs: http://localhost:3000/api/docs

## Modulos del Sistema

### Backend (API)

| Modulo | Descripcion |
|--------|-------------|
| `/auth` | Login, logout, validacion de PIN |
| `/tenants` | Configuracion del negocio |
| `/users` | Gestion de usuarios |
| `/categories` | Categorias de productos |
| `/products` | CRUD de productos |
| `/orders` | Pedidos y cobros |
| `/inventory` | Movimientos de inventario |
| `/cash-register` | Apertura/cierre de caja |
| `/reports` | Reportes de ventas |

### Frontend (Web)

| Pagina | Ruta | Roles |
|--------|------|-------|
| Login | `/login` | Todos |
| Dashboard | `/dashboard` | Admin, Supervisor |
| Ventas | `/sales` | Admin, Supervisor, Vendedor |
| Caja | `/cashier` | Admin, Supervisor, Cajero |
| Productos | `/products` | Admin |
| Categorias | `/categories` | Admin |
| Inventario | `/inventory` | Admin, Supervisor |
| Reportes | `/reports` | Admin, Supervisor |
| Usuarios | `/users` | Admin |
| Configuracion | `/settings` | Admin |

## Roles de Usuario

| Rol | Permisos |
|-----|----------|
| admin | Acceso total al sistema |
| supervisor | Reportes, inventario, caja, pedidos |
| cashier | Cobrar pedidos, caja |
| seller | Crear pedidos |

## Build para Produccion

```bash
pnpm build
```

## Licencia

Privado - Todos los derechos reservados
