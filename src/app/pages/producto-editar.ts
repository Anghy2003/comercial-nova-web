import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, mensajeError } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Categoria, Producto, ProductoInput } from '../core/models';
import { Icono } from '../shared/icono';
import { UsdPipe, estadoStock, usd } from '../shared/formato';

interface Diferencia {
  campo: string;
  mio: string;
  actual: string;
}

/** CU-06 Crear o editar un producto con bloqueo optimista (P2): si otro usuario guardó antes, la API responde 409. */
@Component({
  selector: 'app-producto-editar',
  imports: [FormsModule, RouterLink, Icono, UsdPipe],
  template: `
    <div class="pagina">
      <div class="pagina-cabecera">
        <div>
          <p class="gris migas"><a routerLink="/productos">Productos</a> › {{ esNuevo() ? 'Nuevo producto' : original()?.nombre }}</p>
          <h1>{{ esNuevo() ? 'Nuevo producto' : 'Editar producto' }}</h1>
        </div>
      </div>

      @if (conflicto(); as c) {
        <div class="aviso aviso-amarillo conflicto">
          <app-icono nombre="alerta" [tam]="20" />
          <div class="conflicto-cuerpo">
            <strong>Otro usuario modificó este producto</strong>
            <span>Alguien guardó cambios mientras lo editabas (ahora va en la versión {{ c.version }}). Tus cambios no se guardaron para no borrar los suyos.</span>
            @if (diferencias().length) {
              <table class="tabla comparacion">
                <thead><tr><th>Campo</th><th>Tu cambio</th><th>Versión actual</th></tr></thead>
                <tbody>
                  @for (d of diferencias(); track d.campo) { <tr><td>{{ d.campo }}</td><td class="mio">{{ d.mio }}</td><td>{{ d.actual }}</td></tr> }
                </tbody>
              </table>
            }
            <div class="acciones">
              <button class="btn btn-secundario btn-chico" routerLink="/productos">Descartar mis cambios</button>
              <button class="btn btn-primario btn-chico" (click)="recargar()"><app-icono nombre="recargar" [tam]="16" /> Recargar datos</button>
            </div>
          </div>
        </div>
      }
      @if (error()) { <div class="aviso aviso-rojo">{{ error() }}</div> }
      @if (exito()) { <div class="aviso aviso-verde"><app-icono nombre="ok" [tam]="18" /> {{ exito() }}</div> }

      @if (cargando()) {
        <div class="esqueleto" style="height:320px"></div>
      } @else {
        <div class="rejilla">
          <form class="tarjeta formulario" (ngSubmit)="guardar()">
            <div class="tarjeta-cabecera">
              <h2>Datos del producto</h2>
              @if (!esNuevo()) { <span class="pill pill-gris">Versión {{ datos.version }}</span> }
            </div>
            <div class="rejilla-2">
              <div class="campo">
                <label>Nombre del producto *</label>
                <input class="input" name="nombre" [(ngModel)]="datos.nombre" required [class.invalido]="errores()['nombre']" />
                @if (errores()['nombre']) { <span class="ayuda-error">{{ errores()['nombre'] }}</span> }
              </div>
              <div class="campo">
                <label>Código *</label>
                <input class="input mono" name="codigo" [(ngModel)]="datos.codigo" required [class.invalido]="errores()['codigo']" />
                @if (errores()['codigo']) { <span class="ayuda-error">{{ errores()['codigo'] }}</span> }
              </div>
              <div class="campo">
                <label>Categoría *</label>
                <select class="input" name="categoria" [(ngModel)]="datos.categoria_id" required>
                  @for (c of categorias(); track c.id) { <option [ngValue]="c.id">{{ c.nombre }}</option> }
                </select>
              </div>
              <div class="campo">
                <label>Precio (USD) *</label>
                <input class="input" type="number" min="0" step="0.01" name="precio" [(ngModel)]="datos.precio" required [class.invalido]="errores()['precio']" />
                @if (errores()['precio']) { <span class="ayuda-error">{{ errores()['precio'] }}</span> }
              </div>
              <div class="campo">
                <label>IVA</label>
                <select class="input" name="iva" [(ngModel)]="datos.porcentaje_iva">
                  <option [ngValue]="15">15 %</option>
                  <option [ngValue]="0">0 %</option>
                </select>
              </div>
              <div class="campo activo">
                <label class="interruptor"><input type="checkbox" name="activo" [(ngModel)]="datos.activo" /> Activo</label>
              </div>
            </div>
            <div class="pie">
              <a routerLink="/productos" class="btn btn-secundario">Cancelar</a>
              <button type="submit" class="btn btn-primario" [disabled]="guardando() || !!conflicto()">{{ guardando() ? 'Guardando…' : 'Guardar cambios' }}</button>
            </div>
          </form>

          @if (!esNuevo() && original(); as p) {
            <div class="tarjeta stock">
              <h2>Stock</h2>
              <div class="stock-valor"><strong>{{ p.stock }}</strong> unidades</div>
              <span class="pill" [class]="estado(p.stock).clase">{{ estado(p.stock).texto }}</span>
              <div class="barra"><div [style.width.%]="nivel(p.stock)"></div></div>
              <p class="gris nota"><app-icono nombre="ayuda" [tam]="16" /> El stock solo cambia con ventas y ajustes, no desde este formulario.</p>
              <p class="gris nota">Precio actual: {{ p.precio | usd }}</p>
            </div>
          }
        </div>
      }
    </div>
  `,
  styles: `
    .migas { margin: 0 0 4px; font-size: 13px; }
    .rejilla { display: grid; grid-template-columns: 1fr 320px; gap: 20px; align-items: start; }
    .formulario { display: flex; flex-direction: column; gap: 16px; }
    .activo { justify-content: flex-end; }
    .pie { display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid var(--borde); padding-top: 16px; }
    .stock { display: flex; flex-direction: column; gap: 10px; }
    .stock-valor strong { font-size: 40px; color: var(--azul); }
    .barra { height: 8px; border-radius: 99px; background: #eef1f6; overflow: hidden; }
    .barra div { height: 100%; background: var(--naranja); }
    .nota { display: flex; gap: 6px; font-size: 13px; margin: 0; }
    .conflicto { align-items: flex-start; }
    .conflicto-cuerpo { flex: 1; display: flex; flex-direction: column; gap: 10px; }
    .comparacion { background: #fff; border-radius: 10px; overflow: hidden; }
    .comparacion td { height: 40px; }
    .mio { color: var(--naranja-oscuro); font-weight: 600; }
    .acciones { display: flex; justify-content: flex-end; gap: 8px; }
    @media (max-width: 1000px) { .rejilla { grid-template-columns: 1fr; } }
  `,
})
export class ProductoEditarPage implements OnInit {
  private api = inject(ApiService);
  private router = inject(Router);
  auth = inject(AuthService);
  id = input<string>(); // viene de la ruta /productos/:id

