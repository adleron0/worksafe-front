import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";
import ConfirmDialog from "@/components/general-components/ConfirmDialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { NumField, dateBr, errorMessage, money } from "../../comercial/-shared/commercial";
import { PURCHASE_STATUS_LABEL, PurchaseStatus } from "../-shared/purchases";
import {
  DueBadge, HOLDER_LABEL, ItemDetail, ItemPurchase, KardexRow, PRESET_OPTIONS, Pill, STOCK_ABILITY, STOCK_KEYS, TRACKING_LABEL, TRACKING_OPTIONS, Tracking, qty, stockApi, toOptions, useStockOptions,
} from "../-shared/stock";
import { MovementDetailDialog } from "../-shared/stock-movements";
import { RecordFilesPanel } from "../../arquivos/-shared/record-files";
import { DueStateBadge, EQUIP_KEYS, PrintLabelsDialog, UnitRow, UnitStatusBadge } from "../-shared/equipment";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/suprimentos/estoque/itens_/$itemId")({
  component: ItemPage,
});

type N = number | null;
interface Draft {
  name: string; code: string; categoryId: string; unit: string; description: string; manufacturer: string; model: string; notes: string;
  tracking: Tracking; returnable: boolean; minQuantity: N; reorderQuantity: N; purchaseUnit: string; purchaseFactor: N;
  requiresInspection: boolean; inspectionIntervalDays: N; inspectionBeforeUse: boolean;
  hasLife: boolean; lifeMonths: N; lifeFrom: string; warnDays: N;
  requiresCalibration: boolean; calibrationIntervalMonths: N;
  isPpe: boolean; caNumber: string; caExpiry: string; replaceEveryDays: N;
  rentable: boolean; rentDaily: N; rentWeekly: N; rentMonthly: N; replacementValue: N;
}
const draftOf = (item?: ItemDetail): Draft => ({
  name: item?.name ?? "", code: item?.code ?? "", categoryId: item?.categoryId ? String(item.categoryId) : "", unit: item?.unit ?? "un",
  description: item?.description ?? "", manufacturer: item?.manufacturer ?? "", model: item?.model ?? "", notes: item?.notes ?? "",
  tracking: item?.tracking ?? "quantidade", returnable: item?.returnable ?? false, minQuantity: item?.minQuantity ?? null, reorderQuantity: item?.reorderQuantity ?? null,
  purchaseUnit: item?.purchaseUnit ?? "", purchaseFactor: item?.purchaseFactor ?? null,
  requiresInspection: item?.requiresInspection ?? false, inspectionIntervalDays: item?.inspectionIntervalDays ?? null, inspectionBeforeUse: item?.inspectionBeforeUse ?? false,
  hasLife: item?.lifeMonths != null, lifeMonths: item?.lifeMonths ?? null, lifeFrom: item?.lifeFrom ?? "fabricacao", warnDays: item?.warnDays ?? 30,
  requiresCalibration: item?.requiresCalibration ?? false, calibrationIntervalMonths: item?.calibrationIntervalMonths ?? null,
  isPpe: item?.isPpe ?? false, caNumber: item?.caNumber ?? "", caExpiry: item?.caExpiry ?? "", replaceEveryDays: item?.replaceEveryDays ?? null,
  rentable: item?.rentable ?? false, rentDaily: item?.rentDaily ?? null, rentWeekly: item?.rentWeekly ?? null, rentMonthly: item?.rentMonthly ?? null, replacementValue: item?.replacementValue ?? null,
});
const LIFE_FROM = [{ id: "fabricacao", name: "Da fabricação" }, { id: "primeiro_uso", name: "Do primeiro uso" }];

