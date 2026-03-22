import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, map, of } from 'rxjs';
import { ApiService } from './api.service';

@Injectable({
  providedIn: 'root'
})
export class ImageUploadService {
  private http = inject(HttpClient);
  private api = inject(ApiService);
  public baseUrl = this.api.baseUrl;
  uploadImage(file: File): Observable<string | null> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<{ url: string }>(`${this.baseUrl}/upload`, formData).pipe(
      map(response => response.url),
      catchError(error => {
        console.error('Upload failed:', error);
        return of(null);
      })
    );
  }
}
