import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Usuario } from './models';

const CLAVE_TOKEN = 'cn_token';
const CLAVE_USUARIO = 'cn_usuario';

/** Inicio de sesión con token de Sanctum, usuario actual y sus permisos. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private _usuario = signal<Usuario | null>(leerUsuario());
  readonly usuario = this._usuario.asReadonly();
  readonly autenticado = computed(() => !!this._usuario() && !!this.token());
  readonly esAdmin = computed(() => this._usuario()?.roles.includes('administrador') ?? false);

  token(): string | null {
    try {
      return localStorage.getItem(CLAVE_TOKEN);
    } catch {
      return null;
    }
  }

  login(email: string, password: string): Observable<{ user: Usuario; token: string }> {
    return this.http
      .post<{ user: Usuario; token: string }>(`${environment.apiUrl}/login`, {
        email,
        password,
        device_name: 'comercial-nova-web',
      })
      .pipe(tap((r) => this.guardarSesion(r.token, r.user)));
  }

  /** Vuelve a pedir el usuario (roles y permisos actualizados). */
  refrescar(): Observable<Usuario> {
    return this.http.get<Usuario>(`${environment.apiUrl}/me`).pipe(tap((u) => this.guardarUsuario(u)));
  }

  logout(): void {
    this.http.post(`${environment.apiUrl}/logout`, {}).subscribe({ error: () => undefined });
    this.limpiar();
    this.router.navigate(['/login']);
  }

  /** Se usa cuando la API responde 401 (token vencido o revocado). */
  limpiar(): void {
    try {
      localStorage.removeItem(CLAVE_TOKEN);
      localStorage.removeItem(CLAVE_USUARIO);
    } catch {
      /* sin almacenamiento */
    }
    this._usuario.set(null);
  }

  puede(permiso: string): boolean {
    return this._usuario()?.permisos.includes(permiso) ?? false;
  }

  private guardarSesion(token: string, usuario: Usuario): void {
    try {
      localStorage.setItem(CLAVE_TOKEN, token);
    } catch {
      /* sin almacenamiento */
    }
    this.guardarUsuario(usuario);
  }

  private guardarUsuario(usuario: Usuario): void {
    try {
      localStorage.setItem(CLAVE_USUARIO, JSON.stringify(usuario));
    } catch {
      /* sin almacenamiento */
    }
    this._usuario.set(usuario);
  }
}

function leerUsuario(): Usuario | null {
  try {
    const raw = localStorage.getItem(CLAVE_USUARIO);
    return raw ? (JSON.parse(raw) as Usuario) : null;
  } catch {
    return null;
  }
}
