import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import CalendarPicker from "@/components/general-components/Calendar";
import PageHeader from "@/components/general-components/PageHeader";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import StatusBadge from "@/components/general-components/StatusBadge";
import TagBadge from "@/components/general-components/TagBadge";
import DataTable, { DataColumn, EmptyState } from "@/components/general-components/DataTable";
import { FormPageGrid, FormPageSkeleton, FormSection, SummaryRow } from "@/components/general-components/FormPage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { errorMessage } from "../../comercial/-shared/commercial";
import { dateBr, FISCAL_KEYS, FiscalSettings, formatDoc, ServiceCode, useFiscalSettings, useServiceCodes } from "../_notas/-shared/fiscal";

export const Route = createFileRoute("/_authenticated/financeiro/_fiscal/fiscal")({
  component: FiscalSettingsPage,
});

const SIMPLES = [{ id: "3", name: "Optante do Simples (ME/EPP)" }, { id: "2", name: "MEI" }, { id: "1", name: "Não optante" }];
const SIMPLES_REGIME = [
  { id: "1", name: "Federais e ISS pelo Simples" },
  { id: "2", name: "Federais pelo Simples, ISS por fora" },
  { id: "3", name: "Federais e ISS por fora" },
];
const SPECIAL = [{ id: "0", name: "Nenhum" }, { id: "1", name: "Ato cooperado" }, { id: "2", name: "Estimativa" }, { id: "3", name: "Microempresa municipal" }, { id: "4", name: "Notário ou registrador" }, { id: "5", name: "Profissional autônomo" }, { id: "6", name: "Sociedade de profissionais" }, { id: "9", name: "Outros" }];
const ENVIRONMENTS = [{ id: "restrita", name: "Testes (produção restrita, sem valor fiscal)" }, { id: "producao", name: "Produção (notas valem)" }];
const pick = (v: string | string[]) => String(Array.isArray(v) ? v[0] ?? "" : v);

interface FormState {
  environment: string; municipalRegistration: string; simplesNacional: string; simplesRegime: string; specialRegime: string;
  simplesTotalRate: string; pisCofinsCst: string; dpsSeries: string; nextDpsNumber: string; nextDpsNumberTest: string; autoSendEmail: boolean; autoEmitTraining: boolean; ibsCbsEnabled: boolean; rentalNfseFrom: string; defaultNotes: string;
}
const formOf = (s: FiscalSettings): FormState => ({
  environment: s.environment, municipalRegistration: s.municipalRegistration ?? "", simplesNacional: String(s.simplesNacional), simplesRegime: s.simplesRegime ? String(s.simplesRegime) : "1",
  specialRegime: String(s.specialRegime), simplesTotalRate: s.simplesTotalRate !== null ? String(s.simplesTotalRate) : "", pisCofinsCst: s.pisCofinsCst, dpsSeries: s.dpsSeries,
  nextDpsNumber: String(s.nextDpsNumber), nextDpsNumberTest: String(s.nextDpsNumberTest), autoSendEmail: s.autoSendEmail, autoEmitTraining: s.autoEmitTraining, ibsCbsEnabled: s.ibsCbsEnabled, rentalNfseFrom: s.rentalNfseFrom ? s.rentalNfseFrom.slice(0, 10) : "", defaultNotes: s.defaultNotes ?? "",
});

