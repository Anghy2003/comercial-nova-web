import { Routes } from '@angular/router';
import { authGuard, invitadoGuard, permisoGuard } from './core/guards';
import { Shell } from './layout/shell';

export const routes: Routes = [
  { path: 'login', canActivate: [invitadoGuard], loadComponent: () => import('./pages/login').then((m) => m.LoginPage) },
  {
    path: '',
    component: Shell,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      { path: 'inicio', title: 'Inicio · Comercial Nova', loadComponent: () => import('./pages/inicio').then((m) => m.InicioPage) },
      {
        path: 'ventas/nueva',
        title: 'Nueva venta · Comercial Nova',
        canActivate: [permisoGuard],
        data: { permiso: 'productos.ver' },
        loadComponent: () => import('./pages/nueva-venta').then((m) => m.NuevaVentaPage),
      },
      { path: 'ventas/facturas', title: 'Facturas · Comercial Nova', loadComponent: () => import('./pages/pendiente').then((m) => m.FacturasPage) },
      {
        path: 'productos',
        title: 'Productos · Comercial Nova',
        canActivate: [permisoGuard],
        data: { permiso: 'productos.ver' },
        loadComponent: () => import('./pages/productos').then((m) => m.ProductosPage),
      },
      {
        path: 'productos/nuevo',
        title: 'Nuevo producto · Comercial Nova',
        canActivate: [permisoGuard],
        data: { permiso: 'productos.crear' },
        loadComponent: () => import('./pages/producto-editar').then((m) => m.ProductoEditarPage),
      },
      {
        path: 'productos/:id',
        title: 'Editar producto · Comercial Nova',
        canActivate: [permisoGuard],
        data: { permiso: 'productos.editar' },
        loadComponent: () => import('./pages/producto-editar').then((m) => m.ProductoEditarPage),
      },
      { path: 'ayuda', redirectTo: 'inicio' },
      { path: 'inventario', title: 'Movimientos · Comercial Nova', loadComponent: () => import('./pages/pendiente').then((m) => m.MovimientosPage) },
      {
        path: 'clientes',
        title: 'Clientes · Comercial Nova',
        canActivate: [permisoGuard],
        data: { permiso: 'clientes.ver' },
        loadComponent: () => import('./pages/clientes').then((m) => m.ClientesPage),
      },
      {
        path: 'configuracion',
        title: 'Usuarios y permisos · Comercial Nova',
        canActivate: [permisoGuard],
        data: { permiso: 'usuarios.ver' },
        loadComponent: () => import('./pages/usuarios').then((m) => m.UsuariosPage),
      },
    ],
  },
  { path: '**', redirectTo: 'inicio' },
];
