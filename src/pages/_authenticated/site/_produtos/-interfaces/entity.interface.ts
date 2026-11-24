import { IDefaultEntity } from "@/general-interfaces/defaultEntity.interface";
export interface IProductImage {
  id: number;
  imageUrl: string;
  name: string;
}

export interface IEntity {
  id?: number;
  name: string;
  companyId?: number;
  imageUrl: string | null;
  image?: File | null;
  featured?: boolean;
  features?: string;
  categoryId?: number | null;
  brandId?: number | null;
  category?: { id: number; name: string } | null;
  brand?: { id: number; name: string } | null;
  description?: string;
  price?: number;
  oldPrice?: number;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string | null;
  inactiveAt?: string | null;
  images?: IProductImage[];
}

/** Entidade dos produtos do site: usada na lista e nas telas de cadastro e edição. */
export const siteProductsEntity: IDefaultEntity = {
  name: "Produtos do Site",
  pluralName: "Produtos do Site",
  model: "site-products",
  ability: "loja_site",
};
