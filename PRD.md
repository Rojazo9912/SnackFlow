# PRD – SnackFlow v2.0

## 1. Información General

| Campo | Valor |
|-------|-------|
| **Nombre del producto** | SnackFlow |
| **Tipo** | Sistema de Punto de Venta (POS) |
| **Modelo** | SaaS Multi-tenant |
| **Plataforma** | Web PWA (tablet, PC, móvil) |
| **Backend** | Node.js (NestJS) en Railway |
| **Base de datos** | PostgreSQL en Supabase |
| **Autenticación** | Supabase Auth |
| **Tiempo real** | Supabase Realtime (WebSockets) |
| **Mercado objetivo** | Locales de snacks y dulcerías en México |

---

## 2. Descripción del Producto

SnackFlow es un sistema de punto de venta web diseñado para negocios de snacks y dulcerías. Permite que vendedores tomen pedidos desde tablets y los envíen en tiempo real a la caja, donde el cajero realiza el cobro.

El sistema funciona **con o sin conexión a internet**, reduce errores humanos, acelera el servicio en horas pico y proporciona control de inventario, reportes de ventas y auditoría de operaciones.

---

## 3. Problema a Resolver

Los negocios de snacks enfrentan los siguientes problemas operativos:

| Problema | Impacto |
|----------|---------|
| Cobros lentos en horas pico | Pérdida de clientes, filas largas |
| Errores al tomar pedidos manualmente | Productos incorrectos, pérdidas económicas |
| Falta de control de inventario | Desabasto o exceso de productos |
| Desconocimiento de ventas y ganancias | Decisiones sin información |
| Sin registro de operaciones | No hay forma de auditar errores o fraudes |
| Dependencia total de internet | Parálisis del negocio si cae la conexión |

---

## 4. Objetivos del Producto

- Agilizar el proceso de venta (< 30 segundos por pedido)
- Separar la toma de pedidos del cobro
- Reducir errores humanos a < 1%
- Facilitar el control de inventario en tiempo real
- Proporcionar información clara de ventas y rentabilidad
- Permitir operación offline con sincronización automática
- Registrar todas las operaciones para auditoría

---

## 5. Usuarios del Sistema

### Roles y Permisos

| Rol | Permisos |
|-----|----------|
| **Administrador** | Acceso total: configuración, productos, inventario, reportes, usuarios, auditoría |
| **Supervisor** | Reportes, cancelar pedidos cobrados, ajustes de inventario, ver auditoría |
| **Cajero** | Cobrar pedidos, apertura/cierre de caja, cancelar pedidos pendientes |
| **Vendedor** | Crear pedidos, ver estado de sus pedidos, consultar productos |

### Autenticación

- Login con email/contraseña
- PIN rápido para cambio de usuario en mismo dispositivo
- Sesiones por dispositivo con timeout configurable

---

## 6. Flujo de Uso

### Tablet (Vendedor)

```
1. Inicia turno (opcional)
2. Busca/selecciona productos (favoritos, categorías, búsqueda)
3. Define cantidades
4. Agrega notas al pedido (opcional)
5. Envía el pedido a caja
6. Visualiza confirmación y estado del pedido
7. Recibe notificación cuando el pedido es cobrado
```

### Caja (Cajero)

```
1. Apertura de caja (monto inicial)
2. Recibe pedidos en tiempo real (con alerta sonora)
3. Revisa detalles del pedido
4. Selecciona método de pago
5. Procesa el cobro (calcula cambio si es efectivo)
6. Imprime ticket (opcional)
7. Finaliza la venta
8. Cierre de caja (arqueo)
```

### Estados del Pedido

```
BORRADOR ──► PENDIENTE ──► EN_CAJA ──► COBRADO
                 │            │
                 ▼            ▼
             CANCELADO    CANCELADO
             (vendedor)   (cajero/supervisor)
```

| Estado | Descripción |
|--------|-------------|
| `BORRADOR` | Pedido en construcción, no enviado |
| `PENDIENTE` | Enviado a caja, esperando atención |
| `EN_CAJA` | Cajero está procesando el cobro |
| `COBRADO` | Venta completada |
| `CANCELADO` | Pedido cancelado (requiere motivo) |

---

## 7. Funcionalidades Principales

### 7.1 Ventas

| Funcionalidad | Descripción |
|---------------|-------------|
| Crear pedidos | Desde tablet o caja directa |
| Búsqueda rápida | Por nombre, código o categoría |
| Favoritos | Productos más vendidos en pantalla principal |
| Notas en pedido | Instrucciones especiales ("sin chile", "extra salsa") |
| Envío en tiempo real | WebSocket bidireccional |
| Notificaciones | Sonido al recibir pedido, confirmación de cobro |
| Cancelación | Con motivo obligatorio y registro en auditoría |

### 7.2 Métodos de Pago

