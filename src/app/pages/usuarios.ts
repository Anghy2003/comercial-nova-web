import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { ApiService, mensajeError } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { PermisoGrupo, Rol, Usuario, UsuarioInput } from '../core/models';
import { Confirmar } from '../shared/confirmar';
import { Icono } from '../shared/icono';
import { errorEmail, erroresCampos } from '../shared/validar';

const ACCIONES: Record<string, string> = { ver: 'Ver', crear: 'Crear', editar: 'Editar', eliminar: 'Eliminar' };
const RECURSOS: Record<string, string> = {
  usuarios: 'Usuarios', roles: 'Roles', permisos: 'Permisos', categorias: 'Categorías', clientes: 'Clientes', productos: 'Productos',
};

/** CU-09 Gestionar usuarios, roles y permisos. */
@Component({
  selector: 'app-usuarios',
  imports: [FormsModule, Icono],
  template: `
    <div class="pagina">
      <div class="pagina-cabecera">
        <div><p class="gris migas">Configuración › Usuarios y permisos</p><h1>Usuarios y permisos</h1></div>
        <div class="botones">
          @if (auth.puede('roles.crear')) { <button class="btn btn-secundario" (click)="nuevoRol()" [disabled]="cargando()"><app-icono nombre="escudo" [tam]="18" /> Nuevo rol</button> }
          @if (auth.puede('usuarios.crear')) { <button class="btn btn-primario" (click)="nuevoUsuario()" [disabled]="cargando()"><app-icono nombre="mas" [tam]="18" /> Nuevo usuario</button> }
        </div>
      </div>
      @if (error()) { <div class="aviso aviso-rojo">{{ error() }}<button class="cerrar-aviso" (click)="error.set('')" aria-label="Cerrar aviso"><app-icono nombre="cerrar" [tam]="14" /></button></div> }

      <div class="roles">
        @for (r of roles(); track r.id) {
          <div class="tarjeta rol" [class.elegido]="rolEditado()?.id === r.id">
            <div class="kpi-icono" style="background:var(--azul-suave);color:var(--azul)"><app-icono [nombre]="r.name === 'administrador' ? 'escudo' : 'usuario'" /></div>
            <h2 class="capital">{{ r.name }}</h2>
            <span class="gris">{{ r.permisos.length }} permisos · {{ contarUsuarios(r.name) }} usuarios</span>
            <div class="acciones">
              @if (auth.puede('roles.editar')) { <button class="btn btn-secundario btn-chico" (click)="editarRol(r)">Editar permisos</button> }
              @if (auth.puede('roles.eliminar') && r.name !== 'administrador') {
                <button class="btn btn-peligro btn-chico" (click)="eliminarRol(r)" [attr.aria-label]="'Eliminar rol ' + r.name"><app-icono nombre="basura" [tam]="14" /></button>
              }
            </div>
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
                <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th></th></tr></thead>
                <tbody>
                  @for (u of usuarios(); track u.id) {
                    <tr>
                      <td><div class="usuario"><span class="iniciales">{{ iniciales(u.name) }}</span><strong>{{ u.name }}</strong>@if (u.id === yo()) { <span class="pill pill-gris">Tú</span> }</div></td>
                      <td>{{ u.email }}</td>
                      <td><span class="pill pill-azul capital">{{ u.roles.join(', ') }}</span></td>
                      <td><span class="pill" [class]="u.activo ? 'pill-verde' : 'pill-gris'">{{ u.activo ? 'Activo' : 'Inactivo' }}</span></td>
                      <td class="num acciones-fila">
                        @if (auth.puede('usuarios.editar')) {
                          <button class="btn btn-secundario btn-chico" (click)="editarUsuario(u)"><app-icono nombre="editar" [tam]="14" /> Editar</button>
                        }
                        @if (auth.puede('usuarios.eliminar') && u.id !== yo()) {
                          <button class="btn btn-peligro btn-chico" (click)="eliminarUsuario(u)" [attr.aria-label]="'Eliminar ' + u.name"><app-icono nombre="basura" [tam]="14" /></button>
                        }
                      </td>
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
              <h2>{{ r.id ? 'Permisos del rol' : 'Nuevo rol' }} @if (r.id) { <span class="capital">{{ r.name }}</span> }</h2>
              <button class="btn btn-icono btn-secundario" (click)="rolEditado.set(null)" aria-label="Cerrar"><app-icono nombre="cerrar" [tam]="18" /></button>
            </div>
            @if (guardadoOk()) { <div class="aviso aviso-verde">Permisos guardados.</div> }
            @if (errorRol()) { <span class="ayuda-error">{{ errorRol() }}</span> }
            @if (!r.id) {
              <div class="campo"><label for="nombre-rol">Nombre del rol *</label><input id="nombre-rol" class="input" [(ngModel)]="nombreRol" maxlength="255" placeholder="ej. bodeguero" /></div>
            }
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
              <button class="btn btn-primario" (click)="guardarRol()" [disabled]="guardando() || r.name === 'administrador' || (!r.id && !nombreRol.trim())">{{ guardando() ? 'Guardando…' : r.id ? 'Guardar permisos' : 'Crear rol' }}</button>
            </div>
          </div>
        }
      </div>
    </div>

    @if (usuarioEditado(); as u) {
      <div class="modal-fondo" (click)="usuarioEditado.set(null)">
        <form class="modal" (click)="$event.stopPropagation()" (ngSubmit)="guardarUsuario()" novalidate>
          <div class="modal-cabecera">
            <h2>{{ u.id ? 'Editar usuario' : 'Nuevo usuario' }}</h2>
            <button type="button" class="btn btn-icono btn-secundario" (click)="usuarioEditado.set(null)" aria-label="Cerrar"><app-icono nombre="cerrar" [tam]="18" /></button>
          </div>
          <div class="modal-cuerpo">
            @if (errorUsuario()) { <div class="aviso aviso-rojo">{{ errorUsuario() }}</div> }
            <div class="campo">
              <label for="u-nombre">Nombre *</label>
              <input id="u-nombre" class="input" name="name" [(ngModel)]="formU.name" maxlength="255" [class.invalido]="campoU()['name']" />
              @if (campoU()['name']) { <span class="ayuda-error">{{ campoU()['name'] }}</span> }
            </div>
            <div class="campo">
              <label for="u-email">Correo electrónico *</label>
              <input id="u-email" class="input" type="email" name="email" [(ngModel)]="formU.email" maxlength="255" autocomplete="off" [class.invalido]="campoU()['email']" />
              @if (campoU()['email']) { <span class="ayuda-error">{{ campoU()['email'] }}</span> }
            </div>
            <div class="rejilla-2">
              <div class="campo">
                <label for="u-clave">{{ u.id ? 'Nueva contraseña' : 'Contraseña *' }}</label>
                <input id="u-clave" class="input" type="password" name="password" [(ngModel)]="formU.password" autocomplete="new-password" [class.invalido]="campoU()['password']" />
              </div>
              <div class="campo">
                <label for="u-clave2">Repetir contraseña</label>
                <input id="u-clave2" class="input" type="password" name="password_confirmation" [(ngModel)]="formU.password_confirmation" autocomplete="new-password" />
              </div>
            </div>
            @if (campoU()['password']) { <span class="ayuda-error">{{ campoU()['password'] }}</span> }
            <span class="gris ayuda">Mínimo 8 caracteres.{{ u.id ? ' Déjala vacía para no cambiarla.' : '' }}</span>
            <div class="campo">
              <label for="u-rol">Rol *</label>
              <select id="u-rol" class="input capital" name="rol" [(ngModel)]="rolUsuario" [class.invalido]="campoU()['roles']">
                @for (r of roles(); track r.id) { <option [ngValue]="r.name">{{ r.name }}</option> }
              </select>
              @if (campoU()['roles']) { <span class="ayuda-error">{{ campoU()['roles'] }}</span> }
            </div>
            @if (campoU()['activo']) { <span class="ayuda-error">{{ campoU()['activo'] }}</span> }
            @if (u.id !== yo()) {
              <label class="interruptor"><input type="checkbox" name="activo" [(ngModel)]="formU.activo" /> Usuario activo (puede iniciar sesión)</label>
            }
          </div>
          <div class="modal-pie">
            <button type="button" class="btn btn-secundario" (click)="usuarioEditado.set(null)">Cancelar</button>
            <button type="submit" class="btn btn-primario" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : 'Guardar' }}</button>
          </div>
        </form>
      </div>
    }
  `,
  styles: `
    .migas { margin: 0 0 4px; font-size: 13px; }
    .botones { display: flex; gap: 10px; flex-wrap: wrap; }
    .aviso { position: relative; }
    .cerrar-aviso { margin-left: auto; background: none; border: 0; color: inherit; cursor: pointer; }
    .roles { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
    .rol { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
    .rol.elegido { border-color: var(--azul); }
    .acciones { display: flex; gap: 6px; }
    .acciones-fila { white-space: nowrap; }
    .acciones-fila .btn { margin-left: 6px; }
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
    .ayuda { font-size: 12px; margin-top: -8px; }
    @media (max-width: 1100px) { .contenido.con-panel { grid-template-columns: 1fr; } }
  `,
})
export class UsuariosPage {
  private api = inject(ApiService);
  private confirmar = inject(Confirmar);
  auth = inject(AuthService);
  usuarios = signal<Usuario[]>([]);
  roles = signal<Rol[]>([]);
  grupos = signal<PermisoGrupo[]>([]);
  cargando = signal(true);
  error = signal('');
  guardando = signal(false);
  yo = computed(() => this.auth.usuario()?.id);

