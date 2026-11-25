import { Component, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { ApiService, mensajeError } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { PermisoGrupo, Rol, Usuario } from '../core/models';
import { Icono } from '../shared/icono';

const ACCIONES: Record<string, string> = { ver: 'Ver', crear: 'Crear', editar: 'Editar', eliminar: 'Eliminar' };
const RECURSOS: Record<string, string> = {
  usuarios: 'Usuarios', roles: 'Roles', permisos: 'Permisos', categorias: 'Categorías', clientes: 'Clientes', productos: 'Productos',
};

/** CU-09 Gestionar usuarios, roles y permisos. */
@Component({
  selector: 'app-usuarios',
  imports: [Icono],
  template: `
    <div class="pagina">
      <div class="pagina-cabecera"><div><p class="gris migas">Configuración › Usuarios y permisos</p><h1>Usuarios y permisos</h1></div></div>
      @if (error()) { <div class="aviso aviso-rojo">{{ error() }}</div> }

      <div class="roles">
        @for (r of roles(); track r.id) {
          <div class="tarjeta rol" [class.elegido]="rolEditado()?.id === r.id">
            <div class="kpi-icono" style="background:var(--azul-suave);color:var(--azul)"><app-icono [nombre]="r.name === 'administrador' ? 'escudo' : 'usuario'" /></div>
            <h2 class="capital">{{ r.name }}</h2>
            <span class="gris">{{ r.permisos.length }} permisos · {{ contarUsuarios(r.name) }} usuarios</span>
            @if (auth.puede('roles.editar')) {
              <button class="btn btn-secundario btn-chico" (click)="editarRol(r)">Editar permisos</button>
            }
          </div>
        }
      </div>

      <div class="contenido" [class.con-panel]="rolEditado()">
        <div class="tarjeta">
          <div class="tarjeta-cabecera"><h2>Usuarios del sistema</h2></div>
          @if (cargando()) {
            @for (i of [1, 2, 3]; track i) { <div class="esqueleto" style="height:48px;margin-bottom:8px"></div> }
          } @else {
            <div class="desplazable">
              <table class="tabla">
                <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th></tr></thead>
                <tbody>
                  @for (u of usuarios(); track u.id) {
                    <tr>
                      <td><div class="usuario"><span class="iniciales">{{ iniciales(u.name) }}</span><strong>{{ u.name }}</strong></div></td>
                      <td>{{ u.email }}</td>
                      <td><span class="pill pill-azul capital">{{ u.roles.join(', ') }}</span></td>
                      <td><span class="pill" [class]="u.activo ? 'pill-verde' : 'pill-gris'">{{ u.activo ? 'Activo' : 'Inactivo' }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        @if (rolEditado(); as r) {
          <div class="tarjeta panel">
            <div class="tarjeta-cabecera">
              <h2>Permisos del rol <span class="capital">{{ r.name }}</span></h2>
              <button class="btn btn-icono btn-secundario" (click)="rolEditado.set(null)" aria-label="Cerrar"><app-icono nombre="cerrar" [tam]="18" /></button>
            </div>
            @if (guardadoOk()) { <div class="aviso aviso-verde">Permisos guardados.</div> }
            @for (g of grupos(); track g.recurso) {
              <fieldset>
                <legend>{{ recurso(g.recurso) }}</legend>
                @for (p of g.permisos; track p.id) {
                  <label class="permiso">
                    <input type="checkbox" [checked]="seleccion().has(p.name)" (change)="alternar(p.name)" [disabled]="r.name === 'administrador'" />
                    {{ accion(p.accion) }} {{ recurso(g.recurso).toLowerCase() }}
                  </label>
                }
              </fieldset>
            }
            @if (r.name === 'administrador') { <p class="gris">El administrador siempre tiene todos los permisos.</p> }
            <div class="pie">
              <button class="btn btn-secundario" (click)="rolEditado.set(null)">Cancelar</button>
              <button class="btn btn-primario" (click)="guardarRol()" [disabled]="guardando() || r.name === 'administrador'">{{ guardando() ? 'Guardando…' : 'Guardar permisos' }}</button>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .migas { margin: 0 0 4px; font-size: 13px; }
    .roles { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
    .rol { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
    .rol.elegido { border-color: var(--azul); }
    .capital { text-transform: capitalize; }
    .contenido { display: grid; grid-template-columns: 1fr; gap: 20px; align-items: start; }
    .contenido.con-panel { grid-template-columns: 1fr 380px; }
    .usuario { display: flex; align-items: center; gap: 10px; }
    .iniciales { width: 34px; height: 34px; border-radius: 50%; background: var(--azul); color: #fff; display: grid; place-items: center; font-size: 12px; font-weight: 700; flex: none; }
    .desplazable { overflow-x: auto; }
    .panel { display: flex; flex-direction: column; gap: 12px; }
    fieldset { border: 1px solid var(--borde); border-radius: 12px; padding: 10px 14px; margin: 0; }
    legend { font-weight: 600; padding: 0 6px; }
    .permiso { display: flex; gap: 8px; align-items: center; padding: 4px 0; cursor: pointer; }
    .permiso input { accent-color: var(--azul); width: 16px; height: 16px; }
    .pie { display: flex; justify-content: flex-end; gap: 10px; }
    @media (max-width: 1100px) { .contenido.con-panel { grid-template-columns: 1fr; } }
  `,
})
export class UsuariosPage {
  private api = inject(ApiService);
  auth = inject(AuthService);
  usuarios = signal<Usuario[]>([]);
  roles = signal<Rol[]>([]);
  grupos = signal<PermisoGrupo[]>([]);
  cargando = signal(true);
  error = signal('');
  rolEditado = signal<Rol | null>(null);
  seleccion = signal<Set<string>>(new Set());
  guardando = signal(false);
  guardadoOk = signal(false);

  constructor() {
    forkJoin({
      usuarios: this.api.usuarios(),
      roles: this.auth.puede('roles.ver') ? this.api.roles() : of([] as Rol[]),
      grupos: this.auth.puede('permisos.ver') ? this.api.permisos() : of([] as PermisoGrupo[]),
    }).subscribe({
      next: (r) => {
        this.usuarios.set(r.usuarios);
        this.roles.set(r.roles);
        this.grupos.set(r.grupos);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  contarUsuarios(rol: string): number {
    return this.usuarios().filter((u) => u.roles.includes(rol)).length;
  }

  editarRol(r: Rol): void {
    this.guardadoOk.set(false);
    this.rolEditado.set(r);
    this.seleccion.set(new Set(r.permisos));
  }

  alternar(p: string): void {
    this.seleccion.update((s) => {
      const n = new Set(s);
      if (n.has(p)) n.delete(p);
      else n.add(p);
      return n;
    });
  }

  guardarRol(): void {
    const r = this.rolEditado();
    if (!r) return;
    this.guardando.set(true);
    this.api.actualizarRol(r.id, r.name, [...this.seleccion()]).subscribe({
      next: (nuevo) => {
        this.guardando.set(false);
        this.guardadoOk.set(true);
        this.roles.update((l) => l.map((x) => (x.id === nuevo.id ? { ...x, permisos: nuevo.permisos } : x)));
      },
      error: (e) => {
        this.guardando.set(false);
        this.error.set(mensajeError(e));
      },
    });
  }

  iniciales(n: string): string {
    return n.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  }

  recurso(r: string): string {
    return RECURSOS[r] ?? r;
  }

  accion(a: string): string {
    return ACCIONES[a] ?? a;
  }
}
