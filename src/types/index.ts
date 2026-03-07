export interface Profile {
  id: string;
  full_name: string;
  business_name?: string;
  role: string;
  org_id: string;
  is_on_shift?: boolean;
  address?: string;
  phone?: string;
  tax_rate?: number;
  service_charge_rate?: number;
  tax_enabled?: boolean;
}

export interface Staff {
  id: string;
  org_id: string;
  auth_id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
  is_on_shift?: boolean;
  shift_start_time?: string;
}

export interface Guest {
  id: string;
  org_id: string;
  full_name: string;
  phone?: string;
  email?: string;
  id_number?: string;
  current_room_id?: string;
  last_checkout_at?: string;
}

export interface Room {
  id: string;
  org_id: string;
  room_number: string;
  type: string;
  status: string;
  price_per_night: number;
  current_guest_id?: string;
  current_order_id?: string;
}

export interface Table {
  id: string;
  org_id: string;
  table_number: string;
  status: string;
  capacity: number;
  current_order_id?: string;
}

export interface MenuItem {
  id: string;
  org_id: string;
  name: string;
  price: number;
  category: string;
  is_available: boolean;
  is_ingredient?: boolean;
  current_stock?: number;
  min_stock?: number;
  cost_price?: number;
}

export interface Order {
  id: string;
  org_id: string;
  table_id?: string;
  room_id?: string;
  guest_id?: string;
  staff_id?: string;
  items: any[];
  total_price: number;
  status: string;
  payment_method?: string;
  paid_at?: string;
  created_at: string;
}

export interface Expense {
  id: string;
  org_id: string;
  description: string;
  amount: number;
  category: string;
  created_at: string;
}