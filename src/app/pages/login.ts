import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { mensajeError } from '../core/api.service';
import { Icono } from '../shared/icono';

/** CU-01 Iniciar sesión: correo y contraseña; la API devuelve un token (Sanctum). */
@Component({
  selector: 'app-login',
  imports: [FormsModule, Icono],
  template: `
    <div class="fondo">
      <div class="tarjeta-login">
        <section class="lado-azul">
          <img src="img/logo-blanco.png" alt="Comercial Nova" class="logo" />
          <div>
            <h1>Gestiona ventas, inventario y clientes en <span>un solo lugar.</span></h1>
            <p>Sistema interno de Comercial Nova para vendedores y administradores.</p>
            <ul>
              <li><app-icono nombre="productos" [tam]="18" /> Stock actualizado al instante</li>
              <li><app-icono nombre="factura" [tam]="18" /> Facturas con IVA 15 %</li>
              <li><app-icono nombre="celular" [tam]="18" /> Consulta desde tu celular</li>
            </ul>
          </div>
          <small>© 2026 Comercial Nova · Cuenca, Ecuador</small>
        </section>

        <section class="lado-blanco">
          <form (ngSubmit)="ingresar()" class="formulario">
            <img src="img/logo.png" alt="Comercial Nova" class="logo-color" />
            <h2>Iniciar sesión</h2>
            <p class="gris">Ingresa con tu correo de empleado.</p>

            @if (expirada) {
              <div class="aviso aviso-azul">Tu sesión terminó. Vuelve a ingresar.</div>
            }
            @if (error()) {
              <div class="aviso aviso-rojo"><app-icono nombre="alerta" [tam]="18" /> {{ error() }}</div>
            }

            <div class="campo">
              <label for="email">Correo electrónico *</label>
              <input id="email" class="input" type="email" name="email" [(ngModel)]="email" required autocomplete="username" placeholder="nombre@comercialnova.ec" />
            </div>
            <div class="campo">
              <label for="clave">Contraseña *</label>
              <div class="clave">
                <input id="clave" class="input" [type]="verClave() ? 'text' : 'password'" name="password" [(ngModel)]="password" required autocomplete="current-password" />
                <button type="button" class="ver" (click)="verClave.set(!verClave())" [attr.aria-label]="verClave() ? 'Ocultar contraseña' : 'Mostrar contraseña'">
                  <app-icono nombre="ojo" [tam]="18" />
                </button>
              </div>
            </div>
            <button class="btn btn-primario btn-ancho" type="submit" [disabled]="cargando() || !email || !password">
              {{ cargando() ? 'Ingresando…' : 'Ingresar' }}
            </button>
            <p class="gris pie">¿Problemas para ingresar? Contacta al administrador.</p>
          </form>
        </section>
      </div>
    </div>
  `,
  styles: `
    .fondo { min-height: 100vh; display: grid; place-items: center; padding: 24px; background: var(--fondo); }
    .tarjeta-login { width: min(1040px, 100%); min-height: 600px; display: grid; grid-template-columns: 1fr 1fr; background: #fff; border-radius: 20px; overflow: hidden; border: 1px solid var(--borde); box-shadow: 0 20px 50px rgba(31,58,104,.08); }
    .lado-azul { background: radial-gradient(circle at 20% 10%, #2a4c84, var(--azul) 45%, var(--azul-oscuro)); color: #fff; padding: 40px; display: flex; flex-direction: column; justify-content: space-between; gap: 32px; }
    .logo { height: 44px; align-self: flex-start; }
    h1 { color: #fff; font-size: 30px; line-height: 1.25; font-weight: 700; }
    h1 span { color: var(--naranja); }
    .lado-azul p { color: rgba(255,255,255,.75); font-size: 15px; margin: 14px 0 24px; }
    ul { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 12px; }
    li { display: flex; align-items: center; gap: 10px; }
    li app-icono { color: var(--naranja); }
    small { color: rgba(255,255,255,.6); }
    .lado-blanco { display: grid; place-items: center; padding: 40px; }
    .formulario { width: min(380px, 100%); display: flex; flex-direction: column; gap: 16px; }
    .logo-color { height: 36px; align-self: flex-start; margin-bottom: 8px; }
    h2 { font-size: 26px; }
    .formulario > .gris { margin: -10px 0 4px; }
    .clave { position: relative; }
    .ver { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); background: none; border: 0; color: var(--texto-2); cursor: pointer; padding: 6px; }
    .pie { text-align: center; font-size: 13px; margin: 0; }
    @media (max-width: 860px) { .tarjeta-login { grid-template-columns: 1fr; } .lado-azul { display: none; } }
  `,
})
export class LoginPage {
  private auth = inject(AuthService);
  private router = inject(Router);
  expirada = !!inject(ActivatedRoute).snapshot.queryParamMap.get('expirada');
  email = '';
  password = '';
  verClave = signal(false);
  cargando = signal(false);
  error = signal('');

  ingresar(): void {
    this.error.set('');
    this.cargando.set(true);
    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => this.router.navigate(['/inicio']),
      error: (e) => {
        this.cargando.set(false);
        this.error.set(mensajeError(e));
      },
    });
  }
}
