import { createFileRoute } from "@tanstack/react-router";
import TaxonomyList from "../-taxonomia/TaxonomyList";
import { TaxonomyEntity } from "../-taxonomia/types";

export const categoriaLojaEntity: TaxonomyEntity = {
  name: "Categoria",
  pluralName: "Categorias da Loja",
  model: "site-product-categories",
  ability: "loja_site",
  article: "a",
  placeholder: "Ex.: EPIs",
  description: "Categorias dos produtos da loja. Viram o filtro de categorias no site.",
};

export const Route = createFileRoute("/_authenticated/site/_categorias-loja/categorias-loja")({
  component: () => <TaxonomyList entity={categoriaLojaEntity} />,
});
