import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api, { get } from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import CalendarPicker from "@/components/general-components/Calendar";
import Icon from "@/components/general-components/Icon";
import SlideConfirm from "@/components/general-components/SlideConfirm";
import { FormPageGrid, FormSection, SummaryRow } from "@/components/general-components/FormPage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Response } from "@/general-interfaces/api.interface";
import { cn } from "@/lib/utils";
import { errorMessage, money } from "../../../comercial/-shared/commercial";
import { FEDERAL_TAXES, FederalTax, FISCAL_KEYS, formatDoc, Invoice, InvoiceOrigin, OriginDraft, Preview, todayIso, useFiscalSettings, useServiceCodes } from "../-shared/fiscal";

type TakerMode = "cliente" | "avulso";
interface AddressState { cep: string; street: string; number: string; complement: string; district: string; cityName: string; uf: string }
interface State {
  takerMode: TakerMode;
  customerId: string;
  editTaker: boolean;
  document: string;
  name: string;
  email: string;
  municipalRegistration: string;
  address: AddressState;
  serviceCodeId: string;
  description: string;
  competence: string;
  otherPlace: boolean;
  placeCity: string;
  placeUf: string;
  grossValue: number;
  discountValue: number;
  issRate: string;
  issWithheld: boolean;
  rates: Record<FederalTax, string>;
  reference: string;
  order: string;
  notes: string;
  createReceivable: boolean;
  dueDate: string;
  paymentMethod: string;
  // nota emitida fora
  number: string;
  issuedAt: string;
  accessKey: string;
}

const EMPTY_ADDRESS: AddressState = { cep: "", street: "", number: "", complement: "", district: "", cityName: "", uf: "" };
const UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"].map((uf) => ({ id: uf, name: uf }));
const PAYMENT = [{ id: "boleto", name: "Boleto" }, { id: "pix", name: "Pix" }, { id: "transferencia", name: "Transferência" }, { id: "dinheiro", name: "Dinheiro" }, { id: "outro", name: "Outro" }];
const addDays = (iso: string, days: number) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); };
const num = (value: string) => (value === "" ? null : Number(String(value).replace(",", ".")));
const pick = (v: string | string[]) => String(Array.isArray(v) ? v[0] ?? "" : v);

/** Estado do formulário a partir do rascunho sugerido pela origem (parcela, boletim, OL). */
function stateFromDraft(draft: OriginDraft): State {
  const base = stateFrom(null);
  const t = draft.taker;
  return {
    ...base,
    // inscrição de pessoa física: tomador digitado a partir da inscrição (dá para corrigir)
    takerMode: draft.takerKind === "avulso" ? "avulso" : "cliente",
    document: t?.document ?? "",
    name: t?.name ?? "",
    email: t?.email ?? "",
    address: t?.address ? { cep: t.address.cep ?? "", street: t.address.street ?? "", number: t.address.number ?? "", complement: t.address.complement ?? "", district: t.address.district ?? "", cityName: t.address.cityName ?? "", uf: t.address.uf ?? "" } : base.address,
    customerId: draft.customerId ? String(draft.customerId) : "",
    serviceCodeId: draft.serviceCodeId ? String(draft.serviceCodeId) : "",
    description: draft.description,
    competence: draft.competence,
    grossValue: draft.grossValue,
    issRate: draft.issRate !== null ? String(draft.issRate) : "",
    issWithheld: draft.issWithheld,
    rates: Object.fromEntries(FEDERAL_TAXES.map((t) => [t.id, draft.retentions?.[t.id]?.rate != null ? String(draft.retentions[t.id]!.rate) : ""])) as Record<FederalTax, string>,
    reference: draft.reference ?? "",
    order: draft.order ?? "",
    createReceivable: false,
    dueDate: "",
  };
}