  categorias = signal<Categoria[]>([]);
  original = signal<Producto | null>(null);
  conflicto = signal<Producto | null>(null);
  cargando = signal(true);
  guardando = signal(false);
  error = signal('');
  exito = signal('');
  errores = signal<Record<string, string>>({});
  esNuevo = computed(() => !this.id());
  estado = estadoStock;
  datos: ProductoInput = { categoria_id: 0, codigo: '', nombre: '', precio: 0, porcentaje_iva: 15, activo: true, version: 1 };
  private enviado: ProductoInput | null = null;

  diferencias = computed<Diferencia[]>(() => {
    const actual = this.conflicto();
    const mio = this.enviado;
    if (!actual || !mio) return [];
    const lista: Diferencia[] = [];
    if (mio.nombre !== actual.nombre) lista.push({ campo: 'Nombre', mio: mio.nombre, actual: actual.nombre });
    if (mio.codigo !== actual.codigo) lista.push({ campo: 'Código', mio: mio.codigo, actual: actual.codigo });
    if (+mio.precio !== +actual.precio) lista.push({ campo: 'Precio', mio: usd(mio.precio), actual: usd(actual.precio) });
    if (+mio.porcentaje_iva !== +actual.porcentaje_iva) lista.push({ campo: 'IVA', mio: `${mio.porcentaje_iva} %`, actual: `${+actual.porcentaje_iva} %` });
    if (mio.categoria_id !== actual.categoria?.id) lista.push({ campo: 'Categoría', mio: this.nombreCategoria(mio.categoria_id), actual: actual.categoria?.nombre ?? '' });
    if (mio.activo !== actual.activo) lista.push({ campo: 'Activo', mio: mio.activo ? 'Sí' : 'No', actual: actual.activo ? 'Sí' : 'No' });
    return lista;
  });

  ngOnInit(): void {
    this.api.categorias().subscribe({
      next: (c) => {
        this.categorias.set(c);
        if (this.esNuevo()) {
          this.datos.categoria_id = c[0]?.id ?? 0;
          this.cargando.set(false);
        }
      },
      error: (e) => this.error.set(mensajeError(e)),
    });
    if (!this.esNuevo()) this.cargarProducto();
  }

  recargar(): void {
    this.conflicto.set(null);
    this.enviado = null;
    this.cargarProducto();
  }

  guardar(): void {
    this.guardando.set(true);
    this.error.set('');
    this.exito.set('');
    this.errores.set({});
    const datos: ProductoInput = { ...this.datos, precio: +this.datos.precio, porcentaje_iva: +this.datos.porcentaje_iva };
    this.enviado = datos;
    const id = this.id();
    const peticion = id ? this.api.actualizarProducto(+id, datos) : this.api.crearProducto(datos);
    peticion.subscribe({
      next: (p) => {
        this.guardando.set(false);
        if (!id) {
          this.router.navigate(['/productos', p.id]);
          return;
        }
        this.cargarDesde(p);
        this.exito.set('Cambios guardados. El producto ahora va en la versión ' + p.version + '.');
      },
      error: (e: HttpErrorResponse) => {
        this.guardando.set(false);
        if (e.status === 409 && id) {
          // P2: alguien guardó antes. Traemos la versión actual para comparar.
          this.api.producto(+id).subscribe((actual) => this.conflicto.set(actual));
        } else if (e.status === 422 && e.error?.errors) {
          const m: Record<string, string> = {};
          for (const [k, v] of Object.entries(e.error.errors as Record<string, string[]>)) m[k] = v[0];
          this.errores.set(m);
        } else this.error.set(mensajeError(e));
      },
    });
  }

  nivel(stock: number): number {
    return Math.min(100, (stock / 20) * 100);
  }

  private cargarProducto(): void {
    this.cargando.set(true);
    this.api.producto(+this.id()!).subscribe({
      next: (p) => this.cargarDesde(p),
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  private cargarDesde(p: Producto): void {
    this.original.set(p);
    this.datos = {
      categoria_id: p.categoria?.id ?? 0,
      codigo: p.codigo,
      nombre: p.nombre,
      precio: +p.precio,
      porcentaje_iva: +p.porcentaje_iva,
      activo: p.activo,
      version: p.version,
    };
    this.cargando.set(false);
  }

  private nombreCategoria(id: number): string {
    return this.categorias().find((c) => c.id === id)?.nombre ?? '';
  }
}
