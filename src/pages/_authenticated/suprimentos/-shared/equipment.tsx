import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Link, useNavigate } from "@tanstack/react-router";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";
import useVerify from "@/hooks/use-verify";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import CalendarPicker from "@/components/general-components/Calendar";
import DocStatusBadge from "@/components/general-components/DocStatusBadge";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import { cn } from "@/lib/utils";
import { NumField, dateBr, errorMessage, todayIso } from "../../comercial/-shared/commercial";
import { DueState, STOCK_KEYS, stockApi } from "./stock";

/** Equipamentos rastreados (peças e lotes): tipos (espelham a API), consultas e diálogos comuns. */

export const EQUIP_ABILITY = "equipamentos";
export const PERM_INSPECT = "inspecoes_equipamentos";

export const EQUIP_KEYS = {
  units: "stockUnits",
  unit: "stockUnit",
  inspections: "stockInspections",
  services: "stockServices",
  dues: "stockDues",
  templates: "stockInspectionTemplates",
  suppliers: "stockSuppliers",
  employees: "stockPpeEmployees",
} as const;

export type UnitStatus = "disponivel" | "em_uso" | "em_inspecao" | "em_manutencao" | "em_calibracao" | "bloqueado" | "baixado";
export const UNIT_STATUS_LABEL: Record<UnitStatus, string> = {
  disponivel: "Disponível", em_uso: "Em uso", em_inspecao: "Em inspeção", em_manutencao: "Em manutenção", em_calibracao: "Em calibração", bloqueado: "Bloqueado", baixado: "Baixado",
};
export const UNIT_STATUS_OPTIONS = [
  ...(Object.keys(UNIT_STATUS_LABEL) as UnitStatus[]).map((id) => ({ id, name: UNIT_STATUS_LABEL[id] })),
  { id: "todas", name: "Todas (inclui baixadas)" },
];
export const RETIRE_REASONS = [
  { id: "reprovado", name: "Reprovado na inspeção" }, { id: "fim_vida", name: "Fim da vida útil" }, { id: "perda", name: "Perda" }, { id: "extravio", name: "Extravio" },
  { id: "avaria", name: "Avaria" }, { id: "venda", name: "Venda" }, { id: "outro", name: "Outro" },
];
export const INSPECTION_KINDS = [{ id: "periodica", name: "Periódica" }, { id: "pre_uso", name: "Pré-uso" }, { id: "extraordinaria", name: "Extraordinária" }, { id: "recebimento", name: "Recebimento" }];
export const INSPECTION_RESULTS = [{ id: "aprovado", name: "Aprovado" }, { id: "aprovado_ressalva", name: "Aprovado com ressalva" }, { id: "reprovado", name: "Reprovado" }];
export const SERVICE_KINDS = [{ id: "calibracao", name: "Calibração" }, { id: "manutencao", name: "Manutenção" }];
export const SERVICE_RESULTS = [{ id: "aprovado", name: "Aprovado" }, { id: "ajustado", name: "Ajustado" }, { id: "reprovado", name: "Reprovado" }];

export interface UnitDues { inspection: DueState | null; calibration: DueState | null; life: DueState | null }
export interface UnitRow {
  id: number; tag: string; serialNumber: string | null; itemId: number; item: string; code: string; status: UnitStatus; statusLabel: string; needsInspection: boolean;
  holderType: string; holderId: number | null; holder: string; nextInspectionAt: string | null; nextCalibrationAt: string | null; lifeEndsAt: string | null; length: number | null;
  dues: UnitDues; due: DueState | null;
}
export interface Inspection { id: number; kind: string; kindLabel: string; date: string; result: string; resultLabel: string; answers: Record<string, unknown> | null; nextDueAt: string | null; notes: string | null; inspector: string | null }
export interface ServiceRow {
  id: number; unitId: number; kind: string; kindLabel: string; status: string; sentAt: string | null; returnedAt: string | null; supplierId: number | null; supplier: string | null;
  purchaseOrderId: number | null; cost: number | null; result: string | null; certificateNumber: string | null; nextDueAt: string | null; notes: string | null; daysOut: number | null;
  tag?: string; item?: string;
}
export interface UnitDetail extends UnitRow {
  lot: { id: number; number: string } | null; origin: { id: number; tag: string } | null; children: Array<{ id: number; tag: string }>;
  manufacturedAt: string | null; acquiredAt: string | null; firstUseAt: string | null; acquisitionCost: number | null; attributes: unknown; notes: string | null;
  retiredAt: string | null; retiredReason: string | null; retiredReasonLabel: string | null; retiredNote: string | null;
  itemRules: {
    requiresInspection: boolean; inspectionIntervalDays: number | null; inspectionBeforeUse: boolean; requiresCalibration: boolean; calibrationIntervalMonths: number | null;
    lifeMonths: number | null; lifeFrom: string | null; templateId: number | null; isPpe: boolean; rentable: boolean;
  };
  inspections: Inspection[]; services: ServiceRow[];
  timeline: Array<{ kind: string; at: string; id: number; title: string; detail: string; by: string | null; number: string | null }>;
}
export interface TemplateQuestion { key: string; label: string; kind: "ok_nok" | "texto" | "numero"; required: boolean }
export interface Template { id: number; name: string; items: TemplateQuestion[]; active: boolean }

