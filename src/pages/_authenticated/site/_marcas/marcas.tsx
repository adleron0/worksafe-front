import { createFileRoute } from "@tanstack/react-router";
import TaxonomyList from "../-taxonomia/TaxonomyList";
import { TaxonomyEntity } from "../-taxonomia/types";

export const marcaEntity: TaxonomyEntity = {
  name: "Marca",
  pluralName: "Marcas",
  model: "site-product-brands",
  ability: "loja_site",
  article: "a",
  placeholder: "Ex.: Petzl",
  description: "Marcas dos produtos da loja. Viram o filtro de marcas no site.",
};

export const Route = createFileRoute("/_authenticated/site/_marcas/marcas")({
  component: () => <TaxonomyList entity={marcaEntity} />,
});
