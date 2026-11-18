import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Dialog from "@/components/general-components/Dialog";
import Icon from "@/components/general-components/Icon";
import { ReservationReport, dateBr, formatCnpj, formatCpf, reservationsApi } from "./api";
import { escapeHtml, printHtml } from "./print";

const mark = (value: boolean | null) => (value === null ? "—" : value ? "P" : "F");

/**
 * O que a empresa pede depois do treinamento: os alunos dela, presença por
 * dia, resultado da prova e o link do certificado. Dá para imprimir/salvar em PDF.
 */
export default function RelatorioEmpresaDialog({ reservationId, onClose }: { reservationId: number; onClose: () => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["reservationReport", reservationId],
    queryFn: () => reservationsApi.get<ReservationReport>(`${reservationId}/report`),
  });
  const r = data?.reservation;
  const certUrl = (key: string) => `${window.location.origin}/certificados/${key}`;

  const print = () => {
    if (!data || !r) return;
    const head = data.days.map((d) => `<th class="c">Dia ${d}</th>`).join("");
    const rows = data.students.map((s) => `<tr><td>${escapeHtml(s.name)}</td><td>${escapeHtml(formatCpf(s.cpf))}</td>${s.attendance.map((a) => `<td class="c">${mark(a)}</td>`).join("")}
      <td class="c">${s.exam ? (s.exam.passed ? "Aprovado" : "Reprovado") + (s.exam.score !== null ? ` (${s.exam.score})` : "") : "—"}</td>
      <td>${s.certificate ? escapeHtml(certUrl(s.certificate.key)) : "—"}</td></tr>`).join("");
    printHtml(`Relatório ${r.customer.name}`, `
      <h1>${escapeHtml(r.class.course?.name ?? r.class.name)}</h1>
      <div class="meta muted">${escapeHtml(r.class.name)} · ${dateBr(r.class.initialDate)}${r.class.finalDate && r.class.finalDate !== r.class.initialDate ? ` a ${dateBr(r.class.finalDate)}` : ""}</div>
      <h2>${escapeHtml(r.customer.corporateName || r.customer.name)} · CNPJ ${escapeHtml(formatCnpj(r.customer.cnpj))}</h2>
      <div class="muted">${r.used} aluno(s) de ${r.seats} vaga(s)${r.contract ? ` · venda ${escapeHtml(r.contract.number)}` : ""}</div>
      <table><thead><tr><th>Aluno</th><th>CPF</th>${head}<th class="c">Prova</th><th>Certificado</th></tr></thead><tbody>${rows || `<tr><td colspan="${4 + data.days.length}">Sem alunos.</td></tr>`}</tbody></table>
      <p class="muted">P = presente · F = falta · — = sem registro</p>`);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()} showBttn={false} title="Relatório da empresa" description={r ? `${r.customer.name} · ${r.class.name}` : "Carregando..."} className="max-w-3xl">
      {isLoading || !data ? <p className="text-sm text-muted-foreground">Carregando...</p> : (
        <div className="space-y-3">
          <div className="overflow-auto rounded-md border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs">
                <tr><th className="p-2 text-left">Aluno</th>{data.days.map((d) => <th key={d} className="p-2 text-center">Dia {d}</th>)}<th className="p-2 text-center">Prova</th><th className="p-2 text-left">Certificado</th></tr>
              </thead>
              <tbody className="divide-y">
                {data.students.map((s) => (
                  <tr key={s.subscriptionId}>
                    <td className="p-2"><p>{s.name}</p><p className="text-xs text-muted-foreground">{formatCpf(s.cpf)}</p></td>
                    {s.attendance.map((a, i) => <td key={i} className="p-2 text-center">{mark(a)}</td>)}
                    <td className="p-2 text-center">{s.exam ? <Badge variant={s.exam.passed ? "default" : "destructive"}>{s.exam.passed ? "Aprovado" : "Reprovado"}{s.exam.score !== null ? ` · ${s.exam.score}` : ""}</Badge> : "—"}</td>
                    <td className="p-2">{s.certificate ? <a className="underline" href={certUrl(s.certificate.key)} target="_blank" rel="noreferrer">Ver</a> : "—"}</td>
                  </tr>
                ))}
                {!data.students.length && <tr><td className="p-3 text-muted-foreground" colSpan={3 + data.days.length}>A empresa ainda não tem alunos inscritos.</td></tr>}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Fechar</Button>
            <Button onClick={print}><Icon name="printer" className="w-4 h-4 mr-1" /> Imprimir / PDF</Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}
