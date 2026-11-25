import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, mensajeError } from '../core/api.service';
import { Cliente, ClienteInput } from '../core/models';
import { Icono } from './icono';
import { TIPOS_IDENTIFICACION } from './formato';

/** Ventana para crear o editar un cliente (CU-05 y CU-07). Muestra los errores 422 junto a cada campo. */
@Component({
  selector: 'app-cliente-form',
  imports: [FormsModule, Icono],
  template: `
    <div class="modal-fondo" (click)="cerrar.emit()">
      <form class="modal" (click)="$event.stopPropagation()" (ngSubmit)="guardar()">
        <div class="modal-cabecera">
          <h2>{{ cliente() ? 'Editar cliente' : 'Cliente nuevo' }}</h2>
          <button type="button" class="btn btn-icono btn-secundario" (click)="cerrar.emit()" aria-label="Cerrar"><app-icono nombre="cerrar" [tam]="18" /></button>
        </div>
        <div class="modal-cuerpo">
          @if (error()) { <div class="aviso aviso-rojo">{{ error() }}</div> }
          <div class="campo">
            <label>Tipo de identificación</label>
            <select class="input" name="tipo" [(ngModel)]="datos.tipo_identificacion">
              @for (t of tipos; track t.valor) { <option [value]="t.valor">{{ t.texto }}</option> }
            </select>
          </div>
          <div class="campo">
            <label>Identificación *</label>
            <input class="input mono" name="identificacion" [(ngModel)]="datos.identificacion" required [class.invalido]="errores()['identificacion']" />
            @if (errores()['identificacion']) { <span class="ayuda-error">{{ errores()['identificacion'] }}</span> }
          </div>
          <div class="campo">
            <label>Nombre *</label>
            <input class="input" name="nombre" [(ngModel)]="datos.nombre" required [class.invalido]="errores()['nombre']" />
            @if (errores()['nombre']) { <span class="ayuda-error">{{ errores()['nombre'] }}</span> }
          </div>
          <div class="rejilla-2">
            <div class="campo">
              <label>Correo electrónico</label>
              <input class="input" type="email" name="email" [(ngModel)]="datos.email" [class.invalido]="errores()['email']" />
              @if (errores()['email']) { <span class="ayuda-error">{{ errores()['email'] }}</span> }
            </div>
            <div class="campo">
              <label>Teléfono</label>
              <input class="input" name="telefono" [(ngModel)]="datos.telefono" />
            </div>
          </div>
          <div class="campo">
            <label>Dirección</label>
            <input class="input" name="direccion" [(ngModel)]="datos.direccion" />
          </div>
          @if (cliente()) {
            <label class="interruptor"><input type="checkbox" name="activo" [(ngModel)]="datos.activo" /> Activo</label>
          }
        </div>
        <div class="modal-pie">
          <button type="button" class="btn btn-secundario" (click)="cerrar.emit()">Cancelar</button>
          <button type="submit" class="btn btn-primario" [disabled]="guardando() || !datos.identificacion || !datos.nombre">
            {{ guardando() ? 'Guardando…' : textoGuardar() }}
          </button>
        </div>
      </form>
    </div>
  `,
})
export class ClienteForm implements OnInit {
  private api = inject(ApiService);
  cliente = input<Cliente | null>(null);
  textoGuardar = input('Guardar');
  cerrar = output<void>();
  guardado = output<Cliente>();
  tipos = TIPOS_IDENTIFICACION;
  guardando = signal(false);
  error = signal('');
  errores = signal<Record<string, string>>({});
  datos: ClienteInput = { tipo_identificacion: 'CEDULA', identificacion: '', nombre: '', email: '', telefono: '', direccion: '', activo: true };

  ngOnInit(): void {
    const c = this.cliente();
    if (c) this.datos = { ...c, email: c.email ?? '', telefono: c.telefono ?? '', direccion: c.direccion ?? '' };
  }

  guardar(): void {
    this.guardando.set(true);
    this.error.set('');
    this.errores.set({});
    const limpio: ClienteInput = {
      ...this.datos,
      email: this.datos.email || null,
      telefono: this.datos.telefono || null,
      direccion: this.datos.direccion || null,
    };
    const c = this.cliente();
    const peticion = c ? this.api.actualizarCliente(c.id, limpio) : this.api.crearCliente(limpio);
    peticion.subscribe({
      next: (r) => this.guardado.emit(r),
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        if (e.status === 422 && e.error?.errors) {
          const m: Record<string, string> = {};
          for (const [k, v] of Object.entries(e.error.errors as Record<string, string[]>)) m[k] = v[0];
          this.errores.set(m);
        } else this.error.set(mensajeError(e));
      },
    });
  }
}
