import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import SlideConfirm from "@/components/general-components/SlideConfirm";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { errorMessage } from "../../comercial/-shared/commercial";
import { CHAT_KEY, Channel, PAGES, WhatsAppLogo, chatApi, formatPhone, useChatMeta } from "./chat";

interface QrState { status: Channel["status"]; qr: string | null; pairingCode?: string | null; phone?: string | null; profileName?: string | null; reason?: string | null }
type Step = "termo" | "conectar" | "pronto";
type Mode = "qr" | "codigo";

/**
 * Conectar um número em três passos: aceitar o termo (deslizando), ler o QR
 * code (ou digitar o código no celular) e pronto. A tela pergunta a cada 2 s
 * se o celular já conectou.
 */
export default function ConnectDialog({ channel, open, onOpenChange }: { channel: Channel | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const queryClient = useQueryClient();
  const meta = useChatMeta(open);
  const [step, setStep] = useState<Step>("termo");
  const [mode, setMode] = useState<Mode>("qr");
  const [phone, setPhone] = useState("");
  const [state, setState] = useState<QrState | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !channel) return;
    setError(""); setState(null); setMode("qr"); setPhone(channel.phone ? formatPhone(channel.phone) : "");
    setStep(channel.status === "conectado" ? "pronto" : channel.termsOk ? "conectar" : "termo");
  }, [open, channel?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const connect = useMutation({
    mutationFn: (body: { acceptTerms?: boolean; phone?: string }) => chatApi.post<QrState>(`channels/${channel!.id}/connect`, body),
    onSuccess: (out) => {
      setError(""); setState(out);
      setStep(out.status === "conectado" ? "pronto" : "conectar");
      queryClient.invalidateQueries({ queryKey: [CHAT_KEY, "channels"] });
    },
    onError: (err) => setError(errorMessage(err)),
  });

  // ao chegar no passo de conectar sem QR ainda, pede um
  useEffect(() => {
    if (open && step === "conectar" && mode === "qr" && !state && !connect.isPending && !error) connect.mutate({});
  }, [open, step, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const poll = useQuery({
    queryKey: [CHAT_KEY, "qr", channel?.id],
    enabled: open && step === "conectar" && !!state,
    refetchInterval: 2000,
    queryFn: () => chatApi.get<QrState>(`channels/${channel!.id}/qr`),
  });
  useEffect(() => {
    if (!poll.data) return;
    if (poll.data.status === "conectado") {
      setState(poll.data); setStep("pronto");
      queryClient.invalidateQueries({ queryKey: [CHAT_KEY] });
    } else if (poll.data.qr && poll.data.qr !== state?.qr) setState((current) => ({ ...(current ?? poll.data), ...poll.data, pairingCode: current?.pairingCode }));
  }, [poll.data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!channel) return null;
  const terms = meta.data?.terms;
  const steps: { key: Step; label: string }[] = [{ key: "termo", label: "Termo" }, { key: "conectar", label: "Conectar" }, { key: "pronto", label: "Pronto" }];
  const stepIndex = steps.findIndex((s) => s.key === step);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="shrink-0 space-y-3 border-b px-5 pt-5 pb-4 text-left">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted"><WhatsAppLogo className="h-6 w-6" /></span>
            <div className="min-w-0">
              <DialogTitle className="truncate text-base">Conectar {channel.name}</DialogTitle>
              <DialogDescription className="text-xs">Leva menos de um minuto, com o celular na mão.</DialogDescription>
            </div>
          </div>
          <ol className="flex items-center gap-2" aria-label="Passos">
            {steps.map((item, index) => (
              <li key={item.key} className="flex flex-1 items-center gap-2">
                <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold transition-colors",
                  index < stepIndex ? "bg-primary text-primary-foreground" : index === stepIndex ? "bg-primary/15 text-primary ring-2 ring-primary" : "bg-muted text-muted-foreground")}>
                  {index < stepIndex ? <Icon name="check" className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className={cn("text-xs font-medium", index === stepIndex ? "text-foreground" : "text-muted-foreground")}>{item.label}</span>
                {index < steps.length - 1 && <span className={cn("h-px flex-1", index < stepIndex ? "bg-primary" : "bg-border")} />}
              </li>
            ))}
          </ol>
        </DialogHeader>

        <div className="scroll-fino min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {step === "termo" && (
            !terms ? <Skeleton className="h-64" /> : (
              <div className="grid gap-4 text-sm">
                <p className="leading-relaxed text-muted-foreground">{terms.intro}</p>
                <TermBlock icon="triangle-alert" tone="danger" title="Riscos" items={terms.riscos} />
                <TermBlock icon="shield-check" tone="success" title="O que o sistema faz para proteger o número" items={terms.protecoes} />
                <TermBlock icon="lightbulb" tone="info" title="O que depende de vocês" items={terms.boasPraticas} />
                {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600">{error}</p>}
                <div className="grid gap-2 rounded-xl border bg-muted/40 p-3">
                  <p className="text-xs font-medium">{terms.aceite}</p>
                  <SlideConfirm label="Deslize para aceitar e continuar" pending={connect.isPending} onConfirm={() => { connect.mutate({ acceptTerms: true }); }} />
                </div>
              </div>
            )
          )}

          {step === "conectar" && (
            <div className="grid gap-4">
              <div className="mx-auto flex rounded-lg border bg-muted/40 p-0.5 text-xs font-medium">
                {([["qr", "qr-code", "QR code"], ["codigo", "smartphone", "Código no celular"]] as const).map(([key, icon, label]) => (
                  <button key={key} type="button" onClick={() => { setMode(key); setError(""); if (key === "qr" && !state?.qr) connect.mutate({}); }}
                    className={cn("flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 transition-colors", mode === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
                    <Icon name={icon} className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>

              {mode === "qr" ? (
                <div className="grid items-center gap-5 sm:grid-cols-[13rem_minmax(0,1fr)]">
                  <div className="relative mx-auto grid h-52 w-52 place-items-center overflow-hidden rounded-2xl border bg-white p-2 shadow-sm">
                    {state?.qr ? <img src={state.qr} alt="QR code para conectar o WhatsApp" className="h-full w-full" /> : <Icon name="loader-circle" className="h-8 w-8 animate-spin text-muted-foreground" />}
                    {state?.qr && <span className="absolute inset-x-0 bottom-0 bg-white/90 py-1 text-center text-[10px] text-neutral-500">o código se renova sozinho</span>}
                  </div>
                  <Steps items={["Abra o WhatsApp no celular deste número.", "Toque em ⋮ (Android) ou Configurações (iPhone).", "Entre em Aparelhos conectados → Conectar um aparelho.", "Aponte a câmera para este QR code."]} />
                </div>
              ) : (
                <div className="grid gap-4">
                  {!state?.pairingCode ? (
                    <div className="grid gap-2">
                      <label htmlFor="pair-phone" className="text-xs font-medium">Número deste WhatsApp, com DDD</label>
                      <div className="flex gap-2">
                        <Input id="pair-phone" name="phone" format="phone" value={phone} placeholder="(11) 91234-5678" onValueChange={(_, value) => setPhone(String(value))} className="flex-1" />
                        <Button type="button" disabled={connect.isPending || phone.replace(/\D/g, "").length < 10} onClick={() => { const digits = phone.replace(/\D/g, ""); connect.mutate({ phone: digits.startsWith("55") ? digits : `55${digits}` }); }}>
                          {connect.isPending ? <Icon name="loader-circle" className="h-4 w-4 animate-spin" /> : "Gerar código"}
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Bom para quando o celular está longe do computador: você digita um código no próprio WhatsApp.</p>
                    </div>
                  ) : (
                    <div className="grid items-center gap-5 sm:grid-cols-[13rem_minmax(0,1fr)]">
                      <div className="grid justify-items-center gap-2 rounded-2xl border bg-muted/40 px-3 py-6">
                        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Seu código</span>
                        <span className="font-mono text-2xl font-bold tracking-[0.2em]">{state.pairingCode.slice(0, 4)}-{state.pairingCode.slice(4)}</span>
                        <button type="button" className="cursor-pointer text-xs text-primary hover:underline" onClick={() => setState((current) => current && { ...current, pairingCode: null })}>Gerar outro</button>
                      </div>
                      <Steps items={["Abra o WhatsApp no celular deste número.", "Entre em Aparelhos conectados → Conectar um aparelho.", "Toque em \"Conectar com número de telefone\".", "Digite o código ao lado."]} />
                    </div>
                  )}
                </div>
              )}
              {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-600">{error}</p>}
              <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" /> Esperando o celular conectar…</p>
            </div>
          )}

          {step === "pronto" && (
            <div className="grid justify-items-center gap-3 py-6 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-green-500/12 text-green-600 animate-in zoom-in-50 duration-300"><Icon name="check" className="h-8 w-8" /></span>
              <div>
                <p className="text-lg font-semibold">Número conectado!</p>
                <p className="text-sm text-muted-foreground">{[state?.profileName ?? channel.profileName, formatPhone(state?.phone ?? channel.phone)].filter(Boolean).join(" · ") || channel.name}</p>
              </div>
              <p className="max-w-sm text-xs text-muted-foreground">As mensagens que chegarem neste número aparecem na caixa de entrada, já no setor {meta.data?.sectors.find((s) => s.id === channel.sector)?.name ?? "escolhido"}.</p>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
                <Button asChild><Link to={PAGES.inbox} search={{}}><Icon name="messages-square" className="mr-1.5 h-4 w-4" />Abrir as conversas</Link></Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TermBlock({ icon, tone, title, items }: { icon: string; tone: "danger" | "success" | "info"; title: string; items: string[] }) {
  const color = { danger: "text-red-600 bg-red-500/10", success: "text-green-700 bg-green-500/10", info: "text-sky-700 bg-sky-500/10" }[tone];
  return (
    <section className="grid gap-2">
      <h3 className="flex items-center gap-2 text-[13px] font-semibold">
        <span className={cn("grid h-6 w-6 place-items-center rounded-md", color)}><Icon name={icon} className="h-3.5 w-3.5" /></span>{title}
      </h3>
      <ul className="grid gap-1.5 pl-8">
        {items.map((item) => <li key={item} className="list-disc text-[13px] leading-snug text-muted-foreground marker:text-border">{item}</li>)}
      </ul>
    </section>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="grid gap-2.5">
      {items.map((item, index) => (
        <li key={item} className="flex items-start gap-2.5 text-[13px] leading-snug">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary/12 text-[11px] font-bold text-primary">{index + 1}</span>
          {item}
        </li>
      ))}
    </ol>
  );
}
