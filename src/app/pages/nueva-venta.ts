import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { ApiService, mensajeError } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Categoria, Cliente, Producto, VentaInput } from '../core/models';
import { ClienteForm } from '../shared/cliente-form';
import { Icono, iconoCategoria } from '../shared/icono';
import { UsdPipe, estadoStock } from '../shared/formato';

interface Linea {
  producto: Producto;
  cantidad: number;
}

/** CU-02 Registrar venta en una sola pantalla (P4) con validación de stock en la API (P1). */
@Component({
  selector: 'app-nueva-venta',
  imports: [FormsModule, Icono, UsdPipe, ClienteForm],
  template: `
    <div class="venta">
      <section class="catalogo">
        <div class="pagina-cabecera">
          <div><p class="gris migas">Ventas › Nueva venta</p><h1>Nueva venta</h1></div>
        </div>

        <div class="buscador">
          <app-icono nombre="buscar" [tam]="18" />
          <input class="input grande" placeholder="Buscar producto por nombre o código" [ngModel]="texto()" (ngModelChange)="texto.set($event)" />
        </div>

        <h2 class="titulo">Categorías</h2>
        <div class="categorias">
          <button class="categoria" [class.activa]="categoria() === null" (click)="categoria.set(null)">
            <app-icono nombre="todos" /> Todos
          </button>
          @for (c of categorias(); track c.id) {
            <button class="categoria" [class.activa]="categoria() === c.id" (click)="categoria.set(c.id)">
              <app-icono [nombre]="icono(c.nombre)" /> {{ c.nombre }}
            </button>
          }
        </div>

        <div class="titulo-fila"><h2>Productos disponibles</h2><span class="gris">Mostrando {{ visibles().length }} productos</span></div>

        @if (cargando()) {
          <div class="grilla">@for (i of [1, 2, 3, 4, 5, 6, 7, 8]; track i) { <div class="esqueleto" style="height:230px"></div> }</div>
        } @else if (visibles().length === 0) {
          <div class="tarjeta vacio"><app-icono nombre="buscar" [tam]="36" /><p>No hay productos con ese filtro.</p></div>
        } @else {
          <div class="grilla">
            @for (p of visibles(); track p.id) {
              <article class="producto" [class.agotado]="p.stock <= 0">
                <div class="foto">
                  <app-icono [nombre]="icono(p.categoria?.nombre ?? '')" [tam]="54" />
                  <span class="pill etiqueta" [class]="estado(p.stock).clase">{{ estado(p.stock).texto }}</span>
                </div>
                <span class="gris mono">{{ p.codigo }}</span>
                <strong class="nombre">{{ p.nombre }}</strong>
                <span class="precio">{{ p.precio | usd }}</span>
                @if (p.stock > 0) {
                  <button class="btn btn-primario btn-chico" (click)="agregar(p)" [disabled]="cantidadEnCarrito(p.id) >= p.stock">
                    <app-icono nombre="mas" [tam]="16" /> Agregar
                  </button>
                } @else {
                  <button class="btn btn-secundario btn-chico" disabled>No disponible</button>
                }
              </article>
            }
          </div>
        }
      </section>

      <aside class="tarjeta detalle">
        <div class="tarjeta-cabecera"><h2>Detalle de la factura</h2></div>

        @if (errorStock()) {
          <div class="aviso aviso-rojo">
            <app-icono nombre="alerta" [tam]="18" />
            <div><strong>No se pudo emitir la factura</strong>{{ errorStock() }}</div>
          </div>
        }
        @if (mensaje()) {
          <div class="aviso" [class]="mensaje()!.tipo"><div>{{ mensaje()!.texto }}</div></div>
        }

        <div class="bloque">
          <div class="bloque-fila"><span class="gris etiqueta-chica">CLIENTE</span>
            <button class="enlace" (click)="nuevoCliente.set(true)" [disabled]="!auth.puede('clientes.crear')">+ Cliente nuevo</button>
          </div>
          <select class="input" [ngModel]="clienteId()" (ngModelChange)="clienteId.set(+$event)">
            <option [ngValue]="0" disabled>Selecciona un cliente…</option>
            @for (c of clientes(); track c.id) {
              <option [ngValue]="c.id">{{ c.nombre }} · {{ c.identificacion }}</option>
            }
          </select>
        </div>

        <div class="bloque">
          <span class="gris etiqueta-chica">FORMA DE PAGO</span>
          <div class="pagos">
            @for (f of formas; track f.valor) {
              <button [class.activo]="formaPago() === f.valor" (click)="formaPago.set(f.valor)">{{ f.texto }}</button>
            }
          </div>
        </div>

        <span class="gris etiqueta-chica">PRODUCTOS AGREGADOS ({{ carrito().length }})</span>
        <div class="lineas">
          @for (l of carrito(); track l.producto.id) {
            <div class="linea" [class.sin-stock]="productoSinStock() === l.producto.id">
              <div class="linea-texto">
                <strong>{{ l.producto.nombre }}</strong>
                <span class="gris">{{ l.producto.precio | usd }} c/u · IVA {{ +l.producto.porcentaje_iva }} %</span>
              </div>
              <div class="cantidad">
                <button (click)="cambiar(l, -1)" aria-label="Quitar uno"><app-icono nombre="menos" [tam]="14" /></button>
                <span>{{ l.cantidad }}</span>
                <button (click)="cambiar(l, 1)" [disabled]="l.cantidad >= l.producto.stock" aria-label="Agregar uno"><app-icono nombre="mas" [tam]="14" /></button>
              </div>
              <strong class="num total-linea">{{ +l.producto.precio * l.cantidad | usd }}</strong>
              @if (productoSinStock() === l.producto.id) {
                <button class="btn btn-peligro btn-chico quitar" (click)="quitar(l)">Quitar</button>
              }
            </div>
          } @empty {
            <p class="gris vacio-chico">Agrega productos desde el catálogo.</p>
          }
        </div>

        <dl class="totales">
          <div><dt>Subtotal IVA 0 %</dt><dd>{{ totales().sub0 | usd }}</dd></div>
          <div><dt>Subtotal IVA 15 %</dt><dd>{{ totales().sub15 | usd }}</dd></div>
          <div><dt>Descuento</dt><dd>{{ 0 | usd }}</dd></div>
          <div><dt>IVA 15 %</dt><dd>{{ totales().iva | usd }}</dd></div>
          <div class="total"><dt>TOTAL</dt><dd>{{ totales().total | usd }}</dd></div>
        </dl>

        <button class="btn btn-cobro btn-ancho" (click)="emitir()" [disabled]="!puedeEmitir()">
          <app-icono nombre="factura" [tam]="18" />
          {{ enviando() ? 'Emitiendo…' : productoSinStock() ? 'Corrige el detalle para emitir' : 'Emitir factura · ' + (totales().total | usd) }}
        </button>
        <button class="btn btn-secundario btn-ancho" (click)="descartar()" [disabled]="carrito().length === 0">Descartar</button>
      </aside>
    </div>

    @if (nuevoCliente()) {
      <app-cliente-form (cerrar)="nuevoCliente.set(false)" (guardado)="clienteCreado($event)" textoGuardar="Guardar y usar en la venta" />
    }
  `,
  styles: `
    .venta { display: grid; grid-template-columns: 1fr 380px; gap: 24px; align-items: start; }
    .catalogo { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
    .migas { margin: 0 0 4px; font-size: 13px; }
    .grande { height: 48px; }
    .titulo { margin-top: 4px; }
    .titulo-fila { display: flex; justify-content: space-between; align-items: baseline; }
    .categorias { display: flex; gap: 10px; flex-wrap: wrap; }
    .categoria { display: flex; flex-direction: column; align-items: center; gap: 6px; min-width: 104px; padding: 14px 12px; border-radius: 14px; border: 1px solid var(--borde); background: #fff; font: inherit; font-weight: 500; cursor: pointer; color: var(--texto); }
    .categoria.activa { background: var(--azul); color: #fff; border-color: var(--azul); }
    .grilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
    .producto { background: #fff; border: 1px solid var(--borde); border-radius: 14px; padding: 12px; display: flex; flex-direction: column; gap: 6px; }
    .producto.agotado { opacity: .6; }
    .foto { position: relative; height: 120px; border-radius: 10px; background: #f3f5f9; display: grid; place-items: center; color: #9aa6ba; margin-bottom: 6px; }
    .etiqueta { position: absolute; top: 8px; right: 8px; }
    .nombre { font-weight: 600; min-height: 38px; }
    .precio { font-weight: 700; color: var(--azul); }
    .detalle { position: sticky; top: 96px; display: flex; flex-direction: column; gap: 14px; }
    .detalle .tarjeta-cabecera { margin-bottom: 0; }
    .bloque { background: #f8f9fb; border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
    .bloque-fila { display: flex; justify-content: space-between; align-items: center; }
    .etiqueta-chica { font-size: 11px; font-weight: 600; letter-spacing: .06em; }
    .enlace { background: none; border: 0; color: var(--azul); font: inherit; font-weight: 600; cursor: pointer; }
    .pagos { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px; background: #eef1f6; padding: 4px; border-radius: 10px; }
    .pagos button { border: 0; background: none; padding: 8px 4px; border-radius: 8px; font: inherit; font-weight: 600; color: var(--texto-2); cursor: pointer; }
    .pagos button.activo { background: var(--azul); color: #fff; }
    .lineas { display: flex; flex-direction: column; gap: 8px; max-height: 280px; overflow: auto; }
    .linea { display: grid; grid-template-columns: 1fr auto auto; gap: 10px; align-items: center; padding: 10px; border: 1px solid var(--borde); border-radius: 10px; }
    .linea.sin-stock { background: var(--rojo-suave); border-color: #f5c2c2; }
    .linea-texto { display: flex; flex-direction: column; font-size: 13px; min-width: 0; }
    .linea-texto span { font-size: 12px; }
    .cantidad { display: flex; align-items: center; gap: 6px; }
    .cantidad button { width: 26px; height: 26px; border-radius: 6px; border: 1px solid var(--borde); background: #fff; cursor: pointer; display: grid; place-items: center; }
    .quitar { grid-column: 1 / -1; justify-self: end; }
    .vacio-chico { text-align: center; padding: 16px 0; margin: 0; }
    .totales { margin: 0; display: flex; flex-direction: column; gap: 6px; border-top: 1px solid var(--borde); padding-top: 12px; }
    .totales div { display: flex; justify-content: space-between; }
    .totales dt { color: var(--texto-2); } .totales dd { margin: 0; font-variant-numeric: tabular-nums; }
    .totales .total { font-weight: 700; font-size: 18px; border-top: 1px solid var(--borde); padding-top: 8px; margin-top: 4px; }
    .totales .total dt { color: var(--texto); }
    @media (max-width: 1100px) { .venta { grid-template-columns: 1fr; } .detalle { position: static; } }
  `,
})
export class NuevaVentaPage {
  private api = inject(ApiService);
  private router = inject(Router);
  auth = inject(AuthService);

