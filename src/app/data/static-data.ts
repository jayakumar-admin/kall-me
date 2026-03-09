
export interface Merchant {
  id: string;
  name: string;
  rating: number;
  reviews: string;
  image: string;
  category: string;
  address?: string;
  commission_rate?: number;
  status?: 'active' | 'inactive';
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: 'Starters' | 'Main Course' | 'Desserts' | 'Beverages';
}

export interface Order {
  id: string;
  customerName: string;
  phone: string;
  address: string;
  items: { item: MenuItem; quantity: number }[];
  total: number;
  status: 'Pending' | 'Confirmed' | 'Dispatched' | 'Delivered';
  timestamp: Date;
}

export const MERCHANTS: Merchant[] = [
  {
    id: '1',
    name: 'Grand Hyatt Hotel',
    rating: 4.8,
    reviews: '2k+',
    image: 'https://picsum.photos/seed/hyatt/400/200',
    category: 'Hotel'
  },
  {
    id: '2',
    name: 'Marriott International',
    rating: 4.5,
    reviews: '1.5k+',
    image: 'https://picsum.photos/seed/marriott/400/200',
    category: 'Hotel'
  },
  {
    id: '3',
    name: 'The Taj Mahal Palace',
    rating: 4.9,
    reviews: '5k+',
    image: 'https://picsum.photos/seed/taj/400/200',
    category: 'Hotel'
  }
];

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 'm1',
    name: 'Wagyu Beef Sliders',
    description: 'Set of 3 with truffle mayo and caramelized onions',
    price: 1950,
    image: 'https://picsum.photos/seed/wagyu/100/100',
    category: 'Starters'
  },
  {
    id: 'm2',
    name: 'Truffle Mushroom Risotto',
    description: 'Italian arborio rice with seasonal truffles',
    price: 2600,
    image: 'https://picsum.photos/seed/risotto/100/100',
    category: 'Main Course'
  },
  {
    id: 'm3',
    name: 'Chocolate Lava Cake',
    description: 'Warm cake with molten center and vanilla bean ice cream',
    price: 850,
    image: 'https://picsum.photos/seed/lava/100/100',
    category: 'Desserts'
  },
  {
    id: 'm4',
    name: 'Caesar Salad',
    description: 'Crisp romaine, parmesan, croutons, and house dressing',
    price: 1200,
    image: 'https://picsum.photos/seed/caesar/100/100',
    category: 'Starters'
  }
];

export const DRIVERS = [
  { id: 'd1', name: 'Rajesh Kumar' },
  { id: 'd2', name: 'Suresh Raina' },
  { id: 'd3', name: 'Amit Sharma' }
];