| Método | Características |
|--------|-----------------|
| **Efectivo** | Cálculo automático de cambio |
| **Tarjeta** | Registro manual o integración con terminal |
| **Transferencia** | Muestra datos de cuenta/QR |
| **Pago mixto** | Combinación de métodos |

### 7.3 Productos

| Funcionalidad | Descripción |
|---------------|-------------|
| Registro de productos | Nombre, precio venta, costo, código, imagen |
| Categorías | Organización jerárquica |
| Productos compuestos | Recetas que descuentan ingredientes |
| Variantes | Tamaños, sabores (opcional) |
| Activar/desactivar | Sin eliminar historial |
| Unidades de medida | Compra vs venta (caja → pieza) |

### 7.4 Inventario

| Funcionalidad | Descripción |
|---------------|-------------|
| Descuento automático | Al cobrar pedido |
| Productos compuestos | Descuenta ingredientes según receta |
| Ajustes manuales | Entrada, salida, merma con motivo |
| Alertas de stock | Notificación visual cuando stock < punto de reorden |
| Kardex | Historial de movimientos por producto |
| Lista de reorden | Productos bajo mínimo para comprar |

### 7.5 Caja

| Funcionalidad | Descripción |
|---------------|-------------|
| Apertura de caja | Monto inicial en efectivo |
| Movimientos | Retiros y depósitos con motivo |
| Cierre de caja | Arqueo: esperado vs real, diferencia |
| Historial | Registro de todas las sesiones de caja |

### 7.6 Turnos de Trabajo

| Funcionalidad | Descripción |
|---------------|-------------|
| Inicio de turno | Registro de hora entrada por usuario |
| Ventas por turno | Asignación de pedidos al vendedor/cajero |
| Cierre de turno | Resumen de ventas del turno |
| Reporte por empleado | Ventas, tickets, cancelaciones |

### 7.7 Reportes

| Reporte | Descripción |
|---------|-------------|
| Ventas del día | Total, cantidad de tickets, desglose |
| Ventas por hora | Identificar horas pico |
| Ticket promedio | Valor promedio por venta |
| Productos más vendidos | Top 10/20 productos |
| Productos sin movimiento | Detectar inventario muerto |
| Rentabilidad | Ganancia por producto (si hay costo) |
| Comparativo | Hoy vs ayer, semana vs semana |
| Por empleado | Ventas por vendedor/cajero |
| Exportación | Excel y PDF |

### 7.8 Auditoría

Registro automático de:

| Acción | Datos registrados |
|--------|-------------------|
| Cancelación de pedido | Quién, cuándo, motivo, monto |
| Ajuste de inventario | Quién, producto, cantidad, motivo |
| Cambio de precios | Quién, producto, precio anterior/nuevo |
| Movimientos de caja | Quién, tipo, monto, motivo |
| Cambios de configuración | Quién, qué cambió |

---

## 8. Modo Offline

### Funcionamiento

```
┌─────────────┐     Sin internet     ┌─────────────┐
│   Tablet    │ ──────────────────► │ IndexedDB   │
│  (Vendedor) │                      │   Local     │
└─────────────┘                      └─────────────┘
                                            │
                    Reconexión              │
                    automática              ▼
┌─────────────┐     ◄──────────────  ┌─────────────┐
│  Supabase   │      Sincroniza     │   Cola de   │
│   (Cloud)   │      pedidos        │   Pedidos   │
└─────────────┘                      └─────────────┘
```

| Característica | Descripción |
|----------------|-------------|
| Detección automática | PWA detecta pérdida de conexión |
| Almacenamiento local | Pedidos en IndexedDB |
| Cola de sincronización | Pedidos pendientes de enviar |
| Indicador visual | Badge que muestra estado offline y pedidos pendientes |
| Sincronización | Automática al recuperar conexión |
| Conflictos | Estrategia "último gana" con timestamp |

### Limitaciones Offline

- No se pueden recibir pedidos de otras tablets
- No se actualiza stock de otros usuarios
- Reportes solo muestran datos sincronizados

---

## 9. Requisitos No Funcionales

| Requisito | Especificación |
|-----------|----------------|
| **Rendimiento** | Tiempo de respuesta < 500ms |
| **Disponibilidad** | 99.5% uptime |
| **Compatibilidad** | Chrome, Safari, Firefox (últimas 2 versiones) |
| **Dispositivos** | Tablets Android 8+, iPads iOS 13+, PCs |
| **Resolución mínima** | 768x1024 (tablet portrait) |
| **Seguridad** | HTTPS, JWT, RLS en Supabase |
| **Escalabilidad** | Hasta 10,000 pedidos/día por tenant |
| **Backups** | Automáticos diarios (Supabase) |

---

## 10. Arquitectura Multi-tenant

