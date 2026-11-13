import { createFileRoute } from "@tanstack/react-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input as ShadInput } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import {
  COMMERCIAL_ABILITY, Computed, CostBase, CostBaseVersion, CostItem, CostParams, Defaults, KEYS,
  commercialApi, dateBr, decimal, errorMessage, money, newUid, percent, todayIso,
} from "../-shared/commercial";
import { BenefitsTab, DefaultsTab, HoursTab, ItemsTab } from "./-BaseTabs";
import ProfessionalsTab from "./-ProfessionalsTab";
import SimulatorTab from "./-SimulatorTab";
import TaxTab from "./-TaxTab";

export const Route = createFileRoute("/_authenticated/comercial/_base-calculo/base-calculo")({
  component: CostBasePage,
});

interface Draft { name: string; effectiveFrom: string; notes: string; params: CostParams; items: CostItem[]; defaults: Defaults }

const toDraft = (base: CostBase): Draft => ({
  name: base.name, effectiveFrom: base.effectiveFrom, notes: base.notes ?? "",
  params: { ...base.params, weeklyHours: base.weeklyHours },
  items: base.items.map((item) => ({ ...item, uid: newUid() })),
  defaults: base.defaults,
});
/** O que vai para a API (e o que conta para saber se há alteração): sem o id de tela. */
const payloadOf = (draft: Draft) => ({
  ...draft,
  items: draft.items.map((item) => { const copy: Partial<CostItem> = { ...item }; delete copy.uid; return copy; }),
});