const DUE_LABEL: Record<DueState, string> = { vencido: "Vencido", a_vencer: "A vencer", em_dia: "Em dia" };
/** Selo de vencimento no mesmo estilo dos documentos do RH. */
export function DueStateBadge({ state, label }: { state: DueState | null; label?: string }) {
  if (!state) return null;
  return <DocStatusBadge status={state} label={label ? `${label}: ${DUE_LABEL[state].toLowerCase()}` : DUE_LABEL[state]} />;
}

export function UnitStatusBadge({ status, needsInspection }: { status: UnitStatus; needsInspection?: boolean }) {
  const tone = status === "disponivel" ? "bg-green-100 text-green-700 dark:bg-green-950/50 dark:text-green-300"
    : status === "bloqueado" || status === "baixado" ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
      : status === "em_uso" ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300";
  return (
    <span className="inline-flex items-center gap-1">
      <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap", tone)}>{UNIT_STATUS_LABEL[status] ?? status}</span>
      {needsInspection && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-300 whitespace-nowrap">Inspeção pedida</span>}
    </span>
  );
}

/** Depois de qualquer mudança numa peça, o que pode ter mudado. */
export function useEquipmentRefresh() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of [EQUIP_KEYS.units, EQUIP_KEYS.unit, EQUIP_KEYS.inspections, EQUIP_KEYS.services, EQUIP_KEYS.dues, STOCK_KEYS.overview, STOCK_KEYS.movements, STOCK_KEYS.balances, STOCK_KEYS.unitOptions, STOCK_KEYS.item, STOCK_KEYS.items]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
}

export function useTemplates(enabled = true) {
  return useQuery({ queryKey: [EQUIP_KEYS.templates], queryFn: () => stockApi.get<Template[]>("inspection-templates"), enabled, retry: false, staleTime: 60_000 });
}
export function useSuppliers(enabled = true) {
  return useQuery({
    queryKey: [EQUIP_KEYS.suppliers], enabled, retry: false, staleTime: 60_000,
    queryFn: () => stockApi.get<Array<{ id: number; name: string; supplies: string | null }>>("suppliers"),
  });
}
export function useEmployees(enabled = true) {
  return useQuery({
    queryKey: [EQUIP_KEYS.employees], enabled, retry: false, staleTime: 60_000,
    queryFn: () => stockApi.get<Array<{ id: number; name: string; terminated?: boolean; userId?: number | null }>>("employees/options"),
  });
}

