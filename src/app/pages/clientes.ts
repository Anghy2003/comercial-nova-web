import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, mensajeError } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Cliente } from '../core/models';
import { ClienteForm } from '../shared/cliente-form';
import { Icono } from '../shared/icono';

/** CU-07 Gestionar clientes: listado con buscador, crear y editar. */
@Component({
  selector: 'app-clientes',
  imports: [FormsModule, Icono, ClienteForm],
  template: `
    <div class="pagina">
      <div class="pagina-cabecera">
        <div><p class="gris migas">Clientes</p><h1>Clientes</h1></div>
        @if (auth.puede('clientes.crear')) {
          <button class="btn btn-primario" (click)="abrir(null)"><app-icono nombre="mas" [tam]="18" /> Nuevo cliente</button>
        }
      </div>
      @if (error()) { <div class="aviso aviso-rojo">{{ error() }}</div> }

      <div class="tarjeta">
        <div class="buscador herramientas"><app-icono nombre="buscar" [tam]="18" />
          <input class="input" placeholder="Buscar por nombre o identificación" [ngModel]="texto()" (ngModelChange)="texto.set($event)" />
        </div>
        @if (cargando()) {
          @for (i of [1, 2, 3, 4]; track i) { <div class="esqueleto" style="height:48px;margin-bottom:8px"></div> }
        } @else if (visibles().length === 0) {
          <div class="vacio"><app-icono nombre="clientes" [tam]="36" /><p>No hay clientes con ese filtro.</p></div>
        } @else {
          <div class="desplazable">
            <table class="tabla">
              <thead><tr><th>Cliente</th><th>Identificación</th><th>Correo</th><th>Teléfono</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                @for (c of visibles(); track c.id) {
                  <tr>
                    <td><div class="cliente"><span class="iniciales">{{ iniciales(c.nombre) }}</span><strong>{{ c.nombre }}</strong></div></td>
                    <td><span class="gris">{{ tipo(c.tipo_identificacion) }}</span> <span class="mono">{{ c.identificacion }}</span></td>
                    <td>{{ c.email || '—' }}</td>
                    <td>{{ c.telefono || '—' }}</td>
                    <td><span class="pill" [class]="c.activo ? 'pill-verde' : 'pill-gris'">{{ c.activo ? 'Activo' : 'Inactivo' }}</span></td>
                    <td class="num">
                      @if (auth.puede('clientes.editar')) {
                        <button class="btn btn-secundario btn-chico" (click)="abrir(c)"><app-icono nombre="editar" [tam]="14" /> Editar</button>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>

    @if (editando() !== undefined) {
      <app-cliente-form [cliente]="editando() ?? null" (cerrar)="editando.set(undefined)" (guardado)="guardado($event)" />
    }
  `,
  styles: `
    .migas { margin: 0 0 4px; font-size: 13px; }
    .herramientas { margin-bottom: 16px; max-width: 420px; }
    .cliente { display: flex; align-items: center; gap: 10px; }
    .iniciales { width: 34px; height: 34px; border-radius: 50%; background: var(--azul); color: #fff; display: grid; place-items: center; font-size: 12px; font-weight: 700; flex: none; }
    .desplazable { overflow-x: auto; }
  `,
})
export class ClientesPage {
  private api = inject(ApiService);
  auth = inject(AuthService);
  clientes = signal<Cliente[]>([]);
  cargando = signal(true);
  error = signal('');
  texto = signal('');
  /** undefined = cerrado, null = nuevo, Cliente = editar */
  editando = signal<Cliente | null | undefined>(undefined);

  visibles = computed(() => {
    const t = this.texto().toLowerCase().trim();
    return this.clientes().filter((c) => !t || c.nombre.toLowerCase().includes(t) || c.identificacion.includes(t));
  });

  constructor() {
    this.api.clientes().subscribe({
      next: (c) => {
        this.clientes.set(c);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  abrir(c: Cliente | null): void {
    this.editando.set(c);
  }

  guardado(c: Cliente): void {
    this.clientes.update((l) => {
      const otros = l.filter((x) => x.id !== c.id);
      return [...otros, c].sort((a, b) => a.nombre.localeCompare(b.nombre));
    });
    this.editando.set(undefined);
  }

  iniciales(n: string): string {
    return n.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  }

  tipo(t: string): string {
    return t === 'CEDULA' ? 'Cédula' : t === 'RUC' ? 'RUC' : 'Pasaporte';
  }
}