function stateFrom(invoice: Invoice | null): State {
  const t = invoice?.taker;
  const custom = !!invoice && invoice.takerKind !== "cliente";
  return {
    takerMode: invoice ? (invoice.takerKind === "cliente" ? "cliente" : "avulso") : "cliente",
    customerId: invoice?.customerId ? String(invoice.customerId) : "",
    editTaker: false,
    document: custom ? t?.document ?? "" : "",
    name: custom ? t?.name ?? "" : "",
    email: custom ? t?.email ?? "" : "",
    municipalRegistration: custom ? t?.municipalRegistration ?? "" : "",
    address: custom && t?.address ? { cep: t.address.cep ?? "", street: t.address.street ?? "", number: t.address.number ?? "", complement: t.address.complement ?? "", district: t.address.district ?? "", cityName: t.address.cityName ?? "", uf: t.address.uf ?? "" } : EMPTY_ADDRESS,
    serviceCodeId: invoice?.serviceCodeId ? String(invoice.serviceCodeId) : "",
    description: invoice?.description ?? "",
    competence: invoice?.competence ?? todayIso(),
    otherPlace: false,
    placeCity: "",
    placeUf: "",
    grossValue: invoice?.grossValue ?? 0,
    discountValue: invoice?.discountValue ?? 0,
    issRate: invoice?.issRate !== null && invoice?.issRate !== undefined ? String(invoice.issRate) : "",
    issWithheld: invoice?.issWithheld ?? false,
    rates: Object.fromEntries(FEDERAL_TAXES.map((t) => [t.id, invoice?.retentions?.[t.id]?.rate != null ? String(invoice.retentions[t.id]!.rate) : ""])) as Record<FederalTax, string>,
    reference: invoice?.reference ?? "",
    order: invoice?.order ?? "",
    notes: invoice?.notes ?? "",
    createReceivable: invoice ? !!invoice.receivable : true,
    dueDate: invoice?.origin ? invoice.origin.dueDate ?? "" : invoice?.receivable?.dueDate ?? addDays(todayIso(), 30),
    paymentMethod: invoice?.origin?.paymentMethod ?? invoice?.receivable?.paymentMethod ?? "boleto",
    number: "",
    issuedAt: todayIso(),
    accessKey: "",
  };
}

/**
 * Formulário da nota (nova, rascunho ou rejeitada) e do registro de nota emitida fora.
 * A coluna da direita é a prévia calculada pela API: valores, retenções, líquido,
 * o que impede emitir (erros) e o que merece atenção (avisos).
 */
