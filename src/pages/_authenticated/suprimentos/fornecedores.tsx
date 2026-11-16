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
import { STOCK_KEYS, stockApi } from "./-shared/stock";

export const Route = createFileRoute("/_authenticated/suprimentos/fornecedores")({
  component: SuppliersPage,
});

/**
 * Fornecedores em Suprimentos: quem tem o Financeiro vê a mesma tela de lá (mesmo componente, mesma API);
 * quem só compra vê a lista sem os dados bancários (GET stock/suppliers).
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

interface StockSupplier { id: number; name: string; legalName: string | null; document: string | null; supplies: string | null; contactName: string | null; email: string | null; phone: string | null; active: boolean }

function SupplierList() {
  const [search, setSearch] = useState("");
  const term = search.trim();
  const { data, isLoading, error } = useQuery({
    queryKey: [STOCK_KEYS.suppliers, term],
    queryFn: () => stockApi.get<StockSupplier[]>("suppliers", term ? { search: term } : undefined),
    placeholderData: (previous) => previous,
  });
  const rows = data ?? [];
  return (
    <>
      <div>
        <h1 className="text-xl font-bold">Fornecedores</h1>
        <p className="text-sm text-muted-foreground">De quem a empresa compra. O cadastro rápido fica no pedido de compra; o completo, com dados bancários, em Financeiro → Fornecedores.</p>
      </div>
      <div className="my-4 p-4 rounded-lg border">
        <div className="w-full xl:w-80"><Input name="search" value={search} onValueChange={(_, value) => setSearch(String(value))} placeholder="Buscar por nome ou o que fornece..." icon="search" /></div>
      </div>
      {error && <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>}
      {!error && (
        <div className="rounded-lg border overflow-hidden">
          <div className="hidden lg:flex items-center py-2 px-4 bg-primary font-semibold text-sm text-inverse-foreground">
            <div className="flex-1">Fornecedor</div><div className="w-1/3">Contato</div>
          </div>
          {isLoading && Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 w-full my-1" />)}
          {!isLoading && !rows.length && <p className="p-6 text-sm text-muted-foreground">Nenhum fornecedor encontrado.</p>}
          {rows.map((supplier) => (
            <div key={supplier.id} className="flex flex-col lg:flex-row lg:items-center gap-1 px-4 py-3 border-b last:border-b-0 text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium">{supplier.name}</p>
                <p className="text-xs text-muted-foreground">{[supplier.document && formatDocument(supplier.document), supplier.supplies].filter(Boolean).join(" · ") || "—"}</p>
              </div>
              <div className="lg:w-1/3 text-xs text-muted-foreground break-words">{[supplier.contactName, supplier.phone, supplier.email].filter(Boolean).join(" · ") || "—"}</div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
