// src/app/services/api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, finalize } from 'rxjs';
import { Hotel, MenuItem, DeliveryPerson, Order, DeliveryUser, DeliveryPermission } from '../models';
import { User } from './auth.service';
import { LoaderService } from './loader.service';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private http = inject(HttpClient);
  private loader = inject(LoaderService);
public baseUrl = 'https://api-yoyvsxnlqq-uc.a.run.app/api';
  // public baseUrl = 'http://localhost:3000/api';

  private withLoader<T>(request: Observable<T>, message: string): Observable<T> {
    this.loader.show(message);
    return request.pipe(
      finalize(() => this.loader.hide())
    );
  }

  // Hotels
  getHotels(): Observable<Hotel[]> {
    return this.withLoader(
      this.http.get<Hotel[]>(`${this.baseUrl}/hotels`),
      'Fetching Hotels...'
    );
  }

  getHotel(id: number): Observable<Hotel> {
    return this.withLoader(
      this.http.get<Hotel>(`${this.baseUrl}/hotels/${id}`),
      'Fetching Hotel Details...'
    );
  }

  createHotel(hotel: Partial<Hotel>): Observable<Hotel> {
    return this.withLoader(
      this.http.post<Hotel>(`${this.baseUrl}/hotels`, hotel),
      'Adding Hotel...'
    );
  }

  updateHotel(id: number, hotel: Partial<Hotel>): Observable<Hotel> {
    return this.withLoader(
      this.http.put<Hotel>(`${this.baseUrl}/hotels/${id}`, hotel),
      'Updating Hotel...'
    );
  }

  deleteHotel(id: number): Observable<void> {
    return this.withLoader(
      this.http.delete<void>(`${this.baseUrl}/hotels/${id}`),
      'Removing Hotel...'
    );
  }

  // Menus
  getMenus(hotelId?: number): Observable<MenuItem[]> {
    const url = hotelId 
      ? `${this.baseUrl}/menus?hotel_id=${hotelId}` 
      : `${this.baseUrl}/menus`;
    return this.withLoader(
      this.http.get<MenuItem[]>(url),
      'Loading Menus...'
    );
  }

  createMenuItem(item: Partial<MenuItem>): Observable<MenuItem> {
    return this.withLoader(
      this.http.post<MenuItem>(`${this.baseUrl}/menus`, item),
      'Adding Menu Item...'
    );
  }

  updateMenuItem(id: number, item: Partial<MenuItem>): Observable<MenuItem> {
    return this.withLoader(
      this.http.put<MenuItem>(`${this.baseUrl}/menus/${id}`, item),
      'Updating Menu Item...'
    );
  }

  deleteMenuItem(id: number): Observable<void> {
    return this.withLoader(
      this.http.delete<void>(`${this.baseUrl}/menus/${id}`),
      'Removing Menu Item...'
    );
  }

  // Delivery
  getDeliveryTeam(): Observable<DeliveryPerson[]> {
    return this.withLoader(
      this.http.get<DeliveryPerson[]>(`${this.baseUrl}/delivery`),
      'Fetching Delivery Team...'
    );
  }

  createDeliveryPerson(person: Partial<DeliveryPerson>): Observable<DeliveryPerson> {
    return this.withLoader(
      this.http.post<DeliveryPerson>(`${this.baseUrl}/delivery`, person),
      'Adding Driver...'
    );
  }

  updateDeliveryPerson(id: number, person: Partial<DeliveryPerson>): Observable<DeliveryPerson> {
    return this.withLoader(
      this.http.put<DeliveryPerson>(`${this.baseUrl}/delivery/${id}`, person),
      'Updating Driver...'
    );
  }

  deleteDeliveryPerson(id: number): Observable<void> {
    return this.withLoader(
      this.http.delete<void>(`${this.baseUrl}/delivery/${id}`),
      'Removing Driver...'
    );
  }

  // Orders
  getOrders(): Observable<Order[]> {
    return this.withLoader(
      this.http.get<Order[]>(`${this.baseUrl}/orders`),
      'Loading Orders...'
    );
  }

  getOrder(id: string | number): Observable<Order> {
    return this.withLoader(
      this.http.get<Order>(`${this.baseUrl}/orders/${id}`),
      'Fetching Order Details...'
    );
  }

  createOrder(order: Partial<Order>): Observable<Order> {
    return this.withLoader(
      this.http.post<Order>(`${this.baseUrl}/orders`, order),
      'Placing Order...'
    );
  }

  updateOrderStatus(id: number, status: string): Observable<Order> {
    return this.withLoader(
      this.http.patch<Order>(`${this.baseUrl}/orders/${id}/status`, { status }),
      'Updating Order Status...'
    );
  }

  updateOrder(id: number, order: Partial<Order>): Observable<Order> {
    return this.withLoader(
      this.http.patch<Order>(`${this.baseUrl}/orders/${id}`, order),
      'Updating Order...'
    );
  }

  updateHotelPricing(hotel_id: number, items: { menu_id: number, price: number }[]): Observable<void> {
    return this.withLoader(
      this.http.post<void>(`${this.baseUrl}/pricing/update`, { hotel_id, items }),
      'Updating Pricing...'
    );
  }

  sendWhatsApp(to: string, templateName: string, parameters: Record<string, string | number>): Observable<void> {
    return this.withLoader(
      this.http.post<void>(`${this.baseUrl}/whatsapp/send`, { to, templateName, parameters }),
      'Sending WhatsApp...'
    );
  }

  sendInvoicePdf(to: string, orderNumber: string, pdfBase64: string, orderId?: number, grandTotal?: number, customerName?: string): Observable<void> {
    return this.withLoader(
      this.http.post<void>(`${this.baseUrl}/whatsapp/send-invoice-pdf`, { to, orderNumber, pdfBase64, orderId, grandTotal, customerName }),
      'Sending Invoice PDF...'
    );
  }

  getWhatsAppLogs(): Observable<unknown[]> {
    return this.withLoader(
      this.http.get<unknown[]>(`${this.baseUrl}/whatsapp/logs`),
      'Fetching WhatsApp Logs...'
    );
  }

  // Delivery Portal APIs
  deliveryLogin(credentials: { username?: string | null; password?: string | null }): Observable<User> {
    return this.withLoader(
      this.http.post<User>(`${this.baseUrl}/delivery/login`, credentials),
      'Authenticating...'
    );
  }

  getDeliveryOrders(): Observable<Order[]> {
    return this.withLoader(
      this.http.get<Order[]>(`${this.baseUrl}/delivery/orders`),
      'Loading Assigned Orders...'
    );
  }

  getDeliveryOrder(id: string | number): Observable<Order> {
    return this.withLoader(
      this.http.get<Order>(`${this.baseUrl}/delivery/orders/${id}`),
      'Fetching Order Details...'
    );
  }

  updateDeliveryStatus(orderId: number, status: string): Observable<Order> {
    return this.withLoader(
      this.http.put<Order>(`${this.baseUrl}/delivery/order-status`, { orderId, status }),
      'Updating Status...'
    );
  }

  getDeliveryProfile(): Observable<DeliveryUser> {
    return this.withLoader(
      this.http.get<DeliveryUser>(`${this.baseUrl}/delivery/profile`),
      'Loading Profile...'
    );
  }

  updateDeliveryProfile(profile: Partial<DeliveryUser>): Observable<unknown> {
    return this.withLoader(
      this.http.put<unknown>(`${this.baseUrl}/delivery/profile`, profile),
      'Updating Profile...'
    );
  }

  // Admin: Delivery Permissions
  getDeliveryPermissions(): Observable<DeliveryPermission[]> {
    return this.withLoader(
      this.http.get<DeliveryPermission[]>(`${this.baseUrl}/admin/delivery-permissions`),
      'Loading Permissions...'
    );
  }

  updateDeliveryPermission(userId: string, permissions: Record<string, boolean>): Observable<unknown> {
    return this.withLoader(
      this.http.put<unknown>(`${this.baseUrl}/admin/delivery-permissions`, { userId, permissions }),
      'Updating Permission...'
    );
  }

  // Reports
  getDailyReport(): Observable<unknown[]> {
    return this.withLoader(
      this.http.get<unknown[]>(`${this.baseUrl}/reports/daily`),
      'Generating Report...'
    );
  }

  // User Management
  getUsers(): Observable<User[]> {
    return this.withLoader(
      this.http.get<User[]>(`${this.baseUrl}/auth/users`),
      'Loading Users...'
    );
  }

  registerUser(userData: Partial<User>): Observable<User> {
    return this.withLoader(
      this.http.post<User>(`${this.baseUrl}/auth/register`, userData),
      'Creating Account...'
    );
  }

  deleteUser(id: string | number): Observable<void> {
    return this.withLoader(
      this.http.delete<void>(`${this.baseUrl}/auth/users/${id}`),
      'Removing User...'
    );
  }
}