function CostBasePage() {
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | "current">("current");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saved, setSaved] = useState("");
  const [computed, setComputed] = useState<Computed | null>(null);
  const [computeError, setComputeError] = useState("");
  const [newVersion, setNewVersion] = useState(false);
  const [tab, setTab] = useState("horas");
  const [recompute, setRecompute] = useState(0);

  const canUpdate = can(`update_${COMMERCIAL_ABILITY}`);
  const canCreate = can(`create_${COMMERCIAL_ABILITY}`);

  const { data: versions } = useQuery({ queryKey: [KEYS.versions], queryFn: () => commercialApi.get<CostBaseVersion[]>("cost-bases") });
  const { data: base, isLoading, error } = useQuery({
    queryKey: [KEYS.base, selectedId],
    queryFn: () => commercialApi.get<CostBase>(`cost-bases/${selectedId}`),
    // O rascunho nasce desta resposta: recarregar sozinho ao voltar para a aba apagaria o que está sendo editado.
    refetchOnWindowFocus: false, staleTime: Infinity,
  });

  // Carrega (ou recarrega, depois de salvar) a versão escolhida no rascunho.
  useEffect(() => {
    if (!base) return;
    const next = toDraft(base);
    setDraft(next);
    setSaved(JSON.stringify(payloadOf(next)));
    setComputed({ result: base.result, professionals: base.professionals, sensitivity: base.sensitivity });
    setComputeError("");
  }, [base]);

  const payload = useMemo(() => (draft ? payloadOf(draft) : null), [draft]);
  const serialized = useMemo(() => (payload ? JSON.stringify(payload) : ""), [payload]);
  const dirty = Boolean(draft) && serialized !== saved;
  const disabled = !canUpdate || Boolean(base?.inactiveAt);

  // Conta ao vivo: a API recalcula o rascunho (um motor só, nunca refeito na tela).
  const sequence = useRef(0);
  useEffect(() => {
    if (!payload || (!dirty && recompute === 0)) return;
    const ticket = ++sequence.current;
    const timer = setTimeout(async () => {
      try {
        const result = await commercialApi.post<Computed>("cost-bases/compute", { params: payload.params, items: payload.items });
        if (ticket === sequence.current) { setComputed(result); setComputeError(""); }
      } catch (err) {
        if (ticket === sequence.current) setComputeError(errorMessage(err));
      }
    }, 350);
    return () => clearTimeout(timer);
  // serialized cobre params e itens; recompute força depois de mexer em profissionais
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized, recompute]);

  // Avisa antes de sair com alterações não salvas.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const setParam = useCallback(<K extends keyof CostParams>(key: K, value: CostParams[K]) =>
    setDraft((prev) => (prev ? { ...prev, params: { ...prev.params, [key]: value } } : prev)), []);
  const setItems = useCallback((updater: (items: CostItem[]) => CostItem[]) =>
    setDraft((prev) => (prev ? { ...prev, items: updater(prev.items) } : prev)), []);
  const setDefaults = useCallback((updater: (defaults: Defaults) => Defaults) =>
    setDraft((prev) => (prev ? { ...prev, defaults: updater(prev.defaults) } : prev)), []);

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: [KEYS.versions] });
    queryClient.invalidateQueries({ queryKey: [KEYS.base] });
    queryClient.invalidateQueries({ queryKey: ["commercialSim"] });
    queryClient.invalidateQueries({ queryKey: [KEYS.tax] });
  };

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: () => commercialApi.put<CostBase>(`cost-bases/${base!.id}`, payload),
    onSuccess: (result) => {
      toast({ title: "Base de cálculo salva!", description: "Os valores sugeridos das próximas propostas já usam esta base.", variant: "success" });
      queryClient.setQueryData([KEYS.base, selectedId], result);
      refreshAll();
    },
    onError: (err) => toast({ title: "Não foi possível salvar", description: errorMessage(err), variant: "destructive" }),
  });

  const { mutate: setActive } = useMutation({
    mutationFn: (action: "inactive" | "active") => commercialApi.patch(`cost-bases/${action}/${base!.id}`),
    onSuccess: (_, action) => {
      toast({ title: action === "active" ? "Versão reativada!" : "Versão inativada!", variant: "success" });
      if (action === "inactive") setSelectedId("current");
      refreshAll();
    },
    onError: (err) => toast({ title: "Não foi possível concluir", description: errorMessage(err), variant: "destructive" }),
  });

  const selectVersion = (value: string) => {
    if (dirty && !window.confirm("Há alterações não salvas nesta versão. Trocar de versão descarta essas alterações. Continuar?")) return;
    setSelectedId(Number(value));
  };

  if (!can(`view_${COMMERCIAL_ABILITY}`)) return null;
  if (error) return <p className="p-4 text-destructive font-medium">Erro: {errorMessage(error)}</p>;
  if (isLoading || !draft || !base) return <div className="grid gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-24 w-full" /><Skeleton className="h-96 w-full" /></div>;

  const result = computed?.result;
  const currentVersion = versions?.find((v) => v.current);
  const tabProps = { params: draft.params, setParam, result, disabled };
  const itemProps = { items: draft.items, setItems, result, disabled, params: draft.params, setParam, sensitivity: computed?.sensitivity };

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Base de cálculo</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Transforma salário em custo hora e alimenta os valores sugeridos das propostas de serviço. É sugestão: na proposta, todo valor continua editável.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {dirty && <Button type="button" variant="ghost" onClick={() => { const next = toDraft(base); setDraft(next); setRecompute((n) => n + 1); }}>Descartar</Button>}
          {canUpdate && !base.inactiveAt && (
            <Button type="button" onClick={() => save()} disabled={!dirty || saving || Boolean(computeError)}>
              <Icon name="save" className="w-4 h-4 mr-1" /> {saving ? "Salvando..." : "Salvar alterações"}
            </Button>
          )}
        </div>
      </div>

      <section className="my-4 p-4 rounded-lg border grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <Label htmlFor="version" className="text-xs">Versão</Label>
            <select id="version" className="w-full h-9 rounded-md border bg-background px-2 text-sm mt-1" value={base.id} onChange={(event) => selectVersion(event.target.value)}>
              {(versions ?? [{ id: base.id, name: base.name, effectiveFrom: base.effectiveFrom, current: true, inactiveAt: null } as CostBaseVersion]).map((v) => (
                <option key={v.id} value={v.id}>{v.name} · desde {dateBr(v.effectiveFrom)}{v.current ? " · vigente" : ""}{v.inactiveAt ? " · inativa" : ""}</option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="versionName" className="text-xs">Nome da versão</Label>
            <ShadInput id="versionName" className="mt-1" value={draft.name} maxLength={120} disabled={disabled}
              onChange={(event) => setDraft((prev) => (prev ? { ...prev, name: event.target.value } : prev))} />
          </div>
          <div>
            <Label htmlFor="versionFrom" className="text-xs">Vale a partir de</Label>
            <ShadInput id="versionFrom" type="date" className="mt-1" value={draft.effectiveFrom} disabled={disabled}
              onChange={(event) => setDraft((prev) => (prev ? { ...prev, effectiveFrom: event.target.value } : prev))} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canCreate && <Button type="button" variant="outline" onClick={() => setNewVersion(true)}><Icon name="copy-plus" className="w-4 h-4 mr-1" /> Nova versão</Button>}
          {can(`inactive_${COMMERCIAL_ABILITY}`) && !base.inactiveAt && (versions?.filter((v) => !v.inactiveAt).length ?? 0) > 1 && (
            <ConfirmDialog title={`Inativar a versão "${base.name}"?`} description="Os cálculos passam a usar a versão anterior vigente na data." onConfirm={() => setActive("inactive")}>
              <Button type="button" variant="ghost">Inativar</Button>
            </ConfirmDialog>
          )}
          {can(`activate_${COMMERCIAL_ABILITY}`) && base.inactiveAt && <Button type="button" variant="outline" onClick={() => setActive("active")}>Reativar</Button>}
        </div>
        {currentVersion && currentVersion.id !== base.id && !base.inactiveAt && (
          <p className="lg:col-span-2 text-xs text-muted-foreground">
            Esta não é a versão em uso hoje (a vigente é "{currentVersion.name}"). Ela {base.effectiveFrom > todayIso() ? `passa a valer em ${dateBr(base.effectiveFrom)}` : "foi substituída por uma mais recente"}.
          </p>
        )}
      </section>

      <div className={cn("grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4", computeError && "opacity-50")} aria-live="polite">
        <Stat letter="A" label="Horas úteis por mês" value={decimal(result?.A)} />
        <Stat letter="B" label="Encargos" value={percent(result?.B)} />
        <Stat letter="C" label="Benefícios por hora" value={money(result?.C)} />
        <Stat letter="D" label="Pessoal indireto por hora" value={money(result?.D)} />
        <Stat letter="E" label="Outros custos por hora" value={money(result?.E)} />
        <Stat letter="C+D+E" label="Somado a toda hora vendida" value={money(result?.overheadPerHour)} strong />
      </div>
      {computeError && <p className="mb-4 text-sm rounded-md border border-destructive text-destructive px-3 py-2">Não dá para calcular: {computeError}. Corrija para salvar.</p>}

      <Tabs value={tab} onValueChange={setTab}>
        <div className="overflow-x-auto pb-1">
          <TabsList className="w-max">
            <TabsTrigger value="horas">Horas produtivas</TabsTrigger>
            <TabsTrigger value="encargos">Encargos</TabsTrigger>
            <TabsTrigger value="beneficios">Benefícios</TabsTrigger>
            <TabsTrigger value="indireto">Pessoal indireto</TabsTrigger>
            <TabsTrigger value="outros">Outros custos</TabsTrigger>
            <TabsTrigger value="profissionais">Profissionais</TabsTrigger>
            <TabsTrigger value="imposto">Imposto</TabsTrigger>
            <TabsTrigger value="padroes">Padrões</TabsTrigger>
            <TabsTrigger value="simulador">Simulador</TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="horas" className="mt-4"><HoursTab {...tabProps} /></TabsContent>
        <TabsContent value="encargos" className="mt-4"><ItemsTab group="encargo" {...itemProps} /></TabsContent>
        <TabsContent value="beneficios" className="mt-4"><BenefitsTab {...tabProps} /></TabsContent>
        <TabsContent value="indireto" className="mt-4"><ItemsTab group="pessoal_indireto" {...itemProps} /></TabsContent>
        <TabsContent value="outros" className="mt-4"><ItemsTab group="outro_custo" {...itemProps} /></TabsContent>
        <TabsContent value="profissionais" className="mt-4">
          <ProfessionalsTab professionals={computed?.professionals ?? []} canCreate={canCreate} canUpdate={canUpdate}
            canInactivate={can(`inactive_${COMMERCIAL_ABILITY}`)}
            onChanged={() => { setRecompute((n) => n + 1); queryClient.invalidateQueries({ queryKey: ["commercialSim"] }); }} />
        </TabsContent>
        <TabsContent value="imposto" className="mt-4">
          <TaxTab canCreate={canCreate} canUpdate={canUpdate} canInactivate={can(`inactive_${COMMERCIAL_ABILITY}`)} canActivate={can(`activate_${COMMERCIAL_ABILITY}`)} />
        </TabsContent>
        <TabsContent value="padroes" className="mt-4"><DefaultsTab defaults={draft.defaults} setDefaults={setDefaults} disabled={disabled} /></TabsContent>
        <TabsContent value="simulador" className="mt-4">
          <SimulatorTab professionals={computed?.professionals ?? []} versions={versions ?? []} defaults={draft.defaults} headcount={base.params.headcount} dirty={dirty} />
        </TabsContent>
      </Tabs>

      {newVersion && (
        <NewVersionDialog source={base} onClose={() => setNewVersion(false)}
          onCreated={(created) => { setSelectedId(created.id); refreshAll(); }} />
      )}
    </>
  );
}

