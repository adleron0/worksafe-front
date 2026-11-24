import { createFileRoute } from "@tanstack/react-router";
import { SimpleFormPage } from "../-shared/SimpleCrud";
import { BankAccount } from "../-shared/financial";
import BankAccountForm, { BANK_ACCOUNT_ENTITY, BANK_ACCOUNT_PAGES } from "./-BankAccountForm";

export const Route = createFileRoute("/_authenticated/financeiro/_contas-bancarias/contas-bancarias_/nova")({
  component: () => <SimpleFormPage<BankAccount> entity={BANK_ACCOUNT_ENTITY} pages={BANK_ACCOUNT_PAGES} renderForm={(props) => <BankAccountForm {...props} />} />,
});
