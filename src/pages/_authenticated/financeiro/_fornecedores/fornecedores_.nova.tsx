import { createFileRoute } from "@tanstack/react-router";
import { SimpleFormPage } from "../-shared/SimpleCrud";
import { Supplier } from "../-shared/payables";
import SupplierForm, { SUPPLIER_ENTITY, SUPPLIER_PAGES } from "./-SupplierForm";

export const Route = createFileRoute("/_authenticated/financeiro/_fornecedores/fornecedores_/nova")({
  component: () => <SimpleFormPage<Supplier> entity={SUPPLIER_ENTITY} pages={SUPPLIER_PAGES} renderForm={(props) => <SupplierForm {...props} />} />,
});
