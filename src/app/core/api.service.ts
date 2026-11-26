import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { EMPTY, Observable, expand, map, reduce } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Categoria,
  Cliente,
  ClienteInput,
  ErrorApi,
  Paginado,
  PermisoGrupo,
  Producto,
  ProductoInput,
  Rol,
  Usuario,
  UsuarioInput,
  VentaInput,
} from './models';

/** Todas las llamadas a la API REST de Comercial Nova en un solo lugar. */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private url = environment.apiUrl;

  /** Trae todas las páginas de un listado (100 por página). */
  private todos<T>(recurso: string): Observable<T[]> {
    const pagina = (n: number) =>
      this.http.get<Paginado<T>>(`${this.url}/${recurso}`, {
        params: new HttpParams().set('page', n).set('per_page', 100),
      });
    return pagina(1).pipe(
      expand((r) => (r.meta && r.meta.current_page < r.meta.last_page && r.meta.current_page < 20 ? pagina(r.meta.current_page + 1) : EMPTY)),
      reduce((acc, r) => acc.concat(r.data), [] as T[]),
    );
  }

  // Productos
  productos = () => this.todos<Producto>('productos');
  producto = (id: number) => this.http.get<{ data: Producto }>(`${this.url}/productos/${id}`).pipe(map((r) => r.data));
  crearProducto = (p: ProductoInput) => this.http.post<{ data: Producto }>(`${this.url}/productos`, p).pipe(map((r) => r.data));
  /** Envía la versión leída; si otro usuario guardó antes, la API responde 409 (P2). */
  actualizarProducto = (id: number, p: ProductoInput) =>
    this.http.put<{ data: Producto }>(`${this.url}/productos/${id}`, p).pipe(map((r) => r.data));

  eliminarProducto = (id: number) => this.http.delete<void>(`${this.url}/productos/${id}`);

  // Categorías de productos
  categorias = () => this.todos<Categoria>('categorias');
  categoria = (id: number) => this.http.get<{ data: Categoria }>(`${this.url}/categorias/${id}`).pipe(map((r) => r.data));
  crearCategoria = (nombre: string) => this.http.post<{ data: Categoria }>(`${this.url}/categorias`, { nombre }).pipe(map((r) => r.data));
  actualizarCategoria = (id: number, nombre: string) =>
    this.http.put<{ data: Categoria }>(`${this.url}/categorias/${id}`, { nombre }).pipe(map((r) => r.data));
  eliminarCategoria = (id: number) => this.http.delete<void>(`${this.url}/categorias/${id}`);

  // Clientes
  clientes = () => this.todos<Cliente>('clientes');
  cliente = (id: number) => this.http.get<{ data: Cliente }>(`${this.url}/clientes/${id}`).pipe(map((r) => r.data));
  crearCliente = (c: ClienteInput) => this.http.post<{ data: Cliente }>(`${this.url}/clientes`, c).pipe(map((r) => r.data));
  actualizarCliente = (id: number, c: ClienteInput) =>
    this.http.put<{ data: Cliente }>(`${this.url}/clientes/${id}`, c).pipe(map((r) => r.data));
  eliminarCliente = (id: number) => this.http.delete<void>(`${this.url}/clientes/${id}`);

  // Usuarios
  usuarios = () => this.todos<Usuario>('users');
  usuario = (id: number) => this.http.get<{ data: Usuario }>(`${this.url}/users/${id}`).pipe(map((r) => r.data));
  crearUsuario = (u: UsuarioInput) => this.http.post<{ data: Usuario }>(`${this.url}/users`, u).pipe(map((r) => r.data));
  actualizarUsuario = (id: number, u: UsuarioInput) =>
    this.http.put<{ data: Usuario }>(`${this.url}/users/${id}`, u).pipe(map((r) => r.data));
  eliminarUsuario = (id: number) => this.http.delete<void>(`${this.url}/users/${id}`);

  // Roles y permisos
  roles = () => this.todos<Rol>('roles');
  rol = (id: number) => this.http.get<{ data: Rol }>(`${this.url}/roles/${id}`).pipe(map((r) => r.data));
  crearRol = (name: string, permisos: string[]) =>
    this.http.post<{ data: Rol }>(`${this.url}/roles`, { name, permisos }).pipe(map((r) => r.data));
  actualizarRol = (id: number, name: string, permisos: string[]) =>
    this.http.put<{ data: Rol }>(`${this.url}/roles/${id}`, { name, permisos }).pipe(map((r) => r.data));
  eliminarRol = (id: number) => this.http.delete<void>(`${this.url}/roles/${id}`);
  permisos = () => this.http.get<{ data: PermisoGrupo[] }>(`${this.url}/permisos`).pipe(map((r) => r.data));

  // Ventas (endpoint pendiente en la API: POST /api/ventas)
  registrarVenta = (v: VentaInput) => this.http.post<{ data: { id: number; numero: string } }>(`${this.url}/ventas`, v);
}

/** Convierte un error HTTP en un mensaje claro para el usuario. */
export function mensajeError(err: unknown): string {
  if (!(err instanceof HttpErrorResponse)) return 'Ocurrió un error inesperado.';
  const cuerpo = err.error as ErrorApi | null;
  if (err.status === 0) return 'No hay conexión con la API. Revisa tu internet o la dirección de la API.';
  if (err.status === 422 && cuerpo?.errors) return Object.values(cuerpo.errors).flat().join(' ');
  if (err.status === 403) return 'No tienes permiso para realizar esta acción.';
  if (err.status === 429) return 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.';
  return cuerpo?.message || `Error ${err.status}.`;
}
