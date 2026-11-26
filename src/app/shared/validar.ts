import { HttpErrorResponse } from '@angular/common/http';

/** Mismas reglas que la API (ClienteRequest) para avisar antes de enviar. */
export function errorIdentificacion(tipo: string, valor: string): string {
  const v = (valor ?? '').trim();
  if (!v) return 'La identificación es obligatoria.';
  if (tipo === 'CEDULA' && !/^\d{10}$/.test(v)) return 'La cédula debe tener 10 dígitos.';
  if (tipo === 'RUC' && !/^\d{13}$/.test(v)) return 'El RUC debe tener 13 dígitos.';
  if (tipo === 'PASAPORTE' && !/^[A-Za-z0-9]{1,20}$/.test(v)) return 'El pasaporte solo admite letras y números (máx. 20).';
  return '';
}

export function errorEmail(valor: string | null | undefined): string {
  const v = (valor ?? '').trim();
  return v && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'El correo no es válido.' : '';
}

/** Convierte los errores 422 de Laravel en { campo: primer mensaje }. */
export function erroresCampos(e: unknown): Record<string, string> | null {
  if (!(e instanceof HttpErrorResponse) || e.status !== 422 || !e.error?.errors) return null;
  const m: Record<string, string> = {};
  for (const [k, v] of Object.entries(e.error.errors as Record<string, string[]>)) m[k.split('.')[0]] = v[0];
  return m;
}
