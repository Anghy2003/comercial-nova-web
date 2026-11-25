import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Solo deja pasar si hay sesión. */
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.autenticado() ? true : inject(Router).createUrlTree(['/login']);
};

/** Si ya hay sesión, el login redirige al inicio. */
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.autenticado() ? inject(Router).createUrlTree(['/inicio']) : true;
};

/** Exige el permiso indicado en data.permiso (ej. 'productos.editar'). */
export const permisoGuard: CanActivateFn = (route) => {
  const auth = inject(AuthService);
  const permiso = route.data?.['permiso'] as string | undefined;
  return !permiso || auth.puede(permiso) ? true : inject(Router).createUrlTree(['/inicio']);
};
