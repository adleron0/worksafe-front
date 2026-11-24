import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { get } from "@/services/api";
import useVerify from "@/hooks/use-verify";
import { FormPageHeader, FormPageSkeleton } from "@/components/general-components/FormPage";
import { EmptyState } from "@/components/general-components/DataTable";
import { useBackToList } from "@/hooks/use-back-to-list";
import { ContactForm, CustomerContact, Draft, EMPTY, contactsKey } from "./-components/CustomerContacts";
import { IEntity } from "./-interfaces/entity.interface";

export const Route = createFileRoute("/_authenticated/clientes/$customerId_/contatos/$contactId")({
  component: ContactPage,
});

/** Novo contato (`/contatos/novo`) ou edição de um contato do cliente, em tela cheia. */
function ContactPage() {
  const { customerId, contactId } = Route.useParams();
  const isNew = contactId === "novo";
  const id = Number(customerId);
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const backTo = `/clientes/${customerId}`;
  const back = useBackToList(backTo);

  const { data: customer } = useQuery({
    queryKey: ["customer", id],
    queryFn: () => get<IEntity>("customer", String(id)),
    enabled: id > 0,
  });
  // mesma consulta do painel de contatos: serve para mostrar quem já é o padrão de cada papel
  const { data: contacts, isLoading: loadingContacts } = useQuery({
    queryKey: contactsKey(id),
    queryFn: () => get<{ rows: CustomerContact[] }>("customer-contacts", "", [
      { key: "customerId", value: id },
      { key: "show", value: ["role"] },
      { key: "limit", value: "all" },
      { key: "order-name", value: "asc" },
    ]),
    enabled: id > 0,
  });
  const { data: contact, isLoading: loadingContact, isError } = useQuery({
    queryKey: ["customerContact", contactId],
    queryFn: () => get<CustomerContact>("customer-contacts", contactId),
    enabled: !isNew,
    gcTime: 0, // sem cache: abrir de novo sempre traz a versão salva
  });

  if (!(can("update_clientes") || can("create_clientes"))) return null;
  const others = (contacts?.rows ?? []).filter((c) => !c.inactiveAt && String(c.id) !== contactId);
  const draft: Draft | null = isNew ? { ...EMPTY } : contact ? {
    id: contact.id, name: contact.name, email: contact.email, phone: contact.phone, notes: contact.notes ?? "", roleId: contact.roleId ?? null,
    isCommercial: contact.isCommercial, isFinancial: contact.isFinancial, isFiscal: contact.isFiscal,
    defaultCommercial: contact.defaultCommercial, defaultFinancial: contact.defaultFinancial, defaultFiscal: contact.defaultFiscal,
  } : null;

  return (
    <>
      <FormPageHeader backTo={backTo} backLabel={customer?.name ?? "Cliente"}
        title={isNew ? "Novo contato" : contact ? `Editar ${contact.name}` : "Editar contato"}
        description="Quem fala com vocês por este cliente, e para que." />
      {loadingContacts || (!isNew && loadingContact) ? <FormPageSkeleton />
        : isError || !draft ? <EmptyState icon="search-x" title="Contato não encontrado." />
          : <ContactForm key={contactId} customerId={id} draft={draft} others={others} onClose={back}
              onSaved={() => { queryClient.invalidateQueries({ queryKey: contactsKey(id) }); back(); }} />}
    </>
  );
}