  productos = signal<Producto[]>([]);
  categorias = signal<Categoria[]>([]);
  clientes = signal<Cliente[]>([]);
  cargando = signal(true);
  texto = signal('');
  categoria = signal<number | null>(null);
  carrito = signal<Linea[]>([]);
  clienteId = signal(0);
  formaPago = signal<VentaInput['forma_pago']>('efectivo');
  enviando = signal(false);
  errorStock = signal('');
  productoSinStock = signal<number | null>(null);
  mensaje = signal<{ tipo: string; texto: string } | null>(null);
  nuevoCliente = signal(false);
  estado = estadoStock;
  icono = iconoCategoria;
  formas = [
    { valor: 'efectivo' as const, texto: 'Efectivo' },
    { valor: 'tarjeta' as const, texto: 'Tarjeta' },
    { valor: 'transferencia' as const, texto: 'Transf.' },
  ];

  visibles = computed(() => {
    const t = this.texto().toLowerCase().trim();
    const c = this.categoria();
    return this.productos().filter(
      (p) => p.activo && (c === null || p.categoria?.id === c) && (!t || p.nombre.toLowerCase().includes(t) || p.codigo.toLowerCase().includes(t)),
    );
  });

  totales = computed(() => {
    let sub0 = 0, sub15 = 0, iva = 0;
    for (const l of this.carrito()) {
      const base = +l.producto.precio * l.cantidad;
      const pct = +l.producto.porcentaje_iva;
      if (pct > 0) { sub15 += base; iva += (base * pct) / 100; } else { sub0 += base; }
    }
    const r = (n: number) => Math.round(n * 100) / 100;
    return { sub0: r(sub0), sub15: r(sub15), iva: r(iva), total: r(sub0 + sub15 + iva) };
  });

