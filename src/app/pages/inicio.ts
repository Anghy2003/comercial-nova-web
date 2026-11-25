import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { ApiService, mensajeError } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Cliente, Producto } from '../core/models';
import { Icono } from '../shared/icono';
import { UsdPipe, estadoStock } from '../shared/formato';

/** Inicio: indicadores reales de productos y clientes, y productos con stock bajo. */
@Component({
  selector: 'app-inicio',
  imports: [RouterLink, Icono, UsdPipe],
  template: `
    <div class="pagina">
      <div class="pagina-cabecera">
        <div>
          <h1>{{ saludo }}, {{ nombre() }}</h1>
          <p class="gris">{{ hoy }}</p>
        </div>
        <a routerLink="/ventas/nueva" class="btn btn-cobro"><app-icono nombre="mas" [tam]="18" /> Nueva venta</a>
      </div>

      @if (error()) { <div class="aviso aviso-rojo">{{ error() }}</div> }

      <div class="kpis">
        <div class="tarjeta kpi">
          <div class="kpi-icono" style="background:var(--azul-suave);color:var(--azul)"><app-icono nombre="productos" /></div>
          <span class="gris">Productos activos</span>
          <span class="kpi-valor">{{ cargando() ? '—' : activos().length }}</span>
        </div>
        <div class="tarjeta kpi">
          <div class="kpi-icono" style="background:var(--naranja-suave);color:var(--naranja-oscuro)"><app-icono nombre="alerta" /></div>
          <span class="gris">Con stock bajo</span>
          <span class="kpi-valor">{{ cargando() ? '—' : stockBajo().length }}</span>
        </div>
        <div class="tarjeta kpi">
          <div class="kpi-icono" style="background:var(--rojo-suave);color:var(--rojo)"><app-icono nombre="caja" /></div>
          <span class="gris">Agotados</span>
          <span class="kpi-valor">{{ cargando() ? '—' : agotados().length }}</span>
        </div>
        <div class="tarjeta kpi">
          <div class="kpi-icono" style="background:var(--verde-suave);color:var(--verde)"><app-icono nombre="clientes" /></div>
          <span class="gris">Clientes</span>
          <span class="kpi-valor">{{ cargando() ? '—' : clientes().length }}</span>
        </div>
      </div>

      @if (!cargando() && stockBajo().length + agotados().length > 0) {
        <div class="aviso aviso-naranja alerta">
          <app-icono nombre="alerta" [tam]="18" />
          <span>{{ stockBajo().length + agotados().length }} productos tienen stock bajo o están agotados. Revísalos antes de vender.</span>
          <a routerLink="/productos" [queryParams]="{ filtro: 'bajo' }" class="btn btn-secundario btn-chico">Ver productos</a>
        </div>
      }

      <div class="tarjeta">
        <div class="tarjeta-cabecera"><h2>Productos que necesitan reposición</h2></div>
        @if (cargando()) {
          @for (i of [1, 2, 3]; track i) { <div class="esqueleto" style="height:44px;margin-bottom:8px"></div> }
        } @else if (criticos().length === 0) {
          <div class="vacio"><app-icono nombre="ok" [tam]="36" /><p>Todo el inventario tiene stock suficiente.</p></div>
        } @else {
          <table class="tabla">
            <thead><tr><th>Producto</th><th>Categoría</th><th class="num">Precio</th><th>Stock</th></tr></thead>
            <tbody>
              @for (p of criticos(); track p.id) {
                <tr>
                  <td><strong>{{ p.nombre }}</strong><br /><span class="gris mono">{{ p.codigo }}</span></td>
                  <td>{{ p.categoria?.nombre }}</td>
                  <td class="num">{{ p.precio | usd }}</td>
                  <td><span class="pill" [class]="estado(p.stock).clase">{{ estado(p.stock).texto }}</span></td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>
  `,
  styles: `.alerta { align-items: center; } .alerta span { flex: 1; }`,
})
export class InicioPage {
  private api = inject(ApiService);
  private auth = inject(AuthService);
  productos = signal<Producto[]>([]);
  clientes = signal<Cliente[]>([]);
  cargando = signal(true);
  error = signal('');
  estado = estadoStock;

  nombre = computed(() => this.auth.usuario()?.name.split(' ')[0] ?? '');
  activos = computed(() => this.productos().filter((p) => p.activo));
  stockBajo = computed(() => this.activos().filter((p) => p.stock > 0 && p.stock <= 5));
  agotados = computed(() => this.activos().filter((p) => p.stock <= 0));
  criticos = computed(() => [...this.agotados(), ...this.stockBajo()].slice(0, 8));

  saludo = new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';
  hoy = new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).replace(/^./, (c) => c.toUpperCase());

  constructor() {
    const peticiones = {
      productos: this.api.productos(),
      clientes: this.auth.puede('clientes.ver') ? this.api.clientes() : of([] as Cliente[]),
    };
    forkJoin(peticiones).subscribe({
      next: (r) => {
        this.productos.set(r.productos);
        this.clientes.set(r.clientes);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }
}
