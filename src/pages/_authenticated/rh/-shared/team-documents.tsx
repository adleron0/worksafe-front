import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { toast } from "@/hooks/use-toast";
import useVerify from "@/hooks/use-verify";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import Icon from "@/components/general-components/Icon";
import { cn } from "@/lib/utils";
import { Tip, dateBr, errorMessage } from "../../comercial/-shared/commercial";
import { DOCS_ABILITY, fileErrorMessage, openDocument } from "./documents";

/** Documentos da equipe de uma obra: a tabela pessoa × documento e o pacote para a integração no cliente. */
type CellStatus = "em_dia" | "a_vencer" | "vence_antes" | "vencido" | "faltando" | "nao_enviado";
interface TeamDocuments {
  until: string | null; outside: string[];
  types: Array<{ id: number; name: string; folderName: string; inIntegration: boolean; required: boolean }>;
  rows: Array<{ id: number; name: string; role: string | null; cells: Array<{ typeId: number; documentId: number | null; expiryDate: string | null; status: CellStatus }> }>;
  summary: { vencido: number; faltando: number; vence_antes: number; a_vencer: number };
}
export const TEAM_DOCUMENTS_KEY = "serviceOrderTeamDocuments";

const CELL: Record<CellStatus, { icon: string; className: string; text: (expiry: string | null) => string }> = {
  em_dia: { icon: "circle-check", className: "text-green-700 dark:text-green-400", text: (expiry) => (expiry ? `Em dia, vale até ${dateBr(expiry)}` : "Em dia, não vence") },
  a_vencer: { icon: "clock", className: "text-amber-600 dark:text-amber-400", text: (expiry) => `Vence em ${dateBr(expiry)}` },
  vence_antes: { icon: "calendar-x", className: "text-amber-600 dark:text-amber-400", text: (expiry) => `Vence em ${dateBr(expiry)}, antes do fim da obra` },
  vencido: { icon: "circle-x", className: "text-red-600 dark:text-red-400", text: (expiry) => `Vencido em ${dateBr(expiry)}` },
  faltando: { icon: "circle-alert", className: "text-red-600 dark:text-red-400", text: () => "Obrigatório e não enviado" },
  nao_enviado: { icon: "minus", className: "text-muted-foreground/50", text: () => "Não enviado (não é obrigatório)" },
};