export default function InvoiceForm({ invoice, external = false, draft }: { invoice: Invoice | null; external?: boolean; draft?: OriginDraft | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState<State>(() => (draft ? stateFromDraft(draft) : stateFrom(invoice)));
  const touchedDescription = useRef(!!invoice?.description || !!draft?.description);
  // de onde a nota nasceu: ao autorizar, o sistema fatura essa origem com o número da nota
  const origin: (InvoiceOrigin & { label?: string }) | null = draft ? { ...draft.origin, label: draft.originLabel } : invoice?.origin && !invoice.originBilledAt ? invoice.origin : null;
  const { data: settings } = useFiscalSettings();
  const { data: services } = useServiceCodes();
  const { can } = useVerify();
  const canListCustomers = can("list_clientes");
  const { data: customers, isLoading: loadingCustomers } = useQuery<Response | undefined>({
    queryKey: ["optionsCustomersFiscal"],
    queryFn: () => get<Response>("customer", "", [{ key: "limit", value: 1000 }, { key: "order-name", value: "asc" }]),
    enabled: canListCustomers,
  });

  // serviço padrão na nota nova
  useEffect(() => {
    if (!invoice && !state.serviceCodeId && services?.length) {
      const preferred = services.find((s) => s.isDefault) ?? services[0];
      setState((prev) => ({ ...prev, serviceCodeId: String(preferred.id) }));
    }
  }, [services, invoice, state.serviceCodeId]);

  const set = <K extends keyof State>(key: K, value: State[K]) => setState((prev) => ({ ...prev, [key]: value }));
  const setAddress = (key: keyof AddressState, value: string) => setState((prev) => ({ ...prev, address: { ...prev.address, [key]: value } }));

  const body = useMemo(() => {
    const customTaker = state.takerMode === "avulso" || state.editTaker;
    const takerOverrides = customTaker ? {
      document: state.document.replace(/\D/g, ""),
      name: state.name,
      email: state.email,
      municipalRegistration: state.municipalRegistration,
      address: state.address.street || state.address.cep ? { ...state.address, cep: state.address.cep.replace(/\D/g, "") } : null,
    } : undefined;
    return {
      takerKind: state.takerMode,
      customerId: state.takerMode === "cliente" ? Number(state.customerId) || undefined : undefined,
      taker: takerOverrides,
      serviceCodeId: Number(state.serviceCodeId) || undefined,
      description: touchedDescription.current ? state.description : "",
      competence: state.competence,
      placeCity: state.otherPlace ? state.placeCity : undefined,
      placeUf: state.otherPlace ? state.placeUf : undefined,
      grossValue: state.grossValue,
      discountValue: state.discountValue,
      issRate: state.issRate === "" ? undefined : num(state.issRate),
      issWithheld: state.issWithheld,
      retentions: Object.fromEntries(FEDERAL_TAXES.filter((t) => state.rates[t.id] !== "").map((t) => [t.id, { rate: num(state.rates[t.id]) }])),
      reference: state.reference,
      order: state.order,
      notes: state.notes,
      receivable: origin
        ? { dueDate: state.dueDate || undefined, paymentMethod: state.paymentMethod }
        : state.createReceivable ? { create: true, dueDate: state.dueDate, paymentMethod: state.paymentMethod } : undefined,
      origin: origin ? { kind: origin.kind, contractId: origin.contractId, installmentIds: origin.installmentIds, measurementId: origin.measurementId, rentalId: origin.rentalId, mode: origin.mode, subscriptionIds: origin.subscriptionIds } : undefined,
    };
  }, [state, origin]);

  // prévia calculada pela API (com uma pausa enquanto digita)
  const [debounced, setDebounced] = useState(body);
  useEffect(() => { const t = setTimeout(() => setDebounced(body), 400); return () => clearTimeout(t); }, [body]);
  const ready = state.takerMode === "avulso" ? state.document.replace(/\D/g, "").length >= 11 : !!state.customerId;
  const { data: preview, isFetching: previewing, error: previewError } = useQuery({
    queryKey: ["fiscalPreview", debounced],
    queryFn: async () => (await api.post<Preview & { placeLabel?: string | null }>("fiscal/invoices/preview", debounced)).data,
    enabled: ready && !!debounced.serviceCodeId && debounced.grossValue > 0,
    placeholderData: (previous) => previous,
  });

  // descrição sugerida pelo modelo do serviço até a pessoa mexer nela
  useEffect(() => {
    if (preview && !touchedDescription.current) setState((prev) => ({ ...prev, description: preview.description }));
  }, [preview]);

  const afterSave = (saved: Invoice, emitted: boolean) => {
    queryClient.invalidateQueries({ queryKey: [FISCAL_KEYS.invoices] });
    queryClient.setQueryData([FISCAL_KEYS.invoice, saved.id], saved);
    if (emitted) {
      const ok = saved.status === "autorizada";
      toast({
        title: ok ? `Nota ${saved.number ?? ""} autorizada` : saved.status === "rejeitada" ? "A nota foi rejeitada" : "Nota enviada, sem resposta ainda",
        description: ok ? (saved.environment === "restrita" ? "Ambiente de testes: sem valor fiscal." : "PDF e XML disponíveis na ficha.") : saved.messages[0]?.message,
        variant: ok ? "success" : "destructive",
      });
    } else toast({ title: "Rascunho salvo", variant: "success" });
    navigate({ to: "/financeiro/notas/$invoiceId", params: { invoiceId: String(saved.id) } });
  };

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: async (emit: boolean) => {
      const payload = { ...body, description: state.description, emit };
      const res = invoice ? await api.put<Invoice>(`fiscal/invoices/${invoice.id}`, payload) : await api.post<Invoice>("fiscal/invoices", payload);
      return { saved: res.data, emit };
    },
    onSuccess: ({ saved, emit }) => afterSave(saved, emit),
    onError: (err) => toast({ title: "Não foi possível salvar a nota", description: errorMessage(err), variant: "destructive" }),
  });

  const { mutate: register, isPending: registering } = useMutation({
    mutationFn: async () => (await api.post<Invoice>("fiscal/invoices/external", { ...body, description: state.description, number: state.number, issuedAt: state.issuedAt, accessKey: state.accessKey })).data,
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: [FISCAL_KEYS.invoices] });
      toast({ title: `Nota ${saved.number} registrada`, variant: "success" });
      navigate({ to: "/financeiro/notas/$invoiceId", params: { invoiceId: String(saved.id) } });
    },
    onError: (err) => toast({ title: "Não foi possível registrar a nota", description: errorMessage(err), variant: "destructive" }),
  });

  const customer = (customers?.rows ?? []).find((c: { id: number }) => String(c.id) === state.customerId) as { id: number; name: string } | undefined;
  const calc = preview?.calc;
  const blocking = preview?.errors ?? [];
  const canEmitNow = !!preview?.canEmit && !!settings?.ready && !previewing;
  const environment = settings?.environment ?? "restrita";

  const aside = (
    <>
      <section className="rounded-card border bg-card p-4 flex flex-col gap-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Prévia da nota</p>
        <SummaryRow label="Tomador">{preview?.taker.name || customer?.name || "—"}</SummaryRow>
        <SummaryRow label="Valor do serviço" strong>{money(calc?.gross ?? state.grossValue)}</SummaryRow>
        {!!calc?.discount && <SummaryRow label="Desconto">− {money(calc.discount)}</SummaryRow>}
        {calc && calc.issValue > 0 && <SummaryRow label={calc.issWithheld ? "ISS retido" : "ISS (no Simples)"}>{calc.issWithheld ? "− " : ""}{money(calc.issValue)}</SummaryRow>}
        {calc && FEDERAL_TAXES.filter((t) => calc.federal[t.id].value > 0).map((t) => <SummaryRow key={t.id} label={`${t.name} retido`}>− {money(calc.federal[t.id].value)}</SummaryRow>)}
        <div className="border-t pt-2"><SummaryRow label="Líquido a receber" strong>{money(calc?.net ?? state.grossValue)}</SummaryRow></div>
        {preview?.placeLabel && <SummaryRow label="Prestado em">{preview.placeLabel}</SummaryRow>}
        {previewing && <p className="text-xs text-muted-foreground flex items-center gap-1"><Icon name="loader-circle" className="w-3 h-3 animate-spin" /> calculando…</p>}
        {previewError && <p className="text-xs text-destructive">{errorMessage(previewError)}</p>}
      </section>

      {!external && settings && !settings.ready && (
        <section className="rounded-card border border-amber-300 bg-amber-50 dark:bg-amber-950 p-3 text-xs text-amber-900 dark:text-amber-100">
          <p className="font-semibold mb-1">Ainda não dá para emitir pelo sistema</p>
          <ul className="list-disc pl-4">{settings.pending.map((p) => <li key={p}>{p}</li>)}</ul>
          <Link to="/financeiro/fiscal" className="underline mt-1 inline-block">Configuração fiscal</Link>
        </section>
      )}
      {blocking.length > 0 && (
        <section className="rounded-card border border-red-300 bg-red-50 dark:bg-red-950 p-3 text-xs text-red-900 dark:text-red-100">
          <p className="font-semibold mb-1">Corrija antes de emitir</p>
          <ul className="list-disc pl-4">{blocking.map((e) => <li key={e}>{e}</li>)}</ul>
        </section>
      )}
      {(preview?.warnings ?? []).length > 0 && (
        <section className="rounded-card border border-amber-300 bg-amber-50 dark:bg-amber-950 p-3 text-xs text-amber-900 dark:text-amber-100">
          <ul className="list-disc pl-4">{preview!.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
        </section>
      )}
      {invoice?.status === "rejeitada" && invoice.messages.length > 0 && (
        <section className="rounded-card border border-red-300 bg-red-50 dark:bg-red-950 p-3 text-xs text-red-900 dark:text-red-100">
          <p className="font-semibold mb-1">Por que o ambiente nacional rejeitou</p>
          <ul className="list-disc pl-4">{invoice.messages.map((m) => <li key={m.code + m.message}>{m.code ? <b>{m.code}: </b> : null}{m.message}</li>)}</ul>
        </section>
      )}

      <div className="flex flex-col gap-2">
        {external ? (
          <Button type="button" disabled={registering || !state.number || !ready} onClick={() => register()}>Registrar nota emitida fora</Button>
        ) : (
          <>
            <SlideConfirm label={environment === "producao" ? "Deslize para emitir a nota" : "Deslize para emitir (teste)"} pending={saving} disabled={!canEmitNow} onConfirm={() => { save(true); }} />
            <Button type="button" variant="outline" disabled={saving || !ready} onClick={() => save(false)}>Salvar rascunho</Button>
          </>
        )}
        <Button type="button" variant="ghost" onClick={() => navigate({ to: "/financeiro/notas" })}>Cancelar</Button>
      </div>
    </>
  );

  return (
    <FormPageGrid aside={aside}>
      {external && (
        <FormSection title="Nota emitida fora do sistema" description="Registre a nota que já existe (emitida no portal, em outro sistema ou no Omie) para ela entrar no financeiro e no saldo dos contratos.">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><Label>Número da nota <span>*</span></Label><Input name="number" value={state.number} onValueChange={(_, v) => set("number", String(v))} className="mt-1" /></div>
            <div><Label>Data de emissão</Label><CalendarPicker mode="natural" name="issuedAt" value={state.issuedAt} onValueChange={(_, v) => set("issuedAt", v ?? todayIso())} className="mt-1" /></div>
            <div><Label>Chave de acesso (opcional)</Label><Input name="accessKey" value={state.accessKey} onValueChange={(_, v) => set("accessKey", String(v))} className="mt-1" placeholder="50 dígitos" /></div>
          </div>
        </FormSection>
      )}

      {origin && (
        <div className="rounded-card border border-primary/40 bg-primary-soft p-4 text-sm">
          <p className="font-semibold flex items-center gap-1.5"><Icon name="link" className="w-4 h-4" /> Nota de {origin.label ?? "uma origem do contrato"}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{origin.kind === "subscriptions"
            ? "A inscrição já foi paga: a nota se liga ao pagamento, sem criar outra cobrança. Confira o CPF e o nome do tomador."
            : origin.kind === "contract"
            ? "Esta nota cobre o contrato e não gera cobrança agora. Ao faturar cada parcela ou boletim, escolha \"Usar nota já emitida\": a conta a receber sai com o número desta nota e o saldo dela diminui."
            : "Quando a nota for autorizada, o sistema fatura essa origem com o número da nota: conta a receber, caução, comissão e retenções. O cliente e o valor vêm da origem."}</p>
        </div>
      )}

      <FormSection title="Tomador" description="Quem recebe a nota. Os dados vêm do cadastro; dá para corrigir só nesta nota.">
        {!origin && <div className="flex gap-2">
          {(["cliente", "avulso"] as TakerMode[]).map((mode) => (
            <Button key={mode} type="button" size="sm" variant={state.takerMode === mode ? "default" : "outline"} onClick={() => set("takerMode", mode)}>
              {mode === "cliente" ? "Cliente cadastrado" : "Digitar os dados"}
            </Button>
          ))}
        </div>}
        {state.takerMode === "cliente" && !canListCustomers && (
          <p className="text-sm text-amber-700">Seu perfil não pode ver a lista de clientes. Use "Digitar os dados" ou peça a permissão de clientes.</p>
        )}
        {state.takerMode === "cliente" && canListCustomers && (
          <div>
            <Label>Cliente <span>*</span></Label>
            <Select name="customerId" options={(customers?.rows ?? []) as never[]} state={state.customerId} onChange={(_, v) => set("customerId", pick(v))}
              placeholder="Selecione o cliente" isLoading={loadingCustomers} disabled={!!origin} searchable modal />
          </div>
        )}
        {state.takerMode === "cliente" && preview && !state.editTaker && (
          <div className="rounded-lg border bg-muted/40 px-3 py-2 text-[13px]">
            <p><b>{preview.taker.name}</b> · {formatDoc(preview.taker.document)}</p>
            <p className="text-muted-foreground">{preview.taker.address ? [preview.taker.address.street, preview.taker.address.number, preview.taker.address.district, preview.taker.address.cityName && `${preview.taker.address.cityName}/${preview.taker.address.uf ?? ""}`].filter(Boolean).join(", ") : "Sem endereço no cadastro"}</p>
            <p className="text-muted-foreground">A nota vai para: {preview.taker.email || "sem e-mail (cadastre um contato fiscal no cliente)"}</p>
            <Button type="button" variant="link" size="sm" className="px-0 h-auto" onClick={() => setState((prev) => ({
              ...prev, editTaker: true, document: preview.taker.document, name: preview.taker.name, email: preview.taker.email ?? "", municipalRegistration: preview.taker.municipalRegistration ?? "",
              address: preview.taker.address ? { cep: preview.taker.address.cep, street: preview.taker.address.street, number: preview.taker.address.number, complement: preview.taker.address.complement ?? "", district: preview.taker.address.district, cityName: preview.taker.address.cityName ?? "", uf: preview.taker.address.uf ?? "" } : EMPTY_ADDRESS,
            }))}>Corrigir os dados só nesta nota</Button>
          </div>
        )}
        {(state.takerMode === "avulso" || state.editTaker) && (
          <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
            <div className="sm:col-span-2"><Label>CPF ou CNPJ <span>*</span></Label><Input name="document" format="cpfcnpj" value={state.document} onValueChange={(_, v) => set("document", String(v))} className="mt-1" /></div>
            <div className="sm:col-span-4"><Label>Nome ou razão social <span>*</span></Label><Input name="name" value={state.name} onValueChange={(_, v) => set("name", String(v))} className="mt-1" /></div>
            <div className="sm:col-span-4"><Label>E-mail para a nota</Label><Input name="email" value={state.email} onValueChange={(_, v) => set("email", String(v))} className="mt-1" /></div>
            <div className="sm:col-span-2"><Label>Inscrição municipal</Label><Input name="im" value={state.municipalRegistration} onValueChange={(_, v) => set("municipalRegistration", String(v))} className="mt-1" /></div>
            <div className="sm:col-span-2"><Label>CEP</Label><Input name="cep" format="cep" value={state.address.cep} onValueChange={(_, v) => setAddress("cep", String(v))} className="mt-1" /></div>
            <div className="sm:col-span-4"><Label>Rua</Label><Input name="street" value={state.address.street} onValueChange={(_, v) => setAddress("street", String(v))} className="mt-1" /></div>
            <div className="sm:col-span-1"><Label>Número</Label><Input name="addressNumber" value={state.address.number} onValueChange={(_, v) => setAddress("number", String(v))} className="mt-1" /></div>
            <div className="sm:col-span-2"><Label>Bairro</Label><Input name="district" value={state.address.district} onValueChange={(_, v) => setAddress("district", String(v))} className="mt-1" /></div>
            <div className="sm:col-span-2"><Label>Cidade</Label><Input name="city" value={state.address.cityName} onValueChange={(_, v) => setAddress("cityName", String(v))} className="mt-1" /></div>
            <div className="sm:col-span-1"><Label>UF</Label><Select name="uf" options={UFS as never[]} state={state.address.uf} onChange={(_, v) => setAddress("uf", pick(v))} placeholder="UF" modal /></div>
            <p className="sm:col-span-6 text-xs text-muted-foreground">Tomador com CNPJ precisa de endereço completo. Pessoa física só precisa quando o ISS é retido.</p>
          </div>
        )}
      </FormSection>

      <FormSection title="Serviço" description="O código de tributação vem do serviço fiscal cadastrado na configuração.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Label>Serviço fiscal <span>*</span></Label>
            <Select name="serviceCodeId" options={(services ?? []).map((s) => ({ id: s.id, name: `${s.name} (${s.nationalCode})` })) as never[]} state={state.serviceCodeId}
              onChange={(_, v) => { touchedDescription.current = false; set("serviceCodeId", pick(v)); }} placeholder="Selecione" modal />
            {services && services.length === 0 && <p className="text-xs text-amber-700 mt-1">Nenhum serviço fiscal cadastrado. <Link to="/financeiro/fiscal" className="underline">Cadastrar</Link></p>}
          </div>
          <div><Label>Competência</Label><CalendarPicker mode="natural" name="competence" value={state.competence} onValueChange={(_, v) => set("competence", v ?? todayIso())} className="mt-1" /></div>
        </div>
        <div>
          <Label>Discriminação do serviço <span>*</span></Label>
          <Input type="textArea" name="description" value={state.description} rows={4} maxLength={2000}
            onValueChange={(_, v) => { touchedDescription.current = true; set("description", String(v)); }} className="mt-1" />
          <p className="text-xs text-muted-foreground mt-1">Sugerida pelo modelo do serviço fiscal; edite à vontade.</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={state.otherPlace} onCheckedChange={(v) => set("otherPlace", v === true)} /> Serviço prestado em outra cidade (não na sede)
        </label>
        {state.otherPlace && (
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2"><Label>Cidade da prestação</Label><Input name="placeCity" value={state.placeCity} onValueChange={(_, v) => set("placeCity", String(v))} className="mt-1" /></div>
            <div><Label>UF</Label><Select name="placeUf" options={UFS as never[]} state={state.placeUf} onChange={(_, v) => set("placeUf", pick(v))} placeholder="UF" modal /></div>
          </div>
        )}
      </FormSection>

      <FormSection title="Valores e retenções" description="Informe as alíquotas que o cliente retém; o sistema calcula os valores e o líquido.">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><Label>Valor do serviço <span>*</span></Label><Input name="grossValue" format="currency" value={state.grossValue} disabled={!!origin && origin.mode !== "livre"} onValueChange={(_, v) => set("grossValue", Number(v) || 0)} className="mt-1" />
            {origin && origin.mode !== "livre" && <p className="text-[11px] text-muted-foreground mt-0.5">O valor da origem (antes da caução).</p>}
            {origin?.mode === "livre" && <p className="text-[11px] text-muted-foreground mt-0.5">Valor livre: adiantamento, aditivo ou parte do contrato.</p>}</div>
          <div><Label>Desconto incondicionado</Label><Input name="discountValue" format="currency" value={state.discountValue} onValueChange={(_, v) => set("discountValue", Number(v) || 0)} className="mt-1" /></div>
          <div><Label>Alíquota do ISS (%)</Label><Input name="issRate" value={state.issRate} inputMode="decimal" placeholder="a do serviço fiscal" onValueChange={(_, v) => set("issRate", String(v))} className="mt-1" /></div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={state.issWithheld} onCheckedChange={(v) => set("issWithheld", v === true)} /> ISS retido pelo cliente
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {FEDERAL_TAXES.map((tax) => (
            <div key={tax.id}>
              <Label>{tax.name} (%)</Label>
              <Input name={tax.id} value={state.rates[tax.id]} inputMode="decimal" placeholder="0" onValueChange={(_, v) => set("rates", { ...state.rates, [tax.id]: String(v) })} className="mt-1" />
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{tax.hint}</p>
            </div>
          ))}
        </div>
      </FormSection>

      <FormSection title="Informações complementares" description="Saem na nota. O pedido do cliente costuma ser exigido pelo financeiro dele.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><Label>Documento de referência</Label><Input name="reference" value={state.reference} placeholder="ex.: Proposta PC-2026-0042" onValueChange={(_, v) => set("reference", String(v))} className="mt-1" /></div>
          <div><Label>Pedido do cliente</Label><Input name="order" value={state.order} onValueChange={(_, v) => set("order", String(v))} className="mt-1" /></div>
        </div>
        <div><Label>Observações da nota</Label><Input type="textArea" name="notes" rows={2} value={state.notes} placeholder={settings?.defaultNotes ?? ""} onValueChange={(_, v) => set("notes", String(v))} className="mt-1" /></div>
      </FormSection>

      {origin && origin.kind !== "contract" && origin.kind !== "subscriptions" && (
        <FormSection title="Cobrança" description="A conta a receber sai do faturamento da origem quando a nota for autorizada.">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Vencimento</Label>
              <CalendarPicker mode="natural" name="dueDate" value={state.dueDate || null} placeholder="pela regra da origem" onValueChange={(_, v) => set("dueDate", v ?? "")} className="mt-1" />
              <p className="text-[11px] text-muted-foreground mt-0.5">Vazio: segue a regra combinada (dias após a nota, % da obra...).</p>
            </div>
            <div><Label>Forma de pagamento</Label><Select name="paymentMethod" options={PAYMENT as never[]} state={state.paymentMethod} onChange={(_, v) => set("paymentMethod", pick(v))} modal /></div>
          </div>
        </FormSection>
      )}

      {!invoice?.replacesId && !origin && (
        <FormSection title="Cobrança" description="A nota pode já gerar a conta a receber, com o líquido e as retenções no relatório de impostos retidos.">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={state.createReceivable} onCheckedChange={(v) => set("createReceivable", v === true)} /> {external ? "Gerar a conta a receber agora" : "Gerar a conta a receber quando a nota for autorizada"}
          </label>
          <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-4", !state.createReceivable && "opacity-50 pointer-events-none")}>
            <div><Label>Vencimento</Label><CalendarPicker mode="natural" name="dueDate" value={state.dueDate} onValueChange={(_, v) => set("dueDate", v ?? state.dueDate)} className="mt-1" /></div>
            <div><Label>Forma de pagamento</Label><Select name="paymentMethod" options={PAYMENT as never[]} state={state.paymentMethod} onChange={(_, v) => set("paymentMethod", pick(v))} modal /></div>
          </div>
        </FormSection>
      )}
    </FormPageGrid>
  );
}