  puedeEmitir = computed(() => this.carrito().length > 0 && this.clienteId() > 0 && !this.enviando() && !this.productoSinStock());

  constructor() {
    forkJoin({
      productos: this.api.productos(),
      categorias: this.auth.puede('categorias.ver') ? this.api.categorias() : of([] as Categoria[]),
      clientes: this.auth.puede('clientes.ver') ? this.api.clientes() : of([] as Cliente[]),
    }).subscribe({
      next: (r) => {
        this.productos.set(r.productos);
        this.categorias.set(r.categorias);
        this.clientes.set(r.clientes.filter((c) => c.activo));
        const cf = r.clientes.find((c) => c.nombre.toLowerCase().includes('consumidor final'));
        if (cf) this.clienteId.set(cf.id);
        this.cargando.set(false);
      },
      error: (e) => {
        this.mensaje.set({ tipo: 'aviso-rojo', texto: mensajeError(e) });
        this.cargando.set(false);
      },
    });
  }

  cantidadEnCarrito(id: number): number {
    return this.carrito().find((l) => l.producto.id === id)?.cantidad ?? 0;
  }

  agregar(p: Producto): void {
    this.limpiarAvisos();
    const existe = this.carrito().find((l) => l.producto.id === p.id);
    if (existe) this.cambiar(existe, 1);
    else this.carrito.update((c) => [...c, { producto: p, cantidad: 1 }]);
  }

