import React, { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input as ShadInput } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import { DocumentPaper } from "../../_authenticated/comercial/-shared/document";

export interface ClientProposal {
  company: { name: string; logoUrl: string | null; color: string | null };
  number: string; title: string; status: string; validUntil: string | null; total: number;
  contact: { name: string | null; phone: string | null; email: string | null };
  html: string | null; hash: string | null; canDecide: boolean; requiresCode: boolean; codeEmail: string | null;
  accepted: { name: string | null; role: string | null; at: string } | null;
  /** só na pré-visualização interna */
  preview?: boolean; sent?: boolean;
}

const message = (error: unknown) => {
  const text = (error as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
  return Array.isArray(text) ? text.join(" ") : text || "Não foi possível concluir. Tente de novo.";
};
const dateBr = (value?: string | null) => (value ? value.slice(0, 10).split("-").reverse().join("/") : "");
const dateTime = (value: string) => new Date(value).toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const whatsapp = (phone: string | null) => {
  const digits = (phone ?? "").replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11 ? `https://wa.me/55${digits}` : digits.length >= 12 ? `https://wa.me/${digits}` : null;
};

const NOTICE: Record<string, { title: string; text: string }> = {
  recusada: { title: "Proposta recusada", text: "Esta proposta foi recusada. Se mudou de ideia, fale com quem enviou para receber uma nova versão." },
  expirada: { title: "Validade vencida", text: "A validade desta proposta venceu. Peça uma versão atualizada a quem enviou." },
  substituida: { title: "Há uma versão mais nova", text: "Esta proposta foi substituída por uma revisão. Use o link mais recente que você recebeu." },
  cancelada: { title: "Proposta cancelada", text: "Esta proposta foi cancelada e não está mais disponível." },
};

interface Props {
  data: ClientProposal;
  /** chave do link público; ausente na pré-visualização */
  proposalKey?: string;
  onChanged?: () => void;
}

/**
 * A página que o cliente abre pelo link: o documento e, flutuando no canto, o
 * botão de aceite com o valor. A mesma tela serve de pré-visualização interna (com a
 * tarja de rascunho e sem registrar nada).
 */
export default function ProposalClientView({ data, proposalKey, onChanged }: Props) {
  const [mode, setMode] = useState<"" | "accept" | "refuse">("");
  const preview = Boolean(data.preview);
  const color = data.company.color || "#16A34A";
  const notice = NOTICE[data.status];
  const wa = whatsapp(data.contact.phone);
  const done = () => { setMode(""); onChanged?.(); };

  // O sistema trava a ampliação com os dedos; nesta página a folha aparece reduzida no celular,
  // então o cliente precisa poder ampliar para ler. Ao sair, volta ao que era.
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!meta) return;
    const original = meta.content;
    meta.content = "width=device-width, initial-scale=1, maximum-scale=5, user-scalable=1";
    return () => { meta.content = original; };
  }, []);

  return (
    <div className="min-h-full bg-muted/40 print:bg-white" style={{ ["--brand" as string]: color }}>
      {/* a moldura da página pública tem altura fixa e rolagem: na impressão o documento precisa sair inteiro */}
      <style>{`
        @media print { html, body, #root, .h-dvh { height:auto !important; overflow:visible !important; } .no-print { display:none !important; } }
        @keyframes proposal-shimmer { 0% { transform:translateX(0); } 60%, 100% { transform:translateX(400%); } }
        .proposal-shimmer { background:linear-gradient(100deg, transparent, rgba(255,255,255,.35), transparent); animation:proposal-shimmer 3.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .proposal-shimmer { animation:none; display:none; } }
      `}</style>

      {preview && (
        <div className="no-print sticky top-0 z-30 text-center text-sm font-semibold text-amber-950 px-3 py-2 shadow"
          style={{ background: "repeating-linear-gradient(135deg,#fbbf24 0 14px,#f59e0b 14px 28px)" }} role="status">
          <span className="rounded bg-amber-50/90 px-2 py-0.5">
            RASCUNHO · {data.sent ? "é exatamente isto que o cliente vê pelo link." : "é assim que o cliente vai ver a proposta."} Nada é registrado nesta visualização.
          </span>
        </div>
      )}

      <header className="no-print bg-background border-b">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {data.company.logoUrl && <img src={data.company.logoUrl} alt={data.company.name} className="h-9 w-auto object-contain shrink-0" />}
            <div className="min-w-0">
              <p className="font-semibold truncate">{data.company.name}</p>
              <p className="text-xs text-muted-foreground truncate">Proposta {data.number}</p>
            </div>
          </div>
          {data.html && (
            <Button type="button" variant="outline" size="sm" onClick={() => window.print()} className="shrink-0">
              <Icon name="printer" className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Imprimir ou salvar em PDF</span>
            </Button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-3 sm:p-4 grid gap-4 pb-32">
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

        <p className="no-print text-center text-xs text-muted-foreground">
          Página segura de {data.company.name}.
          {data.contact.name || data.contact.email ? ` Dúvidas? Fale com ${[data.contact.name, data.contact.email].filter(Boolean).join(" · ")}.` : ""}
        </p>
      </main>

      {/* Ações flutuando no canto, como o botão de assinatura de contrato: o documento fica livre até o fim */}
      {data.canDecide && mode === "" && (
        <div className="no-print fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-20 flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            {wa && (
              <Button type="button" variant="outline" size="sm" className="rounded-full bg-background shadow-md" onClick={() => window.open(wa, "_blank", "noopener")}>
                <Icon name="message-circle" className="w-4 h-4 mr-1" /> Tirar dúvida
              </Button>
            )}
            <Button type="button" variant="outline" size="sm" className="rounded-full bg-background shadow-md" onClick={() => setMode("refuse")}>Recusar</Button>
          </div>
          <button type="button" onClick={() => setMode("accept")} style={{ background: color }}
            className="group relative overflow-hidden rounded-full pl-4 pr-6 py-2.5 text-left text-white shadow-xl transition-transform duration-300 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-foreground">
            <span className="relative z-10 flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20"><Icon name="check" className="w-5 h-5" /></span>
              <span>
                <span className="block text-sm font-bold leading-tight">Aceitar a proposta</span>
                <span className="block text-xs leading-tight opacity-90 tabular-nums">{money(data.total)}{data.validUntil ? ` · válida até ${dateBr(data.validUntil)}` : ""}</span>
              </span>
            </span>
            <span aria-hidden="true" className="proposal-shimmer pointer-events-none absolute inset-y-0 -left-1/2 w-1/2" />
          </button>
        </div>
      )}

      <Dialog open={mode !== ""} onOpenChange={(open) => { if (!open) setMode(""); }}>
        <DialogContent className="sm:max-w-xl max-h-[92vh] overflow-y-auto">
          {mode === "accept" && <AcceptForm proposalKey={proposalKey} data={data} preview={preview} onCancel={() => setMode("")} onDone={done} />}
          {mode === "refuse" && <RefuseForm proposalKey={proposalKey} preview={preview} onCancel={() => setMode("")} onDone={done} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

const PreviewNote = () => (
  <p className="rounded-md bg-amber-100 text-amber-900 px-3 py-2 text-sm" role="status">
    Pré-visualização: é isto que o cliente preenche. Aqui o envio está desligado e nada é registrado.
  </p>
);

function AcceptForm({ proposalKey, data, preview, onCancel, onDone }: { proposalKey?: string; data: ClientProposal; preview: boolean; onCancel: () => void; onDone: () => void }) {
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
    if (preview) return;
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
      <DialogHeader>
        <DialogTitle>Aceitar a proposta {data.number}</DialogTitle>
        <DialogDescription>
          Valor total de {money(data.total)}. Seus dados ficam registrados junto com a data, a hora e o documento aceito.
        </DialogDescription>
      </DialogHeader>
      {preview && <PreviewNote />}
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
            <Button type="button" variant="outline" disabled={asking || preview} onClick={() => askCode()}>{asking ? "Enviando..." : codeSentTo ? "Enviar outro código" : "Enviar o código"}</Button>
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
        <Checkbox className="mt-0.5" checked={form.declaration} onCheckedChange={(checked) => set("declaration", checked === true)} />
        Declaro que tenho poderes para representar a empresa contratante neste aceite.
      </label>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox className="mt-0.5" checked={form.termsAccepted} onCheckedChange={(checked) => set("termsAccepted", checked === true)} />
        Li a proposta e concordo com o escopo, os valores, os prazos e as condições descritos nela.
      </label>
      {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Voltar</Button>
        <Button type="submit" disabled={isPending || preview}>{isPending ? "Registrando..." : "Confirmar o aceite"}</Button>
      </div>
    </form>
  );
}

function RefuseForm({ proposalKey, preview, onCancel, onDone }: { proposalKey?: string; preview: boolean; onCancel: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const { mutate, isPending } = useMutation({
    mutationFn: async () => (await api.post(`commercial/public/proposals/${proposalKey}/refuse`, { name, reason })).data,
    onSuccess: onDone,
    onError: (err) => setError(message(err)),
  });
  return (
    <form className="grid gap-3" onSubmit={(event) => { event.preventDefault(); if (preview) return; if (name.trim().length < 2) return setError("Informe seu nome"); setError(""); mutate(); }}>
      <DialogHeader>
        <DialogTitle>Recusar a proposta</DialogTitle>
        <DialogDescription>Se quiser, conte o motivo: ajuda a preparar uma nova versão.</DialogDescription>
      </DialogHeader>
      {preview && <PreviewNote />}
      <div><Label htmlFor="refuseName">Seu nome</Label>
        <ShadInput id="refuseName" className="mt-1" value={name} maxLength={160} onChange={(event) => setName(event.target.value)} /></div>
      <div><Label htmlFor="refuseReason">Motivo (opcional)</Label>
        <Textarea id="refuseReason" className="mt-1" rows={3} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></div>
      {error && <p className="text-red-600 text-sm" role="alert">{error}</p>}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Voltar</Button>
        <Button type="submit" variant="destructive" disabled={isPending || preview}>{isPending ? "Registrando..." : "Confirmar a recusa"}</Button>
      </div>
    </form>
  );
}
