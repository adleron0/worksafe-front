import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/general-components/Icon";
import { WorkReport, WorkReportPaper, printWorkReport } from "../_authenticated/comercial/-shared/measurement-report";

export const Route = createFileRoute("/_index/medicao/$key")({
  component: PublicMeasurementPage,
});

type PublicReport = WorkReport & { canDecide: boolean };
const errorText = (error: unknown) => {
  const message = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(message) ? message.join(" ") : message || "Não foi possível registrar. Tente de novo.";
};

/**
 * Link do cliente para o boletim de medição: lê o boletim e o relatório do
 * período, imprime/salva em PDF e aprova ou contesta (nome, cargo e nota).
 */
function PublicMeasurementPage() {
  const { key } = Route.useParams();
  const queryClient = useQueryClient();
  const queryKey = ["publicMeasurement", key];
  const { data, isLoading, error } = useQuery({
    queryKey, retry: false, refetchOnWindowFocus: false,
    queryFn: async () => (await api.get<PublicReport>(`commercial/public/measurements/${key}`)).data,
  });
  const [mode, setMode] = useState<"aprovar" | "contestar" | null>(null);
  const [form, setForm] = useState({ name: "", role: "", note: "" });
  const [problem, setProblem] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: async () => (await api.post<PublicReport>(`commercial/public/measurements/${key}/decision`, { decision: mode, ...form })).data,
    onSuccess: (result) => { queryClient.setQueryData(queryKey, result); setMode(null); },
    onError: (err) => setProblem(errorText(err)),
  });

  if (isLoading) return <div className="max-w-4xl mx-auto p-4 grid gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-[60vh] w-full" /></div>;
  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto p-6 mt-16 text-center">
        <h1 className="text-xl font-bold">Boletim não encontrado</h1>
        <p className="text-muted-foreground mt-2">O link pode estar incompleto ou o boletim não está mais disponível. Fale com quem enviou.</p>
      </div>
    );
  }
  const decided = data.decision && (data.status === "aprovada" || data.status === "faturada" || data.status === "contestada");
  return (
    <div className="min-h-screen bg-muted/40 py-6 px-3">
      <div className="max-w-4xl mx-auto grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-muted-foreground">Boletim de medição {data.label} · {data.contract.number}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => printWorkReport(data)}><Icon name="printer" className="w-4 h-4 mr-1" /> Imprimir / PDF</Button>
        </div>
        <div className="rounded-lg border bg-white text-black p-4 sm:p-6 shadow-sm"><WorkReportPaper report={data} /></div>

        {data.canDecide && (
          <section className="rounded-lg border bg-background p-4 grid gap-3" aria-label="Aprovar o boletim">
            <div>
              <h2 className="font-semibold">Aprovação do boletim</h2>
              <p className="text-sm text-muted-foreground">Confira a medição do período. Aprovando, a nota fiscal deste boletim é emitida no valor de {data.invoiceValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Se algo precisa ser revisto, conteste explicando o quê.</p>
            </div>
            {!mode && (
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => { setMode("aprovar"); setProblem(""); }}><Icon name="check" className="w-4 h-4 mr-1" /> Aprovar</Button>
                <Button type="button" variant="outline" onClick={() => { setMode("contestar"); setProblem(""); }}>Contestar</Button>
              </div>
            )}
            {mode && (
              <form className="grid gap-3" onSubmit={(event) => {
                event.preventDefault();
                if (form.name.trim().length < 3) return setProblem("Informe o seu nome");
                if (mode === "contestar" && form.note.trim().length < 5) return setProblem("Explique o que precisa ser revisto");
                setProblem(""); mutate();
              }}>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div><Label htmlFor="decName">Seu nome <span>*</span></Label><Input id="decName" className="mt-1" maxLength={160} value={form.name} autoFocus onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
                  <div><Label htmlFor="decRole">Cargo</Label><Input id="decRole" className="mt-1" maxLength={120} value={form.role} placeholder="Ex.: fiscal do contrato" onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))} /></div>
                </div>
                <div><Label htmlFor="decNote">{mode === "contestar" ? "O que precisa ser revisto *" : "Observação (opcional)"}</Label>
                  <Textarea id="decNote" className="mt-1" rows={3} maxLength={1000} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} /></div>
                <p className="text-xs text-muted-foreground">Ficam registrados o seu nome, a data, o endereço de rede e o navegador, como evidência da decisão.</p>
                {problem && <p className="text-sm text-red-600">{problem}</p>}
                <div className="flex gap-2">
                  <Button type="submit" disabled={isPending}>{isPending ? "Registrando..." : mode === "aprovar" ? "Confirmar a aprovação" : "Enviar a contestação"}</Button>
                  <Button type="button" variant="outline" disabled={isPending} onClick={() => setMode(null)}>Voltar</Button>
                </div>
              </form>
            )}
          </section>
        )}
        {!data.canDecide && decided && (
          <p className="rounded-lg border bg-background p-4 text-sm">
            {data.status === "contestada" ? "Contestação registrada: a empresa vai revisar o boletim e enviar de novo." : "Boletim aprovado. Obrigado!"}
          </p>
        )}
      </div>
    </div>
  );
}
