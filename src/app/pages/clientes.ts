import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, mensajeError } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { CONSUMIDOR_FINAL, Cliente } from '../core/models';
import { Confirmar } from '../shared/confirmar';
import { Icono } from '../shared/icono';

/** CU-07 Gestionar clientes: listado con buscador; alta y ficha en su propia pantalla. */
@Component({
  selector: 'app-clientes',
  imports: [FormsModule, RouterLink, Icono],
  template: `
    <div class="pagina">
      <div class="pagina-cabecera">
        <div><p class="gris migas">Clientes</p><h1>Clientes</h1></div>
        @if (auth.puede('clientes.crear')) {
          <a routerLink="/clientes/nuevo" class="btn btn-primario"><app-icono nombre="mas" [tam]="18" /> Nuevo cliente</a>
        }
      </div>
      @if (error()) { <div class="aviso aviso-rojo">{{ error() }}</div> }

      <div class="tarjeta">
        <div class="herramientas">
          <div class="buscador"><app-icono nombre="buscar" [tam]="18" />
            <input class="input" placeholder="Buscar por nombre o identificación" [ngModel]="texto()" (ngModelChange)="texto.set($event)" />
          </div>
          <select class="input selector" [ngModel]="estado()" (ngModelChange)="estado.set($event)">
            <option value="todos">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option>
          </select>
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
                  <tr class="clic" (click)="abrir(c)">
                    <td><div class="cliente"><span class="iniciales">{{ iniciales(c.nombre) }}</span><strong>{{ c.nombre }}</strong></div></td>
                    <td><span class="gris">{{ tipo(c.tipo_identificacion) }}</span> <span class="mono">{{ c.identificacion }}</span></td>
                    <td>{{ c.email || '—' }}</td>
                    <td>{{ c.telefono || '—' }}</td>
                    <td><span class="pill" [class]="c.activo ? 'pill-verde' : 'pill-gris'">{{ c.activo ? 'Activo' : 'Inactivo' }}</span></td>
                    <td class="num acciones" (click)="$event.stopPropagation()">
                      <a [routerLink]="['/clientes', c.id]" class="btn btn-secundario btn-chico">
                        <app-icono [nombre]="auth.puede('clientes.editar') ? 'editar' : 'ojo'" [tam]="14" /> {{ auth.puede('clientes.editar') ? 'Editar' : 'Ver' }}
                      </a>
                      @if (auth.puede('clientes.eliminar') && c.identificacion !== consumidorFinal) {
                        <button class="btn btn-peligro btn-chico" (click)="eliminar(c)" [attr.aria-label]="'Eliminar ' + c.nombre"><app-icono nombre="basura" [tam]="14" /></button>
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
  `,
  styles: `
    .migas { margin: 0 0 4px; font-size: 13px; }
    .herramientas { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
    .herramientas .buscador { flex: 1; min-width: 220px; max-width: 420px; }
    .selector { width: 160px; }
    .cliente { display: flex; align-items: center; gap: 10px; }
    .iniciales { width: 34px; height: 34px; border-radius: 50%; background: var(--azul); color: #fff; display: grid; place-items: center; font-size: 12px; font-weight: 700; flex: none; }
    .acciones { display: flex; gap: 6px; justify-content: flex-end; }
    .desplazable { overflow-x: auto; }
  `,
})
export class ClientesPage {
  private api = inject(ApiService);
  private router = inject(Router);
  private confirmar = inject(Confirmar);
  auth = inject(AuthService);
  consumidorFinal = CONSUMIDOR_FINAL.identificacion;
  clientes = signal<Cliente[]>([]);
  cargando = signal(true);
  error = signal('');
  texto = signal('');
  estado = signal<'todos' | 'activos' | 'inactivos'>('todos');

  visibles = computed(() => {
    const t = this.texto().toLowerCase().trim();
    const e = this.estado();
    return this.clientes().filter(
      (c) =>
        (e === 'todos' || (e === 'activos') === c.activo) &&
        (!t || c.nombre.toLowerCase().includes(t) || c.identificacion.includes(t)),
    );
  });

  constructor() {
    this.cargar();
  }

  abrir(c: Cliente): void {
    this.router.navigate(['/clientes', c.id]);
  }

  async eliminar(c: Cliente): Promise<void> {
    const si = await this.confirmar.preguntar('Eliminar cliente', `¿Seguro que quieres eliminar a «${c.nombre}»? Sus facturas se conservan.`);
    if (!si) return;
    this.api.eliminarCliente(c.id).subscribe({
      next: () => this.clientes.update((l) => l.filter((x) => x.id !== c.id)),
      error: (e) => this.error.set(mensajeError(e)),
    });
  }

  iniciales(n: string): string {
    return n.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase();
  }

  tipo(t: string): string {
    return t === 'CEDULA' ? 'Cédula' : t === 'RUC' ? 'RUC' : 'Pasaporte';
  }

  private cargar(): void {
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
}
