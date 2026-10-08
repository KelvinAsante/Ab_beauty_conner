export type UserRole = 'customer' | 'admin';
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMethod = 'cash_on_delivery' | 'mobile_money' | 'card' | 'bank_transfer';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  sale_price: number | null;
  sku: string | null;
  stock_quantity: number;
  category_id: string | null;
  brand: string | null;
  main_image_url: string | null;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  image_url: string;
  storage_path: string;
  display_order: number;
  created_at: string;
}

export interface Cart {
  id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  total_amount: number;
  shipping_full_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_region: string;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_price: number;
  quantity: number;
  subtotal: number;
  created_at: string;
}

export interface CustomerAddress {
  id: string;
  user_id: string;
  full_name: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  country: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Wishlist {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface ProductReview {
  id: string;
  product_id: string;
  user_id: string;
  rating: number;
  review: string | null;
  is_approved: boolean;
  created_at: string;
  updated_at: string;
}

type TableShape<Row, Insert = Partial<Row>, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableShape<Profile, Omit<Profile, 'created_at' | 'updated_at'>>;
      categories: TableShape<Category, Omit<Category, 'id' | 'created_at' | 'updated_at'>>;
      products: TableShape<Product, Omit<Product, 'id' | 'created_at' | 'updated_at'>>;
      product_images: TableShape<ProductImage, Omit<ProductImage, 'id' | 'created_at'>>;
      carts: TableShape<Cart, Omit<Cart, 'id' | 'created_at' | 'updated_at'>>;
      cart_items: TableShape<CartItem, Omit<CartItem, 'id' | 'created_at' | 'updated_at'>>;
      orders: TableShape<Order, Omit<Order, 'id' | 'order_number' | 'created_at' | 'updated_at'>>;
      order_items: TableShape<OrderItem, Omit<OrderItem, 'id' | 'created_at'>>;
      customer_addresses: TableShape<CustomerAddress, Omit<CustomerAddress, 'id' | 'created_at' | 'updated_at'>>;
      wishlist: TableShape<Wishlist, Omit<Wishlist, 'id' | 'created_at'>>;
      product_reviews: TableShape<ProductReview, Omit<ProductReview, 'id' | 'created_at' | 'updated_at'>>;
      store_settings: TableShape<{
        id: boolean;
        store_name: string;
        contact_email: string | null;
        phone: string | null;
        address: string | null;
        currency_code: string;
        delivery_fee: number;
        updated_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      place_order: {
        Args: {
          p_items: { product_id: string; quantity: number }[];
          p_shipping_full_name: string;
          p_shipping_phone: string;
          p_shipping_address: string;
          p_shipping_city: string;
          p_shipping_region: string;
          p_payment_method?: PaymentMethod | null;
        };
        Returns: string;
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}