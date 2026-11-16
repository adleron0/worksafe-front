import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import Select from "@/components/general-components/Select";
import SignaturePad from "@/components/general-components/SignaturePad";
import { NumField, Tip, dateBr, errorMessage, newUid } from "../../comercial/-shared/commercial";
import { DueBadge, DueState, ItemOption, Pill, STOCK_KEYS, qty, stockApi, toOptions, useStockOptions } from "./stock";
import { LotPicker, UnitPicker } from "./stock-pickers";

/** EPI: entrega (com assinatura), devolução, troca, ficha e pendências. */

export const PPE_ABILITY = "entregas_epi";
export const PPE_KEYS = { employees: "ppeEmployees", employee: "ppeEmployee", pending: "ppePending", items: "ppeItemOptions" } as const;

export const PPE_REASONS = [
  { id: "admissao", name: "Admissão" }, { id: "troca_desgaste", name: "Troca por desgaste" }, { id: "troca_dano", name: "Troca por dano" },
  { id: "perda", name: "Perda" }, { id: "troca_periodica", name: "Troca periódica" }, { id: "outro", name: "Outro" },
];
const EXCHANGE_REASONS = PPE_REASONS.filter((reason) => reason.id.startsWith("troca") || reason.id === "perda");
const TYPE_LABEL: Record<string, string> = { entrega_epi: "Entrega", devolucao_epi: "Devolução", baixa: "Descarte" };

export interface PpeEmployeeRow { id: number; name: string; terminated: boolean; holding: number }
export interface PpeHolding {
  itemId: number; code: string; item: string; unit: string; lotId: number | null; lot: string | null; unitId: number | null; tag: string | null; quantity: number;
  caNumber: string | null; caState: DueState | null; deliveredAt: string | null; replaceAt: string | null; replaceState: DueState | null;
}
export interface PpeHistory {
  id: number; number: string; type: string; date: string; reason: string | null; reasonLabel: string | null; reversed: boolean; by: string | null; signed: boolean; signedBy: string | null;
  lines: Array<{ itemId: number; item: string; caNumber: string | null; quantity: number; unit: string; tag: string | null }>;
}
export interface EmployeePpe { employee: { id: number; name: string; terminated: boolean; admissionDate: string | null }; holding: PpeHolding[]; history: PpeHistory[] }
export interface PpePendingRow { kind: "desligado" | "troca" | "ca"; label: string; employeeId: number; employee: string; item: string; tag: string | null; quantity: number; date: string | null }
interface PpeSheet {
  company: { name: string; corporateName: string; cnpj: string };
  employee: { name: string; cpf: string | null; registration: string | null; admissionDate: string | null; role: string | null };
  entries: Array<{ date: string; type: string; item: string; caNumber: string | null; quantity: number; unit: string; tag: string | null; reason: string | null; movementId: number; signed: boolean; signedBy: string | null }>;
  generatedAt: string;
}
interface DeliverResult { movementId: number; number: string; warnings: string[] }

export const usePpeEmployee = (employeeId: number | null) => useQuery({
  queryKey: [PPE_KEYS.employee, employeeId],
  queryFn: () => stockApi.get<EmployeePpe>(`ppe/employees/${employeeId}`),
  enabled: !!employeeId,
});

/** Depois de entregar, devolver ou trocar. */
function usePpeRefresh() {
  const queryClient = useQueryClient();
  return () => {
    for (const key of [PPE_KEYS.employee, PPE_KEYS.employees, PPE_KEYS.pending, PPE_KEYS.items, STOCK_KEYS.balances, STOCK_KEYS.items, STOCK_KEYS.item, STOCK_KEYS.movements, STOCK_KEYS.overview, STOCK_KEYS.itemOptions, STOCK_KEYS.unitOptions, STOCK_KEYS.lotOptions]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  };
}

// ---------------------------------------------------------------- assinatura e ficha

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result));
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(blob);
});
/** A imagem vem de uma rota com token: busca pelo axios e vira data URL. */
export async function fetchSignature(movementId: number) {
  const response = await api.get<Blob>(`stock/ppe/signatures/${movementId}`, { responseType: "blob" });
  return blobToDataUrl(response.data);
}

