import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { ApiService, mensajeError } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Categoria, Producto } from '../core/models';
import { Icono, iconoCategoria } from '../shared/icono';
import { UsdPipe, estadoStock } from '../shared/formato';

type Filtro = 'todos' | 'bajo' | 'agotados' | 'inactivos';

/** CU-03 Consultar productos y stock. */
@Component({
  selector: 'app-productos',
  imports: [FormsModule, RouterLink, Icono, UsdPipe],
  template: `
    <div class="pagina">
      <div class="pagina-cabecera">
        <div><p class="gris migas">Productos › Productos</p><h1>Productos</h1></div>
        @if (auth.puede('productos.crear')) {
          <a routerLink="/productos/nuevo" class="btn btn-primario"><app-icono nombre="mas" [tam]="18" /> Nuevo producto</a>
        }
      </div>

      @if (error()) { <div class="aviso aviso-rojo">{{ error() }}</div> }

      <div class="kpis">
        <div class="tarjeta kpi"><span class="gris">Total de productos</span><span class="kpi-valor">{{ productos().length }}</span></div>
        <div class="tarjeta kpi"><span class="gris">Con stock bajo</span><span class="kpi-valor" style="color:var(--naranja-oscuro)">{{ cuenta().bajo }}</span></div>
        <div class="tarjeta kpi"><span class="gris">Agotados</span><span class="kpi-valor" style="color:var(--rojo)">{{ cuenta().agotados }}</span></div>
      </div>

      <div class="tarjeta">
        <div class="pestanas">
          @for (f of filtros; track f.valor) {
            <button [class.activa]="filtro() === f.valor" (click)="filtro.set(f.valor)">{{ f.texto }} ({{ $any(cuenta())[f.valor] }})</button>
          }
        </div>
        <div class="herramientas">
          <div class="buscador"><app-icono nombre="buscar" [tam]="18" />
            <input class="input" placeholder="Buscar por nombre o código" [ngModel]="texto()" (ngModelChange)="texto.set($event)" />
          </div>
          <select class="input selector" [ngModel]="categoria()" (ngModelChange)="categoria.set($event)">
            <option [ngValue]="null">Categoría: Todas</option>
            @for (c of categorias(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }
          </select>
        </div>

        @if (cargando()) {
          @for (i of [1, 2, 3, 4, 5]; track i) { <div class="esqueleto" style="height:48px;margin-bottom:8px"></div> }
        } @else if (visibles().length === 0) {
          <div class="vacio"><app-icono nombre="productos" [tam]="36" /><p>No hay productos con ese filtro.</p></div>
        } @else {
          <div class="desplazable">
            <table class="tabla">
              <thead><tr><th>Producto</th><th>Categoría</th><th class="num">Precio</th><th>IVA</th><th>Stock</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                @for (p of visibles(); track p.id) {
                  <tr>
                    <td>
                      <div class="producto"><span class="mini"><app-icono [nombre]="icono(p.categoria?.nombre ?? '')" [tam]="18" /></span>
                        <div><strong>{{ p.nombre }}</strong><br /><span class="gris mono">{{ p.codigo }}</span></div></div>
                    </td>
                    <td>{{ p.categoria?.nombre }}</td>
                    <td class="num">{{ p.precio | usd }}</td>
                    <td>{{ +p.porcentaje_iva }} %</td>
                    <td><span class="pill" [class]="estado(p.stock).clase">{{ p.stock }} u. · {{ estado(p.stock).texto }}</span></td>
                    <td><span class="pill" [class]="p.activo ? 'pill-verde' : 'pill-gris'">{{ p.activo ? 'Activo' : 'Inactivo' }}</span></td>
                    <td class="num">
                      @if (auth.puede('productos.editar')) {
                        <a [routerLink]="['/productos', p.id]" class="btn btn-secundario btn-chico"><app-icono nombre="editar" [tam]="14" /> Editar</a>
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
    .herramientas .buscador { flex: 1; min-width: 220px; }
    .selector { width: 220px; }
    .producto { display: flex; align-items: center; gap: 12px; }
    .mini { width: 38px; height: 38px; border-radius: 10px; background: #f3f5f9; display: grid; place-items: center; color: #8592a8; flex: none; }
    .desplazable { overflow-x: auto; }
  `,
})
export class ProductosPage {
  private api = inject(ApiService);
  auth = inject(AuthService);
  private ruta = inject(ActivatedRoute);
  productos = signal<Producto[]>([]);
  categorias = signal<Categoria[]>([]);
  cargando = signal(true);
  error = signal('');
  texto = signal(this.ruta.snapshot.queryParamMap.get('q') ?? '');
  categoria = signal<number | null>(null);
  filtro = signal<Filtro>((this.ruta.snapshot.queryParamMap.get('filtro') as Filtro) ?? 'todos');
  estado = estadoStock;
  icono = iconoCategoria;
  filtros: { valor: Filtro; texto: string }[] = [
    { valor: 'todos', texto: 'Todos' },
    { valor: 'bajo', texto: 'Stock bajo' },
    { valor: 'agotados', texto: 'Agotados' },
    { valor: 'inactivos', texto: 'Inactivos' },
  ];

  cuenta = computed(() => {
    const p = this.productos();
    return {
      todos: p.length,
      bajo: p.filter((x) => x.activo && x.stock > 0 && x.stock <= 5).length,
      agotados: p.filter((x) => x.activo && x.stock <= 0).length,
      inactivos: p.filter((x) => !x.activo).length,
    };
  });

  visibles = computed(() => {
    const t = this.texto().toLowerCase().trim();
    const c = this.categoria();
    const f = this.filtro();
    return this.productos().filter((p) => {
      if (f === 'bajo' && !(p.activo && p.stock > 0 && p.stock <= 5)) return false;
      if (f === 'agotados' && !(p.activo && p.stock <= 0)) return false;
      if (f === 'inactivos' && p.activo) return false;
      if (c !== null && p.categoria?.id !== c) return false;
      return !t || p.nombre.toLowerCase().includes(t) || p.codigo.toLowerCase().includes(t);
    });
  });

  constructor() {
    forkJoin({
      productos: this.api.productos(),
      categorias: this.auth.puede('categorias.ver') ? this.api.categorias() : of([] as Categoria[]),
    }).subscribe({
      next: (r) => {
        this.productos.set(r.productos);
        this.categorias.set(r.categorias);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }
}
