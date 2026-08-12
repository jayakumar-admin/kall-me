
import { Hotel, MenuItem } from '../models';

export type { Hotel, MenuItem };

export const MENU_CATEGORIES: string[] = [
  'Veg biryani',
  'Non veg biryani',
  'Veg soups',
  'Non veg soup',
  'Veg rices',
  'Non veg rices',
  'Veg staters',
  'Non veg staters',
  'Veg curries',
  'Non veg curries',
  'Starters',
  'Main Course',
  'Desserts',
  'Beverages',
  'Veg',
  'Non-Veg',
  'Beverage',
  'Dessert',
  'Others'
];


export const HOTELS: Hotel[] = [
  {
    id: 1,
    name: 'Grand Hyatt Hotel',
    rating: 4.8,
    reviews: 2450,
    address: 'Mumbai, India',
    image_url: 'https://picsum.photos/seed/hyatt/400/200',
    category: 'Hotel',
    status: 'active'
  },
  {
    id: 2,
    name: 'Marriott International',
    rating: 4.5,
    reviews: 1820,
    address: 'Delhi, India',
    image_url: 'https://picsum.photos/seed/marriott/400/200',
    category: 'Hotel',
    status: 'active'
  },
  {
    id: 3,
    name: 'The Taj Mahal Palace',
    rating: 4.9,
    reviews: 5100,
    address: 'Mumbai, India',
    image_url: 'https://picsum.photos/seed/taj/400/200',
    category: 'Hotel',
    status: 'active'
  }
];

export const MENU_ITEMS: MenuItem[] = [
  {
    id: 101,
    hotel_id: 1,
    name: 'Wagyu Beef Sliders',
    description: 'Set of 3 with truffle mayo and caramelized onions',
    price: 1950,
    image_url: 'https://picsum.photos/seed/wagyu/100/100',
    category: 'Starters'
  },
  {
    id: 102,
    hotel_id: 1,
    name: 'Truffle Mushroom Risotto',
    description: 'Italian arborio rice with seasonal truffles',
    price: 2600,
    image_url: 'https://picsum.photos/seed/risotto/100/100',
    category: 'Main Course'
  },
  {
    id: 103,
    hotel_id: 2,
    name: 'Chocolate Lava Cake',
    description: 'Warm cake with molten center and vanilla bean ice cream',
    price: 850,
    image_url: 'https://picsum.photos/seed/lava/100/100',
    category: 'Desserts'
  },
  {
    id: 104,
    hotel_id: 3,
    name: 'Caesar Salad',
    description: 'Crisp romaine, parmesan, croutons, and house dressing',
    price: 1200,
    image_url: 'https://picsum.photos/seed/caesar/100/100',
    category: 'Starters'
  }
];

export const DRIVERS = [
  { id: 1, name: 'Rajesh Kumar' },
  { id: 2, name: 'Suresh Raina' },
  { id: 3, name: 'Amit Sharma' }
];
