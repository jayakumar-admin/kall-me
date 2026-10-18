import { inject } from '@angular/core';
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const user = authService.user();
  
  let authReq = req;
  if (user && user.token) {
    authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${user.token}`)
    });
  }

  // Do not attempt token refresh for authentication routes or when not logged in
  const isAuthRoute =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/register') ||
    req.url.includes('/auth/refresh') ||
    req.url.includes('/auth/logout') ||
    req.url.includes('/auth/forgot-password') ||
    req.url.includes('/auth/reset-password');

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthRoute && user?.token) {
        return authService.refreshToken().pipe(
          switchMap(() => {
            const newUser = authService.user();
            const newReq = req.clone({
              headers: req.headers.set('Authorization', `Bearer ${newUser?.token}`)
            });
            return next(newReq);
          }),
          catchError((err) => {
            authService.logout('Session expired. Please log in again.');
            return throwError(() => err);
          })
        );
      }
      return throwError(() => error);
    })
  );

};