const fold = (text: unknown) => String(text ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
/** O funcionário ligado ao usuário logado (pelo `userId`, se a API mandar; senão, pelo nome). */
export function useMyEmployeeId(employees: Array<{ id: number; name: string; userId?: number | null }>) {
  const { user } = useAuth();
  if (!user) return "";
  const mine = employees.find((e) => e.userId && e.userId === user.sub) ?? employees.find((e) => fold(e.name) === fold(user.username));
  return mine ? String(mine.id) : "";
}

// ---------------------------------------------------------------- inspeção

export interface InspectionTarget { unitId?: number; lotId?: number; label: string; templateId?: number | null; kind?: string }

/**
 * Registrar inspeção de uma peça ou lote, pensado para o celular: botões grandes de OK / Não OK.
 * "Aprovado" não é aceito se houver "não OK"; fora de aprovado, a observação é obrigatória.
 */
export function InspectionDialog({ target, onClose, onDone }: { target: InspectionTarget; onClose: () => void; onDone?: () => void }) {
  const refresh = useEquipmentRefresh();
  const { data: templates = [], isLoading } = useTemplates();
  const { data: employees = [], isError: noEmployees } = useEmployees();
  const [templateId, setTemplateId] = useState(target.templateId ? String(target.templateId) : "");
  const [kind, setKind] = useState(target.kind ?? "periodica");
  const [date, setDate] = useState(todayIso());
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [result, setResult] = useState("");
  const [resultTouched, setResultTouched] = useState(false);
  const [notes, setNotes] = useState("");
  const [inspector, setInspector] = useState("");
  const [inspectorTouched, setInspectorTouched] = useState(false);
  const [error, setError] = useState("");
  const myEmployee = useMyEmployeeId(employees);
  const template = templates.find((t) => String(t.id) === templateId);
  const hasNok = !!template?.items.some((q) => q.kind === "ok_nok" && answers[q.key] === "nok");
  const okNok = template?.items.filter((q) => q.kind === "ok_nok") ?? [];
  const allOk = okNok.length > 0 && okNok.every((q) => answers[q.key] === "ok")
    && !!template?.items.every((q) => !q.required || (answers[q.key] !== undefined && answers[q.key] !== ""));
  // um "não OK" tira o "aprovado" da escolha
  useEffect(() => { if (hasNok && result === "aprovado") setResult(""); }, [hasNok, result]);
  // tudo OK: "aprovado" vem marcado sozinho (a pessoa pode trocar)
  useEffect(() => { if (allOk && !resultTouched) setResult("aprovado"); }, [allOk, resultTouched]);
  // o inspetor começa com o funcionário de quem está logado
  useEffect(() => { if (myEmployee && !inspectorTouched) setInspector(myEmployee); }, [myEmployee, inspectorTouched]);

  const { mutate, isPending } = useMutation({
    mutationFn: () => stockApi.post<{ id: number; result: string; nextDueAt: string | null }>("inspections", {
      ...(target.unitId ? { unitId: target.unitId } : { lotId: target.lotId }), kind, date, result, notes: notes.trim() || null,
      templateId: templateId ? Number(templateId) : null, answers, inspectorEmployeeId: inspector ? Number(inspector) : null,
    }),
    onSuccess: (row) => {
      refresh();
      toast({ title: `Inspeção registrada: ${INSPECTION_RESULTS.find((r) => r.id === row.result)?.name ?? row.result}`, description: row.nextDueAt ? `Próxima em ${dateBr(row.nextDueAt)}` : undefined, variant: "success" });
      onDone?.(); onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (template) {
      const missing = template.items.find((q) => q.required && (answers[q.key] === undefined || answers[q.key] === ""));
      if (missing) return setError(`Responda: ${missing.label}`);
    }
    if (!result) return setError("Escolha o resultado.");
    if (result === "aprovado" && hasNok) return setError("Há item \"não OK\": o resultado não pode ser \"aprovado\".");
    if (result !== "aprovado" && !notes.trim()) return setError("Conte o que foi encontrado.");
    setError(""); mutate();
  };
  const setAnswer = (key: string, value: string | number) => setAnswers((current) => ({ ...current, [key]: value }));

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar inspeção</DialogTitle>
          <DialogDescription>{target.label}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Tipo</Label>
              <Select name="inspectionKind" options={INSPECTION_KINDS} state={kind} modal onChange={(_, value) => setKind(String(value || "periodica"))} /></div>
            <div><Label>Data</Label>
              <CalendarPicker mode="single" name="inspectionDate" className="mt-1 w-full" value={date} fromYear={2020} toYear={2040} onValueChange={(_, value) => setDate(String(value ?? "") || todayIso())} /></div>
          </div>
          <div><Label>Roteiro</Label>
            <Select name="templateId" searchable options={templates.filter((t) => t.active).map(({ id, name }) => ({ id, name }))} state={templateId} clearable isLoading={isLoading} modal
              onChange={(_, value) => { setTemplateId(String(value ?? "")); setAnswers({}); }} placeholder="Sem roteiro (só o resultado)" /></div>

          {template && (
            <div className="grid gap-2">
              {okNok.length > 1 && (
                <Button type="button" variant="outline" className="h-11"
                  onClick={() => setAnswers((current) => ({ ...current, ...Object.fromEntries(okNok.map((q) => [q.key, "ok"])) }))}>
                  <Icon name="check-check" className="w-4 h-4 mr-1" /> Tudo OK
                </Button>
              )}
              {template.items.map((q, index) => (
                <div key={q.key} className="rounded border p-3 grid gap-2">
                  <p className="text-sm">{index + 1}. {q.label}{q.required && <span className="text-red-500"> *</span>}</p>
                  {q.kind === "ok_nok" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Button type="button" className="h-11" variant={answers[q.key] === "ok" ? "default" : "outline"} onClick={() => setAnswer(q.key, "ok")}><Icon name="check" className="w-4 h-4 mr-1" /> OK</Button>
                      <Button type="button" className={cn("h-11", answers[q.key] === "nok" && "bg-red-600 hover:bg-red-700 text-white")} variant={answers[q.key] === "nok" ? "default" : "outline"} onClick={() => setAnswer(q.key, "nok")}><Icon name="x" className="w-4 h-4 mr-1" /> Não OK</Button>
                    </div>
                  )}
                  {q.kind === "texto" && <Input name={`answer-${q.key}`} value={String(answers[q.key] ?? "")} maxLength={500} onValueChange={(_, value) => setAnswer(q.key, String(value))} />}
                  {q.kind === "numero" && <NumField value={answers[q.key] === undefined ? null : Number(answers[q.key])} digits={3} ariaLabel={q.label} onChange={(value) => setAnswer(q.key, value)} onEmpty={() => setAnswer(q.key, "")} />}
                </div>
              ))}
            </div>
          )}

          <div>
            <Label>Resultado <span>*</span></Label>
            <div className="mt-1 grid sm:grid-cols-3 gap-2">
              {INSPECTION_RESULTS.map((option) => {
                const disabled = option.id === "aprovado" && hasNok;
                return (
                  <Button key={option.id} type="button" disabled={disabled} className={cn("h-11", result === option.id && option.id === "reprovado" && "bg-red-600 hover:bg-red-700 text-white")}
                    variant={result === option.id ? "default" : "outline"} onClick={() => { setResult(option.id); setResultTouched(true); }}>{option.name}</Button>
                );
              })}
            </div>
            {hasNok && <p className="text-xs text-muted-foreground mt-1">Há item "não OK": aprove com ressalva ou reprove.</p>}
            {allOk && !resultTouched && <p className="text-xs text-muted-foreground mt-1">Tudo OK: marcamos "Aprovado". Troque se precisar.</p>}
          </div>
          <div><Label htmlFor="inspectionNotes">Observação{result && result !== "aprovado" && <span> *</span>}</Label>
            <Textarea id="inspectionNotes" className="mt-1" rows={2} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={result === "reprovado" ? "O que foi encontrado (a peça fica bloqueada)" : ""} /></div>
          {!noEmployees && (
            <div><Label>Inspetor</Label>
              <Select name="inspector" searchable options={employees.filter((e) => !e.terminated).map(({ id, name }) => ({ id, name }))} state={inspector} clearable modal onChange={(_, value) => { setInspector(String(value ?? "")); setInspectorTouched(true); }} placeholder="Quem está registrando" /></div>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Registrando..." : "Registrar inspeção"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- envio para calibração/manutenção

export function ServiceSendDialog({ unit, onClose, onDone }: { unit: Pick<UnitRow, "id" | "tag" | "item">; onClose: () => void; onDone?: () => void }) {
  const refresh = useEquipmentRefresh();
  const { can } = useVerify();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: suppliers = [], isLoading } = useSuppliers();
  const canBuy = can("create_pedidos_de_compra");
  const [kind, setKind] = useState("calibracao");
  const [supplierId, setSupplierId] = useState("");
  const [sentAt, setSentAt] = useState(todayIso());
  const [notes, setNotes] = useState("");
  const [openPurchase, setOpenPurchase] = useState(canBuy);
  const [newSupplier, setNewSupplier] = useState(false);
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: () => stockApi.post<ServiceRow>(`units/${unit.id}/service`, { kind, supplierId: Number(supplierId), sentAt, notes: notes.trim() || null }),
    onSuccess: (service) => {
      refresh();
      toast({ title: `${unit.tag} enviada para ${kind === "calibracao" ? "calibração" : "manutenção"}`, variant: "success" });
      onDone?.(); onClose();
      // já abre o pedido de compra do serviço, preenchido
      if (openPurchase && canBuy && storeServiceDraft({ ...service, tag: service.tag ?? unit.tag, item: service.item ?? unit.item, supplierId: service.supplierId ?? Number(supplierId), kind: service.kind ?? kind })) {
        navigate({ to: "/suprimentos/pedidos-de-compra/$purchaseId", params: { purchaseId: "novo" }, search: { servico: "1" } });
      }
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!supplierId) return setError("Escolha o fornecedor (laboratório ou assistência).");
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Enviar {unit.tag}</DialogTitle>
          <DialogDescription>{unit.item}: a peça sai do local e fica com o fornecedor até voltar.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Serviço</Label>
              <Select name="serviceKind" options={SERVICE_KINDS} state={kind} modal onChange={(_, value) => setKind(String(value || "calibracao"))} /></div>
            <div><Label>Envio</Label>
              <CalendarPicker mode="single" name="sentAt" className="mt-1 w-full" value={sentAt} fromYear={2020} toYear={2040} onValueChange={(_, value) => setSentAt(String(value ?? "") || todayIso())} /></div>
          </div>
          <div>
            <div className="flex items-center justify-between gap-2">
              <Label>Fornecedor <span>*</span></Label>
              {canBuy && <button type="button" className="text-xs underline text-primary" onClick={() => setNewSupplier(true)}>Cadastrar fornecedor</button>}
            </div>
            <Select name="supplierId" searchable options={suppliers.map(({ id, name }) => ({ id, name }))} state={supplierId} isLoading={isLoading} modal onChange={(_, value) => setSupplierId(String(value ?? ""))} placeholder="Laboratório ou assistência" />
            {!isLoading && suppliers.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">Nenhum fornecedor cadastrado. {canBuy
                ? <button type="button" className="underline text-primary" onClick={() => setNewSupplier(true)}>Cadastrar agora</button>
                : <Link to="/suprimentos/fornecedores" className="underline text-primary">Ver fornecedores</Link>}</p>
            )}
          </div>
          <div><Label htmlFor="serviceNotes">Observação</Label>
            <Textarea id="serviceNotes" className="mt-1" rows={2} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} /></div>
          {canBuy && (
            <div className="flex items-start gap-2">
              <Checkbox id="openPurchase" className="mt-0.5" checked={openPurchase} onCheckedChange={(checked) => setOpenPurchase(checked === true)} />
              <Label htmlFor="openPurchase" className="font-normal">Abrir pedido de compra do serviço (já preenchido, para aprovar e pagar)</Label>
            </div>
          )}
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Enviando..." : openPurchase && canBuy ? "Enviar e abrir o pedido" : "Enviar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
      {newSupplier && (
        <QuickSupplierDialog onClose={() => setNewSupplier(false)} onCreated={(supplier) => {
          queryClient.invalidateQueries({ queryKey: [EQUIP_KEYS.suppliers] });
          setSupplierId(String(supplier.id));
        }} />
      )}
    </Dialog>
  );
}

