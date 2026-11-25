import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Icono } from '../shared/icono';

/** Aviso para las pantallas que esperan un endpoint que la API todavía no tiene. */
@Component({
  selector: 'app-pendiente',
  imports: [RouterLink, Icono],
  template: `
    <div class="pagina">
      <div class="pagina-cabecera"><div><p class="gris migas">{{ migas() }}</p><h1>{{ titulo() }}</h1></div></div>
      <div class="tarjeta vacio">
        <app-icono [nombre]="icono()" [tam]="44" />
        <h2>Esta sección se conecta en la siguiente entrega</h2>
        <p>La API todavía no publica <code>{{ endpoint() }}</code>. En cuanto José lo agregue, esta pantalla mostrará los datos reales.</p>
        <a routerLink="/ventas/nueva" class="btn btn-secundario">Ir a Nueva venta</a>
      </div>
    </div>
  `,
  styles: `.migas { margin: 0 0 4px; font-size: 13px; } .vacio h2 { margin: 8px 0; } .vacio p { max-width: 520px; margin: 0 auto 16px; } code { background: #f1f3f7; padding: 2px 6px; border-radius: 6px; }`,
})
export class Pendiente {
  titulo = input('');
  migas = input('');
  endpoint = input('');
  icono = input('factura');
}

@Component({
  selector: 'app-facturas',
  imports: [Pendiente],
  template: `<app-pendiente titulo="Facturas" migas="Ventas › Facturas" endpoint="GET /api/ventas" icono="factura" />`,
})
export class FacturasPage {}

@Component({
  selector: 'app-movimientos',
  imports: [Pendiente],
  template: `<app-pendiente titulo="Movimientos de stock" migas="Inventario › Movimientos" endpoint="GET /api/movimientos" icono="inventario" />`,
})
export class MovimientosPage {}
