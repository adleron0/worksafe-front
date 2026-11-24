import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import useVerify from "@/hooks/use-verify";
import PageHeader from "@/components/general-components/PageHeader";
import ListCard from "@/components/general-components/ListCard";
import ListToolbar from "@/components/general-components/ListToolbar";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
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

const SUPPLIER_COLUMNS: DataColumn<StockSupplier>[] = [
  {
    id: "name", header: "Fornecedor", cell: (supplier) => (
      <div className="min-w-0 max-w-md">
        <p className="font-medium truncate">{supplier.name}</p>
        <p className="text-xs text-muted-foreground truncate">{[supplier.document && formatDocument(supplier.document), supplier.supplies].filter(Boolean).join(" · ") || "—"}</p>
      </div>
    ),
  },
  { id: "contact", header: "Contato", className: "text-xs text-muted-foreground", cell: (supplier) => <span className="truncate block max-w-sm">{[supplier.contactName, supplier.phone, supplier.email].filter(Boolean).join(" · ") || "—"}</span> },
];

function SupplierList() {
  const [search, setSearch] = useState("");
  const term = search.trim();
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: [STOCK_KEYS.suppliers, term],
    queryFn: () => stockApi.get<StockSupplier[]>("suppliers", term ? { search: term } : undefined),
    placeholderData: (previous) => previous,
  });
  return (
    <>
      <PageHeader title="Fornecedores" description="De quem a empresa compra. O cadastro rápido fica no pedido de compra; o completo, com dados bancários, em Financeiro → Fornecedores." />
      <ListCard>
        <ListToolbar search={{ value: search, onChange: setSearch, placeholder: "Buscar por nome ou o que fornece..." }} />
        <DataTable rows={data} columns={SUPPLIER_COLUMNS} getRowId={(supplier) => supplier.id} ariaLabel="Fornecedores" skeletonRows={4} minWidth={640}
          loading={isLoading || isFetching} error={error ? errorMessage(error) : null} onRetry={() => refetch()}
          empty={<EmptyState icon={term ? "search-x" : "inbox"} title="Nenhum fornecedor encontrado." />} />
      </ListCard>
    </>
  );
}
