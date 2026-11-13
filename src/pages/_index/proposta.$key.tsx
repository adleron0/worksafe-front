import { createFileRoute } from "@tanstack/react-router";
import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input as ShadInput } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import { DocumentPaper } from "../_authenticated/comercial/-shared/document";

export const Route = createFileRoute("/_index/proposta/$key")({
  component: PublicProposalPage,
});

interface PublicProposal {
  company: { name: string; logoUrl: string | null; color: string | null };
  number: string; title: string; status: string; validUntil: string | null;
  html: string | null; hash: string | null; canDecide: boolean; requiresCode: boolean; codeEmail: string | null;
  accepted: { name: string | null; role: string | null; at: string } | null;
}

const message = (error: unknown) => {
  const text = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(text) ? text.join(" ") : text || "Não foi possível concluir. Tente de novo.";
};
const dateBr = (value?: string | null) => (value ? value.slice(0, 10).split("-").reverse().join("/") : "");
const dateTime = (value: string) => new Date(value).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });

const NOTICE: Record<string, { title: string; text: string }> = {
  recusada: { title: "Proposta recusada", text: "Esta proposta foi recusada. Se mudou de ideia, fale com quem enviou para receber uma nova versão." },
  expirada: { title: "Validade vencida", text: "A validade desta proposta venceu. Peça uma versão atualizada a quem enviou." },
  substituida: { title: "Há uma versão mais nova", text: "Esta proposta foi substituída por uma revisão. Use o link mais recente que você recebeu." },
  cancelada: { title: "Proposta cancelada", text: "Esta proposta foi cancelada e não está mais disponível." },
};

