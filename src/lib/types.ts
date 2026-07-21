export interface Product {
  id: string
  name: string
  category: string | null
  quantity: number
  price: number
  alert_threshold: number
  image_url: string | null
  created_at: string
}

export interface Category {
  id: string
  name: string
  created_at: string
}

export interface StockEntry {
  id: string
  batch_id: string
  product_id: string
  quantity: number
  unit_price: number
  warehouse: string
  origin: string
  date: string
  notes: string | null
  created_at: string
  products?: Product
}

export interface StockExit {
  id: string
  batch_id: string
  product_id: string
  quantity: number
  unit_price: number
  warehouse: string
  destination: string
  recipient: string
  date: string
  notes: string | null
  created_at: string
  products?: Product
}

export interface ProductStock {
  product_id: string
  warehouse: string
  quantity: number
}

export interface Warehouse {
  id: string
  name: string
  created_at: string
}

export type WarehouseName = "all" | "Abidjan" | "Sinfra"