  // Roles
  rolEditado = signal<Rol | null>(null);
  seleccion = signal<Set<string>>(new Set());
  guardadoOk = signal(false);
  errorRol = signal('');
  nombreRol = '';

  // Usuarios
  usuarioEditado = signal<Usuario | { id: 0 } | null>(null);
  campoU = signal<Record<string, string>>({});
  errorUsuario = signal('');
  formU: UsuarioInput = this.formVacio();
  rolUsuario = 'vendedor';

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

  // ---- Roles ----
  nuevoRol(): void {
    this.guardadoOk.set(false);
    this.errorRol.set('');
    this.nombreRol = '';
    this.rolEditado.set({ id: 0, name: '', permisos: [] });
    this.seleccion.set(new Set());
  }

  editarRol(r: Rol): void {
    this.guardadoOk.set(false);
    this.errorRol.set('');
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
    this.errorRol.set('');
    const permisos = [...this.seleccion()];
    const peticion = r.id ? this.api.actualizarRol(r.id, r.name, permisos) : this.api.crearRol(this.nombreRol.trim().toLowerCase(), permisos);
    peticion.subscribe({
      next: (nuevo) => {
        this.guardando.set(false);
        this.guardadoOk.set(true);
        this.roles.update((l) => [...l.filter((x) => x.id !== nuevo.id), nuevo].sort((a, b) => a.id - b.id));
        this.rolEditado.set(nuevo);
      },
      error: (e) => {
        this.guardando.set(false);
        const campos = erroresCampos(e);
        this.errorRol.set(campos ? Object.values(campos).join(' ') : mensajeError(e));
      },
    });
  }