function PublicProposalPage() {
  const { key } = Route.useParams();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"" | "accept" | "refuse">("");
  const queryKey = ["publicProposal", key];
  const { data, isLoading, error } = useQuery({
    queryKey, retry: false, refetchOnWindowFocus: false,
    queryFn: async () => (await api.get<PublicProposal>(`commercial/public/proposals/${key}`)).data,
  });
  const reload = () => { setMode(""); queryClient.invalidateQueries({ queryKey }); };

  if (isLoading) return <div className="max-w-4xl mx-auto p-4 grid gap-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-[60vh] w-full" /></div>;
  if (error || !data) {
    return (
      <div className="max-w-xl mx-auto p-6 mt-16 text-center">
        <h1 className="text-xl font-bold">Proposta não encontrada</h1>
        <p className="text-muted-foreground mt-2">O link pode estar incompleto ou a proposta não está mais disponível. Confira o link recebido ou fale com quem enviou.</p>
      </div>
    );
  }

  const notice = NOTICE[data.status];
  return (
    <div className="min-h-full bg-muted/40 print:bg-white">
      {/* a moldura da página pública tem altura fixa e rolagem: na impressão o documento precisa sair inteiro */}
      <style>{`@media print { html, body, #root, .h-dvh { height:auto !important; overflow:visible !important; } .no-print { display:none !important; } }`}</style>

      <header className="no-print bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {data.company.logoUrl && <img src={data.company.logoUrl} alt={data.company.name} className="h-10 w-auto object-contain" />}
            <div className="min-w-0">
              <p className="font-semibold truncate">{data.company.name}</p>
              <p className="text-sm text-muted-foreground truncate">Proposta {data.number} · {data.title}</p>
            </div>
          </div>
          {data.html && (
            <Button type="button" variant="outline" onClick={() => window.print()} className="shrink-0">
              <Icon name="printer" className="w-4 h-4 mr-1" /> Imprimir ou salvar em PDF
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 grid gap-4">
        {data.status === "aceita" && (
          <div className="rounded-md border border-green-600 bg-green-50 text-green-900 px-4 py-3">
            <p className="font-semibold">Proposta aceita</p>
            <p className="text-sm">
              {data.accepted?.name ? `Aceita por ${data.accepted.name}${data.accepted.role ? ` (${data.accepted.role})` : ""} em ${dateTime(data.accepted.at)}.` : "O aceite foi registrado."}
              {data.hash && <span className="block text-xs mt-1 break-all">Identificador do documento aceito: {data.hash}</span>}
            </p>
          </div>
        )}
        {notice && (
          <div className="no-print rounded-md border border-amber-500 bg-amber-50 text-amber-900 px-4 py-3">
            <p className="font-semibold">{notice.title}</p>
            <p className="text-sm">{notice.text}</p>
          </div>
        )}

        {data.html && <DocumentPaper html={data.html} className="shadow-sm" />}

        {data.canDecide && (
          <section className="no-print rounded-md border bg-background p-4 grid gap-3">
            {mode === "" && (
              <>
                <div>
                  <h2 className="font-semibold">Sua resposta</h2>
                  <p className="text-sm text-muted-foreground">
                    {data.validUntil ? `Esta proposta vale até ${dateBr(data.validUntil)}. ` : ""}Leia o documento acima antes de responder.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button type="button" onClick={() => setMode("accept")}><Icon name="check" className="w-4 h-4 mr-1" /> Aceitar a proposta</Button>
                  <Button type="button" variant="outline" onClick={() => setMode("refuse")}>Recusar</Button>
                </div>
              </>
            )}
            {mode === "accept" && <AcceptForm proposalKey={key} data={data} onCancel={() => setMode("")} onDone={reload} />}
            {mode === "refuse" && <RefuseForm proposalKey={key} onCancel={() => setMode("")} onDone={reload} />}
          </section>
        )}

        <p className="no-print text-center text-xs text-muted-foreground pb-6">Página segura de {data.company.name}. Em caso de dúvida, fale com quem enviou a proposta.</p>
      </main>
    </div>
  );
}

function AcceptForm({ proposalKey, data, onCancel, onDone }: { proposalKey: string; data: PublicProposal; onCancel: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ name: "", cpf: "", role: "", email: "", code: "", declaration: false, termsAccepted: false });
  const [error, setError] = useState("");
  const [codeSentTo, setCodeSentTo] = useState("");
  const set = (name: string, value: string | number | boolean) => setForm((prev) => ({ ...prev, [name]: value }));

  const { mutate: askCode, isPending: asking } = useMutation({
    mutationFn: async () => (await api.post<{ required: boolean; sentTo?: string }>(`commercial/public/proposals/${proposalKey}/code`, {})).data,
    onSuccess: (result) => { setError(""); setCodeSentTo(result.sentTo ?? ""); },
    onError: (err) => setError(message(err)),
  });
  const { mutate: accept, isPending } = useMutation({
    mutationFn: async () => (await api.post(`commercial/public/proposals/${proposalKey}/accept`, { ...form, hash: data.hash })).data,
    onSuccess: onDone,
    onError: (err) => setError(message(err)),
  });

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (form.name.trim().split(/\s+/).length < 2) return setError("Informe o nome completo");
    if (String(form.cpf).replace(/\D/g, "").length !== 11) return setError("Informe o CPF");
    if (form.role.trim().length < 2) return setError("Informe o cargo");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError("Informe um e-mail válido");
    if (data.requiresCode && String(form.code).replace(/\D/g, "").length !== 6) return setError("Informe o código de 6 dígitos enviado por e-mail");
    if (!form.declaration || !form.termsAccepted) return setError("Marque as duas declarações para aceitar");
    setError(""); accept();
  };

  return (
    <form className="grid gap-3" onSubmit={submit}>
      <div>
        <h2 className="font-semibold">Aceitar a proposta {data.number}</h2>
        <p className="text-sm text-muted-foreground">Seus dados ficam registrados junto com a data, a hora e o documento aceito.</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div><Label htmlFor="acceptName">Nome completo</Label>
          <ShadInput id="acceptName" className="mt-1" value={form.name} maxLength={160} autoComplete="name" onChange={(event) => set("name", event.target.value)} /></div>
        <div><Label htmlFor="acceptCpf">CPF</Label>
          <Input id="acceptCpf" name="cpf" format="cpf" className="mt-1" value={form.cpf} onValueChange={set} placeholder="000.000.000-00" /></div>
        <div><Label htmlFor="acceptRole">Cargo</Label>
          <ShadInput id="acceptRole" className="mt-1" value={form.role} maxLength={120} autoComplete="organization-title" onChange={(event) => set("role", event.target.value)} /></div>
        <div><Label htmlFor="acceptEmail">E-mail</Label>
          <ShadInput id="acceptEmail" type="email" className="mt-1" value={form.email} maxLength={255} autoComplete="email" onChange={(event) => set("email", event.target.value)} /></div>
      </div>

      {data.requiresCode && (
        <div className="rounded-md border p-3 grid gap-2">
          <p className="text-sm">Para confirmar, enviamos um código de 6 dígitos para <b>{data.codeEmail}</b>, o e-mail de contato desta proposta.</p>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
            <Button type="button" variant="outline" disabled={asking} onClick={() => askCode()}>{asking ? "Enviando..." : codeSentTo ? "Enviar outro código" : "Enviar o código"}</Button>
            <div className="sm:w-48">
              <Label htmlFor="acceptCode">Código</Label>
              <ShadInput id="acceptCode" className="mt-1 tracking-widest" inputMode="numeric" maxLength={6} value={form.code} autoComplete="one-time-code"
                onChange={(event) => set("code", event.target.value.replace(/\D/g, ""))} />
            </div>
          </div>
          {codeSentTo && <p className="text-xs text-muted-foreground">Código enviado para {codeSentTo}. Ele vale por 15 minutos.</p>}
        </div>
      )}

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={form.declaration} onChange={(event) => set("declaration", event.target.checked)} />
        Declaro que tenho poderes para representar a empresa contratante neste aceite.
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={form.termsAccepted} onChange={(event) => set("termsAccepted", event.target.checked)} />
        Li a proposta acima e concordo com o escopo, os valores, os prazos e as condições descritos nela.
      </label>
      {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="submit" disabled={isPending}>{isPending ? "Registrando..." : "Confirmar o aceite"}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Voltar</Button>
      </div>
    </form>
  );
}

function RefuseForm({ proposalKey, onCancel, onDone }: { proposalKey: string; onCancel: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: async () => (await api.post(`commercial/public/proposals/${proposalKey}/refuse`, { name, reason })).data,
    onSuccess: onDone,
    onError: (err) => setError(message(err)),
  });
  return (
    <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); if (name.trim().length < 2) return setError("Informe seu nome"); setError(""); mutate(); }}>
      <div>
        <h2 className="font-semibold">Recusar a proposta</h2>
        <p className="text-sm text-muted-foreground">Se quiser, conte o motivo: ajuda a preparar uma nova versão.</p>
      </div>
      <div><Label htmlFor="refuseName">Seu nome</Label>
        <ShadInput id="refuseName" className="mt-1" value={name} maxLength={160} onChange={(event) => setName(event.target.value)} /></div>
      <div><Label htmlFor="refuseReason">Motivo (opcional)</Label>
        <Textarea id="refuseReason" className="mt-1" rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></div>
      {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
      <div className="flex flex-col sm:flex-row gap-2">
        <Button type="submit" variant="destructive" disabled={isPending}>{isPending ? "Registrando..." : "Confirmar a recusa"}</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Voltar</Button>
      </div>
    </form>
  );
}
