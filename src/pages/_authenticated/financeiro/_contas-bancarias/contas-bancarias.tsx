import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { get } from "@/services/api";
import StatusBadge from "@/components/general-components/StatusBadge";
import TagBadge from "@/components/general-components/TagBadge";
import SimpleCrud from "../-shared/SimpleCrud";
import TransfersSection from "../-shared/transfers";
import { BankAccount, bankTypeLabel, formatMoney, gatewayOptions } from "../-shared/financial";
import { formatDate } from "../_receber/-components/options";
import { BANK_ACCOUNT_ENTITY, BANK_ACCOUNT_PAGES } from "./-BankAccountForm";

export const Route = createFileRoute("/_authenticated/financeiro/_contas-bancarias/contas-bancarias")({
  component: BankAccounts,
});

const bankLine = (item: BankAccount) => {
  if (item.type === "gateway") return gatewayOptions.find((g) => g.id === item.gateway)?.name ?? item.gateway ?? "";
  const agency = item.agency ? `Ag. ${item.agency}${item.agencyDigit ? `-${item.agencyDigit}` : ""}` : "";
  const account = item.account ? `Conta ${item.account}${item.accountDigit ? `-${item.accountDigit}` : ""}` : "";
  return [item.bankName, agency, account].filter(Boolean).join(" · ");
};

function BankAccounts() {
  const { data: balances } = useQuery<Array<{ id: number; balance: number; start: string | null }> | undefined>({
    queryKey: ["financialBankBalances"],
    queryFn: () => get("financial", "bank-balances"),
  });
  const balanceOf = (id: number) => balances?.find((b) => b.id === id)?.balance;
  const startOf = (id: number) => balances?.find((b) => b.id === id)?.start;

  return (
    <>
    <SimpleCrud<BankAccount>
      entity={BANK_ACCOUNT_ENTITY}
      columns={[
        { id: "name", header: "Conta", mobile: "title", cell: (item) => (
          <div className="min-w-0">
            <p className="font-medium">
              {item.name}
              {item.isDefault && <TagBadge icon="star" className="ml-2">Padrão</TagBadge>}
              {item.inactiveAt && <StatusBadge className="ml-2">Inativa</StatusBadge>}
            </p>
            {(bankLine(item) || item.pixKey) && <p className="text-xs text-muted-foreground truncate">{[bankLine(item), item.pixKey && `Pix: ${item.pixKey}`].filter(Boolean).join(" · ")}</p>}
          </div>
        ) },
        { id: "type", header: "Tipo", cell: (item) => <span className="text-muted-foreground">{bankTypeLabel(item.type)}</span> },
        { id: "balance", header: "Saldo", align: "right", mobile: "end", className: "whitespace-nowrap", cell: (item) => (
          <div>
            <p className="tabular-nums font-semibold">{balanceOf(item.id) === undefined ? "—" : formatMoney(balanceOf(item.id))}</p>
            {startOf(item.id) && <p className="text-xs text-muted-foreground">desde {formatDate(startOf(item.id)!)}</p>}
          </div>
        ) },
      ]}
      pages={BANK_ACCOUNT_PAGES}
      inactivateWarning="Deixa de aparecer na baixa. Os recebimentos e pagamentos já lançados continuam ligados à conta."
    />
    <TransfersSection />
    </>
  );
}