  async eliminarRol(r: Rol): Promise<void> {
    if (this.contarUsuarios(r.name) > 0) {
      this.error.set(`No se puede eliminar el rol «${r.name}» porque tiene usuarios asignados. Cámbialos de rol primero.`);
      return;
    }
    const si = await this.confirmar.preguntar('Eliminar rol', `¿Seguro que quieres eliminar el rol «${r.name}»?`);
    if (!si) return;
    this.api.eliminarRol(r.id).subscribe({
      next: () => {
        this.roles.update((l) => l.filter((x) => x.id !== r.id));
        if (this.rolEditado()?.id === r.id) this.rolEditado.set(null);
      },
      error: (e) => this.error.set(mensajeError(e)),
    });
  }

  // ---- Usuarios ----
  nuevoUsuario(): void {
    this.formU = this.formVacio();
    this.rolUsuario = this.roles().find((r) => r.name === 'vendedor')?.name ?? this.roles()[0]?.name ?? '';
    this.campoU.set({});
    this.errorUsuario.set('');
    this.usuarioEditado.set({ id: 0 });
  }

  editarUsuario(u: Usuario): void {
    this.formU = { name: u.name, email: u.email, password: '', password_confirmation: '', roles: u.roles, activo: u.activo };
    this.rolUsuario = u.roles[0] ?? '';
    this.campoU.set({});
    this.errorUsuario.set('');
    this.usuarioEditado.set(u);
  }

  guardarUsuario(): void {
    const u = this.usuarioEditado();
    if (!u) return;
    // Validación local (la API vuelve a validar todo).
    const errores: Record<string, string> = {};
    if (!this.formU.name.trim()) errores['name'] = 'El nombre es obligatorio.';
    if (!this.formU.email.trim()) errores['email'] = 'El correo es obligatorio.';
    else if (errorEmail(this.formU.email)) errores['email'] = errorEmail(this.formU.email);
    const clave = this.formU.password ?? '';
    if (!u.id && !clave) errores['password'] = 'La contraseña es obligatoria.';
    else if (clave && clave.length < 8) errores['password'] = 'La contraseña debe tener al menos 8 caracteres.';
    else if (clave && clave !== this.formU.password_confirmation) errores['password'] = 'Las contraseñas no coinciden.';
    if (!this.rolUsuario) errores['roles'] = 'Elige un rol.';
    this.campoU.set(errores);
    if (Object.keys(errores).length) return;

    const datos: UsuarioInput = {
      name: this.formU.name.trim(),
      email: this.formU.email.trim(),
      roles: [this.rolUsuario],
      activo: this.formU.activo,
      ...(clave ? { password: clave, password_confirmation: this.formU.password_confirmation } : {}),
    };
    this.guardando.set(true);
    (u.id ? this.api.actualizarUsuario(u.id, datos) : this.api.crearUsuario(datos)).subscribe({
      next: (nuevo) => {
        this.guardando.set(false);
        this.usuarios.update((l) => [...l.filter((x) => x.id !== nuevo.id), nuevo].sort((a, b) => a.id - b.id));
        this.usuarioEditado.set(null);
        if (nuevo.id === this.yo()) this.auth.refrescar().subscribe({ error: () => undefined });
      },
      error: (e) => {
        this.guardando.set(false);
        const campos = erroresCampos(e);
        if (campos) this.campoU.set(campos);
        else this.errorUsuario.set(mensajeError(e));
      },
    });
  }

  async eliminarUsuario(u: Usuario): Promise<void> {
    const si = await this.confirmar.preguntar(
      'Eliminar usuario',
      `¿Seguro que quieres eliminar a «${u.name}»? Se cerrarán todas sus sesiones y ya no podrá ingresar.`,
    );
    if (!si) return;
    this.api.eliminarUsuario(u.id).subscribe({
      next: () => this.usuarios.update((l) => l.filter((x) => x.id !== u.id)),
      error: (e) => this.error.set(mensajeError(e)),
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

  private formVacio(): UsuarioInput {
    return { name: '', email: '', password: '', password_confirmation: '', roles: [], activo: true };
  }
}
