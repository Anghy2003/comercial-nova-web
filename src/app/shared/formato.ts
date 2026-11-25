import { Pipe, PipeTransform } from '@angular/core';

const dinero = new Intl.NumberFormat('es-EC', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });

/** 1234.5 → "$1.234,50" */
export function usd(valor: number | string | null | undefined): string {
  const n = typeof valor === 'string' ? parseFloat(valor) : (valor ?? 0);
  return dinero.format(isNaN(n) ? 0 : n).replace('US$', '$');
}

@Pipe({ name: 'usd' })
export class UsdPipe implements PipeTransform {
  transform(valor: number | string | null | undefined): string {
    return usd(valor);
  }
}

/** Estado del stock para las etiquetas de color (P1). */
export function estadoStock(stock: number): { clase: string; texto: string } {
  if (stock <= 0) return { clase: 'pill-rojo', texto: 'Agotado' };
  if (stock <= 5) return { clase: 'pill-naranja', texto: `Quedan ${stock}` };
  return { clase: 'pill-verde', texto: `${stock} disponibles` };
}

export const TIPOS_IDENTIFICACION = [
  { valor: 'CEDULA', texto: 'Cédula' },
  { valor: 'RUC', texto: 'RUC' },
  { valor: 'PASAPORTE', texto: 'Pasaporte' },
] as const;
