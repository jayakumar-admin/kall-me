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

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        return authService.refreshToken().pipe(
          switchMap(() => {
            const newUser = authService.user();
            const newReq = req.clone({
              headers: req.headers.set('Authorization', `Bearer ${newUser?.token}`)
            });
            return next(newReq);
          }),
          catchError((err) => {
            authService.logout();
            return throwError(() => err);
          })
        );
      }
      return throwError(() => error);
    })
  );
};
