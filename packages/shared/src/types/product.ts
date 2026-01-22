export interface Product {
  id: string;
  tenantId: string;
  categoryId?: string;
  name: string;
  code?: string;
  price: number;
  cost?: number;
  stock: number;
  minStock?: number;
  unit?: string;
  imageUrl?: string;
  active: boolean;
  isFavorite: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  tenantId: string;
  name: string;
  position: number;
  active: boolean;
  createdAt: string;
}

export interface ProductWithCategory extends Product {
  category?: Category;
}
