import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ApiService, mensajeError } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { Categoria, Producto } from '../core/models';
import { Confirmar } from '../shared/confirmar';
import { Icono, iconoCategoria } from '../shared/icono';
import { erroresCampos } from '../shared/validar';

/** CU-06 Gestionar las categorías de los productos. */
@Component({
  selector: 'app-categorias',
  imports: [FormsModule, RouterLink, Icono],
  template: `
    <div class="pagina">
      <div class="pagina-cabecera">
        <div><p class="gris migas"><a routerLink="/productos">Productos</a> › Categorías</p><h1>Categorías de productos</h1></div>
        @if (auth.puede('categorias.crear')) {
          <button class="btn btn-primario" (click)="nueva()"><app-icono nombre="mas" [tam]="18" /> Nueva categoría</button>
        }
      </div>
      @if (error()) { <div class="aviso aviso-rojo">{{ error() }}</div> }

      @if (cargando()) {
        <div class="grilla">@for (i of [1, 2, 3, 4]; track i) { <div class="esqueleto" style="height:120px"></div> }</div>
      } @else if (filas().length === 0) {
        <div class="tarjeta vacio"><app-icono nombre="productos" [tam]="36" /><p>Todavía no hay categorías.</p></div>
      } @else {
        <div class="grilla">
          @for (f of filas(); track f.categoria.id) {
            <div class="tarjeta categoria">
              <div class="kpi-icono" style="background:var(--azul-suave);color:var(--azul)"><app-icono [nombre]="icono(f.categoria.nombre)" /></div>
              <div class="datos">
                <strong>{{ f.categoria.nombre }}</strong>
                <a class="gris" [routerLink]="['/productos']" [queryParams]="{ categoria: f.categoria.id }">{{ f.productos }} {{ f.productos === 1 ? 'producto' : 'productos' }}</a>
              </div>
              <div class="acciones">
                @if (auth.puede('categorias.editar')) {
                  <button class="btn btn-secundario btn-chico" (click)="editar(f.categoria)" [attr.aria-label]="'Renombrar ' + f.categoria.nombre"><app-icono nombre="editar" [tam]="14" /></button>
                }
                @if (auth.puede('categorias.eliminar')) {
                  <button class="btn btn-peligro btn-chico" (click)="eliminar(f.categoria, f.productos)" [attr.aria-label]="'Eliminar ' + f.categoria.nombre"><app-icono nombre="basura" [tam]="14" /></button>
                }
              </div>
            </div>
          }
        </div>
      }
    </div>

    @if (editando(); as e) {
      <div class="modal-fondo" (click)="editando.set(null)">
        <form class="modal" (click)="$event.stopPropagation()" (ngSubmit)="guardar()">
          <div class="modal-cabecera">
            <h2>{{ e.id ? 'Renombrar categoría' : 'Nueva categoría' }}</h2>
            <button type="button" class="btn btn-icono btn-secundario" (click)="editando.set(null)" aria-label="Cerrar"><app-icono nombre="cerrar" [tam]="18" /></button>
          </div>
          <div class="modal-cuerpo">
            <div class="campo">
              <label for="nombre-cat">Nombre *</label>
              <input id="nombre-cat" class="input" name="nombre" [(ngModel)]="nombre" maxlength="255" [class.invalido]="errorNombre()" autofocus />
              @if (errorNombre()) { <span class="ayuda-error">{{ errorNombre() }}</span> }
            </div>
          </div>
          <div class="modal-pie">
            <button type="button" class="btn btn-secundario" (click)="editando.set(null)">Cancelar</button>
            <button type="submit" class="btn btn-primario" [disabled]="guardando() || !nombre.trim()">{{ guardando() ? 'Guardando…' : 'Guardar' }}</button>
          </div>
        </form>
      </div>
    }
  `,
  styles: `
    .migas { margin: 0 0 4px; font-size: 13px; }
    .grilla { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 16px; }
    .categoria { display: flex; align-items: center; gap: 14px; }
    .datos { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .datos a { font-size: 13px; }
    .acciones { display: flex; gap: 6px; }
  `,
})
export class CategoriasPage {
  private api = inject(ApiService);
  private confirmar = inject(Confirmar);
  auth = inject(AuthService);
  categorias = signal<Categoria[]>([]);
  productos = signal<Producto[]>([]);
  cargando = signal(true);
  error = signal('');
  editando = signal<{ id: number | null } | null>(null);
  guardando = signal(false);
  errorNombre = signal('');
  nombre = '';
  icono = iconoCategoria;

  filas = computed(() =>
    this.categorias().map((c) => ({ categoria: c, productos: this.productos().filter((p) => p.categoria?.id === c.id).length })),
  );

  constructor() {
    forkJoin({ categorias: this.api.categorias(), productos: this.api.productos() }).subscribe({
      next: (r) => {
        this.categorias.set(r.categorias);
        this.productos.set(r.productos);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeError(e));
        this.cargando.set(false);
      },
    });
  }

  nueva(): void {
    this.nombre = '';
    this.errorNombre.set('');
    this.editando.set({ id: null });
  }

  editar(c: Categoria): void {
    this.nombre = c.nombre;
    this.errorNombre.set('');
    this.editando.set({ id: c.id });
  }

  guardar(): void {
    const e = this.editando();
    if (!e) return;
    this.guardando.set(true);
    this.errorNombre.set('');
    const nombre = this.nombre.trim();
    (e.id ? this.api.actualizarCategoria(e.id, nombre) : this.api.crearCategoria(nombre)).subscribe({
      next: (c) => {
        this.guardando.set(false);
        this.categorias.update((l) => [...l.filter((x) => x.id !== c.id), c].sort((a, b) => a.nombre.localeCompare(b.nombre)));
        this.editando.set(null);
      },
      error: (err) => {
        this.guardando.set(false);
        const campos = erroresCampos(err);
        this.errorNombre.set(campos?.['nombre'] ?? mensajeError(err));
      },
    });
  }

  async eliminar(c: Categoria, productos: number): Promise<void> {
    if (productos > 0) {
      this.error.set(`No se puede eliminar «${c.nombre}» porque tiene ${productos} productos. Muévelos a otra categoría primero.`);
      return;
    }
    const si = await this.confirmar.preguntar('Eliminar categoría', `¿Seguro que quieres eliminar la categoría «${c.nombre}»?`);
    if (!si) return;
    this.api.eliminarCategoria(c.id).subscribe({
      next: () => this.categorias.update((l) => l.filter((x) => x.id !== c.id)),
      error: (e) => this.error.set(mensajeError(e)),
    });
  }
}
