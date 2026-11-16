import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import { Skeleton } from "@/components/ui/skeleton";
import Input from "@/components/general-components/Input";
import { errorMessage } from "../comercial/-shared/commercial";
import { FINANCIAL_ABILITY } from "../financeiro/-shared/financial";
import { formatDocument } from "../financeiro/-shared/payables";
import { Route as FinanceSuppliersRoute } from "../financeiro/_fornecedores/fornecedores";
import { PURCHASE_OPTIONS_KEY, PurchaseOptions, purchasesApi } from "./-shared/purchases";

export const Route = createFileRoute("/_authenticated/suprimentos/fornecedores")({
  component: SuppliersPage,
});

/**
 * Fornecedores em Suprimentos: quem tem o Financeiro vê a mesma tela de lá (mesmo componente, mesma API);
 * quem só compra vê a lista sem os dados bancários (vinda das opções do pedido de compra).
 */
function SuppliersPage() {
  const { can } = useVerify();
  if (can(`view_${FINANCIAL_ABILITY}`)) {
    const FinanceSuppliers = FinanceSuppliersRoute.options.component!;
    return <FinanceSuppliers />;
  }
  if (!can("view_fornecedores_suprimentos")) return null;
  return <SupplierList />;
}

function SupplierList() {
  const [search, setSearch] = useState("");
  const { data, isLoading, error } = useQuery({ queryKey: [PURCHASE_OPTIONS_KEY], queryFn: () => purchasesApi.get<PurchaseOptions>("options") });
  const term = search.trim().toLowerCase();
  const digits = term.replace(/\D/g, "");
  const rows = (data?.suppliers ?? []).filter((supplier) => !term || supplier.name.toLowerCase().includes(term) || (!!digits && (supplier.document ?? "").includes(digits)));
  return (
    <>
      <div>
        <h1 className="text-xl font-bold">Fornecedores</h1>
        <p className="text-sm text-muted-foreground">De quem a empresa compra. O cadastro rápido fica no pedido de compra; o completo, com dados bancários, em Financeiro → Fornecedores.</p>
      </div>
      <div className="my-4 p-4 rounded-lg border">
        <div className="w-full xl:w-80"><Input name="search" value={search} onValueChange={(_, value) => setSearch(String(value))} placeholder="Buscar por nome ou documento..." icon="search" /></div>
      </div>
      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {!error && (
        <div className="rounded-lg border overflow-hidden">
          {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 w-full my-1" />)}
          {!isLoading && !rows.length && <p className="p-6 text-sm text-muted-foreground">Nenhum fornecedor encontrado.</p>}
          {rows.map((supplier) => (
            <div key={supplier.id} className="flex flex-col sm:flex-row sm:items-center gap-1 px-4 py-3 border-b last:border-b-0 text-sm">
              <div className="flex-1 font-medium">{supplier.name}</div>
              <div className="sm:w-52 text-muted-foreground tabular-nums">{supplier.document ? formatDocument(supplier.document) : "—"}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