  cambiar(l: Linea, delta: number): void {
    const nueva = l.cantidad + delta;
    if (nueva <= 0) return this.quitar(l);
    if (nueva > l.producto.stock) return;
    this.carrito.update((c) => c.map((x) => (x.producto.id === l.producto.id ? { ...x, cantidad: nueva } : x)));
  }

  quitar(l: Linea): void {
    this.carrito.update((c) => c.filter((x) => x.producto.id !== l.producto.id));
    if (this.productoSinStock() === l.producto.id) this.limpiarAvisos();
  }

  descartar(): void {
    this.carrito.set([]);
    this.limpiarAvisos();
  }

  clienteCreado(c: Cliente): void {
    this.clientes.update((l) => [...l, c].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    this.clienteId.set(c.id);
    this.nuevoCliente.set(false);
  }

  emitir(): void {
    this.limpiarAvisos();
    this.enviando.set(true);
    const venta: VentaInput = {
      cliente_id: this.clienteId(),
      forma_pago: this.formaPago(),
      items: this.carrito().map((l) => ({ producto_id: l.producto.id, cantidad: l.cantidad })),
    };
    this.api.registrarVenta(venta).subscribe({
      next: (r) => {
        this.enviando.set(false);
        this.carrito.set([]);
        this.mensaje.set({ tipo: 'aviso-verde', texto: `Venta registrada · Factura ${r.data.numero}` });
        this.recargarProductos();
      },
      error: (e: HttpErrorResponse) => {
        this.enviando.set(false);
        if (e.status === 409) {
          // P1: otro vendedor vendió el último producto mientras armábamos la venta.
          const texto = mensajeError(e);
          const linea = this.carrito().find((l) => texto.includes(l.producto.nombre) || texto.includes(l.producto.codigo));
          this.productoSinStock.set(linea?.producto.id ?? null);
          this.errorStock.set(texto);
          this.recargarProductos();
        } else if (e.status === 404 || e.status === 405) {
          this.mensaje.set({ tipo: 'aviso-amarillo', texto: 'La API todavía no tiene el registro de ventas (POST /api/ventas). La pantalla ya está lista para cuando José lo publique.' });
        } else {
          this.mensaje.set({ tipo: 'aviso-rojo', texto: mensajeError(e) });
        }
      },
    });
  }

  private recargarProductos(): void {
    this.api.productos().subscribe((p) => this.productos.set(p));
  }

  private limpiarAvisos(): void {
    this.errorStock.set('');
    this.productoSinStock.set(null);
    this.mensaje.set(null);
  }
}
