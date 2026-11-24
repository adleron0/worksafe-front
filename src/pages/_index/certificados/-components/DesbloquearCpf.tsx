import { useState } from "react";
import { toast } from "sonner";
import api from "@/services/api";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ============================================================================
// CPF no certificado público (LGPD): a API devolve os CPFs mascarados
// (`***.***.789-**`). Quem é o aluno digita o próprio CPF e recebe o selo `u`,
// que libera as variáveis, a imagem e o PDF completos.
//
// O selo NUNCA vai para a barra de endereço (o link compartilhado sairia
// desbloqueado): fica no estado da página e no sessionStorage por chave.
// Quem abriu pelo QR Code impresso já chega com `?u=` — esse fica como está.
//
// UI: uma pílula discreta "CPF oculto" ao lado do "Baixar" (mesmo estilo);
// o campo só aparece num popover pequeno ao clicar. O menu Baixar também
// oferece "Baixar com CPF completo", que abre o mesmo popover.
// ============================================================================

const storageKey = (certificateKey: string) => `certificado-selo:${certificateKey}`;

/** Selo inicial: o da URL (QR Code) ou o guardado nesta aba. */
export function readInitialUnlock(certificateKey: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  const fromUrl = new URLSearchParams(window.location.search).get("u");
  if (fromUrl) return fromUrl;
  try {
    return window.sessionStorage.getItem(storageKey(certificateKey)) || undefined;
  } catch {
    return undefined;
  }
}

function storeUnlock(certificateKey: string, unlock: string) {
  try {
    window.sessionStorage.setItem(storageKey(certificateKey), unlock);
  } catch {
    // aba privada / armazenamento bloqueado: vale só enquanto a página estiver aberta
  }
}

/** As variáveis vieram com CPF mascarado? (sem variável de CPF, nada a liberar) */
export function hasMaskedCpf(variables: Record<string, any> | null | undefined): boolean {
  if (!variables) return false;
  return Object.entries(variables).some(([name, entry]) => {
    if (!/cpf/i.test(name)) return false;
    const value = entry && typeof entry === "object" && "value" in entry ? entry.value : entry;
    return typeof value === "string" && value.includes("*");
  });
}

interface DesbloquearCpfProps {
  certificateKey: string;
  onUnlock: (unlock: string) => void;
  /** Controlado pelo pai (o menu Baixar também abre). */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Lado do popover em relação à pílula. */
  align?: "start" | "end";
}

/** Pílula "CPF oculto" + popover compacto para confirmar o CPF. */
export default function DesbloquearCpf({
  certificateKey,
  onUnlock,
  open,
  onOpenChange,
  align = "end",
}: DesbloquearCpfProps) {
  const [cpf, setCpf] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const complete = cpf.length === 11;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!complete || sending) return;
    setSending(true);
    setError(null);
    try {
      // JSON de propósito: o helper post() manda multipart.
      const { data } = await api.post<{ u?: string }>(
        `trainee-certificate/public/${certificateKey}/unlock`,
        { cpf },
      );
      if (!data?.u) throw new Error("Resposta sem selo");
      storeUnlock(certificateKey, data.u);
      onOpenChange(false);
      onUnlock(data.u);
      setCpf("");
      toast.success("Pronto! O certificado está completo para ver e baixar.");
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message;
      setError(
        (Array.isArray(message) ? message[0] : message) ||
          (status === 429
            ? "Muitas tentativas. Tente de novo mais tarde."
            : "Não foi possível confirmar agora. Tente de novo."),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setError(null);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          aria-label="CPF oculto: confirmar CPF para ver o certificado completo"
          className="h-8 gap-1.5 rounded-full border border-border/70 bg-card/80 px-3 text-xs font-medium text-muted-foreground backdrop-blur hover:bg-card hover:text-foreground"
        >
          <Icon name="lock" className="h-3.5 w-3.5" />
          CPF oculto
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} sideOffset={8} collisionPadding={16} className="w-72 p-4">
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Icon name="shield-check" className="h-4 w-4 text-primary" />
              Certificado completo
            </p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Os CPFs ficam ocultos para proteger o aluno. Se o certificado é seu, confirme seu CPF.
            </p>
          </div>
          <Input
            name="cpf"
            format="cpf"
            inputMode="numeric"
            autoComplete="off"
            autoFocus
            placeholder="000.000.000-00"
            aria-label="Seu CPF"
            value={cpf}
            onValueChange={(_, value) => {
              setCpf(String(value));
              if (error) setError(null);
            }}
            className="h-9"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" size="sm" className="w-full" disabled={!complete || sending}>
            {sending && <Icon name="loader-2" className="mr-2 h-4 w-4 animate-spin" />}
            Mostrar completo
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