```
┌──────────────────────────────────────────────────┐
│                   SnackFlow SaaS                 │
├──────────────────────────────────────────────────┤
│  Tenant A        │  Tenant B        │  Tenant C  │
│  (Dulcería X)    │  (Snacks Y)      │  (Tienda Z)│
│  ─────────────   │  ─────────────   │  ───────── │
│  - Usuarios      │  - Usuarios      │  - Usuarios│
│  - Productos     │  - Productos     │  - Productos│
│  - Pedidos       │  - Pedidos       │  - Pedidos │
│  - Inventario    │  - Inventario    │  - Inventario│
└──────────────────────────────────────────────────┘
```

| Característica | Implementación |
|----------------|----------------|
| Aislamiento de datos | `tenant_id` en cada tabla + RLS |
| Subdominio | `dulceriax.snackflow.app` (opcional) |
| Configuración independiente | Cada tenant configura sus preferencias |
| Límites por plan | Productos, usuarios, dispositivos |

---

## 11. Modelo de Negocio

### Planes de Suscripción

| Plan | Básico | Pro | Enterprise |
|------|--------|-----|------------|
| **Precio** | $299 MXN/mes | $599 MXN/mes | Cotización |
| Dispositivos | 2 | 5 | Ilimitados |
| Productos | 100 | 500 | Ilimitados |
| Usuarios | 3 | 10 | Ilimitados |
| Reportes | Básicos | Avanzados | Avanzados + API |
| Soporte | Email | Email + Chat | Prioritario |
| Multi-sucursal | No | No | Sí |

### Otros

- Trial gratuito de 14 días (plan Pro)
- Descuento 20% pago anual
- Setup/onboarding incluido

---

## 12. Alcance MVP (Versión 1.0)

### Incluye

- [x] Flujo tablet → caja con tiempo real
- [x] Modo offline básico (vendedor)
- [x] Gestión de productos y categorías
- [x] Métodos de pago: efectivo, tarjeta, transferencia
- [x] Inventario con descuento automático
- [x] Alertas de stock bajo
- [x] Apertura y cierre de caja
- [x] Reportes: ventas día, productos más vendidos
- [x] Usuarios y roles básicos (admin, cajero, vendedor)
- [x] Multi-tenant
- [x] Auditoría básica (cancelaciones, ajustes)
- [x] Notas en pedidos
- [x] Búsqueda y favoritos

### No Incluye (Versiones Futuras)

- [ ] Facturación electrónica (CFDI)
- [ ] Multi-sucursal
- [ ] Productos compuestos/recetas
- [ ] Integración con terminales bancarias
- [ ] App móvil nativa
- [ ] API pública
- [ ] Programa de lealtad/clientes frecuentes

---

## 13. Roadmap

### Versión 1.0 (MVP)

- Flujo completo tablet → caja
- Productos, categorías, inventario básico
- Métodos de pago
- Reportes esenciales
- Multi-tenant con planes

### Versión 1.1

- Productos compuestos (recetas)
- Exportación de reportes (Excel/PDF)
- Mejoras de UX basadas en feedback

### Versión 2.0

- Multi-sucursal
- Integración con terminales bancarias
- API pública para integraciones
- Dashboard analytics avanzado

### Versión 3.0

- Facturación electrónica (CFDI)
- Programa de lealtad
- App móvil nativa (opcional)

---

## 14. Métricas de Éxito

| Métrica | Objetivo |
|---------|----------|
| Tiempo promedio pedido → cobro | < 45 segundos |
| Errores en cobro | < 1% |
| Uptime del sistema | > 99.5% |
| NPS (satisfacción) | > 40 |
| Retención mensual | > 90% |
| Churn rate | < 5% mensual |

---

## 15. Notas Técnicas

### Stack Tecnológico

| Capa | Tecnología |
|------|------------|
| **Frontend** | React + TypeScript + Tailwind CSS |
| **Estado** | Zustand o React Query |
| **PWA** | Workbox + IndexedDB |
| **Backend** | NestJS (Node.js) |
| **Base de datos** | PostgreSQL (Supabase) |
| **Autenticación** | Supabase Auth |
| **Tiempo real** | Supabase Realtime |
| **Hosting Backend** | Railway |
| **Hosting Frontend** | Vercel o Railway |

### Seguridad

- HTTPS obligatorio
- JWT con refresh tokens
- Row Level Security (RLS) en todas las tablas
- Sanitización de inputs
- Rate limiting en API
- Logs de acceso y errores

### API

- RESTful con versionado (`/api/v1/`)
- Documentación con Swagger/OpenAPI
- Health check endpoint (`/health`)
- Respuestas estandarizadas con códigos HTTP correctos

---

## 16. Glosario

| Término | Definición |
|---------|------------|
| **Tenant** | Cliente/negocio que usa SnackFlow |
| **Pedido** | Conjunto de productos solicitados |
| **Ticket** | Pedido cobrado |
| **Arqueo** | Conteo de efectivo al cerrar caja |
| **Kardex** | Historial de movimientos de inventario |
| **RLS** | Row Level Security (seguridad a nivel de fila) |
| **PWA** | Progressive Web App |
