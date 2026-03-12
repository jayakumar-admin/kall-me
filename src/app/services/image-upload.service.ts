import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {
  private http = inject(HttpClient);

  uploadImage(file: File): Observable<string | null> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ url: string }>('https://api-yoyvsxnlqq-uc.a.run.app/api/upload', formData).pipe(
      map(response => response.url),
      catchError(error => {
        console.error('Upload failed:', error);
        return of(null);
      })
    );
  }
}
