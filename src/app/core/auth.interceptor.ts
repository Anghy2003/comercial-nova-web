import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

/** Agrega "Authorization: Bearer <token>" a cada petición a la API; ante un 401 vuelve al login. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const token = auth.token();
  const esApi = req.url.startsWith(environment.apiUrl);

  const peticion =
    esApi && token
      ? req.clone({ setHeaders: { Authorization: `Bearer ${token}`, Accept: 'application/json' } })
      : esApi
        ? req.clone({ setHeaders: { Accept: 'application/json' } })
        : req;

  return next(peticion).pipe(
    catchError((err: HttpErrorResponse) => {
      if (esApi && err.status === 401 && !req.url.endsWith('/login')) {
        auth.limpiar();
        router.navigate(['/login'], { queryParams: { expirada: 1 } });
      }
      return throwError(() => err);
    }),
  );
};
