import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { FormPageGrid, FormSection, SummaryRow } from "@/components/general-components/FormPage";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { errorMessage } from "../../../comercial/-shared/commercial";
import { FISCAL_KEYS, ServiceCode } from "../../_notas/-shared/fiscal";

const TAXATION = [{ id: "1", name: "Tributável no município" }, { id: "2", name: "Imunidade" }, { id: "3", name: "Exportação de serviço" }, { id: "4", name: "Não incidência" }];
const pick = (v: string | string[]) => String(Array.isArray(v) ? v[0] ?? "" : v);

/** Busca na tabela oficial (lista nacional de serviços ou NBS) com resultado clicável. */
function CatalogSearch({ kind, value, label, onPick }: { kind: "services" | "nbs"; value: string; label: string | null; onPick: (code: string, label: string) => void }) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  useEffect(() => { const t = setTimeout(() => setDebounced(q), 300); return () => clearTimeout(t); }, [q]);
  const { data, isFetching } = useQuery({
    queryKey: ["fiscalCatalog", kind, debounced],
    queryFn: async () => (await api.get<Array<{ code: string; item?: string; description: string }>>(`fiscal/catalog/${kind}`, { params: { q: debounced } })).data,
    enabled: debounced.length >= 2,
  });
  return (
    <div className="flex flex-col gap-2">
      {value && <p className="text-sm rounded-lg border bg-muted/40 px-3 py-2"><span className="font-mono">{value}</span>{label ? ` — ${label}` : ""}</p>}
      <Input name={`search-${kind}`} value={q} placeholder={kind === "services" ? "Busque pelo código (0802) ou pela descrição (treinamento)" : "Busque pela descrição ou pelo código"} onValueChange={(_, v) => setQ(String(v))} icon="search" />
      {debounced.length >= 2 && (
        <div className="max-h-64 overflow-auto rounded-lg border divide-y">
          {isFetching && <p className="p-2 text-xs text-muted-foreground">buscando…</p>}
          {(data ?? []).map((row) => (
            <button key={row.code} type="button" className={cn("w-full text-left px-3 py-2 text-sm hover:bg-muted", row.code === value && "bg-primary-soft")}
              onClick={() => { onPick(row.code, row.description); setQ(""); }}>
              <span className="font-mono text-xs mr-2">{row.code}</span>{row.item ? <span className="text-xs text-muted-foreground mr-1">({row.item})</span> : null}{row.description}
            </button>
          ))}
          {data && data.length === 0 && <p className="p-2 text-xs text-muted-foreground">Nada encontrado.</p>}
        </div>
      )}
    </div>
  );
}