function Stat({ letter, label, value, strong }: { letter: string; label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("rounded-lg border px-3 py-2", strong && "bg-primary text-inverse-foreground border-primary")}>
      <p className={cn("text-xs", strong ? "opacity-90" : "text-muted-foreground")}><b>{letter}</b> · {label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/** Copia a versão aberta com uma nova data de vigência (ex.: jornada de 40 h). */
function NewVersionDialog({ source, onClose, onCreated }: { source: CostBase; onClose: () => void; onCreated: (base: CostBase) => void }) {
  const [name, setName] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(todayIso());
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => commercialApi.post<CostBase>("cost-bases", { name, effectiveFrom, sourceId: source.id }),
    onSuccess: (created) => { toast({ title: "Versão criada!", description: "Ajuste os valores e salve.", variant: "success" }); onCreated(created); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (name.trim().length < 2) return setError("Informe o nome da versão");
    if (!effectiveFrom) return setError("Informe a data de vigência");
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova versão da base</DialogTitle>
          <DialogDescription>
            Copia "{source.name}" (como está salva). A versão nova passa a ser usada sozinha a partir da data; antes dela, vale a anterior.
          </DialogDescription>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={submit}>
          <div><Label htmlFor="newName">Nome <span>*</span></Label>
            <ShadInput id="newName" className="mt-1" value={name} maxLength={120} autoFocus placeholder="Ex.: Jornada de 40 h" onChange={(event) => setName(event.target.value)} /></div>
          <div><Label htmlFor="newFrom">Vale a partir de <span>*</span></Label>
            <ShadInput id="newFrom" type="date" className="mt-1" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} /></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>Criar versão</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