function SignatureDialog({ movementId, signedBy, onClose }: { movementId: number; signedBy: string | null; onClose: () => void }) {
  const { data, isLoading, error } = useQuery({ queryKey: ["ppeSignature", movementId], queryFn: () => fetchSignature(movementId), staleTime: Infinity });
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assinatura</DialogTitle>
          <DialogDescription>{signedBy ? `Assinado por ${signedBy}` : "Assinatura desenhada na entrega"}</DialogDescription>
        </DialogHeader>
        {isLoading && <Skeleton className="h-40 w-full" />}
        {error && <p className="text-destructive text-sm">Não foi possível carregar: {errorMessage(error)}</p>}
        {data && <img src={data} alt="Assinatura" className="w-full rounded border bg-white" />}
        <DialogFooter><Button type="button" variant="outline" onClick={onClose}>Fechar</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const esc = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const cnpjText = (value: string) => {
  const d = value.replace(/\D/g, "");
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : value;
};
const cpfText = (value: string) => {
  const d = value.replace(/\D/g, "");
  return d.length === 11 ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4") : value;
};

/**
 * Ficha de EPI: abre uma janela só com a ficha e chama a impressão do navegador
 * (dali dá para salvar em PDF). A janela abre no clique, antes de buscar os dados,
 * para o navegador não bloquear.
 */
export async function printPpeSheet(employeeId: number) {
  const win = window.open("", "_blank");
  if (!win) return toast({ title: "O navegador bloqueou a janela da ficha", description: "Permita janelas deste site e tente de novo.", variant: "destructive" });
  win.document.write("<p style='font-family:sans-serif;padding:24px'>Gerando a ficha de EPI...</p>");
  try {
    const sheet = await stockApi.get<PpeSheet>(`ppe/employees/${employeeId}/sheet`);
    const ids = [...new Set(sheet.entries.filter((entry) => entry.signed).map((entry) => entry.movementId))];
    const images = new Map<number, string>();
    await Promise.all(ids.map(async (id) => { try { images.set(id, await fetchSignature(id)); } catch { /* sem imagem: fica o nome */ } }));
    const rows = sheet.entries.map((entry) => `
      <tr>
        <td>${esc(dateBr(entry.date))}</td><td>${esc(entry.type)}${entry.reason ? `<br><small>${esc(entry.reason)}</small>` : ""}</td>
        <td>${esc(entry.item)}${entry.tag ? `<br><small>peça ${esc(entry.tag)}</small>` : ""}</td><td>${esc(entry.caNumber ?? "—")}</td>
        <td class="n">${esc(qty(entry.quantity))} ${esc(entry.unit)}</td>
        <td class="sig">${images.has(entry.movementId) ? `<img src="${images.get(entry.movementId)}" alt="">` : ""}${entry.signedBy ? `<small>${esc(entry.signedBy)}</small>` : ""}</td>
      </tr>`).join("");
    const e = sheet.employee;
    win.document.open();
    win.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Ficha de EPI - ${esc(e.name)}</title>
      <style>
        *{box-sizing:border-box} body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:24px;font-size:12px}
        h1{font-size:16px;margin:0 0 4px} h2{font-size:13px;margin:16px 0 6px}
        .head{display:flex;justify-content:space-between;gap:16px;border-bottom:2px solid #111;padding-bottom:8px}
        .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:4px 16px;margin-top:8px}
        table{width:100%;border-collapse:collapse;margin-top:8px} th,td{border:1px solid #999;padding:4px 6px;vertical-align:middle;text-align:left}
        th{background:#eee} td.n{text-align:right;white-space:nowrap} td.sig{width:170px;text-align:center} td.sig img{max-width:160px;max-height:50px;display:block;margin:0 auto}
        small{color:#555} .term{margin-top:16px;line-height:1.5} .foot{margin-top:24px;color:#555;font-size:10px}
        @media print{body{margin:10mm} button{display:none}}
      </style></head><body>
      <div class="head"><div><h1>${esc(sheet.company.name || sheet.company.corporateName)}</h1><div>${esc(sheet.company.corporateName)}${sheet.company.cnpj ? ` · CNPJ ${esc(cnpjText(sheet.company.cnpj))}` : ""}</div></div>
      <div style="text-align:right"><strong>FICHA DE CONTROLE DE EPI</strong><br><small>NR-6</small></div></div>
      <div class="grid">
        <div><strong>Funcionário:</strong> ${esc(e.name)}</div><div><strong>Função:</strong> ${esc(e.role ?? "—")}</div>
        <div><strong>Matrícula:</strong> ${esc(e.registration ?? "—")}</div><div><strong>Admissão:</strong> ${esc(dateBr(e.admissionDate))}</div>
        ${e.cpf ? `<div><strong>CPF:</strong> ${esc(cpfText(e.cpf))}</div>` : ""}
      </div>
      <p class="term">Declaro ter recebido os Equipamentos de Proteção Individual abaixo, em perfeito estado, e o treinamento para o uso correto, comprometendo-me a usá-los
      apenas para a finalidade a que se destinam, a guardá-los e conservá-los, e a comunicar qualquer alteração que os torne impróprios para uso.</p>
      <h2>Entregas e devoluções</h2>
      <table><thead><tr><th>Data</th><th>Tipo</th><th>Item</th><th>CA</th><th>Qtd.</th><th>Assinatura</th></tr></thead>
      <tbody>${rows || `<tr><td colspan="6">Nenhuma entrega registrada.</td></tr>`}</tbody></table>
      <p class="foot">Gerada em ${esc(new Date(sheet.generatedAt).toLocaleString("pt-BR"))}.</p>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
      </body></html>`);
    win.document.close();
  } catch (error) {
    win.close();
    toast({ title: "Não foi possível gerar a ficha", description: errorMessage(error), variant: "destructive" });
  }
}

// ---------------------------------------------------------------- o que está com o funcionário

export function EmployeePpePanel({ employeeId, readOnly = false, onDeliver, onReturn, onExchange }: {
  employeeId: number; readOnly?: boolean; onDeliver?: () => void; onReturn?: () => void; onExchange?: () => void;
}) {
  const { can } = useVerify();
  const [signature, setSignature] = useState<PpeHistory | null>(null);
  const { data, isLoading, error } = usePpeEmployee(employeeId);
  if (error) return <p className="text-destructive text-sm">Erro: {errorMessage(error)}</p>;
  if (isLoading || !data) return <Skeleton className="h-48 w-full" />;
  const canMove = !readOnly && can(`create_${PPE_ABILITY}`);
  return (
    <div className="grid lg:grid-cols-2 gap-4 items-start">
      <section className="rounded-lg border p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Com o funcionário agora</h2>
          <div className="flex flex-wrap gap-2">
            {canMove && !data.employee.terminated && onDeliver && <Button size="sm" onClick={onDeliver}><Icon name="hard-hat" className="w-3 h-3 mr-1" /> Entregar</Button>}
            {canMove && data.holding.length > 0 && onExchange && !data.employee.terminated && <Button size="sm" variant="outline" onClick={onExchange}><Icon name="repeat" className="w-3 h-3 mr-1" /> Trocar</Button>}
            {canMove && data.holding.length > 0 && onReturn && <Button size="sm" variant="outline" onClick={onReturn}><Icon name="undo-2" className="w-3 h-3 mr-1" /> Devolver</Button>}
            {can(`view_${PPE_ABILITY}`) && <Button size="sm" variant="outline" onClick={() => printPpeSheet(employeeId)}><Icon name="printer" className="w-3 h-3 mr-1" /> Gerar ficha</Button>}
          </div>
        </div>
        {data.employee.terminated && <p className="mt-2 text-sm text-red-600 dark:text-red-400">Funcionário desligado: não recebe EPI. Recolha o que está com ele.</p>}
        {data.holding.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nada do estoque está com este funcionário.</p> : (
          <ul className="mt-2 divide-y text-sm">
            {data.holding.map((row, index) => (
              <li key={`${row.itemId}-${row.lotId}-${row.unitId}-${index}`} className="py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="flex-1 min-w-0">
                  <p className="truncate">{row.item}{row.tag ? <span className="text-xs text-muted-foreground"> · peça {row.tag}</span> : row.lot ? <span className="text-xs text-muted-foreground"> · lote {row.lot}</span> : null}</p>
                  <p className="text-xs text-muted-foreground">{[row.caNumber && `CA ${row.caNumber}`, row.deliveredAt && `entregue ${dateBr(row.deliveredAt)}`, row.replaceAt && `trocar até ${dateBr(row.replaceAt)}`].filter(Boolean).join(" · ") || " "}</p>
                </div>
                {row.caState === "vencido" && <DueBadge state="vencido" label="CA vencido" />}
                {row.replaceState && row.replaceState !== "em_dia" && <DueBadge state={row.replaceState} label={row.replaceState === "vencido" ? "Troca vencida" : "Troca próxima"} />}
                <span className="tabular-nums font-medium">{qty(row.quantity)} {row.unit}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="rounded-lg border p-4">
        <h2 className="font-semibold">Histórico</h2>
        {data.history.length === 0 ? <p className="mt-2 text-sm text-muted-foreground">Nenhuma entrega ou devolução.</p> : (
          <ul className="mt-2 divide-y text-sm max-h-[480px] overflow-y-auto">
            {data.history.map((entry) => (
              <li key={entry.id} className="py-2">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="tabular-nums text-xs text-muted-foreground">{dateBr(entry.date)}</span>
                  <span className="font-medium">{TYPE_LABEL[entry.type] ?? entry.type}</span>
                  {entry.reasonLabel && <span className="text-xs text-muted-foreground">· {entry.reasonLabel}</span>}
                  <span className="text-xs text-muted-foreground tabular-nums">· {entry.number}</span>
                  {entry.reversed && <Pill tone="red">Estornada</Pill>}
                  {entry.signed && (
                    <Tip text={entry.signedBy ? `Assinado por ${entry.signedBy}` : "Ver a assinatura"}>
                      <Button type="button" variant="ghost" size="sm" className="h-6 px-1.5 text-xs" onClick={() => setSignature(entry)}><Icon name="signature" className="w-3 h-3 mr-1" /> Assinatura</Button>
                    </Tip>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{entry.lines.map((line) => `${qty(line.quantity)} ${line.unit} ${line.item}${line.tag ? ` (${line.tag})` : ""}`).join(", ")}{entry.by ? ` · por ${entry.by}` : ""}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
      {signature && <SignatureDialog movementId={signature.id} signedBy={signature.signedBy} onClose={() => setSignature(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------- linhas de EPI a entregar

interface PpeLine { key: string; itemId: string; quantity: number; lotId: string; unitId: string }
const emptyPpeLine = (): PpeLine => ({ key: newUid(), itemId: "", quantity: 1, lotId: "", unitId: "" });

/** Itens EPI com o saldo no local. */
function usePpeItems(locationId: string) {
  return useQuery({
    queryKey: [PPE_KEYS.items, locationId],
    queryFn: () => stockApi.get<ItemOption[]>("items/options", { flag: "epi", ...(locationId ? { locationId } : {}) }),
    retry: false,
  });
}

function ppeLinesError(lines: PpeLine[], items: ItemOption[]) {
  const used = lines.filter((line) => line.itemId);
  if (!used.length) return "Escolha o que será entregue.";
  for (const [index, line] of used.entries()) {
    const item = items.find((option) => String(option.id) === line.itemId);
    const label = `Linha ${index + 1}${item ? ` (${item.label})` : ""}`;
    if (item?.tracking === "unidade" && !line.unitId) return `${label}: escolha a peça.`;
    if (item?.tracking === "lote" && !line.lotId) return `${label}: escolha o lote.`;
    if (item?.tracking !== "unidade" && !(line.quantity > 0)) return `${label}: informe a quantidade.`;
  }
  const units = used.filter((line) => line.unitId).map((line) => line.unitId);
  if (new Set(units).size !== units.length) return "A mesma peça foi escolhida duas vezes.";
  return "";
}
const ppeLinesBody = (lines: PpeLine[], items: ItemOption[]) => lines.filter((line) => line.itemId).map((line) => {
  const item = items.find((option) => String(option.id) === line.itemId);
  return item?.tracking === "unidade" ? { itemId: Number(line.itemId), unitId: Number(line.unitId), quantity: 1 }
    : { itemId: Number(line.itemId), quantity: line.quantity, ...(item?.tracking === "lote" ? { lotId: Number(line.lotId) } : {}) };
});

function PpeLinesEditor({ lines, onChange, items, loading, locationId }: { lines: PpeLine[]; onChange: (lines: PpeLine[]) => void; items: ItemOption[]; loading: boolean; locationId: string }) {
  const setLine = (key: string, patch: Partial<PpeLine>) => onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  const options = items.map((item) => ({ id: item.id, name: `${item.name} · ${qty(item.available)} ${item.unit} aqui` }));
  return (
    <div className="grid gap-3">
      {!loading && items.length === 0 && <p className="text-sm text-muted-foreground">Nenhum item marcado como EPI. Marque "É EPI" na ficha do item.</p>}
      {lines.map((line, index) => {
        const item = items.find((option) => String(option.id) === line.itemId);
        return (
          <div key={line.key} className="rounded border p-3 grid gap-2">
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-12 sm:col-span-7">
                {index === 0 && <Label className="text-xs">EPI</Label>}
                <Select name={`ppe-item-${line.key}`} options={options} state={line.itemId} isLoading={loading} modal onChange={(_, value) => setLine(line.key, { itemId: String(value ?? ""), lotId: "", unitId: "", quantity: 1 })} placeholder="Escolha o EPI" />
              </div>
              <div className="col-span-10 sm:col-span-4">
                {index === 0 && <Label className="text-xs">Quantidade</Label>}
                {item?.tracking === "unidade" ? <p className="text-sm text-muted-foreground pb-2">1 peça</p>
                  : <NumField value={line.quantity} digits={3} suffix={item?.unit} ariaLabel={`Quantidade da linha ${index + 1}`} onChange={(value) => setLine(line.key, { quantity: value })} />}
              </div>
              <div className="col-span-2 sm:col-span-1 flex justify-end">
                {lines.length > 1 && <Tip text="Remover a linha"><Button type="button" variant="ghost" size="sm" className="h-9 w-9 p-0" aria-label={`Remover a linha ${index + 1}`} onClick={() => onChange(lines.filter((l) => l.key !== line.key))}><Icon name="trash-2" className="w-4 h-4" /></Button></Tip>}
              </div>
            </div>
            {item?.tracking === "unidade" && (
              <div><Label className="text-xs">Peça <span>*</span></Label>
                <UnitPicker name={`ppe-unit-${line.key}`} itemId={line.itemId} holderType="local" holderId={locationId} value={line.unitId} onChange={(value) => setLine(line.key, { unitId: value })}
                  exclude={lines.filter((l) => l.key !== line.key && l.unitId).map((l) => l.unitId)} /></div>
            )}
            {item?.tracking === "lote" && (
              <div><Label className="text-xs">Lote <span>*</span></Label>
                <LotPicker name={`ppe-lot-${line.key}`} itemId={line.itemId} locationId={locationId} value={line.lotId} unit={item.unit} onChange={(value) => setLine(line.key, { lotId: value })} /></div>
            )}
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => onChange([...lines, emptyPpeLine()])}><Icon name="plus" className="w-3 h-3 mr-1" /> Adicionar EPI</Button>
    </div>
  );
}

/** Obras abertas para marcar a entrega (custo vai para a OS); só para quem vê os pedidos de compra. */
function useServiceOrderOptions() {
  const { can } = useVerify();
  return useQuery({
    queryKey: ["purchaseOrderOptions"],
    queryFn: async () => (await api.get<{ serviceOrders: Array<{ id: number; name: string }> }>("purchase-orders/options")).data,
    enabled: can("list_pedidos_de_compra"),
    retry: false,
  });
}

// ---------------------------------------------------------------- devolução (linhas do que está com ele)

interface BackLine { key: string; holding: PpeHolding; include: boolean; quantity: number }
const backLinesOf = (holding: PpeHolding[]): BackLine[] => holding.map((row, index) => ({ key: `h${index}`, holding: row, include: false, quantity: row.quantity }));
const backBody = (lines: BackLine[]) => lines.filter((line) => line.include && (line.holding.unitId || line.quantity > 0)).map((line) => ({
  itemId: line.holding.itemId, ...(line.holding.lotId ? { lotId: line.holding.lotId } : {}), ...(line.holding.unitId ? { unitId: line.holding.unitId } : {}),
  quantity: line.holding.unitId ? 1 : line.quantity,
}));

function BackLinesEditor({ lines, onChange }: { lines: BackLine[]; onChange: (lines: BackLine[]) => void }) {
  const setLine = (key: string, patch: Partial<BackLine>) => onChange(lines.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  return (
    <div className="rounded border divide-y">
      {lines.map((line) => (
        <div key={line.key} className="p-3 grid sm:grid-cols-12 gap-2 items-center text-sm">
          <div className="sm:col-span-8 flex items-center gap-2 min-w-0">
            <Checkbox id={`back-${line.key}`} checked={line.include} onCheckedChange={(checked) => setLine(line.key, { include: checked === true })} />
            <Label htmlFor={`back-${line.key}`} className="font-normal truncate">{line.holding.item}{line.holding.tag ? ` · peça ${line.holding.tag}` : line.holding.lot ? ` · lote ${line.holding.lot}` : ""}</Label>
          </div>
          <div className="sm:col-span-4">
            {line.holding.unitId ? <span className="text-xs text-muted-foreground">1 peça</span> : (
              <NumField value={line.quantity} digits={3} suffix={line.holding.unit} ariaLabel={`Quantidade devolvida de ${line.holding.item}`} disabled={!line.include} onChange={(value) => setLine(line.key, { quantity: value })} />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- entregar / trocar

/** Entrega e troca compartilham o formulário: a troca acrescenta o que volta. */
export function PpeDeliverDialog({ employee, exchange = false, holding = [], onClose }: { employee: { id: number; name: string }; exchange?: boolean; holding?: PpeHolding[]; onClose: () => void }) {
  const refresh = usePpeRefresh();
  const { data: options } = useStockOptions();
  const { data: orders } = useServiceOrderOptions();
  const locations = options?.locations ?? [];
  const [locationId, setLocationId] = useState("");
  const location = locationId || (locations[0] ? String(locations[0].id) : "");
  const { data: items = [], isLoading } = usePpeItems(location);
  const [reason, setReason] = useState(exchange ? "troca_desgaste" : "admissao");
  const [serviceOrderId, setServiceOrderId] = useState("");
  const [costCenterId, setCostCenterId] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<PpeLine[]>([emptyPpeLine()]);
  const [back, setBack] = useState<BackLine[]>(() => backLinesOf(holding));
  const [discard, setDiscard] = useState(true);
  const [signatureName, setSignatureName] = useState(employee.name);
  const [signatureImage, setSignatureImage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DeliverResult | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const body = {
        employeeId: employee.id, locationId: Number(location), reason, note: note.trim() || null,
        ...(serviceOrderId ? { serviceOrderId: Number(serviceOrderId) } : {}), ...(costCenterId ? { costCenterId: Number(costCenterId) } : {}),
        lines: ppeLinesBody(lines, items), signatureName: signatureName.trim() || null, signatureImage,
      };
      if (!exchange) return stockApi.post<DeliverResult>("ppe/deliveries", body);
      const done = await stockApi.post<{ delivered: DeliverResult }>("ppe/exchanges", { ...body, discard, returnLines: backBody(back) });
      return done.delivered;
    },
    onSuccess: (value) => {
      refresh();
      toast({ title: `${value.number}: ${exchange ? "troca registrada" : "entrega registrada"}`, variant: "success" });
      if (value.warnings?.length) setResult(value); else onClose();
    },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!location) return setError("Escolha de qual local sai.");
    if (exchange && !backBody(back).length) return setError("Marque o que o funcionário está devolvendo.");
    const problem = ppeLinesError(lines, items);
    if (problem) return setError(problem);
    if (!signatureImage) return setError("Peça para o funcionário assinar no quadro.");
    setError(""); mutate();
  };

  if (result) {
    return (
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{result.number}: registrada, com avisos</DialogTitle>
            <DialogDescription>A entrega foi feita. Confira os pontos abaixo.</DialogDescription>
          </DialogHeader>
          <ul className="grid gap-2 text-sm">
            {result.warnings.map((warning, index) => <li key={index} className="flex gap-2"><Icon name="triangle-alert" className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" /> {warning}</li>)}
          </ul>
          <DialogFooter><Button type="button" onClick={onClose}>Entendi</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{exchange ? "Trocar EPI" : "Entregar EPI"}: {employee.name}</DialogTitle>
          <DialogDescription>{exchange ? "O que está com ele volta (ou é descartado) e o novo sai do local escolhido." : "Sai do local escolhido para o funcionário, com a assinatura dele na tela."}</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <div className="grid sm:grid-cols-2 gap-3">
            <div><Label>Sai de <span>*</span></Label>
              <Select name="locationId" options={locations} state={location} modal onChange={(_, value) => { setLocationId(String(value ?? "")); setLines((current) => current.map((line) => ({ ...line, lotId: "", unitId: "" }))); }} placeholder="Escolha o local" /></div>
            <div><Label>Motivo</Label>
              <Select name="reason" options={exchange ? EXCHANGE_REASONS : PPE_REASONS} state={reason} modal onChange={(_, value) => setReason(String(value || reason))} /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {orders && (
              <div><Label>Para a obra</Label>
                <Select name="serviceOrderId" options={orders.serviceOrders} state={serviceOrderId} clearable modal onChange={(_, value) => setServiceOrderId(String(value ?? ""))} placeholder="Nenhuma (custo da empresa)" />
                <p className="text-xs text-muted-foreground mt-1">Marcada para uma obra, o custo do EPI conta nela.</p></div>
            )}
            <div><Label>Centro de custo</Label>
              <Select name="costCenterId" options={toOptions(options?.costCenters)} state={costCenterId} clearable modal onChange={(_, value) => setCostCenterId(String(value ?? ""))} placeholder="Nenhum" /></div>
          </div>
          {exchange && (
            <section className="grid gap-2">
              <h3 className="text-sm font-semibold">O que volta</h3>
              <BackLinesEditor lines={back} onChange={setBack} />
              <div className="flex items-center gap-2">
                <Checkbox id="discard" checked={discard} onCheckedChange={(checked) => setDiscard(checked === true)} />
                <Label htmlFor="discard">Descartar o que voltou (sem isso, volta para o local)</Label>
              </div>
            </section>
          )}
          <section className="grid gap-2">
            {exchange && <h3 className="text-sm font-semibold">O que sai</h3>}
            <PpeLinesEditor lines={lines} onChange={setLines} items={items} loading={isLoading} locationId={location} />
          </section>
          <div><Label htmlFor="ppeNote">Observação (opcional)</Label>
            <Textarea id="ppeNote" className="mt-1" rows={2} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></div>
          <section className="grid gap-2 rounded-lg border p-3">
            <div><Label htmlFor="signatureName">Nome de quem assina</Label>
              <Input id="signatureName" name="signatureName" value={signatureName} maxLength={160} onValueChange={(_, value) => setSignatureName(String(value))} className="mt-1" /></div>
            <SignaturePad onChange={setSignatureImage} label="O funcionário assina aqui" />
          </section>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Registrando..." : exchange ? "Registrar a troca" : "Registrar a entrega"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PpeReturnDialog({ employee, holding, onClose }: { employee: { id: number; name: string }; holding: PpeHolding[]; onClose: () => void }) {
  const refresh = usePpeRefresh();
  const { data: options } = useStockOptions();
  const locations = options?.locations ?? [];
  const [locationId, setLocationId] = useState("");
  const [discard, setDiscard] = useState(false);
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<BackLine[]>(() => backLinesOf(holding).map((line) => ({ ...line, include: true })));
  const [error, setError] = useState("");
  const location = locationId || (locations[0] ? String(locations[0].id) : "");
  useEffect(() => { setLines(backLinesOf(holding).map((line) => ({ ...line, include: true }))); }, [holding]);
  const { mutate, isPending } = useMutation({
    mutationFn: () => stockApi.post<{ movementId: number; number: string }>("ppe/returns", {
      employeeId: employee.id, discard, ...(discard ? {} : { locationId: Number(location) }), note: note.trim() || null, lines: backBody(lines),
    }),
    onSuccess: (value) => { refresh(); toast({ title: `${value.number}: ${discard ? "descarte registrado" : "devolução registrada"}`, variant: "success" }); onClose(); },
    onError: (err) => setError(errorMessage(err)),
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!backBody(lines).length) return setError("Marque o que foi devolvido.");
    if (!discard && !location) return setError("Escolha para qual local volta.");
    const over = lines.find((line) => line.include && line.quantity > line.holding.quantity + 0.0005);
    if (over) return setError(`${over.holding.item}: o funcionário só tem ${qty(over.holding.quantity)}.`);
    setError(""); mutate();
  };
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Devolução de EPI: {employee.name}</DialogTitle>
          <DialogDescription>O que volta em condição de uso vai para o local (peça que exige inspeção volta esperando inspeção). O que não serve mais, descarte.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <BackLinesEditor lines={lines} onChange={setLines} />
          <div className="flex items-center gap-2">
            <Checkbox id="returnDiscard" checked={discard} onCheckedChange={(checked) => setDiscard(checked === true)} />
            <Label htmlFor="returnDiscard">Descartar (não volta para o estoque)</Label>
          </div>
          {!discard && (
            <div className="sm:w-1/2"><Label>Volta para <span>*</span></Label>
              <Select name="returnLocation" options={locations} state={location} modal onChange={(_, value) => setLocationId(String(value ?? ""))} placeholder="Escolha o local" /></div>
          )}
          <div><Label htmlFor="returnNote">Observação (opcional)</Label>
            <Textarea id="returnNote" className="mt-1" rows={2} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} /></div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Voltar</Button>
            <Button type="submit" disabled={isPending}>{isPending ? "Registrando..." : discard ? "Registrar o descarte" : "Registrar a devolução"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Para a ficha do funcionário no RH: só leitura, com o atalho para entregar. */
export function EmployeePpeTab({ employeeId }: { employeeId: number }) {
  const { can } = useVerify();
  return (
    <div className="grid gap-3">
      {can(`view_${PPE_ABILITY}`) && can(`create_${PPE_ABILITY}`) && (
        <Button asChild size="sm" variant="outline" className="w-fit">
          <Link to="/suprimentos/estoque/epi" search={{ employeeId }}><Icon name="hard-hat" className="w-3 h-3 mr-1" /> Entregar EPI</Link>
        </Button>
      )}
      <EmployeePpePanel employeeId={employeeId} readOnly />
    </div>
  );
}
