export type ProductOption = {
  id: number;
  label: string;
  stock: number;
};

export type GinLine = {
  id: number;
  productId: number | null;
  quantity: number;
};

export type GinFieldErrors = {
  ginNumber?: string;
  ginDate?: string;
  invoice?: string;
  location?: string;
  preparedBy?: string;
  receivedBy?: string;
  parties?: string;
  lines?: string;
};