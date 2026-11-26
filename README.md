# Comercial Nova — Frontend (Angular)

Cliente web del sistema de gestión de Comercial Nova (proyecto final de Lenguajes de Programación, Grupo 1).
Consume la API REST en Laravel de [comercial-nova-api](https://github.com/xelnagametal/comercial-nova-api),
documentada en Swagger: https://comercial-nova-api.wasmer.app/swagger/index.html

El diseño de las pantallas sigue el prototipo de Figma del proyecto.

## Requisitos

- Node.js 22 o superior
- npm

## Cómo correrlo

```bash
npm install
npm start            # usa la API publicada en Wasmer
npm run start:local  # usa la API en tu computadora (http://localhost:8000/api)
```

Luego abre http://localhost:4200.

La dirección de la API está en `src/environments/environment.ts` (publicada) y `src/environments/environment.local.ts` (local).

## Publicación (Cloudflare Pages)

- Versión de prueba (rama `dev`): https://dev.comercial-nova-web.pages.dev
- Para publicar una nueva versión de prueba: `npm run subir:dev`
- `public/_headers` agrega las cabeceras de seguridad (CSP, anti-iframe, nosniff) y `public/_redirects` hace que las rutas de Angular funcionen al recargar.

## Seguridad

- El token de Sanctum solo se envía a la API (el interceptor no lo agrega a otros dominios) y se borra al cerrar sesión o si la API responde 401.
- Las pantallas y botones se muestran según los permisos del usuario (`/api/me`); la API vuelve a validar cada permiso.
- Toda eliminación pide confirmación; la API no permite borrar el propio usuario, el rol administrador, roles con usuarios ni categorías con productos.
- La CSP solo permite conectarse a la API de Wasmer; si cambia la dirección de la API, actualizar `connect-src` en `public/_headers`.

## Pantallas

| Pantalla | Ruta | Endpoints | Caso de uso |
|---|---|---|---|
| Iniciar sesión | `/login` | `POST /api/login`, `GET /api/me` | CU-01 |
| Inicio | `/inicio` | `GET /api/productos`, `GET /api/clientes` | — |
| Nueva venta (una sola pantalla) | `/ventas/nueva` | `GET /api/productos`, `/categorias`, `/clientes`, `POST /api/ventas`* | CU-02 (P1, P4) |
| Facturas | `/ventas/facturas` | `GET /api/ventas`* | CU-04 |
| Productos | `/productos` | `GET /api/productos` | CU-03 |
| Crear / editar producto | `/productos/nuevo`, `/productos/:id` | `POST`, `PUT /api/productos/{id}` con `version` | CU-06 (P2) |
| Movimientos de stock | `/inventario` | `GET /api/movimientos`* | CU-10 |
| Clientes | `/clientes`, `/clientes/nuevo`, `/clientes/:id` | `GET`, `POST`, `PUT`, `DELETE /api/clientes` | CU-05, CU-07 |
| Categorías | `/productos/categorias` | `GET`, `POST`, `PUT`, `DELETE /api/categorias` | CU-06 |
| Usuarios y permisos | `/configuracion` | `GET`, `POST`, `PUT`, `DELETE /api/users` y `/api/roles`, `GET /api/permisos` | CU-09 |

\* Endpoints que la API todavía no publica. Las pantallas ya están preparadas y muestran un aviso mientras tanto.

## Cómo se resuelven los problemas del caso

- **P1 (sobreventa):** la venta se envía a la API, que descuenta el stock dentro de una transacción. Si otro vendedor
  vendió el último producto, la API responde **409** y la pantalla marca en rojo la línea sin stock y bloquea el botón.
- **P2 (edición simultánea):** el formulario de producto envía la `version` que leyó. Si otro usuario guardó antes, la API
  responde **409** y se muestra «Otro usuario modificó este producto» con la comparación de los cambios y el botón
  «Recargar datos».
- **P4 (pantallas complicadas):** la venta completa (productos, cliente, forma de pago, detalle e IVA) está en una sola pantalla.
- **P6 (celular):** la interfaz se adapta a pantallas pequeñas y usa la misma API con token que usaría una app móvil.

## Estructura

```
src/app/
  core/       servicio de autenticación, interceptor del token, guards y ApiService (todas las llamadas a la API)
  layout/     menú lateral y cabecera
  pages/      una pantalla por archivo
  shared/     íconos, formato de dinero (USD) y formulario de cliente
```

- El **interceptor** agrega `Authorization: Bearer <token>` a cada petición; si la API responde 401 vuelve al login.
- Los **guards** ocultan las pantallas para las que el usuario no tiene permiso (los permisos vienen de `/api/me`).
- Toda la comunicación con la API está en `core/api.service.ts`; las pantallas no llaman a `HttpClient` directamente.
