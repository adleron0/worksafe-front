import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input as ShadInput } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import {
  KEYS, NumField, PreviewResult, PriceRun, TaxBracket, TaxProfile, commercialApi, dateBr, errorMessage, money, percent, todayIso,
} from "../-shared/commercial";

const REGIME_LABEL = { tradicional: "Simples tradicional", hibrido: "Simples híbrido" } as const;
const MODE_LABEL = { nominal: "Nominal da faixa", efetiva: "Efetiva", manual: "Manual" } as const;

interface Props { canCreate: boolean; canUpdate: boolean; canInactivate: boolean; canActivate: boolean }

/** Perfis tributários com vigência e a chave tradicional ⟷ híbrido. */
export default function TaxTab({ canCreate, canUpdate, canInactivate, canActivate }: Props) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<{ profile?: TaxProfile } | null>(null);
  const [sample, setSample] = useState({ cost: 10000, margin: 0.26 });

  const { data: profiles, isLoading } = useQuery({ queryKey: [KEYS.tax], queryFn: () => commercialApi.get<TaxProfile[]>("tax-profiles") });
  const refresh = () => queryClient.invalidateQueries({ queryKey: [KEYS.tax] });
  const active = (profiles ?? []).filter((p) => !p.inactiveAt);
  const regime = active.find((p) => p.isDefault)?.regime ?? "tradicional";

  const { data: comparison, isFetching: comparing, error: compareError } = useQuery({
    queryKey: [KEYS.tax, "compare", sample, profiles?.map((p) => [p.id, p.tax, p.isDefault, p.inactiveAt])],
    enabled: Boolean(profiles?.length) && sample.cost > 0,
    queryFn: () => commercialApi.post<PreviewResult>("pricing/preview", {
      compare: true,
      input: { contingencyRate: 0, sections: [{ margin: sample.margin, items: [{ type: "avulso", quantity: 1, unitCost: sample.cost }] }] },
    }),
    retry: false,
  });

  const { mutate: makeDefault, isPending: switching } = useMutation({
    mutationFn: (profile: TaxProfile) => commercialApi.patch<TaxProfile[]>(`tax-profiles/default/${profile.id}`),
    onSuccess: (_, profile) => { toast({ title: `Padrão agora: ${REGIME_LABEL[profile.regime]}`, description: "Vale para cálculos novos. Propostas já enviadas não mudam.", variant: "success" }); refresh(); },
    onError: (error) => toast({ title: "Não foi possível trocar", description: errorMessage(error), variant: "destructive" }),
  });
  const { mutate: setActive } = useMutation({
    mutationFn: ({ profile, action }: { profile: TaxProfile; action: "inactive" | "active" }) => commercialApi.patch(`tax-profiles/${action}/${profile.id}`),
    onSuccess: (_, { action }) => { toast({ title: action === "active" ? "Perfil reativado!" : "Perfil inativado!", variant: "success" }); refresh(); },
    onError: (error) => toast({ title: "Não foi possível concluir", description: errorMessage(error), variant: "destructive" }),
  });

  /** A chave aponta para o perfil vigente do regime escolhido. */
  const switchTo = (target: "tradicional" | "hibrido") => {
    if (target === regime || switching) return;
    const today = todayIso();
    const pool = active.filter((p) => p.regime === target).sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
    const profile = pool.find((p) => p.effectiveFrom <= today) ?? pool[pool.length - 1];
    if (!profile) return toast({ title: `Nenhum perfil de ${REGIME_LABEL[target]} ativo`, description: "Cadastre ou reative um perfil desse regime.", variant: "destructive" });
    makeDefault(profile);
  };

  const modeOf = (run: PriceRun) => profiles?.find((p) => p.id === run.taxProfile.id)?.mode;

  if (isLoading) return <Skeleton className="h-64 w-full" />;

  return (
    <div className="grid gap-4">
      <section className="rounded-lg border p-4">
        <h3 className="font-semibold">Regime usado nos cálculos</h3>
        <p className="text-xs text-muted-foreground">Define o padrão para propostas novas. Trocar não altera o que já foi enviado.</p>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex rounded-md border overflow-hidden w-fit" role="radiogroup" aria-label="Regime tributário">
            {(["tradicional", "hibrido"] as const).map((value) => (
              <button key={value} type="button" role="radio" aria-checked={regime === value} disabled={!canUpdate || switching}
                onClick={() => switchTo(value)}
                className={cn("px-4 py-2 text-sm font-medium disabled:cursor-not-allowed", regime === value ? "bg-primary text-inverse-foreground" : "hover:bg-muted")}>
                {REGIME_LABEL[value]}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Tradicional: todo o imposto dentro do DAS, embutido no preço. Híbrido: IBS e CBS saem do DAS e aparecem destacados, por fora.
          </p>
        </div>
      </section>

      <section className="rounded-lg border p-4">
        <h3 className="font-semibold">Comparação lado a lado</h3>
        <p className="text-xs text-muted-foreground">O mesmo custo e a mesma margem nos dois regimes. A conversa com o comprador é sobre a última linha.</p>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <div><Label htmlFor="sampleCost" className="text-xs">Custo do serviço</Label>
            <NumField id="sampleCost" kind="money" className="w-40 mt-1" value={sample.cost} onChange={(cost) => setSample((s) => ({ ...s, cost }))} /></div>
          <div><Label htmlFor="sampleMargin" className="text-xs">Margem</Label>
            <NumField id="sampleMargin" kind="percent" className="w-28 mt-1" value={sample.margin} onChange={(margin) => setSample((s) => ({ ...s, margin }))} /></div>
        </div>
        {compareError && <p className="mt-3 text-sm text-destructive">{errorMessage(compareError)}</p>}
        {comparison?.compare && (
          <div className={cn("mt-3 overflow-x-auto", comparing && "opacity-60")}>
            <table className="w-full text-sm min-w-[480px]">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left font-medium py-2" />
                  {(["tradicional", "hibrido"] as const).map((key) => (
                    <th key={key} className={cn("text-right font-medium", regime === key && "text-foreground")}>
                      {REGIME_LABEL[key]}{regime === key && " (em uso)"}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="tabular-nums">
                {compareRows.map(([label, pick, strong]) => (
                  <tr key={label} className={cn("border-b last:border-b-0", strong && "font-semibold")}>
                    <td className="py-1.5">{label}</td>
                    <td className="text-right">{pick(comparison.compare!.tradicional)}</td>
                    <td className="text-right">{pick(comparison.compare!.hibrido)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {comparison?.compare && modeOf(comparison.compare.tradicional) !== modeOf(comparison.compare.hibrido) && (
          <p className="mt-3 text-xs text-muted-foreground">
            Atenção: os dois perfis usam tipos de alíquota diferentes ({MODE_LABEL[modeOf(comparison.compare.tradicional)!].toLowerCase()} × {MODE_LABEL[modeOf(comparison.compare.hibrido)!].toLowerCase()}).
            Parte da diferença de preço vem disso, não do regime.
          </p>
        )}
        <p className="mt-3 text-xs rounded-md bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200 px-3 py-2">
          A parte do DAS que é IBS/CBS e a alíquota por fora foram carregadas com valores de exemplo. Confirme os números reais com a contabilidade antes de decidir.
        </p>
      </section>

      <section className="rounded-lg border p-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold">Perfis tributários</h3>
            <p className="text-xs text-muted-foreground">Cada perfil vale a partir da sua data. Quando a regra mudar, cadastre um perfil novo com a data: nada de código.</p>
          </div>
          {canCreate && <Button type="button" size="sm" onClick={() => setForm({})}><Icon name="plus" className="w-4 h-4 mr-1" /> Novo perfil</Button>}
        </div>
        <div className="mt-3 grid md:grid-cols-2 gap-3">
          {(profiles ?? []).map((profile) => (
            <article key={profile.id} className={cn("rounded-md border p-3 text-sm", profile.inactiveAt && "opacity-60", profile.current && "border-primary")}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{profile.name}</p>
                  <p className="text-xs text-muted-foreground">{REGIME_LABEL[profile.regime]} · a partir de {dateBr(profile.effectiveFrom)}</p>
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {profile.current && <span className="text-xs rounded bg-primary text-inverse-foreground px-1.5 py-0.5">Em uso</span>}
                  {profile.inactiveAt && <span className="text-xs rounded bg-muted px-1.5 py-0.5">Inativo</span>}
                </div>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 tabular-nums">
                <dt className="text-muted-foreground">Alíquota em uso</dt><dd className="text-right">{percent(profile.tax.das)} ({MODE_LABEL[profile.mode].toLowerCase()})</dd>
                <dt className="text-muted-foreground">Nominal · efetiva</dt><dd className="text-right">{percent(profile.tax.nominal)} · {percent(profile.tax.effective)}</dd>
                <dt className="text-muted-foreground">Por dentro do preço</dt><dd className="text-right font-medium">{percent(profile.tax.inside)}</dd>
                <dt className="text-muted-foreground">Por fora (destacado)</dt><dd className="text-right font-medium">{percent(profile.tax.outside)}</dd>
              </dl>
              {profile.notes && <p className="mt-2 text-xs text-muted-foreground">{profile.notes}</p>}
              <div className="mt-2 flex gap-1">
                {canUpdate && !profile.inactiveAt && <Button type="button" variant="outline" size="sm" onClick={() => setForm({ profile })}><Icon name="pencil" className="w-3 h-3 mr-1" /> Editar</Button>}
                {canInactivate && !profile.inactiveAt && !profile.isDefault && (
                  <ConfirmDialog title={`Inativar ${profile.name}?`} description="Deixa de ser usado em cálculos novos." onConfirm={() => setActive({ profile, action: "inactive" })}>
                    <Button type="button" variant="ghost" size="sm">Inativar</Button>
                  </ConfirmDialog>
                )}
                {canActivate && profile.inactiveAt && <Button type="button" variant="ghost" size="sm" onClick={() => setActive({ profile, action: "active" })}>Reativar</Button>}
              </div>
            </article>
          ))}
        </div>
      </section>

      {form && <TaxProfileDialog profile={form.profile} onClose={() => setForm(null)} onSaved={refresh} />}
    </div>
  );
}

const compareRows: Array<[string, (run: PriceRun) => string, boolean?]> = [
  ["Tributo por dentro", (run) => percent(run.tax.inside)],
  ["Tributo por fora", (run) => (run.tax.outside ? percent(run.tax.outside) : "—")],
  ["Preço líquido", (run) => money(run.totals.net)],
  ["Preço na nota", (run) => money(run.totals.total), true],
  ["Crédito que o cliente toma", (run) => money(run.totals.customerCredit)],
  ["Custo real para o cliente", (run) => money(run.totals.customerCost), true],
  ["Margem", (run) => percent(run.totals.profitRate)],
];

function TaxProfileDialog({ profile, onClose, onSaved }: { profile?: TaxProfile; onClose: () => void; onSaved: () => void }) {
  const [state, setState] = useState({
    name: profile?.name ?? "", regime: profile?.regime ?? "tradicional", effectiveFrom: profile?.effectiveFrom ?? todayIso(),
    mode: profile?.mode ?? "efetiva", rbt12: profile?.rbt12 ?? 0, manualRate: profile?.manualRate ?? 0,
    ibsCbsShare: profile?.ibsCbsShare ?? 0, outsideRate: profile?.outsideRate ?? 0, notes: profile?.notes ?? "",
  });
  const [brackets, setBrackets] = useState<TaxBracket[]>(profile?.brackets ?? []);
  const [error, setError] = useState("");
  const set = <K extends keyof typeof state>(key: K, value: (typeof state)[K]) => setState((prev) => ({ ...prev, [key]: value }));

  const { mutate, isPending } = useMutation({
    mutationFn: () => {
      const body = { ...state, manualRate: state.mode === "manual" ? state.manualRate : null, brackets };
      return profile ? commercialApi.put(`tax-profiles/${profile.id}`, body) : commercialApi.post("tax-profiles", body);
    },
    onSuccess: () => { toast({ title: profile ? "Perfil atualizado!" : "Perfil criado!", variant: "success" }); onSaved(); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const selectClass = "w-full h-9 rounded-md border bg-background px-2 text-sm mt-1";

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{profile ? `Editar ${profile.name}` : "Novo perfil tributário"}</DialogTitle>
          <DialogDescription>Percentuais de lei mudam: confirme cada valor com a contabilidade.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => {
          event.preventDefault();
          if (state.name.trim().length < 2) return setError("Informe o nome do perfil");
          setError(""); mutate();
        }}>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2"><Label htmlFor="taxName">Nome <span>*</span></Label>
              <ShadInput id="taxName" className="mt-1" value={state.name} maxLength={120} onChange={(event) => set("name", event.target.value)} /></div>
            <div><Label htmlFor="taxRegime">Regime</Label>
              <select id="taxRegime" className={selectClass} value={state.regime} onChange={(event) => set("regime", event.target.value as TaxProfile["regime"])}>
                <option value="tradicional">Simples tradicional (tudo no DAS)</option>
                <option value="hibrido">Simples híbrido (IBS/CBS por fora)</option>
              </select></div>
            <div><Label htmlFor="taxFrom">Vale a partir de</Label>
              <ShadInput id="taxFrom" type="date" className="mt-1" value={state.effectiveFrom} onChange={(event) => set("effectiveFrom", event.target.value)} /></div>
            <div><Label htmlFor="taxMode">Alíquota usada no preço</Label>
              <select id="taxMode" className={selectClass} value={state.mode} onChange={(event) => set("mode", event.target.value as TaxProfile["mode"])}>
                <option value="nominal">Nominal da faixa (como a planilha)</option>
                <option value="efetiva">Efetiva (desconta a parcela a deduzir)</option>
                <option value="manual">Manual</option>
              </select></div>
            {state.mode === "manual"
              ? <div><Label htmlFor="taxManual">Alíquota manual</Label><NumField id="taxManual" kind="percent" className="mt-1" value={state.manualRate} onChange={(value) => set("manualRate", value)} /></div>
              : <div><Label htmlFor="taxRbt">Receita bruta dos últimos 12 meses (RBT12)</Label><NumField id="taxRbt" kind="money" className="mt-1" value={state.rbt12} onChange={(value) => set("rbt12", value)} /></div>}
            <div><Label htmlFor="taxShare">Parte do DAS que é IBS/CBS</Label>
              <NumField id="taxShare" kind="percent" className="mt-1" value={state.ibsCbsShare} onChange={(value) => set("ibsCbsShare", value)} />
              <p className="text-xs text-muted-foreground mt-1">Sai da guia no híbrido; no tradicional é o crédito que o cliente toma.</p></div>
            <div><Label htmlFor="taxOutside">CBS + IBS por fora</Label>
              <NumField id="taxOutside" kind="percent" className="mt-1" value={state.outsideRate} onChange={(value) => set("outsideRate", value)} disabled={state.regime !== "hibrido"} />
              <p className="text-xs text-muted-foreground mt-1">Só no híbrido: somado ao preço líquido e destacado na nota.</p></div>
          </div>

          {state.mode !== "manual" && (
            <div>
              <Label>Faixas (limite de receita, alíquota nominal, parcela a deduzir)</Label>
              <div className="mt-1 grid gap-1">
                {brackets.map((bracket, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <NumField kind="money" className="flex-1" ariaLabel={`Limite da faixa ${index + 1}`} value={bracket.limit}
                      onChange={(limit) => setBrackets((list) => list.map((b, i) => (i === index ? { ...b, limit } : b)))} />
                    <NumField kind="percent" className="w-28" ariaLabel={`Alíquota da faixa ${index + 1}`} value={bracket.rate}
                      onChange={(rate) => setBrackets((list) => list.map((b, i) => (i === index ? { ...b, rate } : b)))} />
                    <NumField kind="money" className="flex-1" ariaLabel={`Parcela a deduzir da faixa ${index + 1}`} value={bracket.deduction}
                      onChange={(deduction) => setBrackets((list) => list.map((b, i) => (i === index ? { ...b, deduction } : b)))} />
                    <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0" aria-label={`Remover faixa ${index + 1}`}
                      onClick={() => setBrackets((list) => list.filter((_, i) => i !== index))}><Icon name="trash-2" className="w-4 h-4" /></Button>
                  </div>
                ))}
              </div>
              <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setBrackets((list) => [...list, { limit: 0, rate: 0, deduction: 0 }])}>
                <Icon name="plus" className="w-4 h-4 mr-1" /> Adicionar faixa
              </Button>
            </div>
          )}

          <div><Label htmlFor="taxNotes">Observações</Label>
            <ShadInput id="taxNotes" className="mt-1" value={state.notes} maxLength={500} onChange={(event) => set("notes", event.target.value)} /></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{profile ? "Salvar" : "Criar perfil"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
