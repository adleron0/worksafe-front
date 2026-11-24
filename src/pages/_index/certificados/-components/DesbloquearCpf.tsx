import { useState } from "react";
import { toast } from "sonner";
import api from "@/services/api";
import Icon from "@/components/general-components/Icon";
import Input from "@/components/general-components/Input";
import { Button } from "@/components/ui/button";

// ============================================================================
// CPF no certificado público (LGPD): a API devolve os CPFs mascarados
// (`***.***.789-**`). Quem é o aluno digita o próprio CPF e recebe o selo `u`,
// que libera as variáveis, a imagem e o PDF completos.
//
// O selo NUNCA vai para a barra de endereço (o link compartilhado sairia
// desbloqueado): fica no estado da página e no sessionStorage por chave.
// Quem abriu pelo QR Code impresso já chega com `?u=` — esse fica como está.
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
  className?: string;
}

/** Bloco discreto: "É o seu certificado? Digite seu CPF para ver completo." */
export default function DesbloquearCpf({ certificateKey, onUnlock, className = "" }: DesbloquearCpfProps) {
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
      onUnlock(data.u);
      setCpf("");
      toast.success("CPF confirmado! Agora você vê e baixa o certificado completo.");
    } catch (err: any) {
      const status = err?.response?.status;
      const message = err?.response?.data?.message;
      setError(
        (Array.isArray(message) ? message[0] : message) ||
          (status === 429
            ? "Muitas tentativas. Tente de novo mais tarde."
            : "Não foi possível confirmar o CPF agora. Tente de novo."),
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className={`rounded-lg border border-border bg-muted/40 px-4 py-3 ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <Icon name="shield-check" className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          CPF oculto para proteger o aluno. É o seu certificado? Digite seu CPF para ver e baixar completo.
        </p>
      </div>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          name="cpf"
          format="cpf"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000.000.000-00"
          aria-label="Seu CPF"
          value={cpf}
          onValueChange={(_, value) => {
            setCpf(String(value));
            if (error) setError(null);
          }}
          className="h-9 sm:max-w-[200px]"
        />
        <Button type="submit" size="default" disabled={!complete || sending}>
          {sending ? (
            <Icon name="loader-2" className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icon name="eye" className="mr-2 h-4 w-4" />
          )}
          Mostrar completo
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </form>
  );
}
