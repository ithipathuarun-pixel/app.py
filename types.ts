
export type Category = 'drink' | 'food' | 'dessert';

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: Category;
  description: string;
  image: string;
}

export interface CartItem extends MenuItem {
  quantity: number;
  notes?: string; // Special instructions for the item
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface Order {
  id: string;
  queueNumber: string;
  items: CartItem[];
  totalPrice: number;
  status: OrderStatus;
  createdAt: number;
  customerName: string;
}

export interface AppState {
  orders: Order[];
  currentQueueNo: number;
}