/** Ficha do item: cadastro com as marcas (inspeção, vida útil, calibração, EPI, locação) e, depois de salvo, saldos, kardex e compras. */
function ItemPage() {
  const { itemId } = Route.useParams();
  const isNew = itemId === "novo";
  const { can } = useVerify();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(isNew ? draftOf() : null);
  const [preset, setPreset] = useState("consumivel");
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const { data: options } = useStockOptions();
  const { data: item, isLoading, error: loadError } = useQuery({
    queryKey: [STOCK_KEYS.item, itemId],
    queryFn: () => stockApi.get<ItemDetail>(`items/${itemId}`),
    enabled: !isNew,
  });
  useEffect(() => { if (item) setDraft(draftOf(item)); }, [item]);

  const apply = (result: ItemDetail) => {
    queryClient.setQueryData([STOCK_KEYS.item, String(result.id)], result);
    for (const key of [STOCK_KEYS.items, STOCK_KEYS.itemOptions, STOCK_KEYS.overview, STOCK_KEYS.reorder, STOCK_KEYS.categories]) queryClient.invalidateQueries({ queryKey: [key] });
  };
  const editable = isNew ? can(`create_${STOCK_ABILITY}`) : can(`update_${STOCK_ABILITY}`);

  const { mutate: save, isPending: saving } = useMutation({
    mutationFn: (value: Draft) => {
      const body = {
        name: value.name.trim(), ...(value.code.trim() ? { code: value.code.trim() } : {}), categoryId: value.categoryId || null, unit: value.unit.trim() || "un",
        description: value.description, manufacturer: value.manufacturer, model: value.model, notes: value.notes,
        tracking: value.tracking, returnable: value.returnable, minQuantity: value.minQuantity, reorderQuantity: value.reorderQuantity,
        purchaseUnit: value.purchaseUnit, purchaseFactor: value.purchaseUnit.trim() ? value.purchaseFactor : null,
        requiresInspection: value.requiresInspection, inspectionIntervalDays: value.requiresInspection ? value.inspectionIntervalDays : null, inspectionBeforeUse: value.requiresInspection && value.inspectionBeforeUse,
        lifeMonths: value.hasLife ? value.lifeMonths : null, lifeFrom: value.lifeFrom, warnDays: value.warnDays,
        requiresCalibration: value.requiresCalibration, calibrationIntervalMonths: value.requiresCalibration ? value.calibrationIntervalMonths : null,
        isPpe: value.isPpe, caNumber: value.isPpe ? value.caNumber : "", caExpiry: value.isPpe && value.caExpiry ? value.caExpiry : null, replaceEveryDays: value.isPpe ? value.replaceEveryDays : null,
        rentable: value.rentable, rentDaily: value.rentable ? value.rentDaily : null, rentWeekly: value.rentable ? value.rentWeekly : null,
        rentMonthly: value.rentable ? value.rentMonthly : null, replacementValue: value.rentable ? value.replacementValue : null,
        ...(isNew ? { preset } : {}),
      };
      return isNew ? stockApi.post<ItemDetail>("items", body) : stockApi.put<ItemDetail>(`items/${itemId}`, body);
    },
    onSuccess: (result) => {
      apply(result);
      toast({ title: isNew ? `${result.code} cadastrado` : "Item salvo", variant: "success" });
      if (isNew) navigate({ to: "/suprimentos/estoque/itens/$itemId", params: { itemId: String(result.id) }, replace: true });
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const { mutate: setActive } = useMutation({
    mutationFn: (active: boolean) => stockApi.patch<{ ok: boolean }>(`items/${itemId}/${active ? "active" : "inactive"}`),
    onSuccess: (_, active) => {
      queryClient.invalidateQueries({ queryKey: [STOCK_KEYS.item, itemId] });
      for (const key of [STOCK_KEYS.items, STOCK_KEYS.itemOptions]) queryClient.invalidateQueries({ queryKey: [key] });
      toast({ title: active ? "Item reativado" : "Item inativado", variant: "success" });
    },
    onError: (err) => toast({ title: "Não foi possível alterar o item", description: errorMessage(err), variant: "destructive" }),
  });

  if (!can(`view_${STOCK_ABILITY}`)) return null;
  if (loadError) return <div className="p-4"><p className="text-destructive font-medium">Erro: {errorMessage(loadError)}</p><Link to="/suprimentos/estoque/itens" className="underline text-sm">Voltar para os itens</Link></div>;
  if ((!isNew && (isLoading || !item)) || !draft) return <div className="grid gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-64 w-full" /></div>;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => (current ? { ...current, [key]: value } : current));
  const dirty = isNew || JSON.stringify(draft) !== JSON.stringify(draftOf(item));
  const choosePreset = (id: string) => {
    setPreset(id);
    const values = options?.presets[id];
    if (!values) return;
    setDraft((current) => current && ({
      ...current, tracking: values.tracking, returnable: values.returnable, isPpe: values.isPpe,
      requiresInspection: values.requiresInspection, inspectionIntervalDays: values.inspectionIntervalDays ?? current.inspectionIntervalDays,
      requiresCalibration: values.requiresCalibration, calibrationIntervalMonths: values.calibrationIntervalMonths ?? current.calibrationIntervalMonths,
    }));
  };
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (draft.name.trim().length < 2) return setError("Informe o nome do item.");
    if (draft.requiresCalibration && draft.tracking !== "unidade") return setError("Item com calibração precisa ser controlado por unidade (peça).");
    if (draft.rentable && !draft.returnable && draft.tracking !== "unidade") return setError("Item alugável precisa voltar: marque \"volta depois de sair\".");
    if (draft.isPpe && draft.caExpiry && !draft.caNumber.trim()) return setError("Informe o número do CA.");
    setError(""); save(draft);
  };
  const optNum = (key: keyof Draft, label: string, props: { digits?: number; kind?: "money"; suffix?: string; placeholder?: string } = {}) => (
    <div>
      <Label className="text-xs">{label}</Label>
      <NumField value={draft[key] as N} digits={props.digits ?? 0} kind={props.kind} suffix={props.suffix} placeholder={props.placeholder} disabled={!editable} ariaLabel={label}
        onChange={(value) => set(key, value as never)} onEmpty={() => set(key, null as never)} />
    </div>
  );
  const flag = (key: "requiresInspection" | "hasLife" | "requiresCalibration" | "isPpe" | "rentable", label: string, hint: string, body: React.ReactNode) => (
    <div className="rounded-lg border p-3 grid gap-3">
      <div className="flex items-start gap-2">
        <Checkbox id={key} className="mt-0.5" checked={draft[key]} disabled={!editable} onCheckedChange={(checked) => set(key, checked === true)} />
        <div><Label htmlFor={key}>{label}</Label><p className="text-xs text-muted-foreground">{hint}</p></div>
      </div>
      {draft[key] && body}
    </div>
  );

  return (
    <>
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
        <div className="min-w-0">
          <Link to="/suprimentos/estoque/itens" className="text-xs text-muted-foreground hover:underline inline-flex items-center gap-1"><Icon name="arrow-left" className="w-3 h-3" /> Itens do estoque</Link>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <h1 className="text-xl font-bold">{item ? `${item.code} — ${item.name}` : "Novo item"}</h1>
            {item && !item.active && <Pill>Inativo</Pill>}
            {item?.low && <Pill tone="red">Abaixo do mínimo</Pill>}
          </div>
          {item && (
            <p className="text-sm text-muted-foreground">
              {[item.category ?? "Sem categoria", TRACKING_LABEL[item.tracking], `em estoque ${qty(item.inStock)} ${item.unit}`, `disponível ${qty(item.available)}`, item.out ? `fora ${qty(item.out)}` : null,
                item.averageCost !== null ? `custo médio ${money(item.averageCost)}` : null].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        {item && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {item.active && can(`inactive_${STOCK_ABILITY}`) && (
              <ConfirmDialog title="Inativar este item?" description="Ele some das listas de escolha. Só dá para inativar item sem saldo (dê baixa ou ajuste antes)." onConfirm={() => setActive(false)}>
                <Button type="button" variant="outline" size="sm"><Icon name="archive" className="w-4 h-4 mr-1" /> Inativar</Button>
              </ConfirmDialog>
            )}
            {!item.active && can(`activate_${STOCK_ABILITY}`) && <Button type="button" variant="outline" size="sm" onClick={() => setActive(true)}><Icon name="archive-restore" className="w-4 h-4 mr-1" /> Reativar</Button>}
            {item.active && !item.product && can(`update_${STOCK_ABILITY}`) && can("create_loja_site") && (
              <Button type="button" variant="outline" size="sm" onClick={() => setPublishing(true)}><Icon name="store" className="w-4 h-4 mr-1" /> Publicar na loja</Button>
            )}
            {item.product && <span className="text-xs text-muted-foreground inline-flex items-center gap-1"><Icon name="store" className="w-3 h-3" /> Na loja: {item.product.name}{item.product.active ? "" : " (inativo)"}</span>}
          </div>
        )}
      </div>

      <Tabs defaultValue="dados" className="mt-4">
        {item && (
          <TabsList>
            <TabsTrigger value="dados">Dados</TabsTrigger>
            <TabsTrigger value="saldos">Saldos</TabsTrigger>
            <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
            <TabsTrigger value="compras">Compras</TabsTrigger>
            {item.tracking === "unidade" && can("view_equipamentos") && <TabsTrigger value="pecas">Peças</TabsTrigger>}
            <TabsTrigger value="arquivos">Arquivos</TabsTrigger>
          </TabsList>
        )}
        {item && <TabsContent value="saldos" className="mt-4"><ItemBalances item={item} /></TabsContent>}
        {item && item.tracking === "unidade" && can("view_equipamentos") && <TabsContent value="pecas" className="mt-4"><ItemUnits itemId={item.id} /></TabsContent>}
        {item && <TabsContent value="arquivos" className="mt-4"><RecordFilesPanel entity="stock_item" entityId={item.id} title="Arquivos do item" hint="Manual, ficha técnica, certificado de aprovação (CA) e o que mais valer para todas as peças deste item." /></TabsContent>}
        {item && <TabsContent value="movimentacoes" className="mt-4"><ItemKardex itemId={item.id} unit={item.unit} /></TabsContent>}
        {item && <TabsContent value="compras" className="mt-4"><ItemPurchases itemId={item.id} /></TabsContent>}
        <TabsContent value="dados" className="mt-4">
          <form onSubmit={submit} className="grid gap-4 max-w-5xl">
            {isNew && (
              <section className="rounded-lg border p-4 grid gap-2">
                <Label>Modelo</Label>
                <Select name="preset" options={PRESET_OPTIONS} state={preset} onChange={(_, value) => choosePreset(String(value || "consumivel"))} placeholder="Selecione" />
                <p className="text-xs text-muted-foreground">Pré-marca a forma de controle e as opções abaixo; dá para ajustar depois de escolher.</p>
              </section>
            )}
            <section className="rounded-lg border p-4 grid gap-4">
              <h2 className="font-semibold">Identificação</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2"><Label htmlFor="name">Nome <span>*</span></Label>
                  <Input id="name" name="name" value={draft.name} maxLength={200} disabled={!editable} onValueChange={(_, value) => set("name", String(value))} className="mt-1" placeholder="Ex.: Cinto paraquedista" /></div>
                <div><Label htmlFor="code">Código</Label>
                  <Input id="code" name="code" value={draft.code} maxLength={30} disabled={!editable} onValueChange={(_, value) => set("code", String(value).toUpperCase())} className="mt-1" placeholder={isNew ? "Automático pela categoria" : ""} /></div>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div><Label>Categoria</Label>
                  <Select name="categoryId" options={toOptions(options?.categories)} state={draft.categoryId} clearable disabled={!editable} onChange={(_, value) => set("categoryId", String(value ?? ""))} placeholder="Sem categoria" /></div>
                <div><Label htmlFor="manufacturer">Fabricante</Label>
                  <Input id="manufacturer" name="manufacturer" value={draft.manufacturer} maxLength={120} disabled={!editable} onValueChange={(_, value) => set("manufacturer", String(value))} className="mt-1" /></div>
                <div><Label htmlFor="model">Modelo</Label>
                  <Input id="model" name="model" value={draft.model} maxLength={120} disabled={!editable} onValueChange={(_, value) => set("model", String(value))} className="mt-1" /></div>
              </div>
              <div><Label htmlFor="description">Descrição</Label>
                <Textarea id="description" className="mt-1" rows={2} maxLength={2000} disabled={!editable} value={draft.description} onChange={(event) => set("description", event.target.value)} /></div>
            </section>

            <section className="rounded-lg border p-4 grid gap-4">
              <h2 className="font-semibold">Controle e reposição</h2>
              <div className="grid sm:grid-cols-3 gap-4">
                <div><Label htmlFor="unit">Unidade</Label>
                  <Input id="unit" name="unit" value={draft.unit} maxLength={20} disabled={!editable} onValueChange={(_, value) => set("unit", String(value))} className="mt-1" placeholder="un, m, kg, par" /></div>
                <div><Label>Controle</Label>
                  <Select name="tracking" options={TRACKING_OPTIONS} state={draft.tracking} disabled={!editable} onChange={(_, value) => set("tracking", (String(value || "quantidade")) as Tracking)} placeholder="Selecione" />
                  <p className="text-xs text-muted-foreground mt-1">Depois da primeira movimentação não muda mais.</p></div>
                <div className="flex items-center gap-2 sm:pt-6">
                  <Checkbox id="returnable" checked={draft.returnable || draft.tracking === "unidade"} disabled={!editable || draft.tracking === "unidade"} onCheckedChange={(checked) => set("returnable", checked === true)} />
                  <Label htmlFor="returnable">Volta depois de sair (não é consumível)</Label>
                </div>
              </div>
              <div className="grid sm:grid-cols-4 gap-4">
                {optNum("minQuantity", "Estoque mínimo", { digits: 3, suffix: draft.unit, placeholder: "Sem mínimo" })}
                {optNum("reorderQuantity", "Quantidade para repor", { digits: 3, suffix: draft.unit, placeholder: "Sugestão automática" })}
                <div><Label htmlFor="purchaseUnit" className="text-xs">Unidade de compra</Label>
                  <Input id="purchaseUnit" name="purchaseUnit" value={draft.purchaseUnit} maxLength={20} disabled={!editable} onValueChange={(_, value) => set("purchaseUnit", String(value))} placeholder="Ex.: caixa" /></div>
                {draft.purchaseUnit.trim() ? optNum("purchaseFactor", `${draft.unit || "un"} por ${draft.purchaseUnit}`, { digits: 4 }) : <div />}
              </div>
            </section>

            <section className="grid gap-3">
              <h2 className="font-semibold">Marcas</h2>
              {flag("requiresInspection", "Exige inspeção", "Cinto, talabarte, trava-quedas: cada peça ou lote passa por inspeção periódica.", (
                <div className="grid sm:grid-cols-3 gap-4 items-end">
                  {optNum("inspectionIntervalDays", "Inspeção a cada (dias)", { placeholder: "180" })}
                  <div className="flex items-center gap-2 sm:col-span-2 pb-2">
                    <Checkbox id="inspectionBeforeUse" checked={draft.inspectionBeforeUse} disabled={!editable} onCheckedChange={(checked) => set("inspectionBeforeUse", checked === true)} />
                    <Label htmlFor="inspectionBeforeUse">Também inspeção antes de cada uso</Label>
                  </div>
                </div>
              ))}
              {flag("hasLife", "Tem vida útil", "Depois do prazo a peça precisa sair de uso.", (
                <div className="grid sm:grid-cols-3 gap-4">
                  {optNum("lifeMonths", "Vida útil (meses)")}
                  <div><Label className="text-xs">Contada</Label>
                    <Select name="lifeFrom" options={LIFE_FROM} state={draft.lifeFrom} disabled={!editable} onChange={(_, value) => set("lifeFrom", String(value || "fabricacao"))} /></div>
                  {optNum("warnDays", "Avisar quantos dias antes")}
                </div>
              ))}
              {flag("requiresCalibration", "Exige calibração", "Instrumento de medição (precisa ser controlado por unidade).", (
                <div className="grid sm:grid-cols-3 gap-4">{optNum("calibrationIntervalMonths", "Calibração a cada (meses)", { placeholder: "12" })}</div>
              ))}
              {flag("isPpe", "É EPI", "Entregue ao funcionário com ficha e CA.", (
                <div className="grid sm:grid-cols-3 gap-4">
                  <div><Label htmlFor="caNumber" className="text-xs">Número do CA</Label>
                    <Input id="caNumber" name="caNumber" value={draft.caNumber} maxLength={30} disabled={!editable} onValueChange={(_, value) => set("caNumber", String(value))} /></div>
                  <div><Label className="text-xs">Validade do CA</Label>
                    <CalendarPicker mode="single" name="caExpiry" className="w-full" value={draft.caExpiry} placeholder="Não informada" fromYear={2020} toYear={2050} disabled={!editable}
                      onValueChange={(_, value) => set("caExpiry", String(value ?? ""))} />
                    {item?.caState && <div className="mt-1"><DueBadge state={item.caState} label={item.caState === "vencido" ? "CA vencido" : item.caState === "a_vencer" ? "CA a vencer" : "CA em dia"} /></div>}</div>
                  {optNum("replaceEveryDays", "Troca a cada (dias)", { placeholder: "Sem troca periódica" })}
                </div>
              ))}
              {flag("rentable", "Alugável", "Pode ser alugado a clientes (precisa voltar depois de sair).", (
                <div className="grid sm:grid-cols-4 gap-4">
                  {optNum("rentDaily", "Diária", { kind: "money", digits: 2 })}
                  {optNum("rentWeekly", "Semanal", { kind: "money", digits: 2 })}
                  {optNum("rentMonthly", "Mensal", { kind: "money", digits: 2 })}
                  {optNum("replacementValue", "Valor de reposição", { kind: "money", digits: 2 })}
                </div>
              ))}
            </section>

            <section className="rounded-lg border p-4">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" className="mt-1" rows={2} maxLength={1000} disabled={!editable} value={draft.notes} onChange={(event) => set("notes", event.target.value)} />
            </section>

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {editable && (
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving || !dirty}>{saving ? "Salvando..." : isNew ? "Cadastrar item" : "Salvar"}</Button>
                {isNew && <Button type="button" variant="outline" onClick={() => navigate({ to: "/suprimentos/estoque/itens" })}>Cancelar</Button>}
                {!isNew && dirty && <Button type="button" variant="outline" onClick={() => setDraft(draftOf(item))}>Desfazer alterações</Button>}
              </div>
            )}
          </form>
        </TabsContent>
      </Tabs>
      {item && publishing && <PublishDialog itemId={item.id} name={item.name} suggested={item.averageCost} onClose={() => setPublishing(false)} />}
    </>
  );
}

function ItemBalances({ item }: { item: ItemDetail }) {
  const inside = item.balances.filter((b) => b.holderType === "local");
  const outside = item.balances.filter((b) => b.holderType !== "local");
  const list = (rows: ItemDetail["balances"], empty: string) => rows.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">{empty}</p> : (
    <ul className="mt-2 divide-y text-sm">
      {rows.map((row, index) => (
        <li key={index} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="flex-1 min-w-0 truncate">{row.holder} {row.holderType !== "local" && <span className="text-xs text-muted-foreground">({HOLDER_LABEL[row.holderType]})</span>}</span>
          {row.lot && <span className="text-xs text-muted-foreground">lote {row.lot}</span>}
          <span className="tabular-nums font-medium">{qty(row.quantity)} {item.unit}</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      <section className="rounded-lg border p-4">
        <h2 className="font-semibold">No estoque</h2>
        {list(inside, "Nenhum saldo nos locais de estoque.")}
      </section>
      <section className="rounded-lg border p-4">
        <h2 className="font-semibold">Fora do estoque</h2>
        <p className="text-xs text-muted-foreground">Em obras, com funcionários, em locação ou no fornecedor.</p>
        {list(outside, "Nada fora do estoque.")}
      </section>
      {item.lots.length > 0 && (
        <section className="rounded-lg border p-4 lg:col-span-2">
          <h2 className="font-semibold">Lotes</h2>
          <ul className="mt-2 divide-y text-sm">
            {item.lots.map((lot) => (
              <li key={lot.id} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="font-medium">{lot.number}</span>
                <span className="flex-1 min-w-0 text-xs text-muted-foreground">{[lot.manufacturedAt && `fabricado ${dateBr(lot.manufacturedAt)}`, lot.expiresAt ? `vence ${dateBr(lot.expiresAt)}` : "sem validade", lot.status !== "liberado" && lot.status].filter(Boolean).join(" · ")}</span>
                <DueBadge state={lot.expiryState} />
                {lot.inspectionState && <DueBadge state={lot.inspectionState} label={lot.inspectionState === "vencido" ? "Inspeção vencida" : lot.inspectionState === "a_vencer" ? "Inspeção a vencer" : "Inspeção em dia"} />}
                <span className="tabular-nums font-medium">{qty(lot.quantity)} {item.unit}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function ItemKardex({ itemId, unit }: { itemId: number; unit: string }) {
  const [opened, setOpened] = useState<number | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: [STOCK_KEYS.kardex, itemId], queryFn: () => stockApi.get<{ rows: KardexRow[]; total: number }>(`items/${itemId}/movements`) });
  if (error) return <p className="text-destructive text-sm">Erro: {errorMessage(error)}</p>;
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  const rows = data?.rows ?? [];
  const seesCost = rows.some((row) => row.unitCost !== null);
  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="hidden lg:flex items-center py-2 px-4 bg-muted/50 font-semibold text-xs">
        <div className="w-24">Data</div><div className="w-28">Número</div><div className="w-40">Tipo</div><div className="flex-1">De → para</div>
        <div className="w-28 text-right">Qtd.</div>{seesCost && <div className="w-28 text-right">Custo</div>}<div className="w-32 text-right">Saldo depois</div>
      </div>
      {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhuma movimentação deste item.</p>}
      {rows.map((row) => {
        const entering = row.toType === "local" && row.fromType !== "local";
        const leaving = row.fromType === "local" && row.toType !== "local";
        return (
          <button key={row.id} type="button" onClick={() => setOpened(row.movementId)} className="w-full text-left flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-2 border-t text-sm hover:bg-muted/40">
            <div className="lg:w-24 tabular-nums">{dateBr(row.date)}</div>
            <div className="lg:w-28 tabular-nums font-medium">{row.number}</div>
            <div className="lg:w-40">{row.typeLabel}</div>
            <div className="flex-1 min-w-0 text-xs text-muted-foreground truncate">{row.from} → {row.to}{row.unit ? ` · peça ${row.unit}` : ""}</div>
            <div className={`lg:w-28 lg:text-right tabular-nums ${entering ? "text-green-700 dark:text-green-400" : leaving ? "text-red-600 dark:text-red-400" : ""}`}>{entering ? "+" : leaving ? "−" : ""}{qty(row.quantity)} {unit}</div>
            {seesCost && <div className="lg:w-28 lg:text-right tabular-nums">{money(row.totalCost)}</div>}
            <div className="lg:w-32 lg:text-right tabular-nums"><span className="lg:hidden text-xs text-muted-foreground">Saldo depois: </span>{qty(row.inStockAfter)}</div>
          </button>
        );
      })}
      {data && data.total > rows.length && <p className="px-4 py-2 border-t text-xs text-muted-foreground">Mostrando as {rows.length} mais recentes de {data.total}.</p>}
      {opened && <MovementDetailDialog id={opened} onClose={() => setOpened(null)} />}
    </div>
  );
}

function ItemPurchases({ itemId }: { itemId: number }) {
  const { can } = useVerify();
  const { data, isLoading, error } = useQuery({ queryKey: [STOCK_KEYS.itemPurchases, itemId], queryFn: () => stockApi.get<ItemPurchase[]>(`items/${itemId}/purchases`) });
  if (error) return <p className="text-destructive text-sm">Erro: {errorMessage(error)}</p>;
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  const rows = data ?? [];
  const seesPurchases = can("view_pedidos_de_compra");
  return (
    <section className="rounded-lg border p-4">
      <h2 className="font-semibold">Compras deste item</h2>
      <p className="text-xs text-muted-foreground">Pedidos de compra em que a linha foi ligada a este item: o histórico de preço.</p>
      {rows.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nenhum pedido de compra com este item.</p> : (
        <ul className="mt-2 divide-y text-sm">
          {rows.map((row, index) => (
            <li key={`${row.id}-${index}`} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              {seesPurchases
                ? <Link to="/suprimentos/pedidos-de-compra/$purchaseId" params={{ purchaseId: String(row.id) }} className="font-medium tabular-nums hover:underline">{row.number}</Link>
                : <span className="font-medium tabular-nums">{row.number}</span>}
              <span className="text-xs text-muted-foreground">{dateBr(row.date)}</span>
              <span className="flex-1 min-w-0 truncate text-muted-foreground">{row.supplier ?? "Sem fornecedor"} · {PURCHASE_STATUS_LABEL[row.status as PurchaseStatus] ?? row.status}</span>
              <span className="tabular-nums">{qty(row.quantity)} {row.unit ?? ""}{row.received ? ` (recebido ${qty(row.received)})` : ""}</span>
              {row.unitPrice !== null && <span className="tabular-nums font-medium">{money(row.unitPrice)}</span>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Peças do item (controle por unidade), com a impressão das etiquetas. */
function ItemUnits({ itemId }: { itemId: number }) {
  const [printing, setPrinting] = useState(false);
  const params = { itemId, limit: 500 };
  const { data, isLoading, error } = useQuery({ queryKey: [EQUIP_KEYS.units, params], queryFn: () => stockApi.get<{ rows: UnitRow[]; total: number }>("units", params) });
  if (error) return <p className="text-destructive text-sm">Erro: {errorMessage(error)}</p>;
  if (isLoading) return <Skeleton className="h-40 w-full" />;
  const rows = data?.rows ?? [];
  return (
    <section className="rounded-lg border overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-muted/50">
        <h2 className="font-semibold text-sm">Peças ({data?.total ?? 0})</h2>
        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={!rows.length} onClick={() => setPrinting(true)}><Icon name="qr-code" className="w-3 h-3 mr-1" /> Imprimir etiquetas</Button>
          <Button asChild size="sm" variant="outline"><Link to="/suprimentos/equipamentos" search={{ itemId }}>Ver em Equipamentos</Link></Button>
        </div>
      </div>
      {rows.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhuma peça. Elas nascem na entrada (compra, entrada avulsa, saldo inicial).</p>}
      {rows.map((unit) => (
        <Link key={unit.id} to="/suprimentos/equipamentos/$unitId" params={{ unitId: String(unit.id) }} className="flex flex-col lg:flex-row lg:items-center gap-1 lg:gap-0 px-4 py-2.5 border-t text-sm hover:bg-muted/40">
          <div className="lg:w-40 font-semibold tabular-nums">{unit.tag}</div>
          <div className="flex-1 min-w-0 text-muted-foreground truncate">{unit.serialNumber ? `série ${unit.serialNumber}` : ""}</div>
          <div className="lg:w-44"><UnitStatusBadge status={unit.status} needsInspection={unit.needsInspection} /></div>
          <div className="lg:w-56 text-muted-foreground truncate">{unit.holder}</div>
          <div className="lg:w-56 flex flex-wrap gap-1">
            {unit.dues.inspection && <DueStateBadge state={unit.dues.inspection} label="Inspeção" />}
            {unit.dues.calibration && <DueStateBadge state={unit.dues.calibration} label="Calibração" />}
            {unit.dues.life && <DueStateBadge state={unit.dues.life} label="Vida útil" />}
          </div>
        </Link>
      ))}
      {printing && <PrintLabelsDialog units={rows.map((unit) => ({ tag: unit.tag, item: unit.item }))} onClose={() => setPrinting(false)} />}
    </section>
  );
}

/** Publicar na loja: cria o produto do site ligado ao item, com o preço. */
function PublishDialog({ itemId, name, suggested, onClose }: { itemId: number; name: string; suggested: number | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [price, setPrice] = useState<number>(0);
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => stockApi.post<{ id: number; name: string }>(`items/${itemId}/publish`, { price }),
    onSuccess: (product) => {
      queryClient.invalidateQueries({ queryKey: [STOCK_KEYS.item] });
      queryClient.invalidateQueries({ queryKey: ["stockSiteProducts"] });
      toast({ title: `Publicado na loja: ${product.name}`, description: "Complete as fotos e a descrição em Site → Produtos.", variant: "success" });
      onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Publicar na loja</DialogTitle>
          <DialogDescription>Cria o produto "{name}" na loja do site, ligado a este item: a loja mostra "pronta entrega" quando há saldo disponível.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); if (!(price > 0)) return setError("Informe o preço de venda."); setError(""); mutate(); }}>
          <div><Label className="text-sm">Preço de venda <span>*</span></Label>
            <NumField value={price} kind="money" className="mt-1" ariaLabel="Preço de venda" onChange={setPrice} />
            {suggested !== null && suggested > 0 && <p className="text-xs text-muted-foreground mt-1">Custo médio: {money(suggested)}</p>}</div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Publicando..." : "Publicar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
