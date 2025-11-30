export type User = {
  id: number;
  name: string;
  email: string;
  role: string;
}

export type Material = {
  id: number;
  sku: string;
  name: string;
  uom: string;
  minStock: number;
  active: boolean;
}

export type Product = {
  id: number;
  sku: string;
  name: string;
  uom: string;
  active: boolean;
}

export type Location = {
  id: number;
  code: string;
  description?: string;
}