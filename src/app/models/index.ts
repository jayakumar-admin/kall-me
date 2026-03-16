// src/app/models/index.ts
export interface Hotel {
  id: number;
  name: string;
  address: string;
  category: string;
  rating: number;
  reviews?: number;
  commission_rate: number;
  image_url: string;
  images?: string[];
  status: 'active' | 'inactive';
}

export interface MenuItem {
  id: number;
  hotel_id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url: string;
  images?: string[];
  is_available?: boolean;
  quantity?: number;
}

export interface DeliveryPerson {
  id: number;
  name: string;
  mobile: string;
  status: 'active' | 'busy' | 'offline';
  image_url?: string;
}

export interface Order {
  id?: number;
  order_number?: string;
  hotel_id: number;
  hotel_name?: string;
  delivery_person_id: number;
  delivery_person_name?: string;
  customer_name: string;
  customer_phone: string;
  customer_type: 'regular' | 'premium';
  delivery_address: string;
  subtotal: number;
  shipping_fee: number;
  grand_total: number;
  amount_received: number;
  balance_pending: number;
  status?: 'placed' | 'in-progress' | 'in-transit' | 'delivered' | 'cancelled' | 'pending' | 'accepted' | 'picked-up' | 'preparing';
  items: OrderItem[];
  created_at?: string;
  invoice_url?: string;
}

export interface OrderItem {
  menu_id: number;
  menu_name?: string;
  quantity: number;
  price: number;
  total: number;
}

export interface DashboardStats {
  totalOrdersToday: number;
  totalRevenue: number;
  activeDeliveryPersons: number;
}

export interface DeliveryUser {
  id: number;
  name: string;
  mobile: string;
  phone?: string; // Alias for mobile used in some templates
  email: string;
  password?: string;
  status: 'active' | 'inactive';
  vehicle_number?: string;
  created_at?: string;
}

export interface DeliveryPermission {
  id: number;
  userId: string;
  userName: string;
  permissions: Record<string, boolean>;
}
