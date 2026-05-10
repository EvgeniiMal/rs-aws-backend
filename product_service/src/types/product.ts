export interface BaseProduct {
  title: string;
  description: string;
  price: number;
};

export interface Product extends BaseProduct {
  id: string;
}

export interface CreateProduct extends BaseProduct {
  count: number;
};

export interface ProductItem extends Product {
  count: number;
};

export type ProductItemsList = ProductItem[];