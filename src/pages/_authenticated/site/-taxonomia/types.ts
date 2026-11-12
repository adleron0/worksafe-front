/** Categoria ou marca da loja do site (mesmo formato nas duas telas). */
export interface ITaxonomy {
  id?: number;
  name: string;
  order?: number;
  active?: boolean;
  inactiveAt?: string | null;
  createdAt?: string;
  _count?: { products: number };
}

export interface TaxonomyEntity {
  /** "Categoria" / "Marca" */
  name: string;
  /** "Categorias da Loja" / "Marcas" */
  pluralName: string;
  /** rota da API */
  model: string;
  ability: string;
  /** "a" ou "o", para as mensagens ("Nova categoria", "Novo ...") */
  article: "a" | "o";
  placeholder: string;
  description: string;
}
