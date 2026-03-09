// src/app/services/api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Hotel, MenuItem, DeliveryPerson, Order } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private baseUrl = '/api';

  getHotels(): Observable<Hotel[]> {
    return this.http.get<Hotel[]>(`${this.baseUrl}/hotels`);
  }

  getMenus(hotelId?: number): Observable<MenuItem[]> {
    const url = hotelId ? `${this.baseUrl}/menus?hotelId=${hotelId}` : `${this.baseUrl}/menus`;
    return this.http.get<MenuItem[]>(url);
  }

  getDeliveryTeam(): Observable<DeliveryPerson[]> {
    return this.http.get<DeliveryPerson[]>(`${this.baseUrl}/delivery`);
  }

  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.baseUrl}/orders`);
  }

  createOrder(order: Order): Observable<Order> {
    return this.http.post<Order>(`${this.baseUrl}/orders`, order);
  }

  getDailyReport(): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.baseUrl}/reports/daily`);
  }
}
