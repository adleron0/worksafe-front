import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import Icon from "@/components/general-components/Icon";
import { COMMERCIAL_ABILITY, commercialApi, errorMessage } from "../-shared/commercial";
import { CustomerOption, KIND_LABEL, PROPOSALS_KEY, PROPOSAL_KEY, Proposal, ProposalKind, formatCnpj } from "../-shared/proposals";
import CustomerStep from "./-CustomerStep";
import WizardSteps, { STEPS } from "./-WizardSteps";

export const Route = createFileRoute("/_authenticated/comercial/_propostas/propostas_/nova")({
  component: NewProposalPage,
});

/**
 * Primeiro passo de uma proposta nova: só o tipo e o cliente. Ao avançar, o
 * rascunho é criado (já numerado) e o preenchimento continua no editor.
 */
function NewProposalPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<ProposalKind>("servico");
  const [customer, setCustomer] = useState<CustomerOption | null>(null);

  const { mutate: create, isPending } = useMutation({
    mutationFn: () => {
      const contact = customer?.contacts?.[0];
      return commercialApi.post<Proposal>("proposals", {
        kind, customerId: customer!.id, title: "Nova proposta",
        contactName: contact?.name, contactEmail: contact?.email ?? customer?.email, contactPhone: contact?.phone ?? customer?.phone,
      });
    },
    onSuccess: (proposal) => {
      queryClient.setQueryData([PROPOSAL_KEY, String(proposal.id)], proposal);
      queryClient.invalidateQueries({ queryKey: [PROPOSALS_KEY] });
      navigate({ to: "/comercial/propostas/$proposalId", params: { proposalId: String(proposal.id) }, replace: true });
    },
    onError: (err) => toast({ title: "Não foi possível criar a proposta", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can(`create_${COMMERCIAL_ABILITY}`)) return null;

  return (
    <>
      <div>
        <Link to="/comercial/propostas" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"><Icon name="arrow-left" className="w-3 h-3" /> Propostas</Link>
        <h1 className="text-xl font-bold mt-1">Nova proposta</h1>
        <p className="text-sm text-muted-foreground">Escolha o cliente para começar. O rascunho é salvo ao avançar.</p>
      </div>

      <WizardSteps current="cliente" enabled={[]} />

      <div className="grid gap-4 items-start lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 grid gap-4">
          <section className="rounded-lg border bg-background p-4 sm:p-5 grid gap-4">
            <div>
              <h2 className="text-lg font-semibold">{STEPS[0].heading}</h2>
              <p className="text-sm text-muted-foreground">{STEPS[0].description}</p>
            </div>
            <CustomerStep kind={kind} onKind={setKind} selected={customer} onSelect={setCustomer} />
          </section>

          <div className="grid grid-cols-2 sm:flex sm:justify-between gap-2">
            <Button type="button" variant="outline" disabled={isPending} onClick={() => navigate({ to: "/comercial/propostas" })}>Cancelar</Button>
            <Button type="button" disabled={!customer || isPending} onClick={() => create()}>
              {isPending ? "Criando..." : "Avançar"} <Icon name="arrow-right" className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>

        {/* em tela estreita a própria lista já mostra o escolhido */}
        <aside className="hidden lg:block lg:sticky lg:top-4 rounded-lg border bg-background p-4 text-sm" aria-live="polite">
          <h2 className="font-semibold">Resumo</h2>
          <dl className="mt-2 grid gap-2">
            <div><dt className="text-xs text-muted-foreground">Tipo</dt><dd>{KIND_LABEL[kind]}</dd></div>
            <div>
              <dt className="text-xs text-muted-foreground">Cliente</dt>
              <dd className={customer ? "font-medium" : "text-muted-foreground"}>{customer ? customer.name : "Nenhum escolhido"}</dd>
              {customer && <dd className="text-xs text-muted-foreground">{formatCnpj(customer.cnpj)}</dd>}
            </div>
          </dl>
        </aside>
      </div>
    </>
  );
}
