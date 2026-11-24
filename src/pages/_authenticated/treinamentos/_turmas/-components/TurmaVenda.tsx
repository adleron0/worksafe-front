import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { NumField, commercialApi, dateBr, errorMessage, money } from "../../../comercial/-shared/commercial";
import { SaleResultPanel, TargetPurchasesPanel } from "../../../suprimentos/-shared/purchases";

type Mode = "contrato" | "sem_cobranca";
interface Candidate { id: number; number: string; title: string; kind: string; value: number; acceptedAt: string; freeSlots: number }
interface ClassBilling {
  class: { id: number; name: string; customer: { id: number; name: string } | null };
  closed: boolean;
  billing: {
    mode: Mode; reason: string | null; at: string; user: { id: number; name: string } | null;
    contract: { id: number; number: string; title: string; value: number; status: string } | null;
  } | null;
  candidates: Candidate[];
}

const KEY = "classBilling";
type Choice = "venda" | "rapida" | "sem";

/**
 * Aba "Venda" da turma fechada: de onde vem o dinheiro. Ligada a uma venda
 * (contrato), registrada agora por venda rápida, ou marcada "sem cobrança"
 * com o motivo. Sem nenhuma das três, o painel avisa.
 */
export default function TurmaVenda({ classId }: { classId: number }) {
  return (
    <div className="grid gap-4">
      <VendaBox classId={classId} />
      <div className="grid gap-4 lg:grid-cols-2 items-start">
        <TargetPurchasesPanel target={{ kind: "turma", id: classId }} canRequest />
        <SaleResultPanel target={{ kind: "turma", id: classId }} />
      </div>
    </div>
  );
}

