import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthService } from './auth.service';

export interface Notification {
  id: number;
  user_id: number | null;
  role: string;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  
  notifications = signal<Notification[]>([]);
  unreadCount = signal<number>(0);

  fetchNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.authService.baseUrl}/notifications`).pipe(
      tap(data => {
        this.notifications.set(data);
        this.updateUnreadCount(data);
      })
    );
  }

  markAsRead(id: number): Observable<Notification> {
    return this.http.put<Notification>(`${this.authService.baseUrl}/notifications/${id}/read`, {}).pipe(
      tap(() => {
        const current = this.notifications();
        const updated = current.map(n => n.id === id ? { ...n, is_read: true } : n);
        this.notifications.set(updated);
        this.updateUnreadCount(updated);
      })
    );
  }

  markAllAsRead(): Observable<{ success: boolean; count: number }> {
    return this.http.put<{ success: boolean; count: number }>(`${this.authService.baseUrl}/notifications/read-all`, {}).pipe(
      tap(() => {
        const current = this.notifications();
        const updated = current.map(n => ({ ...n, is_read: true }));
        this.notifications.set(updated);
        this.updateUnreadCount(updated);
      })
    );
  }

  private updateUnreadCount(notifications: Notification[]) {
    this.unreadCount.set(notifications.filter(n => !n.is_read).length);
  }
}
