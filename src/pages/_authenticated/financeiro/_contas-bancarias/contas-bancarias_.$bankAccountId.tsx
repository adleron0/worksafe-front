import { createFileRoute } from "@tanstack/react-router";
import { SimpleFormPage } from "../-shared/SimpleCrud";
import { BankAccount } from "../-shared/financial";
import BankAccountForm, { BANK_ACCOUNT_ENTITY, BANK_ACCOUNT_PAGES } from "./-BankAccountForm";

export const Route = createFileRoute("/_authenticated/financeiro/_contas-bancarias/contas-bancarias_/$bankAccountId")({
  component: EditBankAccount,
});

/** Edição de uma conta bancária, em tela cheia. */
function EditBankAccount() {
  const { bankAccountId } = Route.useParams();
  return <SimpleFormPage<BankAccount> entity={BANK_ACCOUNT_ENTITY} pages={BANK_ACCOUNT_PAGES} id={bankAccountId} renderForm={(props) => <BankAccountForm {...props} />} />;
}