/** Cadastro do serviço fiscal (código nacional, NBS, ISS, texto padrão). */
export default function ServiceCodeForm({ service }: { service: ServiceCode | null }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [state, setState] = useState({
    name: service?.name ?? "",
    nationalCode: service?.nationalCode ?? "",
    nationalLabel: service?.nationalLabel ?? null,
    nbsCode: service?.nbsCode ?? "",
    nbsLabel: service?.nbsLabel ?? null,
    municipalCode: service?.municipalCode ?? "",
    issRate: service?.issRate !== null && service?.issRate !== undefined ? String(service.issRate) : "",
    issTaxation: String(service?.issTaxation ?? 1),
    description: service?.description ?? "",
    isDefault: service?.isDefault ?? false,
    active: !service?.inactiveAt,
  });
  const set = (key: keyof typeof state, value: unknown) => setState((prev) => ({ ...prev, [key]: value }));

  const save = useMutation({
    mutationFn: async () => {
      const body = {
        name: state.name, nationalCode: state.nationalCode, nbsCode: state.nbsCode || null, municipalCode: state.municipalCode || null,
        issRate: state.issRate === "" ? null : Number(state.issRate.replace(",", ".")), issTaxation: Number(state.issTaxation), description: state.description, isDefault: state.isDefault,
        ...(service ? { active: state.active } : {}),
      };
      return service ? (await api.put<ServiceCode>(`fiscal/service-codes/${service.id}`, body)).data : (await api.post<ServiceCode>("fiscal/service-codes", body)).data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FISCAL_KEYS.services] });
      queryClient.invalidateQueries({ queryKey: [FISCAL_KEYS.settings] });
      toast({ title: "Serviço fiscal salvo", variant: "success" });
      navigate({ to: "/financeiro/fiscal" });
    },
    onError: (err) => toast({ title: "Não foi possível salvar", description: errorMessage(err), variant: "destructive" }),
  });

  return (
    <FormPageGrid aside={<>
      <section className="rounded-card border bg-card p-4 flex flex-col gap-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">Resumo</p>
        <SummaryRow label="Nome">{state.name || "—"}</SummaryRow>
        <SummaryRow label="Código nacional">{state.nationalCode || "—"}</SummaryRow>
        <SummaryRow label="NBS">{state.nbsCode || "—"}</SummaryRow>
        <SummaryRow label="ISS">{state.issRate ? `${state.issRate}%` : "—"}</SummaryRow>
      </section>
      <Button type="button" disabled={save.isPending || !state.name || !state.nationalCode || !state.description} onClick={() => save.mutate()}>{service ? "Salvar alterações" : "Cadastrar serviço"}</Button>
      <Button type="button" variant="outline" onClick={() => navigate({ to: "/financeiro/fiscal" })}>Cancelar</Button>
    </>}>
      <FormSection title="Identificação" description="O nome é só para a equipe escolher na hora de emitir.">
        <div><Label>Nome <span>*</span></Label><Input name="name" value={state.name} placeholder="ex.: Treinamento NR-35" onValueChange={(_, v) => set("name", String(v))} className="mt-1" /></div>
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={state.isDefault} onCheckedChange={(v) => set("isDefault", v === true)} /> Serviço padrão (vem escolhido na nota nova)</label>
        {service && <label className="flex items-center gap-2 text-sm"><Checkbox checked={state.active} onCheckedChange={(v) => set("active", v === true)} /> Ativo</label>}
      </FormSection>

      <FormSection title="Código de tributação nacional" description="Da lista nacional de serviços (LC 116). Confirme com o contador qual código cada serviço usa.">
        <CatalogSearch kind="services" value={state.nationalCode} label={state.nationalLabel} onPick={(code, label) => setState((prev) => ({ ...prev, nationalCode: code, nationalLabel: label }))} />
      </FormSection>

      <FormSection title="NBS (opcional)" description="Nomenclatura Brasileira de Serviços. Passa a ser exigida com o IBS/CBS.">
        <CatalogSearch kind="nbs" value={state.nbsCode} label={state.nbsLabel} onPick={(code, label) => setState((prev) => ({ ...prev, nbsCode: code, nbsLabel: label }))} />
        {state.nbsCode && <Button type="button" variant="link" size="sm" className="px-0 h-auto w-fit" onClick={() => setState((prev) => ({ ...prev, nbsCode: "", nbsLabel: null }))}>Tirar o NBS</Button>}
      </FormSection>

      <FormSection title="Tributação do ISS">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><Label>Tributação</Label><Select name="issTaxation" options={TAXATION as never[]} state={state.issTaxation} onChange={(_, v) => set("issTaxation", pick(v))} modal /></div>
          <div><Label>Alíquota do ISS (%)</Label><Input name="issRate" value={state.issRate} inputMode="decimal" placeholder="ex.: 5" onValueChange={(_, v) => set("issRate", String(v))} className="mt-1" /></div>
          <div><Label>Código municipal (opcional)</Label><Input name="municipalCode" value={state.municipalCode} onValueChange={(_, v) => set("municipalCode", String(v))} className="mt-1" /></div>
        </div>
        <p className="text-xs text-muted-foreground">No Simples, a alíquota só vai na nota quando o cliente retém o ISS; mesmo assim deixe aqui a alíquota do município.</p>
      </FormSection>

      <FormSection title="Texto padrão da discriminação" description="Vira a descrição do serviço na nota; dá para editar em cada nota.">
        <Input type="textArea" name="description" rows={4} value={state.description} onValueChange={(_, v) => set("description", String(v))}
          placeholder="ex.: Treinamento de trabalho em altura (NR-35) para {cliente}, competência {competencia}." />
        <p className="text-[11px] text-muted-foreground">Variáveis: {"{cliente}"}, {"{competencia}"}, {"{valor}"}, {"{liquido}"}, {"{pedido}"}, {"{referencia}"}.</p>
      </FormSection>
    </FormPageGrid>
  );
}
