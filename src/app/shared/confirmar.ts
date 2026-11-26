import { Component, Injectable, inject, signal } from '@angular/core';
import { Icono } from './icono';

interface Pregunta {
  titulo: string;
  texto: string;
  boton: string;
  peligro: boolean;
  responder: (si: boolean) => void;
}

/** Pide confirmación antes de una acción irreversible (eliminar, desactivar…). */
@Injectable({ providedIn: 'root' })
export class Confirmar {
  readonly actual = signal<Pregunta | null>(null);

  preguntar(titulo: string, texto: string, boton = 'Eliminar', peligro = true): Promise<boolean> {
    return new Promise((resolver) => {
      this.actual.set({
        titulo,
        texto,
        boton,
        peligro,
        responder: (si) => {
          this.actual.set(null);
          resolver(si);
        },
      });
    });
  }
}

@Component({
  selector: 'app-confirmar',
  imports: [Icono],
  template: `
    @if (c.actual(); as p) {
      <div class="modal-fondo" (click)="p.responder(false)">
        <div class="modal confirmar" role="alertdialog" aria-modal="true" (click)="$event.stopPropagation()">
          <div class="modal-cuerpo">
            <div class="icono" [class.peligro]="p.peligro"><app-icono nombre="alerta" [tam]="22" /></div>
            <h2>{{ p.titulo }}</h2>
            <p class="gris">{{ p.texto }}</p>
          </div>
          <div class="modal-pie">
            <button class="btn btn-secundario" (click)="p.responder(false)">Cancelar</button>
            <button class="btn" [class.btn-peligro-lleno]="p.peligro" [class.btn-primario]="!p.peligro" (click)="p.responder(true)">{{ p.boton }}</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: `
    .confirmar { width: min(420px, 100%); }
    .icono { width: 44px; height: 44px; border-radius: 12px; display: grid; place-items: center; background: var(--azul-suave); color: var(--azul); }
    .icono.peligro { background: var(--rojo-suave); color: var(--rojo); }
    p { margin: 0; }
    .btn-peligro-lleno { background: var(--rojo); color: #fff; }
  `,
})
export class ConfirmarDialogo {
  c = inject(Confirmar);
}