export function TeamDocumentsPanel({ orderId, orderNumber }: { orderId: number; orderNumber: string }) {
  const { can } = useVerify();
  const [packing, setPacking] = useState(false);
  const allowed = can(`view_${DOCS_ABILITY}`);
  const { data, isLoading, error } = useQuery({ queryKey: [TEAM_DOCUMENTS_KEY, orderId], enabled: allowed, queryFn: async () => (await api.get<TeamDocuments>(`service-orders/${orderId}/team-documents`)).data });

  if (!allowed) return null;
  // só as colunas que dizem alguma coisa: o que entra na integração e o que alguém enviou ou deve
  const columns = (data?.types ?? []).filter((type) => type.inIntegration || data?.rows.some((row) => row.cells.some((cell) => cell.typeId === type.id && cell.status !== "nao_enviado")));
  const problems = data ? data.summary.vencido + data.summary.faltando + data.summary.vence_antes : 0;

  return (
    <section className="min-w-0 rounded-card border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-semibold">Documentos da equipe</h2>
          <p className="text-xs text-muted-foreground">Para a integração no cliente: a situação dos documentos de quem está escalado{data?.until ? `, até o fim da obra (${dateBr(data.until)})` : ""}.</p>
        </div>
        {!!data?.rows.length && <Button type="button" variant="outline" size="sm" onClick={() => setPacking(true)}><Icon name="package" className="w-4 h-4 mr-1" /> Baixar pacote</Button>}
      </div>
      {error && <p className="mt-3 text-sm text-destructive">Erro: {errorMessage(error)}</p>}
      {isLoading && <Skeleton className="mt-3 h-24 w-full" />}
      {data && !data.rows.length && <p className="mt-3 text-sm text-muted-foreground">Ninguém da equipe está ligado ao cadastro de funcionários. Inclua as pessoas em "Equipe escalada" pelo botão "Incluir funcionário".</p>}
      {data && data.rows.length > 0 && (
        <>
          <p className={cn("mt-3 text-sm", problems ? "text-red-600 dark:text-red-400" : "text-green-700 dark:text-green-400")}>
            {problems ? [data.summary.vencido && `${data.summary.vencido} vencido(s)`, data.summary.faltando && `${data.summary.faltando} obrigatório(s) faltando`, data.summary.vence_antes && `${data.summary.vence_antes} vence(m) antes do fim da obra`].filter(Boolean).join(" · ") : "Nenhuma pendência nos documentos da equipe."}
          </p>
          <div className="mt-2 overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs">
                  <th className="sticky left-0 z-10 bg-muted px-3 py-2 font-semibold">Pessoa</th>
                  {columns.map((type) => <th key={type.id} className="px-2 py-2 text-center font-medium whitespace-nowrap">{type.name}</th>)}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.id} className="border-b last:border-b-0">
                    <td className="sticky left-0 z-10 bg-background px-3 py-2"><p className="font-medium whitespace-nowrap">{row.name}</p><p className="text-xs text-muted-foreground whitespace-nowrap">{row.role ?? "—"}</p></td>
                    {columns.map((type) => {
                      const cell = row.cells.find((item) => item.typeId === type.id);
                      const look = CELL[cell?.status ?? "nao_enviado"];
                      const icon = <Icon name={look.icon} className={cn("w-4 h-4", look.className)} />;
                      return (
                        <td key={type.id} className="px-2 py-2 text-center">
                          <Tip text={`${type.name}: ${look.text(cell?.expiryDate ?? null)}`}>
                            {cell?.documentId
                              ? <button type="button" className="inline-flex" aria-label={`${row.name}, ${type.name}: ${look.text(cell.expiryDate)}. Abrir o documento`} onClick={() => openDocument({ id: cell.documentId as number, fileName: type.name })}>{icon}</button>
                              : <span className="inline-flex" aria-label={`${row.name}, ${type.name}: ${look.text(null)}`}>{icon}</span>}
                          </Tip>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.outside.length > 0 && <p className="mt-2 text-xs text-muted-foreground">Fora do cadastro (sem documentos aqui): {data.outside.join(", ")}.</p>}
        </>
      )}
      {packing && data && <PackageDialog orderId={orderId} orderNumber={orderNumber} data={data} onClose={() => setPacking(false)} />}
    </section>
  );
}

/** Escolher o que entra no pacote: os tipos marcados "entra na integração" já vêm selecionados. */
function PackageDialog({ orderId, orderNumber, data, onClose }: { orderId: number; orderNumber: string; data: TeamDocuments; onClose: () => void }) {
  const [typeIds, setTypeIds] = useState<number[]>(() => data.types.filter((type) => type.inIntegration).map((type) => type.id));
  const [employeeIds, setEmployeeIds] = useState<number[]>(() => data.rows.map((row) => row.id));
  const toggle = (list: number[], id: number) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  const files = data.rows.filter((row) => employeeIds.includes(row.id)).reduce((sum, row) => sum + row.cells.filter((cell) => typeIds.includes(cell.typeId) && cell.documentId).length, 0);

  const { mutate, isPending } = useMutation({
    mutationFn: async () => (await api.post<Blob>(`service-orders/${orderId}/team-documents/package`, { typeIds, employeeIds }, { responseType: "blob" })).data,
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = `Documentos ${orderNumber}.zip`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast({ title: "Pacote gerado", description: `${files} ${files === 1 ? "arquivo" : "arquivos"} e a folha de rosto.`, variant: "success" });
      onClose();
    },
    onError: async (err) => toast({ title: "Não foi possível gerar o pacote", description: await fileErrorMessage(err), variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Pacote de documentos da equipe</DialogTitle>
          <DialogDescription>Um ZIP com uma pasta por pessoa e uma folha de rosto (planilha) com a validade de cada documento. O download fica registrado.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm font-medium">Tipos de documento</p>
            <div className="mt-2 grid max-h-64 gap-2 overflow-y-auto rounded-md border p-3">
              {data.types.map((type) => (
                <div key={type.id} className="flex items-center gap-2">
                  <Checkbox id={`packType-${type.id}`} checked={typeIds.includes(type.id)} onCheckedChange={() => setTypeIds(toggle(typeIds, type.id))} />
                  <Label htmlFor={`packType-${type.id}`} className="font-normal">{type.name}</Label>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium">Pessoas</p>
            <div className="mt-2 grid max-h-64 gap-2 overflow-y-auto rounded-md border p-3">
              {data.rows.map((row) => (
                <div key={row.id} className="flex items-center gap-2">
                  <Checkbox id={`packEmployee-${row.id}`} checked={employeeIds.includes(row.id)} onCheckedChange={() => setEmployeeIds(toggle(employeeIds, row.id))} />
                  <Label htmlFor={`packEmployee-${row.id}`} className="font-normal">{row.name}</Label>
                </div>
              ))}
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">{files ? `${files} ${files === 1 ? "arquivo entra" : "arquivos entram"} no pacote.` : "Nenhum arquivo com essa escolha: o pacote teria só a folha de rosto."} Documento vencido também entra, marcado na folha de rosto.</p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
          <Button type="button" disabled={isPending || !typeIds.length || !employeeIds.length} onClick={() => mutate()}>{isPending ? "Gerando..." : "Baixar pacote"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