/** Configuração fiscal: certificado A1, dados de emissão, série da DPS e serviços fiscais. */
function FiscalSettingsPage() {
  const { can } = useVerify();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: settings, isLoading, error } = useFiscalSettings(can("view_nfse"));
  const { data: services, isLoading: loadingServices } = useServiceCodes(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (settings && !form) setForm(formOf(settings)); }, [settings, form]);
  const set = (key: keyof FormState, value: string | boolean) => setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  const onSaved = (data: FiscalSettings) => { queryClient.setQueryData([FISCAL_KEYS.settings], data); setForm(formOf(data)); };

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return null;
      return (await api.put<FiscalSettings>("fiscal/settings", {
        ...form,
        simplesNacional: Number(form.simplesNacional), simplesRegime: form.simplesNacional === "3" ? Number(form.simplesRegime) : null, specialRegime: Number(form.specialRegime),
        simplesTotalRate: form.simplesTotalRate === "" ? null : Number(form.simplesTotalRate.replace(",", ".")),
        nextDpsNumber: Number(form.nextDpsNumber), nextDpsNumberTest: Number(form.nextDpsNumberTest),
        rentalNfseFrom: form.rentalNfseFrom || null,
      })).data;
    },
    onSuccess: (data) => { if (data) onSaved(data); toast({ title: "Configuração fiscal salva", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível salvar", description: errorMessage(err), variant: "destructive" }),
  });
  const upload = useMutation({
    mutationFn: async () => {
      const data = new FormData();
      data.append("file", file!);
      data.append("password", password);
      return (await api.post<FiscalSettings>("fiscal/settings/certificate", data, { headers: { "Content-Type": "multipart/form-data" } })).data;
    },
    onSuccess: (data) => { onSaved(data); setFile(null); setPassword(""); if (fileRef.current) fileRef.current.value = ""; toast({ title: "Certificado guardado", description: data.certificateSubject ?? undefined, variant: "success" }); },
    onError: (err) => toast({ title: "Certificado não aceito", description: errorMessage(err), variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: async () => (await api.delete<FiscalSettings>("fiscal/settings/certificate")).data,
    onSuccess: (data) => { onSaved(data); toast({ title: "Certificado removido", variant: "success" }); },
    onError: (err) => toast({ title: "Não foi possível remover", description: errorMessage(err), variant: "destructive" }),
  });
  const test = useMutation({
    mutationFn: async () => (await api.post<{ ok: boolean; message: string }>("fiscal/settings/test")).data,
    onSuccess: (data) => toast({ title: data.ok ? "Conexão funcionando" : "Falha na conexão", description: data.message, variant: data.ok ? "success" : "destructive" }),
    onError: (err) => toast({ title: "Não foi possível testar", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can("view_nfse")) return null;
  const canConfig = can("config_fiscal");
  const serviceColumns: DataColumn<ServiceCode>[] = [
    { id: "name", header: "Serviço", className: "min-w-[200px]", cell: (s) => <span className="font-medium">{s.name}{s.isDefault && <TagBadge className="ml-2">padrão</TagBadge>}</span> },
    { id: "code", header: "Código nacional", className: "min-w-[260px]", cell: (s) => <div className="max-w-[26rem]"><p className="font-mono text-xs">{s.nationalCode}</p><p className="text-xs text-muted-foreground truncate">{s.nationalLabel}</p></div> },
    { id: "nbs", header: "NBS", cell: (s) => <span className="font-mono text-xs">{s.nbsCode ?? "—"}</span> },
    { id: "ibs", header: "IBS/CBS", cell: (s) => (s.ibsCbsClassTrib ? <span className="font-mono text-xs">{s.ibsCbsIndOp} · {s.ibsCbsClassTrib}</span> : <span className="text-xs text-muted-foreground">—</span>) },
    { id: "iss", header: "ISS", align: "right", cell: (s) => <span className="tabular-nums">{s.issRate !== null ? `${String(s.issRate).replace(".", ",")}%` : "—"}</span> },
    { id: "status", header: "Situação", cell: (s) => <StatusBadge tone={s.inactiveAt ? "neutral" : "success"} pulse={false}>{s.inactiveAt ? "Inativo" : "Ativo"}</StatusBadge> },
  ];

  return (
    <>
      <PageHeader title="Configuração fiscal" description="Emissão de NFS-e pelo padrão nacional (Emissor Público Nacional): certificado, dados de emissão e serviços." />
      {isLoading && <FormPageSkeleton />}
      {error && <p className="text-destructive">{errorMessage(error)}</p>}
      {settings && form && (
        <FormPageGrid aside={<>
          <section className="rounded-card border bg-card p-4 flex flex-col gap-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Situação</p>
            {settings.ready
              ? <p className="text-sm flex items-center gap-1.5 text-green-700 dark:text-green-400"><Icon name="circle-check" className="w-4 h-4" /> Pronto para emitir</p>
              : <ul className="list-disc pl-4 text-xs text-amber-800 dark:text-amber-200 flex flex-col gap-1">{settings.pending.map((p) => <li key={p}>{p}</li>)}</ul>}
            <div className="border-t pt-2 flex flex-col gap-2">
              <SummaryRow label="Empresa">{settings.emitter.name}</SummaryRow>
              <SummaryRow label="CNPJ">{formatDoc(settings.emitter.cnpj)}</SummaryRow>
              <SummaryRow label="Município">{settings.emitter.cityName ? `${settings.emitter.cityName}/${settings.emitter.uf}` : "—"}</SummaryRow>
              <SummaryRow label="Código IBGE">{settings.emitter.ibge ?? "não encontrado"}</SummaryRow>
              <SummaryRow label="Ambiente">{settings.environment === "producao" ? "Produção" : "Testes"}</SummaryRow>
            </div>
          </section>
          {canConfig && <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>Salvar configuração</Button>}
          {canConfig && settings.hasCertificate && <Button type="button" variant="outline" disabled={test.isPending} onClick={() => test.mutate()}><Icon name="plug-zap" className="w-4 h-4" /> Testar conexão</Button>}
        </>}>

          <FormSection title="Certificado digital (e-CNPJ A1)" description="O arquivo .pfx da empresa. Ele fica cifrado no servidor e nunca volta para a tela; serve para assinar e para entrar no ambiente nacional.">
            {settings.hasCertificate ? (
              <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
                <div className="min-w-0">
                  <p className="font-medium truncate">{settings.certificateSubject}</p>
                  <p className="text-xs text-muted-foreground">CNPJ {formatDoc(settings.certificateDocument)} · válido até {dateBr(settings.certificateValidTo)}
                    {settings.certificateDaysLeft !== null && <> · {settings.certificateDaysLeft < 0 ? "vencido" : `faltam ${settings.certificateDaysLeft} dias`}</>}</p>
                </div>
                {canConfig && (
                  <ConfirmDialog title="Remover o certificado?" description="Sem certificado não dá para emitir nem cancelar notas pelo sistema." onConfirm={() => remove.mutate()}>
                    <Button type="button" variant="ghost" size="sm" className="text-destructive">Remover</Button>
                  </ConfirmDialog>
                )}
              </div>
            ) : <p className="text-sm text-muted-foreground">Nenhum certificado enviado.</p>}
            {settings.certificateDaysLeft !== null && settings.certificateDaysLeft <= 30 && <p className="text-sm text-amber-700">O certificado vence em breve: providencie o novo para não parar a emissão.</p>}
            {canConfig && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="sm:col-span-2">
                  <Label>{settings.hasCertificate ? "Trocar o certificado" : "Arquivo do certificado"} (.pfx ou .p12)</Label>
                  <input ref={fileRef} type="file" accept=".pfx,.p12,application/x-pkcs12" className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
                </div>
                <div><Label>Senha do certificado</Label><Input name="certPassword" type="password" autoComplete="new-password" value={password} onValueChange={(_, v) => setPassword(String(v))} className="mt-1" /></div>
                <Button type="button" className="sm:col-span-3 sm:w-fit" disabled={!file || !password || upload.isPending} onClick={() => upload.mutate()}>
                  <Icon name="upload" className="w-4 h-4" /> Enviar certificado
                </Button>
              </div>
            )}
          </FormSection>

          <FormSection title="Dados de emissão" description="Como a empresa aparece para a prefeitura. Na dúvida, confirme com o contador.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label>Ambiente</Label>
                <Select name="environment" options={ENVIRONMENTS as never[]} state={form.environment} onChange={(_, v) => set("environment", pick(v))} disabled={!canConfig} modal />
                {form.environment === "producao" && settings.environment !== "producao" && <p className="text-xs text-amber-700 mt-1">Em produção as notas valem de verdade. Teste primeiro no ambiente de testes.</p>}
              </div>
              <div><Label>Situação no Simples Nacional</Label><Select name="simplesNacional" options={SIMPLES as never[]} state={form.simplesNacional} onChange={(_, v) => set("simplesNacional", pick(v))} disabled={!canConfig} modal /></div>
              {form.simplesNacional === "3" && <div><Label>Regime de apuração</Label><Select name="simplesRegime" options={SIMPLES_REGIME as never[]} state={form.simplesRegime} onChange={(_, v) => set("simplesRegime", pick(v))} disabled={!canConfig} modal /></div>}
              {form.simplesNacional === "3" && (
                <div>
                  <Label>% aproximado dos tributos (Simples)</Label>
                  <Input name="simplesTotalRate" value={form.simplesTotalRate} inputMode="decimal" placeholder="ex.: 6" onValueChange={(_, v) => set("simplesTotalRate", String(v))} disabled={!canConfig} className="mt-1" />
                  <p className="text-[11px] text-muted-foreground mt-0.5">Vai na nota (pTotTribSN). Use a alíquota efetiva do DAS.</p>
                </div>
              )}
              <div><Label>Regime especial de tributação</Label><Select name="specialRegime" options={SPECIAL as never[]} state={form.specialRegime} onChange={(_, v) => set("specialRegime", pick(v))} disabled={!canConfig} modal /></div>
              <div>
                <Label>Inscrição municipal</Label>
                <Input name="municipalRegistration" value={form.municipalRegistration} onValueChange={(_, v) => set("municipalRegistration", String(v))} disabled={!canConfig} className="mt-1" />
                <p className="text-[11px] text-muted-foreground mt-0.5">Só se o município exigir (cadastro complementar). Se a nota for rejeitada com E0120, deixe em branco.</p>
              </div>
              <div>
                <Label>CST do PIS/COFINS (quando o cliente retém)</Label>
                <Input name="pisCofinsCst" value={form.pisCofinsCst} maxLength={2} onValueChange={(_, v) => set("pisCofinsCst", String(v))} disabled={!canConfig} className="mt-1" />
              </div>
            </div>
          </FormSection>

          <FormSection title="Reforma tributária e locação" description="IBS/CBS na nota e a NFS-e de locação de bens móveis. Ligue depois de confirmar os códigos com o contador.">
            <label className="flex items-start gap-2 text-sm"><Checkbox className="mt-0.5" checked={form.ibsCbsEnabled} disabled={!canConfig} onCheckedChange={(v) => set("ibsCbsEnabled", v === true)} />
              <span>Informar o grupo IBS/CBS na nota<span className="block text-xs text-muted-foreground">Vai o indicador da operação e o cClassTrib de cada serviço fiscal; os valores são calculados pelo ambiente nacional. Em 2026 a nota sem o grupo não é rejeitada; para o Simples, as regras valem a partir de 01/01/2027.</span></span></label>
            <div className="max-w-xs">
              <Label>NFS-e de locação de bens móveis a partir de</Label>
              <CalendarPicker mode="natural" name="rentalNfseFrom" value={form.rentalNfseFrom || null} placeholder="ainda opcional" disabled={!canConfig} onValueChange={(_, v) => set("rentalNfseFrom", v ?? "")} className="mt-1" />
              <p className="text-[11px] text-muted-foreground mt-0.5">Prevista para 01/01/2027 no Simples (confirme com o contador). Antes disso, emitir nota da locação é opcional. Código 99.04.01.</p>
            </div>
          </FormSection>

          <FormSection title="Numeração (DPS)" description="Série própria do WorkSafe, diferente da que outro emissor usa (para os dois conviverem sem colidir). Sistema próprio usa série de 1 a 49999.">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div><Label>Série</Label><Input name="dpsSeries" value={form.dpsSeries} inputMode="numeric" onValueChange={(_, v) => set("dpsSeries", String(v))} disabled={!canConfig} className="mt-1" /></div>
              <div><Label>Próximo número (produção)</Label><Input name="nextDpsNumber" value={form.nextDpsNumber} inputMode="numeric" onValueChange={(_, v) => set("nextDpsNumber", String(v))} disabled={!canConfig} className="mt-1" /></div>
              <div><Label>Próximo número (testes)</Label><Input name="nextDpsNumberTest" value={form.nextDpsNumberTest} inputMode="numeric" onValueChange={(_, v) => set("nextDpsNumberTest", String(v))} disabled={!canConfig} className="mt-1" /></div>
            </div>
          </FormSection>

          <FormSection title="Envio e textos" description="O que acontece depois que a nota é autorizada.">
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.autoSendEmail} disabled={!canConfig} onCheckedChange={(v) => set("autoSendEmail", v === true)} /> Enviar o PDF e o XML ao contato fiscal do cliente automaticamente</label>
            <label className="flex items-start gap-2 text-sm"><Checkbox className="mt-0.5" checked={form.autoEmitTraining} disabled={!canConfig} onCheckedChange={(v) => set("autoEmitTraining", v === true)} />
              <span>Emitir sozinho a nota da inscrição paga em turma aberta<span className="block text-xs text-muted-foreground">Só para os pagamentos de depois de ligar. Inscrição com dado faltando fica como rascunho em Notas a emitir. Vaga paga por contrato tem a nota pelo contrato.</span></span></label>
            <div>
              <Label>Observações padrão da nota</Label>
              <Input type="textArea" name="defaultNotes" rows={3} value={form.defaultNotes} onValueChange={(_, v) => set("defaultNotes", String(v))} disabled={!canConfig} className="mt-1"
                placeholder="ex.: Valor líquido a pagar: {liquido}. Pedido {pedido}." />
              <p className="text-[11px] text-muted-foreground mt-0.5">Variáveis: {"{cliente}"}, {"{competencia}"}, {"{valor}"}, {"{liquido}"}, {"{pedido}"}, {"{referencia}"}.</p>
            </div>
          </FormSection>

          <FormSection title="Serviços fiscais" description="O que vai no campo serviço da nota: código de tributação nacional, NBS, alíquota e o texto padrão. Uma nota leva um serviço.">
            <DataTable rows={services} columns={serviceColumns} getRowId={(s) => s.id} ariaLabel="Serviços fiscais" minWidth={720} loading={loadingServices}
              onRowClick={canConfig ? (s) => navigate({ to: "/financeiro/fiscal/servicos/$serviceId", params: { serviceId: String(s.id) } }) : undefined}
              rowClassName={(s) => (s.inactiveAt ? "opacity-60" : undefined)}
              empty={<EmptyState title="Nenhum serviço fiscal." description="Cadastre os serviços que vocês faturam: treinamento, serviço em altura, locação..." />} />
            {canConfig && <Button type="button" variant="outline" className="w-fit" onClick={() => navigate({ to: "/financeiro/fiscal/servicos/novo" })}><Icon name="plus" className="w-4 h-4" /> Novo serviço fiscal</Button>}
          </FormSection>
        </FormPageGrid>
      )}
    </>
  );
}
