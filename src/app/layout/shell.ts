import { Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { ConfirmarDialogo } from '../shared/confirmar';
import { Icono } from '../shared/icono';

interface Opcion {
  texto: string;
  icono: string;
  ruta?: string;
  permiso?: string;
  hijos?: { texto: string; ruta: string; permiso?: string }[];
}

/** Estructura de las pantallas internas: menú lateral + cabecera + contenido. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, Icono, ConfirmarDialogo],
  template: `
    <div class="app">
      <aside class="lateral" [class.abierto]="menuAbierto()">
        <a routerLink="/inicio" class="marca"><img src="img/logo.png" alt="Comercial Nova" /></a>

        <nav>
          <p class="seccion">PRINCIPAL</p>
          @for (op of principal(); track op.texto) {
            @if (op.hijos) {
              <a [routerLink]="op.hijos[0].ruta" class="item" [class.activo]="enSeccion(op)">
                <app-icono [nombre]="op.icono" /> <span>{{ op.texto }}</span>
              </a>
              <div class="subitems">
                @for (h of op.hijos; track h.ruta) {
                  @if (!h.permiso || auth.puede(h.permiso)) {
                    <a [routerLink]="h.ruta" routerLinkActive="sub-activo" [routerLinkActiveOptions]="{ exact: h.ruta === '/productos' }" class="subitem">{{ h.texto }}</a>
                  }
                }
              </div>
            } @else {
              <a [routerLink]="op.ruta" routerLinkActive="activo" class="item">
                <app-icono [nombre]="op.icono" /> <span>{{ op.texto }}</span>
              </a>
            }
          }
          <p class="seccion">OTROS</p>
          @for (op of otros(); track op.texto) {
            <a [routerLink]="op.ruta" routerLinkActive="activo" class="item">
              <app-icono [nombre]="op.icono" /> <span>{{ op.texto }}</span>
            </a>
          }
        </nav>

        <div class="usuario">
          <div class="avatar">{{ iniciales() }}</div>
          <div class="usuario-datos">
            <strong>{{ auth.usuario()?.name }}</strong>
            <span>{{ rol() }}</span>
          </div>
          <button class="btn btn-icono btn-secundario salir" title="Cerrar sesión" (click)="auth.logout()">
            <app-icono nombre="salir" [tam]="18" />
          </button>
        </div>
      </aside>

      <div class="principal">
        <header class="cabecera">
          <button class="btn btn-icono btn-secundario hamburguesa" (click)="menuAbierto.set(!menuAbierto())" aria-label="Menú">
            <app-icono nombre="todos" [tam]="18" />
          </button>
          <div class="buscador cabecera-buscar">
            <app-icono nombre="buscar" [tam]="18" />
            <input class="input" placeholder="Buscar productos o clientes…" (keyup.enter)="buscar($any($event.target).value)" />
          </div>
          <button class="btn btn-icono btn-secundario" title="Notificaciones"><app-icono nombre="campana" [tam]="18" /></button>
        </header>
        <main class="contenido"><router-outlet /></main>
      </div>
    </div>
    <app-confirmar />
  `,
  styles: `
    .app { display: flex; min-height: 100vh; }
    .lateral { width: 260px; flex: none; background: #fff; border-right: 1px solid var(--borde); display: flex; flex-direction: column; padding: 20px 12px; position: sticky; top: 0; height: 100vh; }
    .marca { padding: 4px 12px 20px; display: block; }
    .marca img { height: 40px; }
    nav { flex: 1; overflow: auto; }
    .seccion { font-size: 11px; font-weight: 600; letter-spacing: .08em; color: var(--texto-2); margin: 14px 12px 8px; }
    .item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 10px; color: #444b57; font-weight: 500; margin-bottom: 2px; }
    .item:hover { background: #f4f6fa; }
    .item.activo { background: var(--azul); color: #fff; }
    .subitems { display: flex; flex-direction: column; margin: 2px 0 6px 34px; border-left: 1px solid var(--borde); }
    .subitem { padding: 6px 12px; color: var(--texto-2); font-size: 13.5px; }
    .subitem.sub-activo { color: var(--azul); font-weight: 600; }
    .usuario { display: flex; align-items: center; gap: 10px; padding: 12px; border-top: 1px solid var(--borde); }
    .avatar { width: 38px; height: 38px; border-radius: 10px; background: var(--azul-suave); color: var(--azul); display: grid; place-items: center; font-weight: 700; }
    .usuario-datos { flex: 1; display: flex; flex-direction: column; min-width: 0; }
    .usuario-datos strong { font-size: 13.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .usuario-datos span { font-size: 12px; color: var(--texto-2); text-transform: capitalize; }
    .salir { width: 34px; height: 34px; }
    .principal { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .cabecera { height: 72px; display: flex; align-items: center; gap: 12px; padding: 0 28px; background: #fff; border-bottom: 1px solid var(--borde); position: sticky; top: 0; z-index: 10; }
    .cabecera-buscar { margin-left: auto; width: min(360px, 100%); }
    .hamburguesa { display: none; }
    .contenido { padding: 28px; }
    @media (max-width: 900px) {
      .lateral { position: fixed; left: 0; z-index: 40; transform: translateX(-100%); transition: transform .2s; box-shadow: 0 0 40px rgba(0,0,0,.15); }
      .lateral.abierto { transform: none; }
      .hamburguesa { display: inline-flex; }
      .cabecera { padding: 0 16px; }
      .contenido { padding: 16px; }
    }
  `,
})
export class Shell {
  auth = inject(AuthService);
  private router = inject(Router);
  menuAbierto = signal(false);
  private url = signal(this.router.url);

  private opciones: Opcion[] = [
    { texto: 'Inicio', icono: 'inicio', ruta: '/inicio' },
    {
      texto: 'Ventas',
      icono: 'ventas',
      hijos: [
        { texto: 'Nueva venta', ruta: '/ventas/nueva' },
        { texto: 'Facturas', ruta: '/ventas/facturas' },
      ],
    },
    {
      texto: 'Productos',
      icono: 'productos',
      permiso: 'productos.ver',
      hijos: [
        { texto: 'Productos', ruta: '/productos', permiso: 'productos.ver' },
        { texto: 'Categorías', ruta: '/productos/categorias', permiso: 'categorias.ver' },
      ],
    },
    { texto: 'Inventario', icono: 'inventario', ruta: '/inventario' },
    { texto: 'Clientes', icono: 'clientes', ruta: '/clientes', permiso: 'clientes.ver' },
  ];

  principal = computed(() => this.opciones.filter((o) => !o.permiso || this.auth.puede(o.permiso)));
  otros = computed(() =>
    [
      { texto: 'Configuración', icono: 'config', ruta: '/configuracion', permiso: 'usuarios.ver' },
      { texto: 'Ayuda', icono: 'ayuda', ruta: '/ayuda' },
    ].filter((o) => !o.permiso || this.auth.puede(o.permiso)),
  );
  iniciales = computed(() =>
    (this.auth.usuario()?.name ?? '?')
      .split(' ')
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase(),
  );
  rol = computed(() => this.auth.usuario()?.roles[0] ?? '');

  constructor() {
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe((e) => {
      this.url.set((e as NavigationEnd).urlAfterRedirects);
      this.menuAbierto.set(false);
    });
    // Actualiza roles y permisos al entrar (por si el administrador los cambió).
    this.auth.refrescar().subscribe({ error: () => undefined });
  }

  enSeccion(op: Opcion): boolean {
    return !!op.hijos?.some((h) => this.url().split('?')[0].startsWith(h.ruta.split('/').slice(0, 2).join('/')));
  }

  buscar(texto: string): void {
    if (texto.trim()) this.router.navigate(['/productos'], { queryParams: { q: texto.trim() } });
  }
}
