import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, mensajeError } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { CONSUMIDOR_FINAL, Cliente, ClienteInput } from '../core/models';
import { Confirmar } from '../shared/confirmar';
import { Icono } from '../shared/icono';
import { TIPOS_IDENTIFICACION } from '../shared/formato';
import { errorEmail, errorIdentificacion, erroresCampos } from '../shared/validar';

/** CU-05 / CU-07: pantalla para registrar un cliente nuevo o ver y editar su ficha. */
@Component({
  selector: 'app-cliente-editar',
  imports: [FormsModule, RouterLink, Icono],
  template: `
    <div class="pagina">
      <div class="pagina-cabecera">
        <div>
          <p class="gris migas"><a routerLink="/clientes">Clientes</a> › {{ esNuevo() ? 'Nuevo cliente' : original()?.nombre }}</p>
          <h1>{{ esNuevo() ? 'Nuevo cliente' : 'Ficha del cliente' }}</h1>
        </div>
        @if (!esNuevo() && auth.puede('clientes.eliminar') && !esConsumidorFinal()) {
          <button class="btn btn-peligro" (click)="eliminar()"><app-icono nombre="basura" [tam]="16" /> Eliminar cliente</button>
        }
      </div>

      @if (error()) { <div class="aviso aviso-rojo">{{ error() }}</div> }
      @if (exito()) { <div class="aviso aviso-verde"><app-icono nombre="ok" [tam]="18" /> {{ exito() }}</div> }
      @if (esConsumidorFinal()) {
        <div class="aviso aviso-azul">Este es el cliente genérico «Consumidor final» que usan las ventas sin datos del comprador. No se puede eliminar.</div>
      }

      @if (cargando()) {
        <div class="esqueleto" style="height:360px"></div>
      } @else {
        <form class="tarjeta formulario" (ngSubmit)="guardar()" novalidate>
          <div class="tarjeta-cabecera">
            <h2>Información del cliente</h2>
            @if (!esNuevo()) {
              <span class="pill" [class]="datos.activo ? 'pill-verde' : 'pill-gris'">{{ datos.activo ? 'Activo' : 'Inactivo' }}</span>
            }
          </div>
          <div class="rejilla-2">
            <div class="campo">
              <label for="tipo">Tipo de identificación *</label>
              <select id="tipo" class="input" name="tipo" [(ngModel)]="datos.tipo_identificacion" [disabled]="!editable()">
                @for (t of tipos; track t.valor) { <option [value]="t.valor">{{ t.texto }}</option> }
              </select>
            </div>
            <div class="campo">
              <label for="ident">Identificación *</label>
              <input id="ident" class="input mono" name="identificacion" [(ngModel)]="datos.identificacion" [disabled]="!editable()"
                [class.invalido]="mostrar('identificacion')" maxlength="20" inputmode="numeric" />
              @if (mostrar('identificacion')) { <span class="ayuda-error">{{ mostrar('identificacion') }}</span> }
            </div>
            <div class="campo completo">
              <label for="nombre">Nombre o razón social *</label>
              <input id="nombre" class="input" name="nombre" [(ngModel)]="datos.nombre" [disabled]="!editable()" maxlength="255" [class.invalido]="mostrar('nombre')" />
              @if (mostrar('nombre')) { <span class="ayuda-error">{{ mostrar('nombre') }}</span> }
            </div>
            <div class="campo">
              <label for="email">Correo electrónico</label>
              <input id="email" class="input" type="email" name="email" [(ngModel)]="datos.email" [disabled]="!editable()" maxlength="255" [class.invalido]="mostrar('email')" />
              @if (mostrar('email')) { <span class="ayuda-error">{{ mostrar('email') }}</span> }
            </div>
            <div class="campo">
              <label for="tel">Teléfono</label>
              <input id="tel" class="input" name="telefono" [(ngModel)]="datos.telefono" [disabled]="!editable()" maxlength="20" inputmode="tel" />
            </div>
            <div class="campo completo">
              <label for="dir">Dirección</label>
              <input id="dir" class="input" name="direccion" [(ngModel)]="datos.direccion" [disabled]="!editable()" maxlength="255" />
            </div>
            @if (!esNuevo()) {
              <label class="interruptor"><input type="checkbox" name="activo" [(ngModel)]="datos.activo" [disabled]="!editable() || esConsumidorFinal()" /> Cliente activo</label>
            }
          </div>
          <div class="pie">
            <a routerLink="/clientes" class="btn btn-secundario">{{ editable() ? 'Cancelar' : 'Volver' }}</a>
            @if (editable()) {
              <button type="submit" class="btn btn-primario" [disabled]="guardando()">{{ guardando() ? 'Guardando…' : esNuevo() ? 'Registrar cliente' : 'Guardar cambios' }}</button>
            }
          </div>
        </form>
      }
    </div>
  `,
  styles: `
    .migas { margin: 0 0 4px; font-size: 13px; }
    .formulario { display: flex; flex-direction: column; gap: 16px; max-width: 860px; }
    .completo { grid-column: 1 / -1; }
    .pie { display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--borde); padding-top: 16px; }
  `,
})
export class ClienteEditarPage implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  private confirmar = inject(Confirmar);
  auth = inject(AuthService);
  id = input<string>();

  tipos = TIPOS_IDENTIFICACION;
  original = signal<Cliente | null>(null);
  cargando = signal(false);
  guardando = signal(false);
  intentado = signal(false);
  error = signal('');
  exito = signal('');
  erroresApi = signal<Record<string, string>>({});
  esNuevo = computed(() => !this.id());
  esConsumidorFinal = computed(() => this.original()?.identificacion === CONSUMIDOR_FINAL.identificacion);
  editable = computed(() => (this.esNuevo() ? this.auth.puede('clientes.crear') : this.auth.puede('clientes.editar')));
  datos: ClienteInput = { tipo_identificacion: 'CEDULA', identificacion: '', nombre: '', email: '', telefono: '', direccion: '', activo: true };

  ngOnInit(): void {
    if (this.esNuevo()) return;
    this.cargando.set(true);
    this.api.cliente(+this.id()!).subscribe({
      next: (c) => this.cargar(c),
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  /** Error a mostrar en un campo: primero las reglas locales (después de intentar guardar), luego las de la API. */
  mostrar(campo: string): string {
    const api = this.erroresApi()[campo];
    if (api) return api;
    if (!this.intentado()) return '';
    if (campo === 'identificacion') return errorIdentificacion(this.datos.tipo_identificacion, this.datos.identificacion);
    if (campo === 'nombre') return this.datos.nombre.trim() ? '' : 'El nombre es obligatorio.';
    if (campo === 'email') return errorEmail(this.datos.email);
    return '';
  }

  guardar(): void {
    this.intentado.set(true);
    this.erroresApi.set({});
    this.error.set('');
    this.exito.set('');
    if (['identificacion', 'nombre', 'email'].some((c) => this.mostrar(c))) return;
    this.guardando.set(true);
    const limpio: ClienteInput = {
      ...this.datos,
      identificacion: this.datos.identificacion.trim(),
      nombre: this.datos.nombre.trim(),
      email: this.datos.email?.trim() || null,
      telefono: this.datos.telefono?.trim() || null,
      direccion: this.datos.direccion?.trim() || null,
    };
    const id = this.id();
    (id ? this.api.actualizarCliente(+id, limpio) : this.api.crearCliente(limpio)).subscribe({
      next: (c) => {
        this.guardando.set(false);
        if (!id) {
          this.router.navigate(['/clientes', c.id], { state: { creado: true } });
          return;
        }
        this.cargar(c);
        this.exito.set('Cambios guardados.');
      },
      error: (e) => {
        this.guardando.set(false);
        const campos = erroresCampos(e);
        if (campos) this.erroresApi.set(campos);
        else this.error.set(mensajeError(e));
      },
    });
  }

  async eliminar(): Promise<void> {
    const c = this.original();
    if (!c) return;
    const si = await this.confirmar.preguntar(
      'Eliminar cliente',
      `¿Seguro que quieres eliminar a «${c.nombre}»? Sus facturas se conservan, pero ya no aparecerá en la lista.`,
    );
    if (!si) return;
    this.api.eliminarCliente(c.id).subscribe({
      next: () => this.router.navigate(['/clientes']),
      error: (e) => this.error.set(mensajeError(e)),
    });
  }

  private cargar(c: Cliente): void {
    this.original.set(c);
    this.datos = { ...c, email: c.email ?? '', telefono: c.telefono ?? '', direccion: c.direccion ?? '' };
    this.cargando.set(false);
    if (history.state?.creado) this.exito.set('Cliente registrado.');
  }
}