/** Cadastro rápido de fornecedor (o mesmo do pedido de compra: só nome, documento e Pix). */
export function QuickSupplierDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (supplier: { id: number; name: string }) => void }) {
  const [name, setName] = useState("");
  const [document, setDocument] = useState("");
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: async () => (await api.post<{ id: number; name: string }>("purchase-orders/suppliers", { name: name.trim(), document: document.replace(/\D/g, "") })).data,
    onSuccess: (supplier) => { toast({ title: `${supplier.name} cadastrado`, variant: "success" }); onCreated(supplier); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault(); event.stopPropagation();
    if (name.trim().length < 2) return setError("Informe o nome do fornecedor.");
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastrar fornecedor</DialogTitle>
          <DialogDescription>Só o essencial. O cadastro completo fica em Financeiro → Fornecedores.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div><Label htmlFor="quickSupplierName">Nome <span>*</span></Label>
            <Input id="quickSupplierName" name="quickSupplierName" value={name} maxLength={160} onValueChange={(_, value) => setName(String(value))} className="mt-1" placeholder="Ex.: Laboratório de metrologia" /></div>
          <div><Label htmlFor="quickSupplierDocument">CNPJ ou CPF</Label>
            <Input id="quickSupplierDocument" name="quickSupplierDocument" value={document} maxLength={18} onValueChange={(_, value) => setDocument(String(value))} className="mt-1" placeholder="Opcional" /></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Salvando..." : "Cadastrar"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- pedido de compra do serviço

/** A tela de Calibração guarda aqui o pedido do serviço; a do pedido lê com `?servico=1` e apaga. */
export const SERVICE_STORAGE_KEY = "worksafe.estoque.servico";
export interface ServiceDraft {
  stockServiceEventId: number; supplierId: number | null; title: string; group: string;
  items: Array<{ description: string; unit: string; quantity: number; unitPrice: number }>;
}
export function readServiceDraft(): ServiceDraft | null {
  try {
    const raw = sessionStorage.getItem(SERVICE_STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as ServiceDraft) : null;
    return parsed && Number(parsed.stockServiceEventId) > 0 ? parsed : null;
  } catch { return null; }
}
export function storeServiceDraft(service: ServiceRow): boolean {
  const title = `${service.kind === "manutencao" ? "Manutenção" : "Calibração"} ${service.tag ?? ""}`.trim();
  const draft: ServiceDraft = {
    stockServiceEventId: service.id, supplierId: service.supplierId, title, group: "outros",
    items: [{ description: `${title}${service.item ? ` — ${service.item}` : ""}`, unit: "serv", quantity: 1, unitPrice: service.cost ?? 0 }],
  };
  try { sessionStorage.setItem(SERVICE_STORAGE_KEY, JSON.stringify(draft)); return true; } catch { return false; }
}

// ---------------------------------------------------------------- etiquetas com QR

export interface LabelUnit { tag: string; item: string }
export const tagUrl = (tag: string) => `${window.location.origin}/e/${encodeURIComponent(tag)}`;
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** Prévia das etiquetas (QR + etiqueta + nome) e impressão numa janela própria. */
export function PrintLabelsDialog({ units, onClose }: { units: LabelUnit[]; onClose: () => void }) {
  const [codes, setCodes] = useState<Record<string, string>>({});
  const key = useMemo(() => units.map((u) => u.tag).join("|"), [units]);
  useEffect(() => {
    let alive = true;
    Promise.all(units.map(async (unit) => [unit.tag, await QRCode.toDataURL(tagUrl(unit.tag), { margin: 1, width: 240 })] as const))
      .then((pairs) => { if (alive) setCodes(Object.fromEntries(pairs)); })
      .catch(() => toast({ title: "Não foi possível gerar os QR codes", variant: "destructive" }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const ready = units.every((unit) => codes[unit.tag]);
  const print = () => {
    const win = window.open("", "_blank", "width=800,height=900");
    if (!win) return toast({ title: "O navegador bloqueou a janela de impressão", description: "Permita janelas deste site e tente de novo.", variant: "destructive" });
    const cells = units.map((unit) => `<div class="label"><img src="${codes[unit.tag]}" alt=""/><div><p class="tag">${escapeHtml(unit.tag)}</p><p class="name">${escapeHtml(unit.item)}</p></div></div>`).join("");
    win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Etiquetas</title><style>
      body{font-family:system-ui,sans-serif;margin:8mm}
      .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:4mm}
      .label{display:flex;gap:3mm;align-items:center;border:1px dashed #999;padding:2mm;break-inside:avoid}
      .label img{width:24mm;height:24mm}
      .tag{font-weight:700;font-size:12pt;margin:0}.name{font-size:8pt;margin:1mm 0 0}
      @media print{.label{border-color:#ddd}}
    </style></head><body><div class="grid">${cells}</div><script>window.onload=function(){window.print()}</script></body></html>`);
    win.document.close();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Imprimir etiquetas</DialogTitle>
          <DialogDescription>{units.length} etiqueta(s). O QR abre a ficha da peça no sistema (é preciso estar logado).</DialogDescription>
        </DialogHeader>
        {units.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma peça para imprimir.</p> : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {units.map((unit) => (
              <div key={unit.tag} className="flex items-center gap-2 rounded border border-dashed p-2">
                {codes[unit.tag] ? <img src={codes[unit.tag]} alt={`QR da etiqueta ${unit.tag}`} className="w-16 h-16" /> : <div className="w-16 h-16 bg-muted rounded" />}
                <div className="min-w-0"><p className="font-bold text-sm">{unit.tag}</p><p className="text-xs text-muted-foreground truncate">{unit.item}</p></div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Fechar</Button>
          <Button type="button" disabled={!ready || units.length === 0} onClick={print}><Icon name="printer" className="w-4 h-4 mr-1" /> Imprimir</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
