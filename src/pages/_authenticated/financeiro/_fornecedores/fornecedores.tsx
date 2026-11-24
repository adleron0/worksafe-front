import { createFileRoute } from "@tanstack/react-router";
import StatusBadge from "@/components/general-components/StatusBadge";
import SimpleCrud from "../-shared/SimpleCrud";
import { Supplier, formatDocument } from "../-shared/payables";
import { SUPPLIER_ENTITY, SUPPLIER_PAGES } from "./-SupplierForm";

export const Route = createFileRoute("/_authenticated/financeiro/_fornecedores/fornecedores")({
  component: () => (
    <SimpleCrud<Supplier>
      entity={SUPPLIER_ENTITY}
      columns={[
        { id: "name", header: "Fornecedor", mobile: "title", className: "min-w-[200px]", cell: (item) => (
          <div className="min-w-0 sm:max-w-[22rem]">
            <p className="font-medium sm:truncate">{item.name}{item.inactiveAt && <StatusBadge className="ml-2">Inativo</StatusBadge>}</p>
            <p className="text-xs text-muted-foreground truncate">{[formatDocument(item.document), item.supplies, item.city && [item.city, item.state].filter(Boolean).join("/")].filter(Boolean).join(" · ") || "—"}</p>
          </div>
        ) },
        { id: "contact", header: "Contato", mobile: "subtitle", cell: (item) => <span className="text-xs text-muted-foreground line-clamp-2 sm:max-w-[16rem]">{[item.contactName, item.phone, item.phone2, item.email].filter(Boolean).join(" · ") || "—"}</span> },
        { id: "payment", header: "Pagamento", cell: (item) => (
          <span className="text-xs text-muted-foreground line-clamp-2 sm:max-w-[14rem]">
            {item.pixKey ? `Pix: ${item.pixKey}` : [item.bankName, item.agency && `Ag. ${item.agency}`, item.account && `Conta ${item.account}`].filter(Boolean).join(" · ") || "—"}
          </span>
        ) },
        { id: "count", header: "Contas", align: "right", mobile: "end", cell: (item) => <span className="tabular-nums">{item._count?.payables ?? 0}</span> },
      ]}
      pages={SUPPLIER_PAGES}
      inactivateWarning="Deixa de aparecer para novas contas. As contas já lançadas continuam ligadas."
    />
  ),
});
