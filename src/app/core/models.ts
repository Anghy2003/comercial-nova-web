/** Formas de los datos tal como los devuelve la API (ver Swagger). */

export interface Usuario {
  id: number;
  name: string;
  email: string;
  activo: boolean;
  roles: string[];
  permisos: string[];
  created_at?: string;
  updated_at?: string;
}

export interface Categoria {
  id: number;
  nombre: string;
}

export interface Producto {
  id: number;
  codigo: string;
  nombre: string;
  precio: string; // decimal con 2 cifras, ej. "19.90"
  porcentaje_iva: string; // "15.00" o "0.00"
  stock: number;
  version: number;
  activo: boolean;
  categoria: Categoria | null;
  updated_at?: string;
}

export interface ProductoInput {
  categoria_id: number;
  codigo: string;
  nombre: string;
  precio: number;
  porcentaje_iva: number;
  activo: boolean;
  version?: number;
}

export type TipoIdentificacion = 'CEDULA' | 'RUC' | 'PASAPORTE';

export interface Cliente {
  id: number;
  tipo_identificacion: TipoIdentificacion;
  identificacion: string;
  nombre: string;
  email: string | null;
  telefono: string | null;
  direccion: string | null;
  activo: boolean;
}

export type ClienteInput = Omit<Cliente, 'id'>;

export interface Rol {
  id: number;
  name: string;
  permisos: string[];
  users_count?: number;
}

export interface PermisoGrupo {
  recurso: string;
  permisos: { id: number; name: string; accion: string }[];
}

export interface Paginado<T> {
  data: T[];
  meta: { current_page: number; last_page: number; per_page: number; total: number };
}

/** Venta que se envía a POST /api/ventas (según el contrato de la API). */
export interface VentaInput {
  cliente_id: number;
  forma_pago: 'efectivo' | 'tarjeta' | 'transferencia';
  items: { producto_id: number; cantidad: number }[];
}

/** Respuesta de error de Laravel. */
export interface ErrorApi {
  message: string;
  errors?: Record<string, string[]>;
}