function VendaBox({ classId }: { classId: number }) {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const canEdit = can("update_comercial");
  const canQuick = canEdit && can("create_comercial");
  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState<Choice>("rapida");
  const [contractId, setContractId] = useState("");
  const [value, setValue] = useState<number | null>(null);
  const [parts, setParts] = useState<number | null>(1);
  const [dueDays, setDueDays] = useState<number | null>(30);
  const [reason, setReason] = useState("");
  const [unlinking, setUnlinking] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: [KEY, classId],
    queryFn: () => commercialApi.get<ClassBilling>(`classes/${classId}/billing`),
    enabled: can("list_comercial"), retry: false,
  });
  const done = (title: string) => {
    queryClient.invalidateQueries({ queryKey: [KEY, classId] });
    queryClient.invalidateQueries({ queryKey: ["dashboard-training"] });
    toast({ title, variant: "success" });
    setEditing(false);
  };
  const fail = (e: unknown) => toast({ title: "Não foi possível salvar", description: errorMessage(e), variant: "destructive" });

  const link = useMutation({ mutationFn: (body: Record<string, unknown>) => commercialApi.put<ClassBilling>(`classes/${classId}/billing`, body), onError: fail });
  const quick = useMutation({
    mutationFn: () => {
      const count = Math.max(1, Math.min(24, Math.round(parts ?? 1)));
      const days = Math.max(0, Math.round(dueDays ?? 0));
      // parcelas iguais, a cada 30 dias depois da primeira; a última fecha o arredondamento
      const installments = Array.from({ length: count }, (_, i) => ({ percent: i === count - 1 ? Number((1 - (count - 1) * Number((1 / count).toFixed(6))).toFixed(6)) : Number((1 / count).toFixed(6)), dueRule: "dias_apos_nf", dueDays: days + i * 30 }));
      return commercialApi.post<{ contractNumber: string }>("quick-sale", { classId, value, installments });
    },
    onSuccess: (result) => done(`Venda ${result.contractNumber} registrada`),
    onError: fail,
  });

  if (!can("list_comercial")) return <p className="rounded-card border bg-card p-4 text-sm text-muted-foreground">Ver a venda da turma pede acesso ao Comercial.</p>;
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  if (error || !data) return <p className="rounded-card border bg-card p-4 text-sm text-destructive">Não foi possível carregar: {errorMessage(error)}</p>;
  if (!data.closed) return <p className="rounded-card border bg-card p-4 text-sm text-muted-foreground">Turma aberta: o dinheiro vem das inscrições. Para vender a turma a um cliente, escolha o cliente no passo "Turma".</p>;

  const billing = data.billing;
  const showForm = canEdit && (editing || !billing);
  const choices: Array<{ id: Choice; title: string; hint: string; icon: string; disabled?: boolean }> = [
    { id: "rapida", title: "Venda rápida", hint: "Combinada fora do sistema: informe valor e parcelas.", icon: "zap", disabled: !canQuick },
    { id: "venda", title: "Ligar a uma venda", hint: data.candidates.length ? `${data.candidates.length} venda(s) deste cliente.` : "Este cliente não tem venda.", icon: "link", disabled: !data.candidates.length },
    { id: "sem", title: "Sem cobrança", hint: "Cortesia, treinamento interno...", icon: "gift" },
  ];

  return (
    <div className="grid gap-4">
      {billing?.mode === "contrato" && billing.contract && (
        <section className="rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/40">
          <p className="text-sm font-medium flex items-center gap-1.5"><Icon name="circle-check" className="w-4 h-4 text-green-700 dark:text-green-300" /> Ligada à venda</p>
          <p className="mt-1 text-sm">
            <Link to="/comercial/contratos/$contractId" params={{ contractId: String(billing.contract.id) }} className="font-medium underline">{billing.contract.number}</Link>
            {" · "}{billing.contract.title} · {money(billing.contract.value)}{billing.contract.status === "cancelado" ? " · venda cancelada" : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">O faturamento sai das parcelas da venda, em Financeiro → A Faturar.</p>
        </section>
      )}
      {billing?.mode === "sem_cobranca" && (
        <section className="rounded-card border bg-card p-4">
          <p className="text-sm font-medium flex items-center gap-1.5"><Icon name="gift" className="w-4 h-4" /> Sem cobrança</p>
          <p className="mt-1 text-sm">{billing.reason}</p>
          <p className="mt-1 text-xs text-muted-foreground">{[billing.user?.name, dateBr(billing.at)].filter(Boolean).join(" · ")}</p>
        </section>
      )}
      {!billing && (
        <section role="alert" className="rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
          <p className="font-medium text-destructive flex items-center gap-1.5"><Icon name="triangle-alert" className="w-4 h-4" /> Turma fechada sem venda</p>
          <p className="mt-1">Do jeito que está, a turma acontece e o financeiro não fica sabendo. Escolha de onde vem o dinheiro{data.class.customer ? ` de ${data.class.customer.name}` : ""}.</p>
          {!canEdit && <p className="mt-1 text-muted-foreground">Quem tem permissão de editar o Comercial resolve isto.</p>}
        </section>
      )}

      {billing && canEdit && !editing && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}><Icon name="pencil" className="w-4 h-4 mr-1" /> Mudar</Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setUnlinking(true)}>Desfazer</Button>
        </div>
      )}
      <ConfirmDialog open={unlinking} onOpenChange={setUnlinking} title="Desfazer a origem do dinheiro da turma?"
        description="A turma volta a aparecer no painel como turma fechada sem venda. A venda em si não muda."
        onConfirm={() => { setUnlinking(false); link.mutate({ mode: "nenhum" }, { onSuccess: () => done("Desfeito") }); }} />

      {showForm && (
        <section className="rounded-card border bg-card p-4 grid gap-4">
          <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-label="De onde vem o dinheiro">
            {choices.map((option) => (
              <button key={option.id} type="button" role="radio" aria-checked={choice === option.id} disabled={option.disabled} onClick={() => setChoice(option.id)}
                className={cn("rounded-card border bg-card p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  choice === option.id ? "border-primary bg-primary/5" : "hover:bg-muted")}>
                <span className="flex items-center gap-1.5 text-sm font-medium"><Icon name={option.icon} className="w-4 h-4" /> {option.title}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{option.hint}</span>
              </button>
            ))}
          </div>

          {choice === "rapida" && (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="grid gap-1.5"><Label htmlFor="quick-value">Valor da venda</Label><NumField id="quick-value" kind="money" value={value} onChange={setValue} onEmpty={() => setValue(null)} /></div>
                <div className="grid gap-1.5"><Label htmlFor="quick-parts">Parcelas</Label><NumField id="quick-parts" digits={0} value={parts} onChange={setParts} /></div>
                <div className="grid gap-1.5"><Label htmlFor="quick-days">1ª vence, dias após a nota</Label><NumField id="quick-days" digits={0} value={dueDays} onChange={setDueDays} /></div>
              </div>
              <p className="text-xs text-muted-foreground">Cria a venda (proposta aceita e contrato) sem mandar documento ao cliente. As parcelas seguintes vencem a cada 30 dias e são faturadas em Financeiro → A Faturar.</p>
              <div className="flex gap-2">
                <Button type="button" disabled={!(Number(value) > 0) || quick.isPending} onClick={() => quick.mutate()}>{quick.isPending ? "Registrando…" : "Registrar venda"}</Button>
                {billing && <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>}
              </div>
            </div>
          )}

          {choice === "venda" && (
            <div className="grid gap-3">
              <div className="grid gap-1.5 sm:max-w-lg">
                <Label>Venda</Label>
                <Select name="contractId" state={contractId} modal={false} placeholder="Escolha a venda"
                  options={data.candidates.map((c) => ({ id: String(c.id), name: `${c.number} · ${c.title} · ${money(c.value)}${c.freeSlots ? " · tem item deste curso sem turma" : ""}` }))}
                  onChange={(_, picked) => setContractId(String(picked))} />
              </div>
              <div className="flex gap-2">
                <Button type="button" disabled={!contractId || link.isPending} onClick={() => link.mutate({ mode: "contrato", contractId: Number(contractId) }, { onSuccess: () => done("Turma ligada à venda") })}>Ligar</Button>
                {billing && <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>}
              </div>
            </div>
          )}

          {choice === "sem" && (
            <div className="grid gap-3">
              <div className="grid gap-1.5 sm:max-w-lg">
                <Label htmlFor="no-charge-reason">Motivo</Label>
                <Input name="reason" id="no-charge-reason" value={reason} maxLength={300} onValueChange={(_, v) => setReason(String(v))} placeholder="Ex.: treinamento da nossa equipe, cortesia ao cliente" />
              </div>
              <div className="flex gap-2">
                <Button type="button" disabled={reason.trim().length < 3 || link.isPending} onClick={() => link.mutate({ mode: "sem_cobranca", reason }, { onSuccess: () => done("Turma marcada sem cobrança") })}>Marcar sem cobrança</Button>
                {billing && <Button type="button" variant="ghost" onClick={() => setEditing(false)}>Cancelar</Button>}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
